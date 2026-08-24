from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile
from django.core import mail
from django.test import override_settings
from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.cache import cache


class AuthenticationAPITests(APITestCase):
    def setUp(self):
        cache.clear()

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
            "TECH_LEAD",
            "FINANCIAL_OFFICER",
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



    def test_login_is_rate_limited_after_ten_rapid_attempts(self):
        for _ in range(10):
            response = self.login(
                password="IncorrectPassword@2026",
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_401_UNAUTHORIZED,
            )

        blocked_response = self.login(
            password="IncorrectPassword@2026",
        )

        self.assertEqual(
            blocked_response.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    def test_login_response_disables_http_caching(self):
        response = self.login()

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "no-store",
            response.headers.get(
                "Cache-Control",
                "",
            ),
        )

        self.assertEqual(
            response.headers.get("Pragma"),
            "no-cache",
        )

        self.assertEqual(
            response.headers.get("Expires"),
            "0",
        )

    def test_authenticated_api_response_disables_http_caching(self):
        login_response = self.login()
        access_token = login_response.data["access"]

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access_token}",
        )

        response = self.client.get(
            reverse("current-user"),
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        cache_control = response.headers.get(
            "Cache-Control",
            "",
        )

        self.assertIn(
            "no-store",
            cache_control,
        )

        self.assertIn(
            "private",
            cache_control,
        )

        self.assertEqual(
            response.headers.get("Pragma"),
            "no-cache",
        )

        self.assertEqual(
            response.headers.get("Expires"),
            "0",
        )


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    FRONTEND_URL="http://localhost:5173",
)
class ForgotPasswordAPITests(APITestCase):
    def setUp(self):
        cache.clear()

        self.user = User.objects.create_user(
            username="password_user",
            email="employee@altrium.lk",
            password="ExistingPassword@2026",
            first_name="Nuwan",
        )

        self.url = reverse("forgot-password")

    def test_known_email_returns_generic_response_and_sends_email(self):
        response = self.client.post(
            self.url,
            {"email": self.user.email},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["detail"],
            (
                "If an account exists for that email address, "
                "a password reset link has been sent."
            ),
        )

        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(
            mail.outbox[0].to,
            [self.user.email],
        )
        self.assertIn(
            "/reset-password?uid=",
            mail.outbox[0].body,
        )
        self.assertIn(
            "&token=",
            mail.outbox[0].body,
        )

    def test_unknown_email_returns_same_generic_response(self):
        response = self.client.post(
            self.url,
            {"email": "unknown@altrium.lk"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["detail"],
            (
                "If an account exists for that email address, "
                "a password reset link has been sent."
            ),
        )

        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_user_does_not_receive_reset_email(self):
        self.user.is_active = False
        self.user.save()

        response = self.client.post(
            self.url,
            {"email": self.user.email},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_email_format_is_rejected(self):
        response = self.client.post(
            self.url,
            {"email": "not-an-email"},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class ResetPasswordAPITests(APITestCase):
    def setUp(self):
        cache.clear()

        self.old_password = "ExistingPassword@2026"
        self.new_password = "DifferentSecurePassword@2026"

        self.user = User.objects.create_user(
            username="reset_user",
            email="reset@altrium.lk",
            password=self.old_password,
        )

        self.url = reverse("reset-password")

    def get_reset_credentials(self):
        return {
            "uid": urlsafe_base64_encode(force_bytes(self.user.pk)),
            "token": default_token_generator.make_token(self.user),
        }

    def test_valid_token_resets_password(self):
        credentials = self.get_reset_credentials()

        response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.user.refresh_from_db()

        self.assertTrue(
            self.user.check_password(self.new_password),
        )
        self.assertFalse(
            self.user.check_password(self.old_password),
        )

    def test_user_can_log_in_with_new_password(self):
        credentials = self.get_reset_credentials()

        self.client.post(
            self.url,
            {
                **credentials,
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.new_password,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)

    def test_password_confirmation_must_match(self):
        credentials = self.get_reset_credentials()

        response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": self.new_password,
                "confirm_password": "AnotherPassword@2026",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_weak_password_is_rejected(self):
        credentials = self.get_reset_credentials()

        response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": "123",
                "confirm_password": "123",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.user.refresh_from_db()
        self.assertTrue(
            self.user.check_password(self.old_password),
        )

    def test_invalid_token_is_rejected(self):
        credentials = self.get_reset_credentials()

        response = self.client.post(
            self.url,
            {
                "uid": credentials["uid"],
                "token": "invalid-token",
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_invalid_user_id_is_rejected(self):
        response = self.client.post(
            self.url,
            {
                "uid": "invalid-user",
                "token": "invalid-token",
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_reset_token_cannot_be_reused(self):
        credentials = self.get_reset_credentials()

        first_response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        second_response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": "ThirdSecurePassword@2026",
                "confirm_password": "ThirdSecurePassword@2026",
            },
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    @override_settings(PASSWORD_RESET_TIMEOUT=1)
    def test_expired_token_is_rejected(self):
        issued_at = datetime.now()

        with patch.object(
            default_token_generator,
            "_now",
            return_value=issued_at,
        ):
            credentials = self.get_reset_credentials()

        with patch.object(
            default_token_generator,
            "_now",
            return_value=issued_at + timedelta(seconds=2),
        ):
            response = self.client.post(
                self.url,
                {
                    **credentials,
                    "new_password": self.new_password,
                    "confirm_password": self.new_password,
                },
            )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_existing_refresh_token_is_invalidated(self):
        login_response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.old_password,
            },
        )

        old_refresh_token = login_response.data["refresh"]
        credentials = self.get_reset_credentials()

        reset_response = self.client.post(
            self.url,
            {
                **credentials,
                "new_password": self.new_password,
                "confirm_password": self.new_password,
            },
        )

        refresh_response = self.client.post(
            reverse("refresh"),
            {"refresh": old_refresh_token},
        )

        self.assertEqual(
            reset_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )


class LogoutAPITests(APITestCase):
    def setUp(self):
        self.password = "SecureLogoutPassword@2026"

        self.user = User.objects.create_user(
            username="logout_user",
            email="logout@altrium.lk",
            password=self.password,
        )

        self.login_response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        self.access_token = self.login_response.data["access"]
        self.refresh_token = self.login_response.data["refresh"]
        self.logout_url = reverse("logout")

    def authenticate(self):
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {self.access_token}",
        )

    def test_logout_requires_authentication(self):
        response = self.client.post(
            self.logout_url,
            {
                "refresh": self.refresh_token,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_logout_requires_refresh_token(self):
        self.authenticate()

        response = self.client.post(
            self.logout_url,
            {},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_valid_logout_succeeds(self):
        self.authenticate()

        response = self.client.post(
            self.logout_url,
            {
                "refresh": self.refresh_token,
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["detail"],
            "You have been logged out successfully.",
        )

    def test_logged_out_refresh_token_cannot_be_reused(self):
        self.authenticate()

        logout_response = self.client.post(
            self.logout_url,
            {
                "refresh": self.refresh_token,
            },
        )

        refresh_response = self.client.post(
            reverse("refresh"),
            {
                "refresh": self.refresh_token,
            },
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_invalid_refresh_token_is_rejected(self):
        self.authenticate()

        response = self.client.post(
            self.logout_url,
            {
                "refresh": "invalid-refresh-token",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_user_cannot_blacklist_another_users_token(self):
        second_password = "SecondUserPassword@2026"

        second_user = User.objects.create_user(
            username="second_logout_user",
            email="second@altrium.lk",
            password=second_password,
        )

        second_login = self.client.post(
            reverse("login"),
            {
                "username": second_user.username,
                "password": second_password,
            },
        )

        second_refresh_token = second_login.data["refresh"]

        self.authenticate()

        logout_response = self.client.post(
            self.logout_url,
            {
                "refresh": second_refresh_token,
            },
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.client.credentials()

        refresh_response = self.client.post(
            reverse("refresh"),
            {
                "refresh": second_refresh_token,
            },
        )

        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_200_OK,
        )

    def test_refresh_token_cannot_be_logged_out_twice(self):
        self.authenticate()

        first_response = self.client.post(
            self.logout_url,
            {
                "refresh": self.refresh_token,
            },
        )

        second_response = self.client.post(
            self.logout_url,
            {
                "refresh": self.refresh_token,
            },
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )