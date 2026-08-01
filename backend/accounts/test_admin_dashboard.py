from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class AdminDashboardSummaryTests(APITestCase):
    def setUp(self):
        self.url = reverse("admin-dashboard-summary")

        self.admin = User.objects.create_user(
            username="dashboard_admin",
            email="admin@altrium.lk",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.sales_rep = User.objects.create_user(
            username="dashboard_sales_rep",
            email="sales@altrium.lk",
            password="TestPassword@2026",
        )

        self.inactive_user = User.objects.create_user(
            username="inactive_employee",
            email="inactive@altrium.lk",
            password="TestPassword@2026",
            is_active=False,
        )
        self.inactive_user.profile.role = UserProfile.Role.MARKETING
        self.inactive_user.profile.save()

    def test_admin_can_view_dashboard_summary(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(response.data["total_users"], 3)
        self.assertEqual(response.data["active_users"], 2)
        self.assertEqual(response.data["inactive_users"], 1)
        self.assertEqual(
            response.data["role_counts"]["ADMIN"],
            1,
        )
        self.assertEqual(
            response.data["role_counts"]["SALES_REP"],
            1,
        )
        self.assertEqual(
            response.data["role_counts"]["MARKETING"],
            1,
        )

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

    def test_response_contains_every_approved_role(self):
        self.client.force_authenticate(user=self.admin)

        response = self.client.get(self.url)

        expected_roles = {
            role_value
            for role_value, _ in UserProfile.Role.choices
        }

        self.assertEqual(
            set(response.data["role_counts"].keys()),
            expected_roles,
        )
