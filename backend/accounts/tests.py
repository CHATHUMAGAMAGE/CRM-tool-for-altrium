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

    def test_profile_is_created_automatically(self):
        user = User.objects.create_user(
            username="sales_test",
            password="TestPassword@2026",
        )

        self.assertEqual(
            user.profile.role,
            UserProfile.Role.SALES_REP,
        )

    def test_login_returns_tokens(self):
        response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_current_user_requires_authentication(self):
        response = self.client.get(reverse("current-user"))

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_current_user_returns_user_details(self):
        login_response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        access_token = login_response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}"
        )

        response = self.client.get(reverse("current-user"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["username"], "test_admin")
        self.assertEqual(response.data["role"], "ADMIN")

    def test_refresh_token_returns_new_access_token(self):
        login_response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        response = self.client.post(
            reverse("refresh"),
            {"refresh": login_response.data["refresh"]},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)