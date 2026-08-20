from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile

from .models import Communication, Customer, FollowUp, Lead


User = get_user_model()


class LeadSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_username = serializers.SerializerMethodField()

    created_by_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

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

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return None

        full_name = obj.assigned_to.get_full_name().strip()

        return full_name or obj.assigned_to.username

    def get_assigned_to_username(self, obj):
        if obj.assigned_to is None:
            return None

        return obj.assigned_to.username

    def get_created_by_name(self, obj):
        full_name = obj.created_by.get_full_name().strip()

        return full_name or obj.created_by.username

    def get_created_by_username(self, obj):
        return obj.created_by.username

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        profile = getattr(user, "profile", None)

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

        if (
            requested_status == Lead.Status.LOST
            and not (lost_reason or "").strip()
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
            requested_status == Lead.Status.WON
            and current_status != Lead.Status.WON
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

    def create(self, validated_data):
        request = self.context["request"]

        return Lead.objects.create(
            created_by=request.user,
            **validated_data,
        )

    def update(self, instance, validated_data):
        requested_status = validated_data.get(
            "status",
            instance.status,
        )

        if requested_status != Lead.Status.LOST:
            validated_data["lost_reason"] = ""

        return super().update(
            instance,
            validated_data,
        )


class CommunicationSerializer(serializers.ModelSerializer):
    communication_type_display = serializers.CharField(
        source="get_communication_type_display",
        read_only=True,
    )

    created_by_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

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

    def get_created_by_name(self, obj):
        full_name = obj.created_by.get_full_name().strip()

        return full_name or obj.created_by.username

    def get_created_by_username(self, obj):
        return obj.created_by.username

    def validate_communication_date(self, value):
        if value > timezone.now():
            raise serializers.ValidationError(
                "Communication date cannot be in the future."
            )

        return value

    def validate_summary(self, value):
        cleaned_value = value.strip()

        if not cleaned_value:
            raise serializers.ValidationError(
                "Communication summary is required."
            )

        return cleaned_value

    def validate_notes(self, value):
        return value.strip()


class FollowUpSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    is_overdue = serializers.BooleanField(
        read_only=True,
    )

    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_username = serializers.SerializerMethodField()

    created_by_name = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()

    completed_by_name = serializers.SerializerMethodField()
    completed_by_username = serializers.SerializerMethodField()

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

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return None

        full_name = obj.assigned_to.get_full_name().strip()

        return full_name or obj.assigned_to.username

    def get_assigned_to_username(self, obj):
        if obj.assigned_to is None:
            return None

        return obj.assigned_to.username

    def get_created_by_name(self, obj):
        full_name = obj.created_by.get_full_name().strip()

        return full_name or obj.created_by.username

    def get_created_by_username(self, obj):
        return obj.created_by.username

    def get_completed_by_name(self, obj):
        if obj.completed_by is None:
            return None

        full_name = obj.completed_by.get_full_name().strip()

        return full_name or obj.completed_by.username

    def get_completed_by_username(self, obj):
        if obj.completed_by is None:
            return None

        return obj.completed_by.username

    def validate_title(self, value):
        cleaned_value = value.strip()

        if not cleaned_value:
            raise serializers.ValidationError(
                "Follow-up title is required."
            )

        return cleaned_value

    def validate_description(self, value):
        return value.strip()

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        profile = getattr(user, "profile", None)

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
                and due_date <= timezone.now()
            ):
                raise serializers.ValidationError(
                    {
                        "due_date": (
                            "A new follow-up must have a future due date."
                        )
                    }
                )

            if requested_status != FollowUp.Status.PENDING:
                raise serializers.ValidationError(
                    {
                        "status": (
                            "A new follow-up must start as pending."
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
                and requested_status
                != self.instance.status
            ):
                raise serializers.ValidationError(
                    {
                        "status": (
                            "Completed or cancelled follow-ups cannot "
                            "be reopened."
                        )
                    }
                )

            if (
                "due_date" in attrs
                and requested_status == FollowUp.Status.PENDING
                and due_date is not None
                and due_date <= timezone.now()
            ):
                raise serializers.ValidationError(
                    {
                        "due_date": (
                            "A pending follow-up must have a future due date."
                        )
                    }
                )

        if "assigned_to" in attrs:
            if profile is None:
                raise serializers.ValidationError(
                    {
                        "assigned_to": (
                            "A valid authenticated user profile is required."
                        )
                    }
                )

            assigned_to = attrs.get("assigned_to")

            if profile.role == UserProfile.Role.SALES_REP:
                if (
                    assigned_to is not None
                    and assigned_to.id != user.id
                ):
                    raise serializers.ValidationError(
                        {
                            "assigned_to": (
                                "Sales Representatives can only assign "
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
                            "You do not have permission to assign "
                            "follow-ups."
                        )
                    }
                )

        return attrs

    def update(self, instance, validated_data):
        requested_status = validated_data.get(
            "status",
            instance.status,
        )

        if (
            instance.status == FollowUp.Status.PENDING
            and requested_status
            == FollowUp.Status.COMPLETED
        ):
            request = self.context.get("request")
            user = getattr(request, "user", None)

            validated_data["completed_at"] = timezone.now()
            validated_data["completed_by"] = user

        elif requested_status != FollowUp.Status.COMPLETED:
            validated_data["completed_at"] = None
            validated_data["completed_by"] = None

        return super().update(
            instance,
            validated_data,
        )


class CustomerSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.SerializerMethodField()
    assigned_to_username = serializers.SerializerMethodField()

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

    def get_assigned_to_name(self, obj):
        if obj.assigned_to is None:
            return None

        full_name = obj.assigned_to.get_full_name().strip()

        return full_name or obj.assigned_to.username

    def get_assigned_to_username(self, obj):
        if obj.assigned_to is None:
            return None

        return obj.assigned_to.username