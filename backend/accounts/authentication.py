from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import (
    InvalidToken,
    TokenError,
)
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .mfa import (
    MFAChallengeError,
    MFASecretError,
    build_provisioning_uri,
    build_qr_code_data_url,
    clear_challenge,
    consume_recovery_code,
    create_challenge,
    decrypt_secret,
    encrypt_secret,
    generate_recovery_codes,
    generate_totp_secret,
    hash_recovery_codes,
    match_totp_counter,
    resolve_challenge,
    user_needs_mfa_setup,
    user_requires_mfa,
)
from .serializers import (
    MFACodeVerificationSerializer,
    MFASetupStartSerializer,
)


def _coerce_boolean(value) -> bool:
    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        return value.strip().lower() in {
            "1",
            "true",
            "yes",
            "on",
        }

    return bool(value)


def is_trusted_frontend_origin(request) -> bool:
    """
    Browser requests that use the HttpOnly refresh cookie must originate
    from one of the explicitly configured frontend origins.

    Non-browser clients commonly omit Origin, so a missing Origin header
    is permitted. CORS remains the browser's primary cross-origin control.
    """
    origin = request.headers.get(
        "Origin",
        "",
    ).rstrip("/")

    if not origin:
        return True

    allowed_origins = {
        configured_origin.rstrip("/")
        for configured_origin in (
            list(
                getattr(
                    settings,
                    "CORS_ALLOWED_ORIGINS",
                    [],
                )
            )
            + list(
                getattr(
                    settings,
                    "CSRF_TRUSTED_ORIGINS",
                    [],
                )
            )
        )
        if configured_origin
    }

    return origin in allowed_origins


def _refresh_cookie_max_age(
    remember_me: bool,
):
    if not remember_me:
        return None

    refresh_lifetime = (
        settings.SIMPLE_JWT[
            "REFRESH_TOKEN_LIFETIME"
        ]
    )

    return int(
        refresh_lifetime.total_seconds()
    )


def set_web_auth_cookies(
    response: Response,
    refresh_token: str,
    remember_me: bool,
) -> None:
    max_age = _refresh_cookie_max_age(
        remember_me,
    )

    common_cookie_options = {
        "secure": settings.AUTH_COOKIE_SECURE,
        "httponly": True,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
        "path": settings.AUTH_REFRESH_COOKIE_PATH,
    }

    if settings.AUTH_COOKIE_DOMAIN:
        common_cookie_options[
            "domain"
        ] = settings.AUTH_COOKIE_DOMAIN

    response.set_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        refresh_token,
        max_age=max_age,
        **common_cookie_options,
    )

    response.set_cookie(
        settings.AUTH_REMEMBER_COOKIE_NAME,
        "1" if remember_me else "0",
        max_age=max_age,
        **common_cookie_options,
    )


def clear_web_auth_cookies(
    response: Response,
) -> None:
    delete_options = {
        "path": settings.AUTH_REFRESH_COOKIE_PATH,
        "samesite": settings.AUTH_COOKIE_SAMESITE,
    }

    if settings.AUTH_COOKIE_DOMAIN:
        delete_options[
            "domain"
        ] = settings.AUTH_COOKIE_DOMAIN

    response.delete_cookie(
        settings.AUTH_REFRESH_COOKIE_NAME,
        **delete_options,
    )

    response.delete_cookie(
        settings.AUTH_REMEMBER_COOKIE_NAME,
        **delete_options,
    )


def _issue_authenticated_session(
    user,
    *,
    web_session: bool,
    remember_me: bool,
    extra_data: dict | None = None,
) -> Response:
    """
    This is the only helper that issues a full JWT session after the
    password/MFA gates have been satisfied.
    """
    refresh_token = RefreshToken.for_user(
        user
    )

    response_data = {
        "access": str(
            refresh_token.access_token
        ),
    }

    if extra_data:
        response_data.update(
            extra_data
        )

    if not web_session:
        response_data[
            "refresh"
        ] = str(
            refresh_token
        )

    response = Response(
        response_data,
        status=status.HTTP_200_OK,
    )

    if web_session:
        set_web_auth_cookies(
            response,
            str(refresh_token),
            remember_me,
        )

    return response


def _challenge_response(
    user,
    *,
    purpose: str,
    web_session: bool,
    remember_me: bool,
) -> Response:
    challenge_token = create_challenge(
        user,
        purpose=purpose,
        web_session=web_session,
        remember_me=remember_me,
    )

    if purpose == "setup":
        data = {
            "mfa_setup_required": True,
            "challenge_token": challenge_token,
            "detail": (
                "Multi-factor authentication setup "
                "is required before this account can sign in."
            ),
        }
    else:
        data = {
            "mfa_required": True,
            "challenge_token": challenge_token,
            "detail": (
                "Enter your authenticator code to continue."
            ),
        }

    response = Response(
        data,
        status=status.HTTP_200_OK,
    )

    if web_session:
        # A password-only login must never inherit an older browser
        # refresh session while MFA is still outstanding.
        clear_web_auth_cookies(
            response
        )

    return response


class ThrottledTokenObtainPairView(
    APIView
):
    """
    Password login protected by the Sprint 1 login throttle.

    MFA behavior:
      - accounts that already enabled MFA receive a short-lived,
        one-time challenge and no JWTs;
      - accounts in MFA_REQUIRED_ROLES must enroll before a JWT is issued;
      - other accounts retain the existing login behavior.

    Web:
      - access JWT is returned to JavaScript memory;
      - refresh JWT is stored in a Secure/HttpOnly cookie.

    Mobile:
      - normal non-privileged users retain access + refresh JSON tokens;
      - privileged users cannot bypass MFA by pretending to be mobile.
    """

    permission_classes = [
        AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "login"

    invalid_credentials_message = (
        "No active account found with the given credentials."
    )

    def post(
        self,
        request,
        *args,
        **kwargs,
    ):
        web_session = _coerce_boolean(
            request.data.get(
                "web_session",
                False,
            )
        )

        if (
            web_session
            and not is_trusted_frontend_origin(
                request,
            )
        ):
            return Response(
                {
                    "detail": (
                        "This browser origin is not "
                        "allowed to create a web session."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        username = request.data.get(
            "username",
            "",
        )

        password = request.data.get(
            "password",
            "",
        )

        if (
            not isinstance(
                username,
                str,
            )
            or not isinstance(
                password,
                str,
            )
            or not username
            or not password
        ):
            return Response(
                {
                    "detail": (
                        self.invalid_credentials_message
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        user = authenticate(
            request=request,
            username=username,
            password=password,
        )

        if user is None:
            return Response(
                {
                    "detail": (
                        self.invalid_credentials_message
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        remember_me = _coerce_boolean(
            request.data.get(
                "remember_me",
                False,
            )
        )

        if user_needs_mfa_setup(
            user
        ):
            return _challenge_response(
                user,
                purpose="setup",
                web_session=web_session,
                remember_me=remember_me,
            )

        if user_requires_mfa(
            user
        ):
            return _challenge_response(
                user,
                purpose="verify",
                web_session=web_session,
                remember_me=remember_me,
            )

        return _issue_authenticated_session(
            user,
            web_session=web_session,
            remember_me=remember_me,
        )


class MFASetupStartView(
    APIView
):
    permission_classes = [
        AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "mfa_setup"

    def post(
        self,
        request,
    ):
        serializer = (
            MFASetupStartSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            challenge = resolve_challenge(
                serializer.validated_data[
                    "challenge_token"
                ],
                expected_purpose="setup",
            )
        except MFAChallengeError as exc:
            return Response(
                {
                    "detail": str(
                        exc
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            challenge.web_session
            and not is_trusted_frontend_origin(
                request
            )
        ):
            return Response(
                {
                    "detail": (
                        "This browser origin is not "
                        "allowed to configure MFA."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = challenge.user
        profile = user.profile

        if profile.mfa_enabled:
            return Response(
                {
                    "detail": (
                        "Multi-factor authentication "
                        "is already enabled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user_requires_mfa(
            user
        ):
            return Response(
                {
                    "detail": (
                        "Multi-factor authentication "
                        "setup is not required for this account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        secret = generate_totp_secret()

        profile.mfa_pending_secret_encrypted = (
            encrypt_secret(
                secret
            )
        )

        profile.save(
            update_fields=[
                "mfa_pending_secret_encrypted",
            ]
        )

        provisioning_uri = (
            build_provisioning_uri(
                user,
                secret,
            )
        )

        return Response(
            {
                "secret": secret,
                "provisioning_uri": (
                    provisioning_uri
                ),
                "qr_code_data_url": (
                    build_qr_code_data_url(
                        provisioning_uri
                    )
                ),
                "detail": (
                    "Scan the QR code with an authenticator "
                    "app, then enter the current six-digit code."
                ),
            },
            status=status.HTTP_200_OK,
        )


class MFASetupConfirmView(
    APIView
):
    permission_classes = [
        AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "mfa_verify"

    def post(
        self,
        request,
    ):
        serializer = (
            MFACodeVerificationSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            challenge = resolve_challenge(
                serializer.validated_data[
                    "challenge_token"
                ],
                expected_purpose="setup",
            )
        except MFAChallengeError as exc:
            return Response(
                {
                    "detail": str(
                        exc
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            challenge.web_session
            and not is_trusted_frontend_origin(
                request
            )
        ):
            return Response(
                {
                    "detail": (
                        "This browser origin is not "
                        "allowed to complete MFA setup."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = challenge.user
        profile = user.profile

        if profile.mfa_enabled:
            return Response(
                {
                    "detail": (
                        "Multi-factor authentication "
                        "is already enabled."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            secret = decrypt_secret(
                profile.mfa_pending_secret_encrypted
            )
        except MFASecretError:
            return Response(
                {
                    "detail": (
                        "MFA setup has not been started "
                        "or the setup data is no longer valid."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        matched_counter = (
            match_totp_counter(
                secret,
                serializer.validated_data[
                    "code"
                ],
                last_used_counter=None,
            )
        )

        if matched_counter is None:
            return Response(
                {
                    "detail": (
                        "The authenticator code is invalid "
                        "or has expired."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        recovery_codes = (
            generate_recovery_codes()
        )

        profile.mfa_enabled = True
        profile.mfa_secret_encrypted = (
            profile.mfa_pending_secret_encrypted
        )
        profile.mfa_pending_secret_encrypted = ""
        profile.mfa_last_used_counter = (
            matched_counter
        )
        profile.mfa_recovery_code_hashes = (
            hash_recovery_codes(
                recovery_codes
            )
        )
        profile.mfa_enrolled_at = (
            timezone.now()
        )
        profile.mfa_challenge_nonce = ""

        profile.save(
            update_fields=[
                "mfa_enabled",
                "mfa_secret_encrypted",
                "mfa_pending_secret_encrypted",
                "mfa_last_used_counter",
                "mfa_recovery_code_hashes",
                "mfa_enrolled_at",
                "mfa_challenge_nonce",
            ]
        )

        return _issue_authenticated_session(
            user,
            web_session=(
                challenge.web_session
            ),
            remember_me=(
                challenge.remember_me
            ),
            extra_data={
                "mfa_setup_complete": True,
                "recovery_codes": (
                    recovery_codes
                ),
                "detail": (
                    "Multi-factor authentication "
                    "was enabled successfully."
                ),
            },
        )


class MFAVerifyView(
    APIView
):
    permission_classes = [
        AllowAny,
    ]
    authentication_classes = []
    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "mfa_verify"

    def post(
        self,
        request,
    ):
        serializer = (
            MFACodeVerificationSerializer(
                data=request.data,
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        try:
            challenge = resolve_challenge(
                serializer.validated_data[
                    "challenge_token"
                ],
                expected_purpose="verify",
            )
        except MFAChallengeError as exc:
            return Response(
                {
                    "detail": str(
                        exc
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            challenge.web_session
            and not is_trusted_frontend_origin(
                request
            )
        ):
            return Response(
                {
                    "detail": (
                        "This browser origin is not "
                        "allowed to verify MFA."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        user = challenge.user
        profile = user.profile

        if (
            not profile.mfa_enabled
            or not profile.mfa_secret_encrypted
        ):
            return Response(
                {
                    "detail": (
                        "Multi-factor authentication "
                        "is not configured for this account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        supplied_code = (
            serializer.validated_data[
                "code"
            ]
        )

        try:
            secret = decrypt_secret(
                profile.mfa_secret_encrypted
            )
        except MFASecretError:
            return Response(
                {
                    "detail": (
                        "The MFA configuration could not "
                        "be verified. Contact an administrator."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        matched_counter = (
            match_totp_counter(
                secret,
                supplied_code,
                last_used_counter=(
                    profile.mfa_last_used_counter
                ),
            )
        )

        used_recovery_code = False

        if matched_counter is None:
            used_recovery_code = (
                consume_recovery_code(
                    profile,
                    supplied_code,
                )
            )

            if not used_recovery_code:
                return Response(
                    {
                        "detail": (
                            "The authenticator or recovery "
                            "code is invalid or has expired."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            profile.mfa_last_used_counter = (
                matched_counter
            )

            profile.save(
                update_fields=[
                    "mfa_last_used_counter",
                ]
            )

        clear_challenge(
            user
        )

        return _issue_authenticated_session(
            user,
            web_session=(
                challenge.web_session
            ),
            remember_me=(
                challenge.remember_me
            ),
            extra_data={
                "mfa_verified": True,
                "used_recovery_code": (
                    used_recovery_code
                ),
            },
        )


class CookieAwareTokenRefreshView(
    TokenRefreshView
):
    """
    Refresh endpoint supporting both clients:

    Web:
      - refresh JWT comes from an HttpOnly cookie;
      - only the access JWT is returned to JavaScript.

    Mobile / non-browser:
      - standard SimpleJWT request-body refresh remains supported.
    """

    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "token_refresh"

    def post(
        self,
        request,
        *args,
        **kwargs,
    ):
        cookie_refresh = (
            request.COOKIES.get(
                settings.AUTH_REFRESH_COOKIE_NAME,
            )
        )

        if not cookie_refresh:
            return super().post(
                request,
                *args,
                **kwargs,
            )

        if not is_trusted_frontend_origin(
            request,
        ):
            response = Response(
                {
                    "detail": (
                        "This browser origin is not "
                        "allowed to refresh the session."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

            clear_web_auth_cookies(
                response,
            )

            return response

        serializer = self.get_serializer(
            data={
                "refresh": cookie_refresh,
            },
        )

        try:
            serializer.is_valid(
                raise_exception=True,
            )
        except (
            TokenError,
            InvalidToken,
        ):
            response = Response(
                {
                    "detail": (
                        "The refresh session is invalid "
                        "or has expired."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

            clear_web_auth_cookies(
                response,
            )

            return response

        response_data = dict(
            serializer.validated_data
        )

        rotated_refresh = (
            response_data.pop(
                "refresh",
                None,
            )
        )

        response = Response(
            response_data,
            status=status.HTTP_200_OK,
        )

        if rotated_refresh:
            remember_me = (
                request.COOKIES.get(
                    settings.AUTH_REMEMBER_COOKIE_NAME,
                    "0",
                )
                == "1"
            )

            set_web_auth_cookies(
                response,
                str(rotated_refresh),
                remember_me,
            )

        return response
