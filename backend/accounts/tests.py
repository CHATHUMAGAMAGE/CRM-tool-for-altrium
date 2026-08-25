import time

import pyotp
from django.conf import settings
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import UserProfile
from django.core import mail
from django.test import override_settings
from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.core.cache import cache


@override_settings(MFA_REQUIRED_ROLES=[])
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

    def login(
        self,
        username=None,
        password=None,
        *,
        web_session=True,
        remember_me=False,
    ):
        payload = {
            "username": username or self.user.username,
            "password": password or self.password,
        }

        if web_session:
            payload["web_session"] = True
            payload["remember_me"] = remember_me

        return self.client.post(
            reverse("login"),
            payload,
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

    def test_web_login_returns_access_and_sets_httponly_refresh_cookie(self):
        response = self.login()

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn(
            "access",
            response.data,
        )
        self.assertNotIn(
            "refresh",
            response.data,
        )

        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            response.cookies,
        )

        refresh_cookie = response.cookies[
            settings.AUTH_REFRESH_COOKIE_NAME
        ]

        self.assertTrue(
            bool(
                refresh_cookie["httponly"]
            )
        )

        self.assertEqual(
            refresh_cookie["samesite"],
            settings.AUTH_COOKIE_SAMESITE,
        )

    def test_web_login_session_cookie_is_not_persistent_by_default(self):
        response = self.login()

        refresh_cookie = response.cookies[
            settings.AUTH_REFRESH_COOKIE_NAME
        ]

        self.assertEqual(
            refresh_cookie["max-age"],
            "",
        )

    def test_remember_me_makes_web_refresh_cookie_persistent(self):
        response = self.login(
            remember_me=True,
        )

        refresh_cookie = response.cookies[
            settings.AUTH_REFRESH_COOKIE_NAME
        ]

        self.assertTrue(
            refresh_cookie["max-age"],
        )

    def test_mobile_login_contract_still_returns_refresh_token_in_body(self):
        response = self.login(
            web_session=False,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn(
            "access",
            response.data,
        )
        self.assertIn(
            "refresh",
            response.data,
        )

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

    def test_web_refresh_uses_cookie_and_returns_access_only(self):
        self.login()

        response = self.client.post(
            reverse("refresh"),
            {},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertIn(
            "access",
            response.data,
        )
        self.assertNotIn(
            "refresh",
            response.data,
        )

    def test_mobile_body_refresh_contract_remains_available(self):
        login_response = self.login(
            web_session=False,
        )

        self.client.cookies.clear()

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
        self.assertIn(
            "access",
            response.data,
        )

    def test_web_session_rejects_untrusted_browser_origin(self):
        response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
                "web_session": True,
            },
            HTTP_ORIGIN="https://evil.example",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )



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

    def test_existing_web_refresh_cookie_is_invalidated(self):
        login_response = self.client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.old_password,
                "web_session": True,
            },
        )

        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            login_response.cookies,
        )

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
            {},
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
        cache.clear()

        self.password = (
            "SecureLogoutPassword@2026"
        )

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
                "web_session": True,
            },
        )

        self.access_token = (
            self.login_response.data[
                "access"
            ]
        )

        self.refresh_token = (
            self.login_response.cookies[
                settings.AUTH_REFRESH_COOKIE_NAME
            ].value
        )

        self.logout_url = reverse(
            "logout"
        )

    def test_valid_web_logout_succeeds_and_deletes_cookie(self):
        response = self.client.post(
            self.logout_url,
            {},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["detail"],
            "You have been logged out successfully.",
        )

        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            response.cookies,
        )

        self.assertEqual(
            response.cookies[
                settings.AUTH_REFRESH_COOKIE_NAME
            ]["max-age"],
            0,
        )

    def test_web_logout_is_idempotent_without_cookie(self):
        self.client.cookies.clear()

        response = self.client.post(
            self.logout_url,
            {},
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

    def test_logged_out_web_refresh_token_cannot_be_reused(self):
        logout_response = self.client.post(
            self.logout_url,
            {},
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_200_OK,
        )

        self.client.cookies[
            settings.AUTH_REFRESH_COOKIE_NAME
        ] = self.refresh_token

        refresh_response = self.client.post(
            reverse("refresh"),
            {},
        )

        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_web_logout_ignores_body_token_and_does_not_blacklist_other_user(self):
        second_password = (
            "SecondUserPassword@2026"
        )

        second_user = User.objects.create_user(
            username="second_logout_user",
            email="second@altrium.lk",
            password=second_password,
        )

        second_client = APIClient()

        second_login = second_client.post(
            reverse("login"),
            {
                "username": second_user.username,
                "password": second_password,
            },
        )

        second_refresh_token = (
            second_login.data["refresh"]
        )

        logout_response = self.client.post(
            self.logout_url,
            {
                "refresh": second_refresh_token,
            },
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_200_OK,
        )

        second_refresh_response = (
            second_client.post(
                reverse("refresh"),
                {
                    "refresh": second_refresh_token,
                },
            )
        )

        self.assertEqual(
            second_refresh_response.status_code,
            status.HTTP_200_OK,
        )

    def test_mobile_logout_body_flow_remains_supported(self):
        mobile_client = APIClient()

        mobile_login = mobile_client.post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        mobile_access = (
            mobile_login.data["access"]
        )
        mobile_refresh = (
            mobile_login.data["refresh"]
        )

        mobile_client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {mobile_access}"
            ),
        )

        logout_response = mobile_client.post(
            self.logout_url,
            {
                "refresh": mobile_refresh,
            },
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_200_OK,
        )

        mobile_client.credentials()

        refresh_response = mobile_client.post(
            reverse("refresh"),
            {
                "refresh": mobile_refresh,
            },
        )

        self.assertEqual(
            refresh_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_mobile_user_cannot_blacklist_another_users_token(self):
        second_password = (
            "SecondUserPassword@2026"
        )

        second_user = User.objects.create_user(
            username="second_mobile_user",
            email="second-mobile@altrium.lk",
            password=second_password,
        )

        second_client = APIClient()

        second_login = second_client.post(
            reverse("login"),
            {
                "username": second_user.username,
                "password": second_password,
            },
        )

        second_refresh_token = (
            second_login.data["refresh"]
        )

        mobile_login = APIClient().post(
            reverse("login"),
            {
                "username": self.user.username,
                "password": self.password,
            },
        )

        mobile_access = (
            mobile_login.data["access"]
        )

        first_client = APIClient()
        first_client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {mobile_access}"
            ),
        )

        logout_response = first_client.post(
            self.logout_url,
            {
                "refresh": second_refresh_token,
            },
        )

        self.assertEqual(
            logout_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        second_refresh_response = (
            second_client.post(
                reverse("refresh"),
                {
                    "refresh": second_refresh_token,
                },
            )
        )

        self.assertEqual(
            second_refresh_response.status_code,
            status.HTTP_200_OK,
        )

    def test_untrusted_origin_cannot_logout_web_cookie_session(self):
        response = self.client.post(
            self.logout_url,
            {},
            HTTP_ORIGIN="https://evil.example",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


class MFAAuthenticationAPITests(APITestCase):
    def setUp(self):
        cache.clear()

        self.password = (
            "MFAAdminPassword@2026"
        )

        self.user = (
            User.objects
            .create_user(
                username="mfa_admin",
                email="mfa-admin@altrium.lk",
                password=self.password,
            )
        )

        self.user.profile.role = (
            UserProfile.Role.ADMIN
        )

        self.user.profile.save(
            update_fields=[
                "role",
            ]
        )

    def password_login(
        self,
        *,
        web_session=True,
        remember_me=False,
        client=None,
    ):
        api_client = (
            client
            or self.client
        )

        payload = {
            "username": (
                self.user.username
            ),
            "password": (
                self.password
            ),
        }

        if web_session:
            payload[
                "web_session"
            ] = True

            payload[
                "remember_me"
            ] = remember_me

        return api_client.post(
            reverse("login"),
            payload,
        )

    def begin_setup(
        self,
        challenge_token,
    ):
        return self.client.post(
            reverse(
                "mfa-setup-start"
            ),
            {
                "challenge_token": (
                    challenge_token
                ),
            },
        )

    def enroll_mfa(self):
        login_response = (
            self.password_login()
        )

        self.assertEqual(
            login_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            login_response.data[
                "mfa_setup_required"
            ]
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        setup_response = (
            self.begin_setup(
                challenge_token
            )
        )

        self.assertEqual(
            setup_response.status_code,
            status.HTTP_200_OK,
        )

        secret = (
            setup_response.data[
                "secret"
            ]
        )

        current_code = (
            pyotp.TOTP(
                secret
            ).now()
        )

        confirm_response = (
            self.client.post(
                reverse(
                    "mfa-setup-confirm"
                ),
                {
                    "challenge_token": (
                        challenge_token
                    ),
                    "code": (
                        current_code
                    ),
                },
            )
        )

        self.assertEqual(
            confirm_response.status_code,
            status.HTTP_200_OK,
        )

        return (
            secret,
            confirm_response,
        )

    def test_privileged_web_login_requires_mfa_setup_before_tokens(self):
        response = (
            self.password_login()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data[
                "mfa_setup_required"
            ]
        )

        self.assertNotIn(
            "access",
            response.data,
        )

        self.assertNotIn(
            "refresh",
            response.data,
        )

        # Password-only login must not create an authenticated refresh
        # session. The response intentionally contains an expired deletion
        # cookie so any older browser refresh cookie is cleared.
        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            response.cookies,
        )

        refresh_cookie = response.cookies[
            settings.AUTH_REFRESH_COOKIE_NAME
        ]

        self.assertEqual(
            refresh_cookie.value,
            "",
        )

        self.assertEqual(
            refresh_cookie["max-age"],
            0,
        )

    def test_privileged_mobile_login_cannot_bypass_mfa(self):
        response = (
            self.password_login(
                web_session=False,
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data[
                "mfa_setup_required"
            ]
        )

        self.assertNotIn(
            "access",
            response.data,
        )

        self.assertNotIn(
            "refresh",
            response.data,
        )

    def test_sales_rep_mobile_login_remains_compatible(self):
        sales_user = (
            User.objects
            .create_user(
                username="mobile_sales_rep",
                email="mobile-sales@altrium.lk",
                password="MobileSalesPassword@2026",
            )
        )

        sales_user.profile.role = (
            UserProfile.Role.SALES_REP
        )

        sales_user.profile.save(
            update_fields=[
                "role",
            ]
        )

        response = (
            self.client.post(
                reverse("login"),
                {
                    "username": (
                        sales_user.username
                    ),
                    "password": (
                        "MobileSalesPassword@2026"
                    ),
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            response.data,
        )

        self.assertIn(
            "refresh",
            response.data,
        )

    def test_setup_returns_qr_and_secret_without_issuing_session(self):
        login_response = (
            self.password_login()
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        response = (
            self.begin_setup(
                challenge_token
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data[
                "secret"
            ]
        )

        self.assertTrue(
            response.data[
                "provisioning_uri"
            ].startswith(
                "otpauth://totp/"
            )
        )

        self.assertTrue(
            response.data[
                "qr_code_data_url"
            ].startswith(
                "data:image/png;base64,"
            )
        )

        self.assertNotIn(
            "access",
            response.data,
        )

        self.user.profile.refresh_from_db()

        self.assertNotEqual(
            self.user.profile
            .mfa_pending_secret_encrypted,
            response.data[
                "secret"
            ],
        )

    def test_correct_setup_code_enables_mfa_and_returns_recovery_codes(self):
        secret, response = (
            self.enroll_mfa()
        )

        self.assertIn(
            "access",
            response.data,
        )

        self.assertNotIn(
            "refresh",
            response.data,
        )

        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            response.cookies,
        )

        self.assertEqual(
            len(
                response.data[
                    "recovery_codes"
                ]
            ),
            settings.MFA_RECOVERY_CODE_COUNT,
        )

        self.user.profile.refresh_from_db()

        self.assertTrue(
            self.user.profile.mfa_enabled
        )

        self.assertTrue(
            self.user.profile
            .mfa_secret_encrypted
        )

        self.assertNotEqual(
            self.user.profile
            .mfa_secret_encrypted,
            secret,
        )

        self.assertEqual(
            self.user.profile
            .mfa_pending_secret_encrypted,
            "",
        )

    def test_invalid_setup_code_does_not_enable_mfa(self):
        login_response = (
            self.password_login()
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        self.begin_setup(
            challenge_token
        )

        response = (
            self.client.post(
                reverse(
                    "mfa-setup-confirm"
                ),
                {
                    "challenge_token": (
                        challenge_token
                    ),
                    "code": "000000",
                },
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.user.profile.refresh_from_db()

        self.assertFalse(
            self.user.profile.mfa_enabled
        )

    def test_enrolled_user_receives_mfa_challenge_without_tokens(self):
        self.enroll_mfa()

        self.client.cookies.clear()

        response = (
            self.password_login()
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            response.data[
                "mfa_required"
            ]
        )

        self.assertNotIn(
            "access",
            response.data,
        )

        self.assertNotIn(
            "refresh",
            response.data,
        )

    def test_correct_totp_completes_login_and_same_code_cannot_be_replayed(self):
        secret, _ = (
            self.enroll_mfa()
        )

        self.client.cookies.clear()

        login_response = (
            self.password_login()
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        # Setup consumed the current counter. The configured +1 clock
        # window lets the test use the next counter without sleeping.
        next_code = (
            pyotp.TOTP(
                secret
            ).at(
                time.time()
                + 30
            )
        )

        verify_response = (
            self.client.post(
                reverse(
                    "mfa-verify"
                ),
                {
                    "challenge_token": (
                        challenge_token
                    ),
                    "code": (
                        next_code
                    ),
                },
            )
        )

        self.assertEqual(
            verify_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIn(
            "access",
            verify_response.data,
        )

        self.assertIn(
            settings.AUTH_REFRESH_COOKIE_NAME,
            verify_response.cookies,
        )

        # A new password login gets a new one-time challenge, but the
        # already-consumed TOTP counter must still be rejected.
        replay_login = (
            self.password_login()
        )

        replay_response = (
            self.client.post(
                reverse(
                    "mfa-verify"
                ),
                {
                    "challenge_token": (
                        replay_login.data[
                            "challenge_token"
                        ]
                    ),
                    "code": (
                        next_code
                    ),
                },
            )
        )

        self.assertEqual(
            replay_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_recovery_code_is_one_time(self):
        _, setup_response = (
            self.enroll_mfa()
        )

        recovery_code = (
            setup_response.data[
                "recovery_codes"
            ][0]
        )

        self.client.cookies.clear()

        login_response = (
            self.password_login()
        )

        verify_response = (
            self.client.post(
                reverse(
                    "mfa-verify"
                ),
                {
                    "challenge_token": (
                        login_response.data[
                            "challenge_token"
                        ]
                    ),
                    "code": (
                        recovery_code
                    ),
                },
            )
        )

        self.assertEqual(
            verify_response.status_code,
            status.HTTP_200_OK,
        )

        self.assertTrue(
            verify_response.data[
                "used_recovery_code"
            ]
        )

        second_login = (
            self.password_login()
        )

        reused_response = (
            self.client.post(
                reverse(
                    "mfa-verify"
                ),
                {
                    "challenge_token": (
                        second_login.data[
                            "challenge_token"
                        ]
                    ),
                    "code": (
                        recovery_code
                    ),
                },
            )
        )

        self.assertEqual(
            reused_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_new_password_login_invalidates_older_mfa_challenge(self):
        first_login = (
            self.password_login()
        )

        second_login = (
            self.password_login()
        )

        first_response = (
            self.begin_setup(
                first_login.data[
                    "challenge_token"
                ]
            )
        )

        second_response = (
            self.begin_setup(
                second_login.data[
                    "challenge_token"
                ]
            )
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
        )

    def test_mfa_verification_is_rate_limited(self):
        secret, _ = (
            self.enroll_mfa()
        )

        self.client.cookies.clear()

        # Enrollment confirmation uses the same verification throttle.
        # Clear its test-only cache entry so this test measures exactly
        # five failed verification attempts before the sixth is blocked.
        cache.clear()

        # Use one challenge for repeated invalid attempts.
        login_response = (
            self.password_login()
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        for _ in range(
            5
        ):
            response = (
                self.client.post(
                    reverse(
                        "mfa-verify"
                    ),
                    {
                        "challenge_token": (
                            challenge_token
                        ),
                        "code": "000000",
                    },
                )
            )

            self.assertEqual(
                response.status_code,
                status.HTTP_400_BAD_REQUEST,
            )

        blocked = (
            self.client.post(
                reverse(
                    "mfa-verify"
                ),
                {
                    "challenge_token": (
                        challenge_token
                    ),
                    "code": (
                        pyotp.TOTP(
                            secret
                        ).at(
                            time.time()
                            + 30
                        )
                    ),
                },
            )
        )

        self.assertEqual(
            blocked.status_code,
            status.HTTP_429_TOO_MANY_REQUESTS,
        )

    def test_untrusted_origin_cannot_complete_web_mfa(self):
        login_response = (
            self.password_login()
        )

        challenge_token = (
            login_response.data[
                "challenge_token"
            ]
        )

        response = (
            self.client.post(
                reverse(
                    "mfa-setup-start"
                ),
                {
                    "challenge_token": (
                        challenge_token
                    ),
                },
                HTTP_ORIGIN=(
                    "https://evil.example"
                ),
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_mfa_secret_fields_are_not_exposed_by_current_user_api(self):
        _, setup_response = (
            self.enroll_mfa()
        )

        access_token = (
            setup_response.data[
                "access"
            ]
        )

        self.client.credentials(
            HTTP_AUTHORIZATION=(
                f"Bearer {access_token}"
            ),
        )

        response = (
            self.client.get(
                reverse(
                    "current-user"
                )
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        response_keys = set(
            response.data.keys()
        )

        self.assertFalse(
            {
                key
                for key
                in response_keys
                if "mfa_secret"
                in key
            }
        )

