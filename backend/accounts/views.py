import logging

from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils.encoding import force_bytes
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView, UpdateAPIView
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
from .models import UserProfile
from .permissions import IsAdminRole
from .serializers import (
    AdminDashboardSummarySerializer,
    AdminUserCreateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
    CurrentUserSerializer,
    ForgotPasswordSerializer,
    LogoutSerializer,
    ResetPasswordSerializer,
)


logger = logging.getLogger(__name__)


class CurrentUserView(RetrieveAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    invalid_token_message = (
        "The supplied refresh token is invalid."
    )

    def post(self, request):
        serializer = LogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = RefreshToken(
                serializer.validated_data["refresh"],
            )
        except TokenError:
            return Response(
                {"detail": self.invalid_token_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        token_user_id = refresh_token.get(
            api_settings.USER_ID_CLAIM,
        )

        authenticated_user_id = getattr(
            request.user,
            api_settings.USER_ID_FIELD,
        )

        if str(token_user_id) != str(authenticated_user_id):
            return Response(
                {"detail": self.invalid_token_message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh_token.blacklist()

        return Response(
            {
                "detail": (
                    "You have been logged out successfully."
                )
            },
            status=status.HTTP_200_OK,
        )


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
            for outstanding_token in OutstandingToken.objects.filter(
                user=user,
            ):
                BlacklistedToken.objects.get_or_create(
                    token=outstanding_token,
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
