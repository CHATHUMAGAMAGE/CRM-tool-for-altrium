from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        self.password = "TestPassword@2026"

        self.user = User.objects.create_user(
            username="test_admin",
            email="test@example.com",
            password=self.password,
        )

        self.user.profile.role = UserProfile.Role.ADMIN
        self.user.profile.save()

    def login(self, username=None, password=None):
        return self.client.post(
            reverse("login"),
            {
                "username": username or self.user.username,
                "password": password or self.password,
            },
        )

    def test_profile_is_created_automatically(self):
        user = User.objects.create_user(
            username="sales_test",
            password="TestPassword@2026",
        )

        self.assertEqual(
            user.profile.role,
            UserProfile.Role.SALES_REP,
        )

    def test_all_approved_roles_are_available(self):
        expected_roles = {
            "ADMIN",
            "MARKETING",
            "SALES_REP",
            "SALES_MANAGER",
            "PROJECT_MANAGER",
            "SOFTWARE_ENGINEER",
            "DIRECTOR",
        }

        actual_roles = {
            role_value
            for role_value, _ in UserProfile.Role.choices
        }

        self.assertEqual(actual_roles, expected_roles)

    def test_role_display_labels_are_correct(self):
        role_labels = dict(UserProfile.Role.choices)

        self.assertEqual(
            role_labels["SALES_MANAGER"],
            "Sales Manager",
        )
        self.assertEqual(
            role_labels["DIRECTOR"],
            "Director",
        )

    def test_login_returns_access_and_refresh_tokens(self):
        response = self.login()

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_invalid_credentials_are_rejected(self):
        response = self.login(password="IncorrectPassword@2026")

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_inactive_user_cannot_log_in(self):
        self.user.is_active = False
        self.user.save()

        response = self.login()

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_current_user_requires_authentication(self):
        response = self.client.get(reverse("current-user"))

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_current_user_returns_user_details_and_role(self):
        login_response = self.login()
        access_token = login_response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        response = self.client.get(reverse("current-user"))

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["username"],
            "test_admin",
        )
        self.assertEqual(
            response.data["email"],
            "test@example.com",
        )
        self.assertEqual(
            response.data["role"],
            "ADMIN",
        )
        self.assertEqual(
            response.data["role_display"],
            "Administrator",
        )

    def test_each_role_is_returned_through_current_user_endpoint(self):
        login_response = self.login()
        access_token = login_response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        for role_value, role_label in UserProfile.Role.choices:
            with self.subTest(role=role_value):
                self.user.profile.role = role_value
                self.user.profile.save()

                response = self.client.get(
                    reverse("current-user"),
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_200_OK,
                )
                self.assertEqual(
                    response.data["role"],
                    role_value,
                )
                self.assertEqual(
                    response.data["role_display"],
                    role_label,
                )

    def test_refresh_token_returns_new_access_token(self):
        login_response = self.login()

        response = self.client.post(
            reverse("refresh"),
            {
                "refresh": login_response.data["refresh"],
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn("access", response.data)