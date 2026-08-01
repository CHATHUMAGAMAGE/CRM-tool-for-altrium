from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .email_service import PasswordResetEmailError
from .models import UserProfile


class AdminPasswordResetEmailTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="reset_email_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.employee = User.objects.create_user(
            username="reset_email_employee",
            email="employee@altrium.lk",
            first_name="Nuwan",
            password="TestPassword@2026",
        )

        self.url = reverse(
            "admin-user-password-reset-email",
            kwargs={"pk": self.employee.pk},
        )

    @patch("accounts.views.send_password_reset_email")
    def test_admin_can_send_password_reset_email(
        self,
        mock_send_email,
    ):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        mock_send_email.assert_called_once()

        call_arguments = mock_send_email.call_args.kwargs

        self.assertEqual(
            call_arguments["recipient_email"],
            self.employee.email,
        )
        self.assertIn(
            "/reset-password?uid=",
            call_arguments["reset_url"],
        )

    def test_non_admin_user_is_forbidden(self):
        self.client.force_authenticate(user=self.employee)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_user_is_unauthorized(self):
        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_inactive_user_is_rejected(self):
        self.employee.is_active = False
        self.employee.save(update_fields=["is_active"])

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_without_email_is_rejected(self):
        self.employee.email = ""
        self.employee.save(update_fields=["email"])

        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    @patch(
        "accounts.views.send_password_reset_email",
        side_effect=PasswordResetEmailError(
            "Email delivery failed."
        ),
    )
    def test_email_delivery_failure_returns_service_unavailable(
        self,
        mock_send_email,
    ):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
        mock_send_email.assert_called_once()

    def test_missing_user_returns_not_found(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            reverse(
                "admin-user-password-reset-email",
                kwargs={"pk": 999999},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
