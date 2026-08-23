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

        DISQUALIFIED = (
            "DISQUALIFIED",
            "Disqualified",
        )

    company_name = models.CharField(
        max_length=255,
    )

    contact_name = models.CharField(
        max_length=255,
    )

    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
    )

    source = models.CharField(
        max_length=100,
        blank=True,
    )

    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.NEW,
    )

    qualification_notes = models.TextField(
        blank=True,
    )

    lost_reason = models.TextField(
        blank=True,
    )

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

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    converted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def clean(self):
        super().clean()

        if not (
            self.company_name
            or ""
        ).strip():
            raise ValidationError(
                {
                    "company_name":
                        "Company name is required."
                }
            )

        if not (
            self.contact_name
            or ""
        ).strip():
            raise ValidationError(
                {
                    "contact_name":
                        "Contact name is required."
                }
            )

        if not (
            self.phone
            or ""
        ).strip():
            raise ValidationError(
                {
                    "phone":
                        "Phone number is required."
                }
            )

        if (
            self.status
            == self.Status.LOST
            and not (
                self.lost_reason
                or ""
            ).strip()
        ):
            raise ValidationError(
                {
                    "lost_reason": (
                        "Lost reason is required "
                        "when a lead is lost."
                    )
                }
            )

    def __str__(self):
        return (
            f"{self.company_name} - "
            f"{self.contact_name}"
        )


class LeadHistory(models.Model):
    class EventType(models.TextChoices):
        CREATED = "CREATED", "Created"
        UPDATED = "UPDATED", "Updated"
        ASSIGNED = "ASSIGNED", "Assigned"
        UNASSIGNED = "UNASSIGNED", "Unassigned"

        STATUS_CHANGED = (
            "STATUS_CHANGED",
            "Status Changed",
        )

        QUALIFIED = (
            "QUALIFIED",
            "Qualified",
        )

        DISQUALIFIED = (
            "DISQUALIFIED",
            "Disqualified",
        )

        WON = "WON", "Won"
        LOST = "LOST", "Lost"

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="history",
    )

    event_type = models.CharField(
        max_length=30,
        choices=EventType.choices,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="lead_history_events",
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
    )

    class Meta:
        ordering = [
            "-created_at",
            "-id",
        ]

    def __str__(self):
        return (
            f"{self.get_event_type_display()} - "
            f"{self.lead}"
        )


class Communication(models.Model):
    class CommunicationType(
        models.TextChoices,
    ):
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

    summary = models.CharField(
        max_length=255,
    )

    notes = models.TextField(
        blank=True,
    )

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_communications",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-communication_date",
        ]

    def clean(self):
        super().clean()

        if not (
            self.summary
            or ""
        ).strip():
            raise ValidationError(
                {
                    "summary": (
                        "Communication summary "
                        "is required."
                    )
                }
            )

    def __str__(self):
        communication_type = (
            self
            .get_communication_type_display()
        )

        return (
            f"{communication_type} - "
            f"{self.lead}"
        )


class FollowUp(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        COMPLETED = "COMPLETED", "Completed"

        CANCELLED = (
            "CANCELLED",
            "Cancelled",
        )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="follow_ups",
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

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

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "due_date",
        ]

    @property
    def is_overdue(self):
        return (
            self.status
            == self.Status.PENDING
            and self.due_date
            < timezone.now()
        )

    def clean(self):
        super().clean()

        if not (
            self.title
            or ""
        ).strip():
            raise ValidationError(
                {
                    "title":
                        "Follow-up title is required."
                }
            )

        if (
            self._state.adding
            and self.due_date
            and self.due_date
            < timezone.now()
        ):
            raise ValidationError(
                {
                    "due_date": (
                        "A new follow-up cannot "
                        "have a past due date."
                    )
                }
            )

    def __str__(self):
        return (
            f"{self.title} - "
            f"{self.lead}"
        )


class Customer(models.Model):
    company_name = models.CharField(
        max_length=255,
    )

    contact_name = models.CharField(
        max_length=255,
    )

    email = models.EmailField(
        blank=True,
    )

    phone = models.CharField(
        max_length=30,
    )

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

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

    def clean(self):
        super().clean()

        if not (
            self.company_name
            or ""
        ).strip():
            raise ValidationError(
                {
                    "company_name":
                        "Company name is required."
                }
            )

        if not (
            self.contact_name
            or ""
        ).strip():
            raise ValidationError(
                {
                    "contact_name":
                        "Contact name is required."
                }
            )

        if not (
            self.phone
            or ""
        ).strip():
            raise ValidationError(
                {
                    "phone":
                        "Phone number is required."
                }
            )

    def __str__(self):
        return (
            f"{self.company_name} - "
            f"{self.contact_name}"
        )


class TechnicalAssessment(models.Model):
    class Status(models.TextChoices):
        REQUESTED = (
            "REQUESTED",
            "Requested",
        )

        IN_PROGRESS = (
            "IN_PROGRESS",
            "In Progress",
        )

        SUBMITTED = (
            "SUBMITTED",
            "Submitted",
        )

        REVIEWED = (
            "REVIEWED",
            "Reviewed",
        )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.PROTECT,
        related_name="technical_assessments",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "requested_technical_assessments"
        ),
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "assigned_technical_assessments"
        ),
        limit_choices_to={
            "profile__role":
                "TECH_LEAD",
        },
    )

    requirements = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
    )

    technical_comments = models.TextField(
        blank=True,
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name=(
            "reviewed_technical_assessments"
        ),
    )

    review_notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "status",
                ],
                name="tech_assess_status_idx",
            ),

            models.Index(
                fields=[
                    "assigned_to",
                    "status",
                ],
                name="tech_assess_owner_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if not (
            self.requirements
            or ""
        ).strip():
            raise ValidationError(
                {
                    "requirements": (
                        "Assessment requirements "
                        "are required."
                    )
                }
            )

        if self.assigned_to_id:
            profile = getattr(
                self.assigned_to,
                "profile",
                None,
            )

            if (
                profile is None
                or profile.role
                != "TECH_LEAD"
            ):
                raise ValidationError(
                    {
                        "assigned_to": (
                            "Technical assessments "
                            "must be assigned to "
                            "a Tech Lead."
                        )
                    }
                )

    def __str__(self):
        return (
            f"Technical Assessment #{self.pk} - "
            f"{self.lead}"
        )


class TechnicalAssessmentRecommendation(
    models.Model,
):
    class Availability(models.TextChoices):
        AVAILABLE = (
            "AVAILABLE",
            "Available",
        )

        LIMITED = (
            "LIMITED",
            "Limited Availability",
        )

        UNAVAILABLE = (
            "UNAVAILABLE",
            "Unavailable",
        )

    assessment = models.ForeignKey(
        TechnicalAssessment,
        on_delete=models.CASCADE,
        related_name="recommendations",
    )

    engineer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "technical_assessment_recommendations"
        ),
        limit_choices_to={
            "profile__role":
                "SOFTWARE_ENGINEER",
        },
    )

    availability = models.CharField(
        max_length=20,
        choices=Availability.choices,
        default=Availability.AVAILABLE,
    )

    recommendation_notes = models.TextField(
        blank=True,
    )

    recommended_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "created_technical_recommendations"
        ),
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "created_at",
        ]

        constraints = [
            models.UniqueConstraint(
                fields=[
                    "assessment",
                    "engineer",
                ],
                name=(
                    "unique_engineer_per_"
                    "technical_assessment"
                ),
            )
        ]

    def clean(self):
        super().clean()

        if self.engineer_id:
            profile = getattr(
                self.engineer,
                "profile",
                None,
            )

            if (
                profile is None
                or profile.role
                != "SOFTWARE_ENGINEER"
            ):
                raise ValidationError(
                    {
                        "engineer": (
                            "Only Software Engineers "
                            "can be recommended."
                        )
                    }
                )

    def __str__(self):
        return (
            f"{self.engineer} - "
            f"{self.assessment}"
        )


class TechnicalAssessmentDocument(
    models.Model,
):
    assessment = models.ForeignKey(
        TechnicalAssessment,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    file = models.FileField(
        upload_to=(
            "technical_assessments/"
            "%Y/%m/"
        ),
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "uploaded_technical_assessment_documents"
        ),
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-uploaded_at",
        ]

    def clean(self):
        super().clean()

        if not (
            self.title
            or ""
        ).strip():
            raise ValidationError(
                {
                    "title":
                        "Document title is required."
                }
            )

    def __str__(self):
        return (
            f"{self.title} - "
            f"{self.assessment}"
        )


class TechnicalAssessmentHistory(
    models.Model,
):
    class EventType(models.TextChoices):
        REQUESTED = (
            "REQUESTED",
            "Requested",
        )

        STARTED = (
            "STARTED",
            "Started",
        )

        UPDATED = (
            "UPDATED",
            "Updated",
        )

        RECOMMENDATION_ADDED = (
            "RECOMMENDATION_ADDED",
            "Recommendation Added",
        )

        RECOMMENDATION_REMOVED = (
            "RECOMMENDATION_REMOVED",
            "Recommendation Removed",
        )

        DOCUMENT_ADDED = (
            "DOCUMENT_ADDED",
            "Document Added",
        )

        SUBMITTED = (
            "SUBMITTED",
            "Submitted",
        )

        REVIEWED = (
            "REVIEWED",
            "Reviewed",
        )

    assessment = models.ForeignKey(
        TechnicalAssessment,
        on_delete=models.CASCADE,
        related_name="history",
    )

    event_type = models.CharField(
        max_length=40,
        choices=EventType.choices,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name=(
            "technical_assessment_history_events"
        ),
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
    )

    class Meta:
        ordering = [
            "-created_at",
            "-id",
        ]

    def __str__(self):
        return (
            f"{self.get_event_type_display()} - "
            f"{self.assessment}"
        )


class FinancialAssessment(models.Model):
    class Status(models.TextChoices):
        REQUESTED = (
            "REQUESTED",
            "Requested",
        )

        IN_PROGRESS = (
            "IN_PROGRESS",
            "In Progress",
        )

        SUBMITTED = (
            "SUBMITTED",
            "Submitted",
        )

        REVIEWED = (
            "REVIEWED",
            "Reviewed",
        )

    lead = models.ForeignKey(
        Lead,
        on_delete=models.PROTECT,
        related_name="financial_assessments",
    )

    technical_assessment = models.ForeignKey(
        TechnicalAssessment,
        on_delete=models.PROTECT,
        related_name="financial_assessments",
    )

    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "requested_financial_assessments"
        ),
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "assigned_financial_assessments"
        ),
        limit_choices_to={
            "profile__role":
                "FINANCIAL_OFFICER",
        },
    )

    requirements = models.TextField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.REQUESTED,
    )

    financial_comments = models.TextField(
        blank=True,
    )

    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reviewed_at = models.DateTimeField(
        null=True,
        blank=True,
    )

    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name=(
            "reviewed_financial_assessments"
        ),
    )

    review_notes = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        ordering = [
            "-created_at",
        ]

        indexes = [
            models.Index(
                fields=[
                    "status",
                ],
                name="fin_assess_status_idx",
            ),

            models.Index(
                fields=[
                    "assigned_to",
                    "status",
                ],
                name="fin_assess_owner_idx",
            ),
        ]

    def clean(self):
        super().clean()

        if not (
            self.requirements
            or ""
        ).strip():
            raise ValidationError(
                {
                    "requirements": (
                        "Financial assessment "
                        "requirements are required."
                    )
                }
            )

        if self.assigned_to_id:
            profile = getattr(
                self.assigned_to,
                "profile",
                None,
            )

            if (
                profile is None
                or profile.role
                != "FINANCIAL_OFFICER"
            ):
                raise ValidationError(
                    {
                        "assigned_to": (
                            "Financial assessments "
                            "must be assigned to a "
                            "Financial Officer."
                        )
                    }
                )

        if (
            self.technical_assessment_id
            and self.lead_id
        ):
            if (
                self.technical_assessment
                .lead_id
                != self.lead_id
            ):
                raise ValidationError(
                    {
                        "technical_assessment": (
                            "The technical assessment "
                            "must belong to the same "
                            "lead."
                        )
                    }
                )

            if (
                self.technical_assessment
                .status
                != TechnicalAssessment
                .Status
                .REVIEWED
            ):
                raise ValidationError(
                    {
                        "technical_assessment": (
                            "The technical assessment "
                            "must be reviewed before a "
                            "financial assessment can "
                            "be requested."
                        )
                    }
                )

    def __str__(self):
        return (
            f"Financial Assessment #{self.pk} - "
            f"{self.lead}"
        )


class FinancialAssessmentDocument(
    models.Model,
):
    assessment = models.ForeignKey(
        FinancialAssessment,
        on_delete=models.CASCADE,
        related_name="documents",
    )

    title = models.CharField(
        max_length=255,
    )

    description = models.TextField(
        blank=True,
    )

    file = models.FileField(
        upload_to=(
            "financial_assessments/"
            "%Y/%m/"
        ),
    )

    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name=(
            "uploaded_financial_assessment_documents"
        ),
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = [
            "-uploaded_at",
        ]

    def clean(self):
        super().clean()

        if not (
            self.title
            or ""
        ).strip():
            raise ValidationError(
                {
                    "title":
                        "Document title is required."
                }
            )

    def __str__(self):
        return (
            f"{self.title} - "
            f"{self.assessment}"
        )


class FinancialAssessmentHistory(
    models.Model,
):
    class EventType(models.TextChoices):
        REQUESTED = (
            "REQUESTED",
            "Requested",
        )

        STARTED = (
            "STARTED",
            "Started",
        )

        UPDATED = (
            "UPDATED",
            "Updated",
        )

        DOCUMENT_ADDED = (
            "DOCUMENT_ADDED",
            "Document Added",
        )

        SUBMITTED = (
            "SUBMITTED",
            "Submitted",
        )

        REVIEWED = (
            "REVIEWED",
            "Reviewed",
        )

    assessment = models.ForeignKey(
        FinancialAssessment,
        on_delete=models.CASCADE,
        related_name="history",
    )

    event_type = models.CharField(
        max_length=40,
        choices=EventType.choices,
    )

    description = models.TextField()

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name=(
            "financial_assessment_history_events"
        ),
    )

    metadata = models.JSONField(
        default=dict,
        blank=True,
    )

    created_at = models.DateTimeField(
        default=timezone.now,
        editable=False,
    )

    class Meta:
        ordering = [
            "-created_at",
            "-id",
        ]

    def __str__(self):
        return (
            f"{self.get_event_type_display()} - "
            f"{self.assessment}"
        )