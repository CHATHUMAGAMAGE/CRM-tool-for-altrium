from unittest.mock import MagicMock, patch

from django.core import mail
from django.test import SimpleTestCase, override_settings

from .email_service import (
    PasswordResetEmailError,
    build_password_reset_html,
    build_password_reset_text,
    send_password_reset_email,
)


class PasswordResetEmailContentTests(SimpleTestCase):
    def test_text_email_contains_recipient_and_reset_url(self):
        content = build_password_reset_text(
            "Nuwan",
            "https://eleven.example/reset-password?token=abc",
        )

        self.assertIn("Hello Nuwan", content)
        self.assertIn(
            "https://eleven.example/reset-password?token=abc",
            content,
        )

    def test_html_email_contains_reset_button_and_url(self):
        content = build_password_reset_html(
            "Nuwan",
            "https://eleven.example/reset-password?token=abc",
        )

        self.assertIn("Reset Password", content)
        self.assertIn(
            "https://eleven.example/reset-password?token=abc",
            content,
        )

    def test_html_email_escapes_unsafe_content(self):
        content = build_password_reset_html(
            "<script>alert('name')</script>",
            'https://example.com/reset?value="unsafe"',
        )

        self.assertNotIn("<script>", content)
        self.assertIn("&lt;script&gt;", content)
        self.assertIn("&quot;unsafe&quot;", content)


@override_settings(
    PASSWORD_RESET_EMAIL_PROVIDER="django",
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="ELEVEN CRM <no-reply@eleven.local>",
)
class DjangoPasswordResetEmailTests(SimpleTestCase):
    def test_django_provider_sends_email(self):
        result = send_password_reset_email(
            recipient_email="employee@altrium.lk",
            recipient_name="Nuwan",
            reset_url=(
                "https://eleven.example/reset-password"
                "?uid=MQ&token=test-token"
            ),
        )

        self.assertIsNone(result)
        self.assertEqual(len(mail.outbox), 1)

        sent_email = mail.outbox[0]

        self.assertEqual(
            sent_email.to,
            ["employee@altrium.lk"],
        )
        self.assertEqual(
            sent_email.subject,
            "Reset your ELEVEN CRM password",
        )
        self.assertIn(
            "https://eleven.example/reset-password",
            sent_email.body,
        )
        self.assertEqual(len(sent_email.alternatives), 1)


class BrevoPasswordResetEmailTests(SimpleTestCase):
    @override_settings(
        PASSWORD_RESET_EMAIL_PROVIDER="unsupported",
    )
    def test_unsupported_provider_is_rejected(self):
        with self.assertRaises(PasswordResetEmailError):
            send_password_reset_email(
                recipient_email="employee@altrium.lk",
                recipient_name="Nuwan",
                reset_url="https://eleven.example/reset",
            )

    @override_settings(
        PASSWORD_RESET_EMAIL_PROVIDER="brevo",
        BREVO_API_KEY="",
        BREVO_SENDER_EMAIL="sender@example.com",
    )
    def test_missing_brevo_api_key_is_rejected(self):
        with self.assertRaises(PasswordResetEmailError):
            send_password_reset_email(
                recipient_email="employee@altrium.lk",
                recipient_name="Nuwan",
                reset_url="https://eleven.example/reset",
            )

    @override_settings(
        PASSWORD_RESET_EMAIL_PROVIDER="brevo",
        BREVO_API_KEY="test-api-key",
        BREVO_SENDER_EMAIL="",
    )
    def test_missing_brevo_sender_is_rejected(self):
        with self.assertRaises(PasswordResetEmailError):
            send_password_reset_email(
                recipient_email="employee@altrium.lk",
                recipient_name="Nuwan",
                reset_url="https://eleven.example/reset",
            )

    @override_settings(
        PASSWORD_RESET_EMAIL_PROVIDER="brevo",
        BREVO_API_KEY="test-api-key",
        BREVO_SENDER_NAME="ELEVEN CRM",
        BREVO_SENDER_EMAIL="sender@example.com",
        BREVO_TIMEOUT_SECONDS=10,
    )
    @patch("accounts.email_service.Brevo")
    def test_brevo_provider_sends_email_and_returns_message_id(
        self,
        mock_brevo,
    ):
        mock_client = MagicMock()
        mock_result = MagicMock()
        mock_result.message_id = "brevo-message-id"

        mock_brevo.return_value = mock_client

        send_method = (
            mock_client
            .transactional_emails
            .send_transac_email
        )
        send_method.return_value = mock_result

        result = send_password_reset_email(
            recipient_email="employee@altrium.lk",
            recipient_name="Nuwan",
            reset_url=(
                "https://eleven.example/reset-password"
                "?uid=MQ&token=test-token"
            ),
        )

        self.assertEqual(result, "brevo-message-id")

        mock_brevo.assert_called_once_with(
            api_key="test-api-key",
            timeout=10,
        )

        send_method.assert_called_once()

        call_arguments = send_method.call_args.kwargs

        self.assertEqual(
            call_arguments["subject"],
            "Reset your ELEVEN CRM password",
        )
        self.assertIn(
            "Reset Password",
            call_arguments["html_content"],
        )

    @override_settings(
        PASSWORD_RESET_EMAIL_PROVIDER="brevo",
        BREVO_API_KEY="test-api-key",
        BREVO_SENDER_NAME="ELEVEN CRM",
        BREVO_SENDER_EMAIL="sender@example.com",
        BREVO_TIMEOUT_SECONDS=10,
    )
    @patch("accounts.email_service.Brevo")
    def test_brevo_delivery_error_is_wrapped(
        self,
        mock_brevo,
    ):
        mock_client = MagicMock()
        mock_brevo.return_value = mock_client

        (
            mock_client
            .transactional_emails
            .send_transac_email
            .side_effect
        ) = RuntimeError("Brevo unavailable")

        with self.assertRaises(PasswordResetEmailError):
            send_password_reset_email(
                recipient_email="employee@altrium.lk",
                recipient_name="Nuwan",
                reset_url="https://eleven.example/reset",
            )