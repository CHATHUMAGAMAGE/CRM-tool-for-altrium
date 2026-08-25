import logging
import mimetypes

from django.conf import settings
from django.core import signing
from django.http import Http404, HttpResponse
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Count, Q
from django.db.models.deletion import ProtectedError
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from rest_framework import status
from rest_framework.generics import (
    ListAPIView,
    RetrieveAPIView,
    UpdateAPIView,
)
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.settings import api_settings
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .email_service import (
    PasswordResetEmailError,
    send_password_reset_email,
)
from .authentication import (
    clear_web_auth_cookies,
    is_trusted_frontend_origin,
)
from .models import UserProfile
from .permissions import IsAdminRole
from .serializers import (
    AdminDashboardSummarySerializer,
    AdminUserCreateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    CurrentUserProfileUpdateSerializer,
    CurrentUserSerializer,
    ForgotPasswordSerializer,
    LogoutSerializer,
    ResetPasswordSerializer,
    SalesRepLookupSerializer,
)


logger = logging.getLogger(__name__)


class CurrentUserView(RetrieveAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CurrentUserProfileUpdateView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [
        MultiPartParser,
        FormParser,
        JSONParser,
    ]

    def patch(self, request):
        serializer = (
            CurrentUserProfileUpdateSerializer(
                request.user,
                data=request.data,
                partial=True,
                context={
                    "request": request,
                },
            )
        )

        serializer.is_valid(
            raise_exception=True
        )

        user = serializer.save()

        return Response(
            CurrentUserSerializer(
                user,
                context={
                    "request": request,
                },
            ).data,
            status=status.HTTP_200_OK,
        )


class ProfileAvatarView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    signing_salt = (
        "eleven-crm-profile-avatar-v1"
    )

    def get(
        self,
        request,
        token,
    ):
        try:
            payload = signing.loads(
                token,
                salt=self.signing_salt,
                max_age=(
                    60 * 60 * 24 * 30
                ),
            )
        except (
            signing.BadSignature,
            signing.SignatureExpired,
        ) as exc:
            raise Http404(
                "Profile picture not found."
            ) from exc

        user = get_object_or_404(
            User.objects.select_related(
                "profile"
            ),
            pk=payload.get(
                "user_id"
            ),
        )

        profile = user.profile

        if (
            not profile.avatar_data
            or profile.avatar_name
            != payload.get(
                "avatar_name"
            )
        ):
            raise Http404(
                "Profile picture not found."
            )

        content_type = (
            profile.avatar_content_type
            or mimetypes.guess_type(
                profile.avatar_name
            )[0]
            or "application/octet-stream"
        )

        response = HttpResponse(
            bytes(profile.avatar_data),
            content_type=content_type,
        )

        response[
            "Content-Disposition"
        ] = "inline"

        response[
            "X-Content-Type-Options"
        ] = "nosniff"

        return response


class LogoutView(APIView):
    """
    Supports both authentication clients.

    Web:
      - reads the refresh token only from the HttpOnly cookie;
      - blacklists it and clears the cookie.

    Mobile / non-browser:
      - preserves the existing authenticated body-token logout flow.
    """

    permission_classes = [AllowAny]

    invalid_token_message = (
        "The supplied refresh token is invalid."
    )

    def _successful_response(self):
        response = Response(
            {
                "detail": (
                    "You have been logged out successfully."
                )
            },
            status=status.HTTP_200_OK,
        )

        clear_web_auth_cookies(
            response,
        )

        return response

    def post(self, request):
        cookie_refresh = (
            request.COOKIES.get(
                settings.AUTH_REFRESH_COOKIE_NAME,
            )
        )

        if cookie_refresh:
            if not is_trusted_frontend_origin(
                request,
            ):
                return Response(
                    {
                        "detail": (
                            "This browser origin is not "
                            "allowed to end the session."
                        )
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            try:
                RefreshToken(
                    cookie_refresh,
                ).blacklist()
            except TokenError:
                # Logout is deliberately idempotent for browser sessions:
                # an expired/invalid cookie is still removed locally.
                pass

            return self._successful_response()

        body_refresh = request.data.get(
            "refresh",
            "",
        )

        if not body_refresh:
            return self._successful_response()

        if not request.user.is_authenticated:
            return Response(
                {
                    "detail": (
                        "Authentication credentials "
                        "were not provided."
                    )
                },
                status=status.HTTP_401_UNAUTHORIZED,
            )

        serializer = LogoutSerializer(
            data=request.data,
        )
        serializer.is_valid(
            raise_exception=True,
        )

        try:
            refresh_token = RefreshToken(
                serializer.validated_data[
                    "refresh"
                ],
            )
        except TokenError:
            return Response(
                {
                    "detail": (
                        self.invalid_token_message
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_user_id = refresh_token.get(
            api_settings.USER_ID_CLAIM,
        )

        authenticated_user_id = getattr(
            request.user,
            api_settings.USER_ID_FIELD,
        )

        if (
            str(token_user_id)
            != str(authenticated_user_id)
        ):
            return Response(
                {
                    "detail": (
                        self.invalid_token_message
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh_token.blacklist()

        return self._successful_response()


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    response_message = (
        "If an account exists for that email address, "
        "a password reset link has been sent."
    )

    def post(self, request):
        serializer = ForgotPasswordSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users.iterator():
            uid = urlsafe_base64_encode(
                force_bytes(user.pk),
            )
            token = default_token_generator.make_token(user)

            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/reset-password?uid={uid}&token={token}"
            )

            try:
                send_password_reset_email(
                    recipient_email=user.email,
                    recipient_name=(
                        user.first_name or user.username
                    ),
                    reset_url=reset_url,
                )
            except PasswordResetEmailError:
                logger.exception(
                    "Password-reset email delivery failed "
                    "for user_id=%s.",
                    user.pk,
                )

        return Response(
            {"detail": self.response_message},
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "password_reset"

    invalid_link_message = (
        "This password reset link is invalid or has expired."
    )

    def post(self, request):
        uid = request.data.get("uid", "")
        token = request.data.get("token", "")

        try:
            user_id = urlsafe_base64_decode(uid).decode()

            user = User.objects.get(
                pk=user_id,
                is_active=True,
            )
        except (
            TypeError,
            ValueError,
            OverflowError,
            UnicodeDecodeError,
            User.DoesNotExist,
        ):
            return Response(
                {"detail": self.invalid_link_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(
            user,
            token,
        ):
            return Response(
                {"detail": self.invalid_link_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ResetPasswordSerializer(
            data=request.data,
            context={"user": user},
        )
        serializer.is_valid(raise_exception=True)

        user.set_password(
            serializer.validated_data["new_password"],
        )
        user.save(update_fields=["password"])

        profile = getattr(
            user,
            "profile",
            None,
        )

        if profile is not None:
            profile.mfa_challenge_nonce = ""
            profile.mfa_pending_secret_encrypted = ""

            profile.save(
                update_fields=[
                    "mfa_challenge_nonce",
                    "mfa_pending_secret_encrypted",
                ]
            )

        for outstanding_token in OutstandingToken.objects.filter(
            user=user,
        ):
            BlacklistedToken.objects.get_or_create(
                token=outstanding_token,
            )

        return Response(
            {
                "detail": (
                    "Your password has been reset successfully. "
                    "Please log in using your new password."
                )
            },
            status=status.HTTP_200_OK,
        )


class AdminDashboardSummaryView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request):
        user_counts = User.objects.aggregate(
            total_users=Count("id"),
            active_users=Count(
                "id",
                filter=Q(is_active=True),
            ),
            inactive_users=Count(
                "id",
                filter=Q(is_active=False),
            ),
        )

        role_counts = {
            role_value: UserProfile.objects.filter(
                role=role_value,
            ).count()
            for role_value, _ in UserProfile.Role.choices
        }

        serializer = AdminDashboardSummarySerializer(
            {
                **user_counts,
                "role_counts": role_counts,
            }
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK,
        )

class SalesRepLookupView(ListAPIView):
    serializer_class = SalesRepLookupSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, "profile", None)

        if profile is None:
            return User.objects.none()

        if profile.role not in {
            UserProfile.Role.ADMIN,
            UserProfile.Role.SALES_MANAGER,
            UserProfile.Role.PROJECT_MANAGER,
        }:
            return User.objects.none()

        return User.objects.select_related(
            "profile",
        ).filter(
            is_active=True,
            profile__role=UserProfile.Role.SALES_REP,
        ).order_by(
            "first_name",
            "last_name",
            "username",
        )

class AdminUserListView(ListAPIView):
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get_queryset(self):
        queryset = User.objects.select_related(
            "profile",
        ).order_by("-date_joined")

        search = self.request.query_params.get(
            "search",
            "",
        ).strip()

        role = self.request.query_params.get(
            "role",
            "",
        ).strip()

        status_filter = self.request.query_params.get(
            "status",
            "",
        ).strip().lower()

        if search:
            queryset = queryset.filter(
                Q(username__icontains=search)
                | Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
            )

        approved_roles = {
            role_value
            for role_value, _ in UserProfile.Role.choices
        }

        if role:
            if role not in approved_roles:
                return queryset.none()

            queryset = queryset.filter(
                profile__role=role,
            )

        if status_filter == "active":
            queryset = queryset.filter(
                is_active=True,
            )
        elif status_filter == "inactive":
            queryset = queryset.filter(
                is_active=False,
            )

        return queryset


class AdminUserDetailView(RetrieveAPIView):
    serializer_class = AdminUserListSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = User.objects.select_related("profile")


class AdminUserCreateView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request):
        serializer = AdminUserCreateSerializer(
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        uid = urlsafe_base64_encode(
            force_bytes(user.pk),
        )
        token = default_token_generator.make_token(user)

        setup_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}"
            f"/reset-password?uid={uid}&token={token}"
        )

        try:
            send_password_reset_email(
                recipient_email=user.email,
                recipient_name=(
                    user.first_name or user.username
                ),
                reset_url=setup_url,
            )
        except PasswordResetEmailError:
            logger.exception(
                "Employee password-setup email delivery failed "
                "for user_id=%s.",
                user.pk,
            )

            user.delete()

            return Response(
                {
                    "detail": (
                        "The employee account could not be created "
                        "because the password setup email failed."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response_serializer = AdminUserListSerializer(user)

        return Response(
            {
                "detail": (
                    "Employee account created successfully. "
                    "A password setup email has been sent."
                ),
                "user": response_serializer.data,
            },
            status=status.HTTP_201_CREATED,
        )


class AdminUserUpdateView(UpdateAPIView):
    serializer_class = AdminUserUpdateSerializer
    permission_classes = [IsAuthenticated, IsAdminRole]
    queryset = User.objects.select_related("profile")
    http_method_names = ["patch"]

    def perform_update(self, serializer):
        user = serializer.save()

        if not user.is_active:
            user.profile.mfa_challenge_nonce = ""
            user.profile.mfa_pending_secret_encrypted = ""

            user.profile.save(
                update_fields=[
                    "mfa_challenge_nonce",
                    "mfa_pending_secret_encrypted",
                ]
            )

            for outstanding_token in OutstandingToken.objects.filter(
                user=user,
            ):
                BlacklistedToken.objects.get_or_create(
                    token=outstanding_token,
                )


class AdminUserDeleteView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def delete(self, request, pk):
        user = get_object_or_404(
            User.objects.select_related("profile"),
            pk=pk,
        )

        if user.pk == request.user.pk:
            return Response(
                {
                    "detail": (
                        "You cannot delete your own account."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            user.profile.role == UserProfile.Role.ADMIN
            and user.is_active
        ):
            active_admin_count = User.objects.filter(
                profile__role=UserProfile.Role.ADMIN,
                is_active=True,
            ).count()

            if active_admin_count <= 1:
                return Response(
                    {
                        "detail": (
                            "The final active administrator "
                            "cannot be deleted."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        username = user.username

        try:
            user.delete()
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "This user cannot be deleted because "
                        "they are connected to existing CRM records. "
                        "Deactivate the account instead."
                    )
                },
                status=status.HTTP_409_CONFLICT,
            )

        return Response(
            {
                "detail": (
                    f'User "{username}" was deleted successfully.'
                )
            },
            status=status.HTTP_200_OK,
        )


class AdminUserPasswordResetEmailView(APIView):
    permission_classes = [IsAuthenticated, IsAdminRole]

    def post(self, request, pk):
        user = get_object_or_404(
            User.objects.select_related("profile"),
            pk=pk,
        )

        if not user.is_active:
            return Response(
                {
                    "detail": (
                        "The user must be active before a password "
                        "setup or reset email can be sent."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not user.email:
            return Response(
                {
                    "detail": (
                        "This user does not have an email address."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        uid = urlsafe_base64_encode(
            force_bytes(user.pk),
        )
        token = default_token_generator.make_token(user)

        reset_url = (
            f"{settings.FRONTEND_URL.rstrip('/')}"
            f"/reset-password?uid={uid}&token={token}"
        )

        try:
            send_password_reset_email(
                recipient_email=user.email,
                recipient_name=(
                    user.first_name or user.username
                ),
                reset_url=reset_url,
            )
        except PasswordResetEmailError:
            logger.exception(
                "Admin-triggered password email delivery failed "
                "for user_id=%s.",
                user.pk,
            )

            return Response(
                {
                    "detail": (
                        "The password setup or reset email "
                        "could not be delivered."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(
            {
                "detail": (
                    "Password setup or reset email sent successfully."
                )
            },
            status=status.HTTP_200_OK,
        )
