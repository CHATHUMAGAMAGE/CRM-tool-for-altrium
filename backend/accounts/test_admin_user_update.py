from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
)
from rest_framework_simplejwt.tokens import RefreshToken

from .models import UserProfile


class AdminUserUpdateTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="update_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.employee = User.objects.create_user(
            username="update_employee",
            email="employee@altrium.lk",
            first_name="Nuwan",
            last_name="Perera",
            password="TestPassword@2026",
        )
        self.employee.profile.role = UserProfile.Role.SALES_REP
        self.employee.profile.save()

        self.url = reverse(
            "admin-user-update",
            kwargs={"pk": self.employee.pk},
        )

    def authenticate_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_update_employee_role(self):
        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {"role": UserProfile.Role.SALES_MANAGER},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.employee.profile.refresh_from_db()

        self.assertEqual(
            self.employee.profile.role,
            UserProfile.Role.SALES_MANAGER,
        )

    def test_admin_can_update_employee_details(self):
        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {
                "first_name": "Kamal",
                "last_name": "Silva",
                "phone_number": "0712345678",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.employee.refresh_from_db()
        self.employee.profile.refresh_from_db()

        self.assertEqual(self.employee.first_name, "Kamal")
        self.assertEqual(self.employee.last_name, "Silva")
        self.assertEqual(
            self.employee.profile.phone_number,
            "0712345678",
        )

    def test_admin_can_deactivate_employee(self):
        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {"is_active": False},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.employee.refresh_from_db()
        self.assertFalse(self.employee.is_active)

    def test_admin_can_reactivate_employee(self):
        self.employee.is_active = False
        self.employee.save(update_fields=["is_active"])

        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {"is_active": True},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.employee.refresh_from_db()
        self.assertTrue(self.employee.is_active)

    def test_deactivation_blacklists_existing_refresh_tokens(self):
        refresh_token = RefreshToken.for_user(self.employee)

        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {"is_active": False},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            BlacklistedToken.objects.filter(
                token__jti=refresh_token["jti"],
            ).exists()
        )

    def test_admin_cannot_deactivate_own_account(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse(
                "admin-user-update",
                kwargs={"pk": self.admin.pk},
            ),
            {"is_active": False},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.admin.refresh_from_db()
        self.assertTrue(self.admin.is_active)

    def test_admin_cannot_remove_own_admin_role(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.patch(
            reverse(
                "admin-user-update",
                kwargs={"pk": self.admin.pk},
            ),
            {"role": UserProfile.Role.SALES_REP},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.admin.profile.refresh_from_db()

        self.assertEqual(
            self.admin.profile.role,
            UserProfile.Role.ADMIN,
        )

    def test_invalid_role_is_rejected(self):
        self.authenticate_admin()

        response = self.client.patch(
            self.url,
            {"role": "INVALID_ROLE"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_non_admin_user_is_forbidden(self):
        self.client.force_authenticate(user=self.employee)

        response = self.client.patch(
            self.url,
            {"first_name": "Changed"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_user_is_unauthorized(self):
        response = self.client.patch(
            self.url,
            {"first_name": "Changed"},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
