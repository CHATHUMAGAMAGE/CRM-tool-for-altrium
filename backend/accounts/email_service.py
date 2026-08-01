from html import escape

from brevo import Brevo
from brevo.transactional_emails import (
    SendTransacEmailRequestSender,
    SendTransacEmailRequestToItem,
)
from django.conf import settings
from django.core.mail import send_mail


class PasswordResetEmailError(Exception):
    """Raised when a password-reset email cannot be delivered."""


def build_password_reset_text(
    recipient_name: str,
    reset_url: str,
) -> str:
    return (
        f"Hello {recipient_name},\n\n"
        "A password reset was requested for your "
        "ELEVEN CRM account.\n\n"
        f"Reset your password using this link:\n{reset_url}\n\n"
        "This link expires after one hour and becomes unusable "
        "after your password is changed.\n\n"
        "If you did not request this reset, you can ignore "
        "this email."
    )


def build_password_reset_html(
    recipient_name: str,
    reset_url: str,
) -> str:
    safe_name = escape(recipient_name)
    safe_reset_url = escape(reset_url, quote=True)

    return f"""
    <!doctype html>
    <html lang="en">
      <body style="
        margin: 0;
        padding: 32px;
        background-color: #f4f7fb;
        font-family: Arial, sans-serif;
        color: #172033;
      ">
        <div style="
          max-width: 560px;
          margin: 0 auto;
          padding: 32px;
          background-color: #ffffff;
          border-radius: 12px;
          border: 1px solid #e3e8ef;
        ">
          <h1 style="
            margin-top: 0;
            color: #0b2a59;
          ">
            Reset your ELEVEN password
          </h1>

          <p>Hello {safe_name},</p>

          <p>
            A password reset was requested for your
            ELEVEN CRM account.
          </p>

          <p style="margin: 28px 0;">
            <a
              href="{safe_reset_url}"
              style="
                display: inline-block;
                padding: 14px 22px;
                border-radius: 8px;
                background-color: #0866e5;
                color: #ffffff;
                text-decoration: none;
                font-weight: bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link expires after one hour and becomes unusable
            after your password is changed.
          </p>

          <p>
            If you did not request this reset, you can safely
            ignore this email.
          </p>

          <p style="
            margin-top: 32px;
            color: #667085;
            font-size: 13px;
          ">
            ELEVEN CRM — Built for Altrium
          </p>
        </div>
      </body>
    </html>
    """


def send_password_reset_email(
    *,
    recipient_email: str,
    recipient_name: str,
    reset_url: str,
) -> str | None:
    subject = "Reset your ELEVEN CRM password"

    text_content = build_password_reset_text(
        recipient_name,
        reset_url,
    )

    html_content = build_password_reset_html(
        recipient_name,
        reset_url,
    )

    provider = settings.PASSWORD_RESET_EMAIL_PROVIDER.strip().lower()

    if provider == "django":
        send_mail(
            subject=subject,
            message=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[recipient_email],
            fail_silently=False,
            html_message=html_content,
        )

        return None

    if provider != "brevo":
        raise PasswordResetEmailError(
            "Unsupported password-reset email provider."
        )

    if not settings.BREVO_API_KEY:
        raise PasswordResetEmailError(
            "The Brevo API key is not configured."
        )

    if not settings.BREVO_SENDER_EMAIL:
        raise PasswordResetEmailError(
            "The Brevo sender email is not configured."
        )

    try:
        client = Brevo(
            api_key=settings.BREVO_API_KEY,
            timeout=settings.BREVO_TIMEOUT_SECONDS,
        )

        result = client.transactional_emails.send_transac_email(
            subject=subject,
            html_content=html_content,
            sender=SendTransacEmailRequestSender(
                name=settings.BREVO_SENDER_NAME,
                email=settings.BREVO_SENDER_EMAIL,
            ),
            to=[
                SendTransacEmailRequestToItem(
                    email=recipient_email,
                    name=recipient_name,
                )
            ],
            request_options={
                "timeout_in_seconds": (
                    settings.BREVO_TIMEOUT_SECONDS
                ),
                "max_retries": 1,
            },
        )

        return result.message_id

    except Exception as error:
        raise PasswordResetEmailError(
            "Brevo could not deliver the password-reset email."
        ) from error