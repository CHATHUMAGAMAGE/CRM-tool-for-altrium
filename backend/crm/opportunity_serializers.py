from rest_framework import serializers

from .models import (
    Deal,
    LeadOpportunityDecision,
)


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


class OpportunityDecisionInputSerializer(
    serializers.Serializer,
):
    decision = serializers.ChoiceField(
        choices=(
            LeadOpportunityDecision
            .Decision
            .choices
        ),
    )

    decision_notes = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
    )

    def validate_decision_notes(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Decision notes are required."
            )

        return cleaned_value


class LeadOpportunityDecisionSerializer(
    serializers.ModelSerializer,
):
    decision_display = serializers.CharField(
        source="get_decision_display",
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

    technical_assessment_status = (
        serializers.CharField(
            source=(
                "technical_assessment."
                "status"
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

    financial_assessment_status = (
        serializers.CharField(
            source=(
                "financial_assessment."
                "status"
            ),
            read_only=True,
        )
    )

    financial_assessment_status_display = (
        serializers.CharField(
            source=(
                "financial_assessment."
                "get_status_display"
            ),
            read_only=True,
        )
    )

    decided_by_name = (
        serializers.SerializerMethodField()
    )

    decided_by_username = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = (
            LeadOpportunityDecision
        )

        fields = [
            "id",
            "lead",
            "lead_company_name",
            "lead_contact_name",
            "lead_status",
            "lead_status_display",
            "technical_assessment",
            "technical_assessment_status",
            "technical_assessment_status_display",
            "financial_assessment",
            "financial_assessment_status",
            "financial_assessment_status_display",
            "decision",
            "decision_display",
            "decision_notes",
            "decided_by",
            "decided_by_name",
            "decided_by_username",
            "decided_at",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

    def get_decided_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.decided_by,
        )

    def get_decided_by_username(
        self,
        obj,
    ):
        if obj.decided_by is None:
            return None

        return obj.decided_by.username


class DealSerializer(
    serializers.ModelSerializer,
):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    source_lead_company = serializers.CharField(
        source="source_lead.company_name",
        read_only=True,
    )

    source_lead_contact = serializers.CharField(
        source="source_lead.contact_name",
        read_only=True,
    )

    source_lead_status = serializers.CharField(
        source="source_lead.status",
        read_only=True,
    )

    source_lead_status_display = (
        serializers.CharField(
            source=(
                "source_lead."
                "get_status_display"
            ),
            read_only=True,
        )
    )

    approval_decision = serializers.CharField(
        source=(
            "opportunity_decision."
            "decision"
        ),
        read_only=True,
    )

    approval_decision_display = (
        serializers.CharField(
            source=(
                "opportunity_decision."
                "get_decision_display"
            ),
            read_only=True,
        )
    )

    decision_notes = serializers.CharField(
        source=(
            "opportunity_decision."
            "decision_notes"
        ),
        read_only=True,
    )

    decided_by_name = (
        serializers.SerializerMethodField()
    )

    assigned_to_name = (
        serializers.SerializerMethodField()
    )

    assigned_to_username = (
        serializers.SerializerMethodField()
    )

    created_by_name = (
        serializers.SerializerMethodField()
    )

    created_by_username = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = Deal

        fields = [
            "id",
            "source_lead",
            "source_lead_company",
            "source_lead_contact",
            "source_lead_status",
            "source_lead_status_display",
            "opportunity_decision",
            "approval_decision",
            "approval_decision_display",
            "decision_notes",
            "decided_by_name",
            "name",
            "company_name",
            "contact_name",
            "email",
            "phone",
            "status",
            "status_display",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

        read_only_fields = fields

    def get_decided_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj
            .opportunity_decision
            .decided_by
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
        if obj.assigned_to is None:
            return None

        return obj.assigned_to.username

    def get_created_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.created_by,
        )

    def get_created_by_username(
        self,
        obj,
    ):
        return obj.created_by.username