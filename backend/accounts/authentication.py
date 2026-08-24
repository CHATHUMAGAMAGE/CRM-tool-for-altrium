from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.exceptions import (
    InvalidToken,
    TokenError,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
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


class ThrottledTokenObtainPairView(
    TokenObtainPairView
):
    """
    JWT login protected by the Sprint 1 login throttle.

    Web clients send web_session=True. Their refresh token is moved into
    a Secure/HttpOnly cookie and removed from the JSON response.

    Other API clients, including the existing mobile application, keep
    the normal SimpleJWT token-pair response for backward compatibility.
    """

    throttle_classes = [
        ScopedRateThrottle,
    ]
    throttle_scope = "login"

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

        response = super().post(
            request,
            *args,
            **kwargs,
        )

        if (
            response.status_code
            != status.HTTP_200_OK
            or not web_session
        ):
            return response

        refresh_token = (
            response.data.pop(
                "refresh",
                None,
            )
        )

        if not refresh_token:
            return Response(
                {
                    "detail": (
                        "The authentication service "
                        "did not issue a refresh token."
                    )
                },
                status=(
                    status.HTTP_500_INTERNAL_SERVER_ERROR
                ),
            )

        remember_me = _coerce_boolean(
            request.data.get(
                "remember_me",
                False,
            )
        )

        set_web_auth_cookies(
            response,
            str(refresh_token),
            remember_me,
        )

        return response


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

        # Rotation is intentionally disabled in this Sprint 1 batch so
        # the existing mobile refresh flow is not changed unexpectedly.
        # If SimpleJWT is configured to rotate later, handle it safely.
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
