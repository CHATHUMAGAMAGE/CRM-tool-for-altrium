from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import serializers

from accounts.models import UserProfile

from .models import Communication, Lead


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
            requested_status == Lead.Status.CONVERTED
            and current_status != Lead.Status.CONVERTED
        ):
            raise serializers.ValidationError(
                {
                    "status": (
                        "Leads must be converted through the "
                        "dedicated conversion workflow."
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
