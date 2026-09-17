from django.contrib.auth import get_user_model
from django.db import transaction
from django.urls import reverse

from rest_framework import serializers

from accounts.models import UserProfile

from .models import (
    FinancialAssessment,
    FinancialAssessmentDocument,
    FinancialAssessmentHistory,
    Notification,
    Lead,
)
from .notifications import create_notification


User = get_user_model()


def get_user_display_name(
    user,
):
    if user is None:
        return None

    full_name = (
        user
        .get_full_name()
        .strip()
    )

    return (
        full_name
        or user.username
    )


class FinancialAssessmentHistorySerializer(
    serializers.ModelSerializer,
):
    event_type_display = serializers.CharField(
        source="get_event_type_display",
        read_only=True,
    )

    performed_by_name = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = FinancialAssessmentHistory

        fields = [
            "id",
            "assessment",
            "event_type",
            "event_type_display",
            "description",
            "performed_by",
            "performed_by_name",
            "metadata",
            "created_at",
        ]

        read_only_fields = fields

    def get_performed_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.performed_by,
        )


class FinancialAssessmentDocumentSerializer(
    serializers.ModelSerializer,
):
    file = serializers.FileField(
        write_only=True,
    )

    uploaded_by_name = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = FinancialAssessmentDocument

        fields = [
            "id",
            "assessment",
            "title",
            "description",
            "file",
            "uploaded_by",
            "uploaded_by_name",
            "uploaded_at",
        ]

        read_only_fields = [
            "id",
            "assessment",
            "uploaded_by",
            "uploaded_at",
        ]

    def get_uploaded_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.uploaded_by,
        )

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        path = reverse(
            "crm:financial-assessment-document-download",
            kwargs={
                "assessment_id": instance.assessment_id,
                "pk": instance.pk,
            },
        )
        data["file"] = (
            request.build_absolute_uri(path)
            if request
            else path
        )
        data["file_name"] = instance.file_name
        data["content_type"] = instance.content_type
        data["file_size"] = instance.file_size
        return data

    def validate_file(self, value):
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError(
                "Documents must be 10 MB or smaller."
            )
        return value

    def validate_title(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Document title is required."
            )

        return cleaned_value

    def validate_description(
        self,
        value,
    ):
        return value.strip()

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):
        uploaded_file = validated_data.pop("file")
        document = super().create({
            **validated_data,
            "file_data": uploaded_file.read(),
            "file_name": uploaded_file.name,
            "content_type": getattr(
                uploaded_file,
                "content_type",
                "application/octet-stream",
            ),
            "file_size": uploaded_file.size,
        })

        FinancialAssessmentHistory.objects.create(
            assessment=document.assessment,
            event_type=(
                FinancialAssessmentHistory
                .EventType
                .DOCUMENT_ADDED
            ),
            description=(
                "Financial assessment document "
                f"added: {document.title}."
            ),
            performed_by=(
                document.uploaded_by
            ),
            metadata={
                "document_id":
                    document.id,

                "title":
                    document.title,
            },
        )

        return document


class FinancialAssessmentSerializer(
    serializers.ModelSerializer,
):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    lead_company_name = serializers.CharField(
        source="lead.company_name",
        read_only=True,
    )

    lead_contact_name = serializers.CharField(
        source="lead.contact_name",
        read_only=True,
    )

    lead_status = serializers.CharField(
        source="lead.status",
        read_only=True,
    )

    lead_status_display = serializers.CharField(
        source="lead.get_status_display",
        read_only=True,
    )

    lead_project_name = serializers.CharField(
        source="lead.project_name",
        read_only=True,
    )

    lead_budget_min = serializers.DecimalField(
        source="lead.budget_min",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    lead_budget_max = serializers.DecimalField(
        source="lead.budget_max",
        max_digits=14,
        decimal_places=2,
        read_only=True,
    )

    lead_budget_currency = serializers.CharField(
        source="lead.budget_currency",
        read_only=True,
    )

    lead_requirement = serializers.CharField(
        source="lead.requirement",
        read_only=True,
    )

    lead_expected_timeline = serializers.CharField(
        source="lead.expected_timeline",
        read_only=True,
    )

    technical_assessment_status = (
        serializers.CharField(
            source=(
                "technical_assessment.status"
            ),
            read_only=True,
        )
    )

    technical_assessment_status_display = (
        serializers.CharField(
            source=(
                "technical_assessment."
                "get_status_display"
            ),
            read_only=True,
        )
    )

    technical_comments = serializers.CharField(
        source=(
            "technical_assessment."
            "technical_comments"
        ),
        read_only=True,
    )

    technical_review_notes = serializers.CharField(
        source=(
            "technical_assessment."
            "review_notes"
        ),
        read_only=True,
    )

    requested_by_name = (
        serializers.SerializerMethodField()
    )

    assigned_to_name = (
        serializers.SerializerMethodField()
    )

    assigned_to_username = (
        serializers.SerializerMethodField()
    )

    reviewed_by_name = (
        serializers.SerializerMethodField()
    )

    documents = (
        FinancialAssessmentDocumentSerializer(
            many=True,
            read_only=True,
        )
    )

    history = (
        FinancialAssessmentHistorySerializer(
            many=True,
            read_only=True,
        )
    )

    class Meta:
        model = FinancialAssessment

        fields = [
            "id",
            "lead",
            "lead_company_name",
            "lead_contact_name",
            "lead_status",
            "lead_status_display",
            "lead_project_name",
            "lead_budget_min",
            "lead_budget_max",
            "lead_budget_currency",
            "lead_requirement",
            "lead_expected_timeline",
            "technical_assessment",
            "technical_assessment_status",
            "technical_assessment_status_display",
            "technical_comments",
            "technical_review_notes",
            "requested_by",
            "requested_by_name",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "requirements",
            "status",
            "status_display",
            "financial_comments",
            "outcome",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "reviewed_by_name",
            "review_notes",
            "created_at",
            "updated_at",
            "documents",
            "history",
        ]

        read_only_fields = fields

    def get_requested_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.requested_by,
        )

    def get_assigned_to_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.assigned_to,
        )

    def get_assigned_to_username(
        self,
        obj,
    ):
        return obj.assigned_to.username

    def get_reviewed_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.reviewed_by,
        )


class FinancialAssessmentCreateSerializer(
    serializers.ModelSerializer,
):
    assigned_to = (
        serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .FINANCIAL_OFFICER
                ),
            )
        )
    )

    class Meta:
        model = FinancialAssessment

        fields = [
            "id",
            "lead",
            "assigned_to",
            "requirements",
        ]

        read_only_fields = [
            "id",
        ]

    def validate_requirements(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Financial assessment "
                "requirements are required."
            )

        return cleaned_value

    def validate_lead(
        self,
        lead,
    ):
        if lead.status in {
            Lead.Status.WON,
            Lead.Status.LOST,
            Lead.Status.DISQUALIFIED,
        }:
            raise serializers.ValidationError(
                "A financial assessment cannot "
                "be requested for a closed lead."
            )

        missing_fields = []
        if not (lead.company_name or "").strip():
            missing_fields.append("client/company")
        if not (lead.project_name or "").strip():
            missing_fields.append("lead/project name")
        if not (lead.requirement or "").strip():
            missing_fields.append("business requirement")
        if lead.budget_min is None and lead.budget_max is None:
            missing_fields.append("client budget")
        if not (lead.budget_currency or "").strip():
            missing_fields.append("budget currency")

        if missing_fields:
            raise serializers.ValidationError(
                "The Lead is not ready for Financial Assessment. Missing: "
                + ", ".join(missing_fields)
                + "."
            )

        return lead

    def validate(
        self,
        attrs,
    ):
        lead = attrs.get(
            "lead"
        )

        if (
            lead is not None
            and FinancialAssessment
            .objects
            .filter(
                lead=lead,
                status__in=[
                    FinancialAssessment
                    .Status
                    .REQUESTED,

                    FinancialAssessment
                    .Status
                    .IN_PROGRESS,

                    FinancialAssessment
                    .Status
                    .SUBMITTED,
                ],
            )
            .exists()
        ):
            raise serializers.ValidationError(
                {
                    "lead": (
                        "This lead already has "
                        "an active financial assessment."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):
        request = self.context[
            "request"
        ]

        assessment = (
            FinancialAssessment
            .objects
            .create(
                requested_by=request.user,
                status=(
                    FinancialAssessment
                    .Status
                    .REQUESTED
                ),
                **validated_data,
            )
        )

        FinancialAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                FinancialAssessmentHistory
                .EventType
                .REQUESTED
            ),
            description=(
                "Financial assessment requested "
                "and assigned to "
                f"{get_user_display_name(assessment.assigned_to)}."
            ),
            performed_by=request.user,
            metadata={
                "lead_id":
                    assessment.lead_id,

                "assigned_to_id":
                    assessment.assigned_to_id,

                "assigned_to_name":
                    get_user_display_name(
                        assessment.assigned_to,
                    ),
            },
        )

        create_notification(
            recipient=assessment.assigned_to,
            actor=request.user,
            kind=Notification.Kind.ASSIGNMENT,
            title="Financial assessment assigned to you",
            message=f"Assess {assessment.lead.contact_name} at {assessment.lead.company_name}.",
            target_url=f"/financial-assessments/{assessment.id}",
        )

        return assessment


class FinancialAssessmentRequestUpdateSerializer(
    serializers.ModelSerializer,
):
    assigned_to = (
        serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .FINANCIAL_OFFICER
                ),
            ),
            required=False,
        )
    )

    class Meta:
        model = FinancialAssessment

        fields = [
            "assigned_to",
            "requirements",
        ]

    def validate_requirements(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Financial assessment "
                "requirements are required."
            )

        return cleaned_value

    def validate(
        self,
        attrs,
    ):
        if (
            self.instance.status
            != FinancialAssessment
            .Status
            .REQUESTED
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only a requested financial "
                        "assessment can have its "
                        "request details updated."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        request = self.context.get(
            "request"
        )

        previous_assigned_to = (
            instance.assigned_to
        )

        previous_requirements = (
            instance.requirements
        )

        updated = (
            super().update(
                instance,
                validated_data,
            )
        )

        changed_fields = []

        if (
            previous_assigned_to.id
            != updated.assigned_to_id
        ):
            changed_fields.append(
                "Assigned Financial Officer"
            )

        if (
            previous_requirements
            != updated.requirements
        ):
            changed_fields.append(
                "Requirements"
            )

        if changed_fields:
            FinancialAssessmentHistory.objects.create(
                assessment=updated,
                event_type=(
                    FinancialAssessmentHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Financial assessment request "
                    "updated: "
                    + ", ".join(
                        changed_fields
                    )
                    + "."
                ),
                performed_by=getattr(
                    request,
                    "user",
                    None,
                ),
                metadata={
                    "changed_fields":
                        changed_fields
                },
            )

        return updated


class FinancialAssessmentWorkSerializer(
    serializers.ModelSerializer,
):
    class Meta:
        model = FinancialAssessment

        fields = [
            "financial_comments",
            "outcome",
        ]

    def validate_financial_comments(
        self,
        value,
    ):
        return value.strip()

    def validate_outcome(self, value):
        return value

    def validate(
        self,
        attrs,
    ):
        if (
            self.instance.status
            != FinancialAssessment
            .Status
            .IN_PROGRESS
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Financial comments can "
                        "only be updated while the "
                        "assessment is in progress."
                    )
                }
            )

        return attrs

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        request = self.context.get(
            "request"
        )

        previous_comments = (
            instance.financial_comments
        )
        previous_outcome = instance.outcome

        updated = (
            super().update(
                instance,
                validated_data,
            )
        )

        if (
            previous_comments
            != updated.financial_comments
            or previous_outcome != updated.outcome
        ):
            FinancialAssessmentHistory.objects.create(
                assessment=updated,
                event_type=(
                    FinancialAssessmentHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Financial assessment "
                    "findings updated."
                ),
                performed_by=getattr(
                    request,
                    "user",
                    None,
                ),
                metadata={
                    "outcome": updated.outcome,
                },
            )

        return updated


class FinancialAssessmentReviewSerializer(
    serializers.ModelSerializer,
):
    class Meta:
        model = FinancialAssessment

        fields = [
            "review_notes",
        ]

    def validate_review_notes(
        self,
        value,
    ):
        return value.strip()

    def validate(
        self,
        attrs,
    ):
        if (
            self.instance.status
            != FinancialAssessment
            .Status
            .SUBMITTED
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only a submitted financial "
                        "assessment can be reviewed."
                    )
                }
            )

        return attrs
