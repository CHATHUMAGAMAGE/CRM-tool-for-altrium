from django.contrib.auth import get_user_model
from django.db import transaction
from django.urls import reverse
from django.utils import timezone

from rest_framework import serializers

from accounts.models import UserProfile

from .models import (
    Communication,
    Customer,
    FollowUp,
    Lead,
    LeadHistory,
    TechnicalAssessment,
    TechnicalAssessmentDocument,
    TechnicalAssessmentHistory,
    TechnicalAssessmentRecommendation,
)


User = get_user_model()


def get_user_display_name(user):
    if user is None:
        return None

    full_name = user.get_full_name().strip()

    return full_name or user.username


def get_status_display(status_value):
    return dict(
        Lead.Status.choices
    ).get(
        status_value,
        status_value,
    )


class LeadSerializer(
    serializers.ModelSerializer,
):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
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

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            profile__role=UserProfile.Role.SALES_REP,
        ),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Lead

        fields = [
            "id",
            "company_name",
            "contact_name",
            "email",
            "phone",
            "source",
            "status",
            "status_display",
            "qualification_notes",
            "lost_reason",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
            "updated_at",
            "converted_at",
        ]

        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "converted_at",
        ]

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

    def validate(
        self,
        attrs,
    ):
        request = self.context.get(
            "request"
        )

        user = getattr(
            request,
            "user",
            None,
        )

        profile = getattr(
            user,
            "profile",
            None,
        )

        current_status = (
            self.instance.status
            if self.instance is not None
            else Lead.Status.NEW
        )

        requested_status = attrs.get(
            "status",
            current_status,
        )

        lost_reason = attrs.get(
            "lost_reason",
            (
                self.instance.lost_reason
                if self.instance is not None
                else ""
            ),
        )

        qualification_notes = attrs.get(
            "qualification_notes",
            (
                self.instance.qualification_notes
                if self.instance is not None
                else ""
            ),
        )

        if (
            profile is not None
            and profile.role
            == UserProfile.Role.SALES_REP
        ):
            if "qualification_notes" in attrs:
                raise serializers.ValidationError(
                    {
                        "qualification_notes": (
                            "Sales Representatives cannot modify "
                            "lead qualification notes."
                        )
                    }
                )

            if (
                requested_status
                in {
                    Lead.Status.QUALIFIED,
                    Lead.Status.DISQUALIFIED,
                }
                and requested_status
                != current_status
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "Only management can qualify or "
                            "disqualify a lead."
                        )
                    }
                )

        if (
            requested_status
            in {
                Lead.Status.QUALIFIED,
                Lead.Status.DISQUALIFIED,
            }
            and requested_status
            != current_status
            and not (
                qualification_notes
                or ""
            ).strip()
        ):
            raise serializers.ValidationError(
                {
                    "qualification_notes": (
                        "Qualification notes are required "
                        "when qualifying or disqualifying a lead."
                    )
                }
            )

        if (
            requested_status
            == Lead.Status.LOST
            and not (
                lost_reason
                or ""
            ).strip()
        ):
            raise serializers.ValidationError(
                {
                    "lost_reason": (
                        "A reason is required when marking "
                        "a lead as lost."
                    )
                }
            )

        if (
            requested_status
            == Lead.Status.WON
            and current_status
            != Lead.Status.WON
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "Leads must be marked as won through the "
                        "dedicated win workflow."
                    )
                }
            )

        if "assigned_to" in attrs:
            if profile is None:
                raise serializers.ValidationError(
                    {
                        "assigned_to": (
                            "A valid authenticated user profile "
                            "is required."
                        )
                    }
                )

            if profile.role not in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }:
                raise serializers.ValidationError(
                    {
                        "assigned_to": (
                            "Only an Administrator, Sales Manager, "
                            "or Project Manager can assign leads."
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

        lead = Lead.objects.create(
            created_by=request.user,
            **validated_data,
        )

        LeadHistory.objects.create(
            lead=lead,
            event_type=(
                LeadHistory
                .EventType
                .CREATED
            ),
            description="Lead created.",
            performed_by=request.user,
            metadata={
                "status":
                    lead.status,
            },
            created_at=lead.created_at,
        )

        if lead.assigned_to is not None:
            LeadHistory.objects.create(
                lead=lead,
                event_type=(
                    LeadHistory
                    .EventType
                    .ASSIGNED
                ),
                description=(
                    "Lead assigned to "
                    f"{get_user_display_name(lead.assigned_to)}."
                ),
                performed_by=request.user,
                metadata={
                    "assigned_to_id":
                        lead.assigned_to_id,

                    "assigned_to_name":
                        get_user_display_name(
                            lead.assigned_to,
                        ),
                },
            )

        return lead

    @transaction.atomic
    def update(
        self,
        instance,
        validated_data,
    ):
        request = self.context.get(
            "request"
        )

        performed_by = getattr(
            request,
            "user",
            None,
        )

        previous_status = (
            instance.status
        )

        previous_assigned_to_id = (
            instance.assigned_to_id
        )

        previous_assigned_to_name = (
            get_user_display_name(
                instance.assigned_to,
            )
        )

        previous_qualification_notes = (
            instance.qualification_notes
        )

        previous_lost_reason = (
            instance.lost_reason
        )

        detail_fields = {
            "company_name": (
                "Company name",
                instance.company_name,
            ),

            "contact_name": (
                "Contact name",
                instance.contact_name,
            ),

            "email": (
                "Email",
                instance.email,
            ),

            "phone": (
                "Phone",
                instance.phone,
            ),

            "source": (
                "Lead source",
                instance.source,
            ),
        }

        requested_status = (
            validated_data.get(
                "status",
                instance.status,
            )
        )

        if (
            requested_status
            != Lead.Status.LOST
        ):
            validated_data[
                "lost_reason"
            ] = ""

        updated_lead = (
            super().update(
                instance,
                validated_data,
            )
        )

        if (
            "assigned_to"
            in validated_data
            and previous_assigned_to_id
            != updated_lead.assigned_to_id
        ):
            new_name = (
                get_user_display_name(
                    updated_lead.assigned_to,
                )
            )

            if (
                updated_lead.assigned_to
                is None
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .UNASSIGNED
                )

                description = (
                    "Lead assignment removed"
                )

                if previous_assigned_to_name:
                    description += (
                        f" from "
                        f"{previous_assigned_to_name}"
                    )

                description += "."

            elif (
                previous_assigned_to_id
                is None
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .ASSIGNED
                )

                description = (
                    f"Lead assigned to "
                    f"{new_name}."
                )

            else:
                event_type = (
                    LeadHistory
                    .EventType
                    .ASSIGNED
                )

                description = (
                    "Lead reassigned from "
                    f"{previous_assigned_to_name} "
                    f"to {new_name}."
                )

            LeadHistory.objects.create(
                lead=updated_lead,
                event_type=event_type,
                description=description,
                performed_by=performed_by,
                metadata={
                    "previous_assigned_to_id":
                        previous_assigned_to_id,

                    "previous_assigned_to_name":
                        previous_assigned_to_name,

                    "assigned_to_id":
                        updated_lead.assigned_to_id,

                    "assigned_to_name":
                        new_name,
                },
            )

        if (
            "status"
            in validated_data
            and previous_status
            != updated_lead.status
        ):
            if (
                updated_lead.status
                == Lead.Status.QUALIFIED
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .QUALIFIED
                )

                description = (
                    "Lead qualified."
                )

            elif (
                updated_lead.status
                == Lead.Status.DISQUALIFIED
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .DISQUALIFIED
                )

                description = (
                    "Lead disqualified."
                )

            elif (
                updated_lead.status
                == Lead.Status.LOST
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .LOST
                )

                description = (
                    "Lead marked as lost."
                )

            elif (
                updated_lead.status
                == Lead.Status.WON
            ):
                event_type = (
                    LeadHistory
                    .EventType
                    .WON
                )

                description = (
                    "Lead marked as won."
                )

            else:
                event_type = (
                    LeadHistory
                    .EventType
                    .STATUS_CHANGED
                )

                description = (
                    "Lead status changed from "
                    f"{get_status_display(previous_status)} "
                    "to "
                    f"{get_status_display(updated_lead.status)}."
                )

            metadata = {
                "previous_status":
                    previous_status,

                "previous_status_display":
                    get_status_display(
                        previous_status,
                    ),

                "status":
                    updated_lead.status,

                "status_display":
                    get_status_display(
                        updated_lead.status,
                    ),
            }

            if (
                updated_lead.status
                in {
                    Lead.Status.QUALIFIED,
                    Lead.Status.DISQUALIFIED,
                }
            ):
                metadata[
                    "qualification_notes"
                ] = (
                    updated_lead
                    .qualification_notes
                )

            if (
                updated_lead.status
                == Lead.Status.LOST
            ):
                metadata[
                    "lost_reason"
                ] = (
                    updated_lead
                    .lost_reason
                )

            LeadHistory.objects.create(
                lead=updated_lead,
                event_type=event_type,
                description=description,
                performed_by=performed_by,
                metadata=metadata,
            )

        changed_detail_labels = []

        for field_name, (
            label,
            previous_value,
        ) in detail_fields.items():
            if (
                field_name
                in validated_data
                and previous_value
                != getattr(
                    updated_lead,
                    field_name,
                )
            ):
                changed_detail_labels.append(
                    label,
                )

        if changed_detail_labels:
            LeadHistory.objects.create(
                lead=updated_lead,
                event_type=(
                    LeadHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Lead details updated: "
                    + ", ".join(
                        changed_detail_labels,
                    )
                    + "."
                ),
                performed_by=performed_by,
                metadata={
                    "changed_fields":
                        changed_detail_labels
                },
            )

        if (
            "qualification_notes"
            in validated_data
            and previous_status
            == updated_lead.status
            and previous_qualification_notes
            != updated_lead
            .qualification_notes
        ):
            LeadHistory.objects.create(
                lead=updated_lead,
                event_type=(
                    LeadHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Qualification notes updated."
                ),
                performed_by=performed_by,
            )

        if (
            "lost_reason"
            in validated_data
            and previous_status
            == updated_lead.status
            and previous_lost_reason
            != updated_lead.lost_reason
        ):
            LeadHistory.objects.create(
                lead=updated_lead,
                event_type=(
                    LeadHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Lost reason updated."
                ),
                performed_by=performed_by,
            )

        return updated_lead


class LeadHistorySerializer(
    serializers.ModelSerializer,
):
    event_type_display = (
        serializers.CharField(
            source="get_event_type_display",
            read_only=True,
        )
    )

    performed_by_name = (
        serializers.SerializerMethodField()
    )

    performed_by_username = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = LeadHistory

        fields = [
            "id",
            "lead",
            "event_type",
            "event_type_display",
            "description",
            "performed_by",
            "performed_by_name",
            "performed_by_username",
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

    def get_performed_by_username(
        self,
        obj,
    ):
        if obj.performed_by is None:
            return None

        return (
            obj.performed_by.username
        )


class CommunicationSerializer(
    serializers.ModelSerializer,
):
    communication_type_display = (
        serializers.CharField(
            source=(
                "get_communication_type_display"
            ),
            read_only=True,
        )
    )

    created_by_name = (
        serializers.SerializerMethodField()
    )

    created_by_username = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = Communication

        fields = [
            "id",
            "lead",
            "communication_type",
            "communication_type_display",
            "communication_date",
            "summary",
            "notes",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "lead",
            "created_by",
            "created_at",
        ]

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
        return (
            obj.created_by.username
        )

    def validate_communication_date(
        self,
        value,
    ):
        if value > timezone.now():
            raise serializers.ValidationError(
                "Communication date cannot "
                "be in the future."
            )

        return value

    def validate_summary(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Communication summary "
                "is required."
            )

        return cleaned_value

    def validate_notes(
        self,
        value,
    ):
        return value.strip()


class FollowUpSerializer(
    serializers.ModelSerializer,
):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    is_overdue = serializers.BooleanField(
        read_only=True,
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

    completed_by_name = (
        serializers.SerializerMethodField()
    )

    completed_by_username = (
        serializers.SerializerMethodField()
    )

    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            profile__role=UserProfile.Role.SALES_REP,
        ),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = FollowUp

        fields = [
            "id",
            "lead",
            "title",
            "description",
            "due_date",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "status",
            "status_display",
            "is_overdue",
            "completed_at",
            "completed_by",
            "completed_by_name",
            "completed_by_username",
            "created_by",
            "created_by_name",
            "created_by_username",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "lead",
            "completed_at",
            "completed_by",
            "created_by",
            "created_at",
            "updated_at",
        ]

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

        return (
            obj.assigned_to.username
        )

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
        return (
            obj.created_by.username
        )

    def get_completed_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.completed_by,
        )

    def get_completed_by_username(
        self,
        obj,
    ):
        if obj.completed_by is None:
            return None

        return (
            obj.completed_by.username
        )

    def validate_title(
        self,
        value,
    ):
        cleaned_value = (
            value.strip()
        )

        if not cleaned_value:
            raise serializers.ValidationError(
                "Follow-up title is required."
            )

        return cleaned_value

    def validate_description(
        self,
        value,
    ):
        return value.strip()

    def validate(
        self,
        attrs,
    ):
        request = self.context.get(
            "request"
        )

        user = getattr(
            request,
            "user",
            None,
        )

        profile = getattr(
            user,
            "profile",
            None,
        )

        current_status = (
            self.instance.status
            if self.instance is not None
            else FollowUp.Status.PENDING
        )

        requested_status = attrs.get(
            "status",
            current_status,
        )

        due_date = attrs.get(
            "due_date",
            (
                self.instance.due_date
                if self.instance is not None
                else None
            ),
        )

        if self.instance is None:
            if (
                due_date is not None
                and due_date
                <= timezone.now()
            ):
                raise serializers.ValidationError(
                    {
                        "due_date": (
                            "A new follow-up must "
                            "have a future due date."
                        )
                    }
                )

            if (
                requested_status
                != FollowUp.Status.PENDING
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "A new follow-up must "
                            "start as pending."
                        )
                    }
                )

        if self.instance is not None:
            if (
                self.instance.status
                in {
                    FollowUp.Status.COMPLETED,
                    FollowUp.Status.CANCELLED,
                }
                and attrs
            ):
                raise serializers.ValidationError(
                    {
                        "detail": (
                            "Completed or cancelled "
                            "follow-ups cannot be edited."
                        )
                    }
                )

            if (
                "due_date" in attrs
                and requested_status
                == FollowUp.Status.PENDING
                and due_date is not None
                and due_date
                <= timezone.now()
            ):
                raise serializers.ValidationError(
                    {
                        "due_date": (
                            "A pending follow-up must "
                            "have a future due date."
                        )
                    }
                )

        if "assigned_to" in attrs:
            if profile is None:
                raise serializers.ValidationError(
                    {
                        "assigned_to": (
                            "A valid authenticated "
                            "user profile is required."
                        )
                    }
                )

            assigned_to = attrs.get(
                "assigned_to"
            )

            if (
                profile.role
                == UserProfile.Role.SALES_REP
            ):
                if (
                    assigned_to is not None
                    and assigned_to.id
                    != user.id
                ):
                    raise serializers.ValidationError(
                        {
                            "assigned_to": (
                                "Sales Representatives "
                                "can only assign "
                                "follow-ups to themselves."
                            )
                        }
                    )

            elif profile.role not in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }:
                raise serializers.ValidationError(
                    {
                        "assigned_to": (
                            "You do not have permission "
                            "to assign follow-ups."
                        )
                    }
                )

        return attrs

    def update(
        self,
        instance,
        validated_data,
    ):
        requested_status = (
            validated_data.get(
                "status",
                instance.status,
            )
        )

        if (
            instance.status
            == FollowUp.Status.PENDING
            and requested_status
            == FollowUp.Status.COMPLETED
        ):
            request = self.context.get(
                "request"
            )

            user = getattr(
                request,
                "user",
                None,
            )

            validated_data[
                "completed_at"
            ] = timezone.now()

            validated_data[
                "completed_by"
            ] = user

        elif (
            requested_status
            != FollowUp.Status.COMPLETED
        ):
            validated_data[
                "completed_at"
            ] = None

            validated_data[
                "completed_by"
            ] = None

        return super().update(
            instance,
            validated_data,
        )


class CustomerSerializer(
    serializers.ModelSerializer,
):
    assigned_to_name = (
        serializers.SerializerMethodField()
    )

    assigned_to_username = (
        serializers.SerializerMethodField()
    )

    source_lead_company = serializers.CharField(
        source="source_lead.company_name",
        read_only=True,
    )

    source_lead_contact = serializers.CharField(
        source="source_lead.contact_name",
        read_only=True,
    )

    class Meta:
        model = Customer

        fields = [
            "id",
            "company_name",
            "contact_name",
            "email",
            "phone",
            "source_lead",
            "source_lead_company",
            "source_lead_contact",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "source_lead",
            "source_lead_company",
            "source_lead_contact",
            "created_at",
            "updated_at",
        ]

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

        return (
            obj.assigned_to.username
        )


class TechnicalAssessmentHistorySerializer(
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
        model = TechnicalAssessmentHistory

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


class TechnicalAssessmentRecommendationSerializer(
    serializers.ModelSerializer,
):
    engineer_name = (
        serializers.SerializerMethodField()
    )

    engineer_username = (
        serializers.SerializerMethodField()
    )

    availability_display = (
        serializers.CharField(
            source="get_availability_display",
            read_only=True,
        )
    )

    recommended_by_name = (
        serializers.SerializerMethodField()
    )

    engineer = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            is_active=True,
            profile__role=(
                UserProfile
                .Role
                .SOFTWARE_ENGINEER
            ),
        )
    )

    class Meta:
        model = (
            TechnicalAssessmentRecommendation
        )

        fields = [
            "id",
            "assessment",
            "engineer",
            "engineer_name",
            "engineer_username",
            "availability",
            "availability_display",
            "recommendation_notes",
            "recommended_by",
            "recommended_by_name",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "id",
            "assessment",
            "recommended_by",
            "created_at",
            "updated_at",
        ]

    def get_engineer_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.engineer,
        )

    def get_engineer_username(
        self,
        obj,
    ):
        return obj.engineer.username

    def get_recommended_by_name(
        self,
        obj,
    ):
        return get_user_display_name(
            obj.recommended_by,
        )

    def validate_recommendation_notes(
        self,
        value,
    ):
        return value.strip()

    @transaction.atomic
    def create(
        self,
        validated_data,
    ):
        assessment = (
            validated_data.get(
                "assessment"
            )
        )

        engineer = (
            validated_data.get(
                "engineer"
            )
        )

        if (
            assessment is not None
            and engineer is not None
            and TechnicalAssessmentRecommendation
            .objects
            .filter(
                assessment=assessment,
                engineer=engineer,
            )
            .exists()
        ):
            raise serializers.ValidationError(
                {
                    "engineer": (
                        "This Software Engineer "
                        "has already been recommended "
                        "for this assessment."
                    )
                }
            )

        recommendation = (
            super().create(
                validated_data
            )
        )

        TechnicalAssessmentHistory.objects.create(
            assessment=(
                recommendation.assessment
            ),
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .RECOMMENDATION_ADDED
            ),
            description=(
                "Software Engineer recommendation "
                f"added: "
                f"{get_user_display_name(recommendation.engineer)}."
            ),
            performed_by=(
                recommendation.recommended_by
            ),
            metadata={
                "engineer_id":
                    recommendation.engineer_id,

                "engineer_name":
                    get_user_display_name(
                        recommendation.engineer,
                    ),

                "availability":
                    recommendation.availability,
            },
        )

        return recommendation


class TechnicalAssessmentDocumentSerializer(
    serializers.ModelSerializer,
):
    file = serializers.FileField(
        write_only=True,
    )

    uploaded_by_name = (
        serializers.SerializerMethodField()
    )

    class Meta:
        model = TechnicalAssessmentDocument

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
            "crm:technical-assessment-document-download",
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

        TechnicalAssessmentHistory.objects.create(
            assessment=document.assessment,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .DOCUMENT_ADDED
            ),
            description=(
                "Technical assessment document "
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


class TechnicalAssessmentSerializer(
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

    recommendations = (
        TechnicalAssessmentRecommendationSerializer(
            many=True,
            read_only=True,
        )
    )

    documents = (
        TechnicalAssessmentDocumentSerializer(
            many=True,
            read_only=True,
        )
    )

    history = (
        TechnicalAssessmentHistorySerializer(
            many=True,
            read_only=True,
        )
    )

    class Meta:
        model = TechnicalAssessment

        fields = [
            "id",
            "lead",
            "lead_company_name",
            "lead_contact_name",
            "lead_status",
            "lead_status_display",
            "requested_by",
            "requested_by_name",
            "assigned_to",
            "assigned_to_name",
            "assigned_to_username",
            "requirements",
            "status",
            "status_display",
            "technical_comments",
            "submitted_at",
            "reviewed_at",
            "reviewed_by",
            "reviewed_by_name",
            "review_notes",
            "created_at",
            "updated_at",
            "recommendations",
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


class TechnicalAssessmentCreateSerializer(
    serializers.ModelSerializer,
):
    assigned_to = (
        serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .TECH_LEAD
                ),
            )
        )
    )

    class Meta:
        model = TechnicalAssessment

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
                "Technical assessment "
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
                "A technical assessment cannot "
                "be requested for a closed lead."
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
            and TechnicalAssessment
            .objects
            .filter(
                lead=lead,
                status__in=[
                    TechnicalAssessment
                    .Status
                    .REQUESTED,

                    TechnicalAssessment
                    .Status
                    .IN_PROGRESS,

                    TechnicalAssessment
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
                        "an active technical assessment."
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
            TechnicalAssessment
            .objects
            .create(
                requested_by=request.user,
                status=(
                    TechnicalAssessment
                    .Status
                    .REQUESTED
                ),
                **validated_data,
            )
        )

        TechnicalAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .REQUESTED
            ),
            description=(
                "Technical assessment requested "
                f"and assigned to "
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

        return assessment


class TechnicalAssessmentRequestUpdateSerializer(
    serializers.ModelSerializer,
):
    assigned_to = (
        serializers.PrimaryKeyRelatedField(
            queryset=User.objects.filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .TECH_LEAD
                ),
            ),
            required=False,
        )
    )

    class Meta:
        model = TechnicalAssessment

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
                "Technical assessment "
                "requirements are required."
            )

        return cleaned_value

    def validate(
        self,
        attrs,
    ):
        if (
            self.instance.status
            != TechnicalAssessment
            .Status
            .REQUESTED
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only a requested assessment "
                        "can have its request details "
                        "updated."
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

        updated = super().update(
            instance,
            validated_data,
        )

        changed_fields = []

        if (
            previous_assigned_to.id
            != updated.assigned_to_id
        ):
            changed_fields.append(
                "Assigned Tech Lead"
            )

        if (
            previous_requirements
            != updated.requirements
        ):
            changed_fields.append(
                "Requirements"
            )

        if changed_fields:
            TechnicalAssessmentHistory.objects.create(
                assessment=updated,
                event_type=(
                    TechnicalAssessmentHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Technical assessment request "
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


class TechnicalAssessmentWorkSerializer(
    serializers.ModelSerializer,
):
    class Meta:
        model = TechnicalAssessment

        fields = [
            "technical_comments",
        ]

    def validate_technical_comments(
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
            != TechnicalAssessment
            .Status
            .IN_PROGRESS
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Technical comments can only "
                        "be updated while the "
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
            instance.technical_comments
        )

        updated = super().update(
            instance,
            validated_data,
        )

        if (
            previous_comments
            != updated.technical_comments
        ):
            TechnicalAssessmentHistory.objects.create(
                assessment=updated,
                event_type=(
                    TechnicalAssessmentHistory
                    .EventType
                    .UPDATED
                ),
                description=(
                    "Technical assessment "
                    "comments updated."
                ),
                performed_by=getattr(
                    request,
                    "user",
                    None,
                ),
            )

        return updated


class TechnicalAssessmentReviewSerializer(
    serializers.ModelSerializer,
):
    class Meta:
        model = TechnicalAssessment

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
            != TechnicalAssessment
            .Status
            .SUBMITTED
        ):
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Only a submitted technical "
                        "assessment can be reviewed."
                    )
                }
            )

        return attrs
