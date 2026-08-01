from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .email_service import PasswordResetEmailError
from .models import UserProfile


class AdminUserCreateTests(APITestCase):
    def setUp(self):
        self.url = reverse("admin-user-create")

        self.admin = User.objects.create_user(
            username="create_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.sales_rep = User.objects.create_user(
            username="create_sales_rep",
            email="sales@altrium.lk",
            password="TestPassword@2026",
        )

        self.payload = {
            "username": "new.employee",
            "email": "employee@altrium.lk",
            "first_name": "Nuwan",
            "last_name": "Perera",
            "role": UserProfile.Role.SALES_REP,
            "phone_number": "0771234567",
        }

    def authenticate_admin(self):
        self.client.force_authenticate(user=self.admin)

    @patch("accounts.views.send_password_reset_email")
    def test_admin_can_create_employee(self, mock_send_email):
        self.authenticate_admin()

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        user = User.objects.get(
            username="new.employee",
        )

        self.assertFalse(user.has_usable_password())
        self.assertEqual(
            user.profile.role,
            UserProfile.Role.SALES_REP,
        )
        self.assertEqual(
            user.profile.phone_number,
            "0771234567",
        )

        self.assertNotIn(
            "password",
            response.data["user"],
        )

        mock_send_email.assert_called_once()

    def test_non_admin_user_is_forbidden(self):
        self.client.force_authenticate(user=self.sales_rep)

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_user_is_unauthorized(self):
        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_email_is_required(self):
        self.authenticate_admin()
        payload = self.payload.copy()
        payload.pop("email")

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_duplicate_username_is_rejected(self):
        self.authenticate_admin()
        payload = self.payload.copy()
        payload["username"] = self.sales_rep.username

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_duplicate_email_is_rejected(self):
        self.authenticate_admin()
        payload = self.payload.copy()
        payload["email"] = self.sales_rep.email

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_role_is_rejected(self):
        self.authenticate_admin()
        payload = self.payload.copy()
        payload["role"] = "INVALID_ROLE"

        response = self.client.post(
            self.url,
            payload,
            format="json",
        )

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
    def test_account_is_deleted_when_email_fails(
        self,
        mock_send_email,
    ):
        self.authenticate_admin()

        response = self.client.post(
            self.url,
            self.payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )

        self.assertFalse(
            User.objects.filter(
                username="new.employee",
            ).exists()
        )

        mock_send_email.assert_called_once()
