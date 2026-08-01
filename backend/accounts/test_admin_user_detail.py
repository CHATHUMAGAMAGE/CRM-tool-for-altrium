from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class AdminUserDetailTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="detail_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.employee = User.objects.create_user(
            username="detail_employee",
            email="employee@altrium.lk",
            first_name="Nuwan",
            last_name="Perera",
            password="TestPassword@2026",
        )
        self.employee.profile.role = UserProfile.Role.SALES_REP
        self.employee.profile.phone_number = "0771234567"
        self.employee.profile.save()

        self.url = reverse(
            "admin-user-detail",
            kwargs={"pk": self.employee.pk},
        )

    def test_admin_can_view_user_details(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["username"],
            "detail_employee",
        )
        self.assertEqual(
            response.data["role"],
            UserProfile.Role.SALES_REP,
        )
        self.assertEqual(
            response.data["phone_number"],
            "0771234567",
        )

    def test_password_is_not_exposed(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertNotIn("password", response.data)

    def test_non_admin_user_is_forbidden(self):
        self.client.force_authenticate(user=self.employee)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_user_is_unauthorized(self):
        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_missing_user_returns_not_found(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(
            reverse(
                "admin-user-detail",
                kwargs={"pk": 999999},
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )
