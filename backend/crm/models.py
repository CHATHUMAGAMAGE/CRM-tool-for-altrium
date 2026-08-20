from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone


class Lead(models.Model):
    class Status(models.TextChoices):
        NEW = "NEW", "New"
        CONTACTED = "CONTACTED", "Contacted"
        QUALIFIED = "QUALIFIED", "Qualified"
        PROPOSAL = "PROPOSAL", "Proposal"
        WON = "WON", "Won"
        LOST = "LOST", "Lost"
        DISQUALIFIED = "DISQUALIFIED", "Disqualified"

    company_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30)
    source = models.CharField(max_length=100, blank=True)

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NEW,
    )

    qualification_notes = models.TextField(blank=True)
    lost_reason = models.TextField(blank=True)

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_leads",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_leads",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    converted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        super().clean()

        if not (self.company_name or "").strip():
            raise ValidationError(
                {"company_name": "Company name is required."}
            )

        if not (self.contact_name or "").strip():
            raise ValidationError(
                {"contact_name": "Contact name is required."}
            )

        if not (self.phone or "").strip():
            raise ValidationError(
                {"phone": "Phone number is required."}
            )

        if (
            self.status == self.Status.LOST
            and not (self.lost_reason or "").strip()
        ):
            raise ValidationError(
                {
                    "lost_reason": (
                        "Lost reason is required when a lead is lost."
                    )
                }
            )

    def __str__(self):
        return f"{self.company_name} - {self.contact_name}"


class Communication(models.Model):
    class CommunicationType(models.TextChoices):
        CALL = "CALL", "Call"
        EMAIL = "EMAIL", "Email"
        MEETING = "MEETING", "Meeting"
        WHATSAPP = "WHATSAPP", "WhatsApp"

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="communications",
    )

    communication_type = models.CharField(
        max_length=20,
        choices=CommunicationType.choices,
    )

    communication_date = models.DateTimeField()
    summary = models.CharField(max_length=255)
    notes = models.TextField(blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_communications",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-communication_date"]

    def clean(self):
        super().clean()

        if not (self.summary or "").strip():
            raise ValidationError(
                {"summary": "Communication summary is required."}
            )

    def __str__(self):
        communication_type = self.get_communication_type_display()
        return f"{communication_type} - {self.lead}"


class FollowUp(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="follow_ups",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField()

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_follow_ups",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    completed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_follow_ups",
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_follow_ups",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["due_date"]

    @property
    def is_overdue(self):
        return (
            self.status == self.Status.PENDING
            and self.due_date < timezone.now()
        )

    def clean(self):
        super().clean()

        if not (self.title or "").strip():
            raise ValidationError(
                {"title": "Follow-up title is required."}
            )

        if (
            self._state.adding
            and self.due_date
            and self.due_date < timezone.now()
        ):
            raise ValidationError(
                {
                    "due_date": (
                        "A new follow-up cannot have a past due date."
                    )
                }
            )

    def __str__(self):
        return f"{self.title} - {self.lead}"


class Customer(models.Model):
    company_name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=30)

    source_lead = models.OneToOneField(
        Lead,
        on_delete=models.PROTECT,
        related_name="customer",
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_customers",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def clean(self):
        super().clean()

        if not (self.company_name or "").strip():
            raise ValidationError(
                {"company_name": "Company name is required."}
            )

        if not (self.contact_name or "").strip():
            raise ValidationError(
                {"contact_name": "Contact name is required."}
            )

        if not (self.phone or "").strip():
            raise ValidationError(
                {"phone": "Phone number is required."}
            )

    def __str__(self):
        return f"{self.company_name} - {self.contact_name}"