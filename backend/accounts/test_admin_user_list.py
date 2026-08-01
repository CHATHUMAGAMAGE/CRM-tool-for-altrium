from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class AdminUserListTests(APITestCase):
    def setUp(self):
        self.url = reverse("admin-user-list")

        self.admin = User.objects.create_user(
            username="list_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.sales_rep = User.objects.create_user(
            username="nuwan.sales",
            email="nuwan@altrium.lk",
            first_name="Nuwan",
            last_name="Perera",
            password="TestPassword@2026",
        )
        self.sales_rep.profile.role = UserProfile.Role.SALES_REP
        self.sales_rep.profile.phone_number = "0771234567"
        self.sales_rep.profile.save()

        self.marketing_user = User.objects.create_user(
            username="marketing.employee",
            email="marketing@altrium.lk",
            password="TestPassword@2026",
            is_active=False,
        )
        self.marketing_user.profile.role = UserProfile.Role.MARKETING
        self.marketing_user.profile.save()

    def authenticate_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_admin_can_list_users(self):
        self.authenticate_admin()

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(response.data), 3)

    def test_non_admin_user_is_forbidden(self):
        self.client.force_authenticate(user=self.sales_rep)

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

    def test_user_response_never_contains_password(self):
        self.authenticate_admin()

        response = self.client.get(self.url)

        for user_data in response.data:
            self.assertNotIn("password", user_data)

    def test_users_can_be_searched(self):
        self.authenticate_admin()

        response = self.client.get(
            self.url,
            {"search": "Nuwan"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["username"],
            "nuwan.sales",
        )

    def test_users_can_be_filtered_by_role(self):
        self.authenticate_admin()

        response = self.client.get(
            self.url,
            {"role": UserProfile.Role.MARKETING},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["role"],
            UserProfile.Role.MARKETING,
        )

    def test_users_can_be_filtered_by_status(self):
        self.authenticate_admin()

        response = self.client.get(
            self.url,
            {"status": "inactive"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertFalse(response.data[0]["is_active"])

    def test_invalid_role_returns_empty_list(self):
        self.authenticate_admin()

        response = self.client.get(
            self.url,
            {"role": "INVALID_ROLE"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, [])
