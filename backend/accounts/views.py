from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes
from django.utils.http import (
    urlsafe_base64_decode,
    urlsafe_base64_encode,
)
from rest_framework import status
from rest_framework.generics import RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)

from .serializers import (
    CurrentUserSerializer,
    ForgotPasswordSerializer,
    ResetPasswordSerializer,
)


class CurrentUserView(RetrieveAPIView):
    serializer_class = CurrentUserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


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
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        users = User.objects.filter(
            email__iexact=email,
            is_active=True,
        )

        for user in users.iterator():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)

            reset_url = (
                f"{settings.FRONTEND_URL.rstrip('/')}"
                f"/reset-password?uid={uid}&token={token}"
            )

            message = (
                f"Hello {user.first_name or user.username},\n\n"
                "A password reset was requested for your "
                "ELEVEN CRM account.\n\n"
                f"Reset your password using this link:\n{reset_url}\n\n"
                "This link expires after one hour and becomes unusable "
                "after your password is changed.\n\n"
                "If you did not request this reset, you can ignore "
                "this email."
            )

            send_mail(
                subject="Reset your ELEVEN CRM password",
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
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
            user = User.objects.get(pk=user_id, is_active=True)
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

        if not default_token_generator.check_token(user, token):
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