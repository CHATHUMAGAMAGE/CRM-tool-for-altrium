from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        MARKETING = "MARKETING", "Marketing Employee"

        SALES_REP = (
            "SALES_REP",
            "Sales Representative",
        )

        SALES_MANAGER = (
            "SALES_MANAGER",
            "Sales Manager",
        )

        TECH_LEAD = (
            "TECH_LEAD",
            "Tech Lead",
        )

        FINANCIAL_OFFICER = (
            "FINANCIAL_OFFICER",
            "Financial Officer",
        )

        PROJECT_MANAGER = (
            "PROJECT_MANAGER",
            "Project Manager",
        )

        SOFTWARE_ENGINEER = (
            "SOFTWARE_ENGINEER",
            "Software Engineer",
        )

        DIRECTOR = (
            "DIRECTOR",
            "Director",
        )

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.SALES_REP,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    avatar_data = models.BinaryField(
        null=True,
        blank=True,
    )

    avatar_name = models.CharField(
        max_length=255,
        blank=True,
    )

    avatar_content_type = models.CharField(
        max_length=100,
        blank=True,
    )

    avatar_size = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    # -----------------------------------------------------------------
    # Multi-factor authentication
    # -----------------------------------------------------------------
    #
    # TOTP secrets are encrypted before being stored in these fields.
    # The plaintext secret is only returned once during enrollment.
    #
    # mfa_challenge_nonce makes each password-login MFA challenge
    # one-time: a newer login replaces the previous challenge, and a
    # successful verification clears it.
    # -----------------------------------------------------------------

    mfa_enabled = models.BooleanField(
        default=False,
    )

    mfa_secret_encrypted = models.TextField(
        blank=True,
    )

    mfa_pending_secret_encrypted = models.TextField(
        blank=True,
    )

    mfa_last_used_counter = models.BigIntegerField(
        null=True,
        blank=True,
    )

    mfa_recovery_code_hashes = models.JSONField(
        default=list,
        blank=True,
    )

    mfa_enrolled_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    mfa_challenge_nonce = models.CharField(
        max_length=128,
        blank=True,
    )

    def __str__(self):
        return (
            f"{self.user.username} - "
            f"{self.get_role_display()}"
        )
