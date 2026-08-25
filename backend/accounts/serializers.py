from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile


class CurrentUserSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source="profile.role")
    role_display = serializers.CharField(
        source="profile.get_role_display",
        read_only=True,
    )
    phone_number = serializers.CharField(
        source="profile.phone_number",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone_number",
        ]


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError(
                {
                    "confirm_password": (
                        "The password confirmation does not match."
                    )
                }
            )

        user = self.context.get("user")

        if user is not None:
            validate_password(attrs["new_password"], user=user)

        return attrs


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField(
        write_only=True,
        trim_whitespace=False,
    )


class AdminDashboardSummarySerializer(serializers.Serializer):
    total_users = serializers.IntegerField(min_value=0)
    active_users = serializers.IntegerField(min_value=0)
    inactive_users = serializers.IntegerField(min_value=0)
    role_counts = serializers.DictField(
        child=serializers.IntegerField(min_value=0),
    )


class AdminUserListSerializer(serializers.ModelSerializer):
    role = serializers.CharField(
        source="profile.role",
        read_only=True,
    )
    role_display = serializers.CharField(
        source="profile.get_role_display",
        read_only=True,
    )
    phone_number = serializers.CharField(
        source="profile.phone_number",
        read_only=True,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "role_display",
            "phone_number",
            "is_active",
            "date_joined",
            "last_login",
        ]
        read_only_fields = fields

class SalesRepLookupSerializer(serializers.ModelSerializer):
    role = serializers.CharField(
        source="profile.role",
        read_only=True,
    )

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "role",
        ]
        read_only_fields = fields

    def get_full_name(self, obj):
        full_name = obj.get_full_name().strip()
        return full_name or obj.username

class AdminUserCreateSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(
        required=True,
        allow_blank=False,
    )
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        write_only=True,
    )
    phone_number = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        max_length=20,
    )

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "role",
            "phone_number",
        ]
        read_only_fields = ["id"]

    def validate_username(self, value):
        normalized_username = value.strip()

        if User.objects.filter(
            username__iexact=normalized_username,
        ).exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )

        return normalized_username

    def validate_email(self, value):
        normalized_email = value.strip().lower()

        if User.objects.filter(
            email__iexact=normalized_email,
        ).exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )

        return normalized_email

    def create(self, validated_data):
        role = validated_data.pop("role")
        phone_number = validated_data.pop(
            "phone_number",
            "",
        )

        user = User(**validated_data)
        user.set_unusable_password()
        user.save()

        user.profile.role = role
        user.profile.phone_number = phone_number
        user.profile.save(
            update_fields=[
                "role",
                "phone_number",
            ]
        )

        return user


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    username = serializers.CharField(
        required=False,
        allow_blank=False,
        max_length=150,
    )
    email = serializers.EmailField(
        required=False,
        allow_blank=False,
    )
    role = serializers.ChoiceField(
        choices=UserProfile.Role.choices,
        source="profile.role",
        required=False,
    )
    phone_number = serializers.CharField(
        source="profile.phone_number",
        required=False,
        allow_blank=True,
        max_length=20,
    )

    class Meta:
        model = User
        fields = [
            "username",
            "first_name",
            "last_name",
            "email",
            "role",
            "phone_number",
            "is_active",
        ]

    def validate_username(self, value):
        normalized_username = value.strip()

        existing_users = User.objects.filter(
            username__iexact=normalized_username,
        )

        if self.instance:
            existing_users = existing_users.exclude(
                pk=self.instance.pk,
            )

        if existing_users.exists():
            raise serializers.ValidationError(
                "A user with this username already exists."
            )

        return normalized_username

    def validate_email(self, value):
        normalized_email = value.strip().lower()

        existing_users = User.objects.filter(
            email__iexact=normalized_email,
        )

        if self.instance:
            existing_users = existing_users.exclude(
                pk=self.instance.pk,
            )

        if existing_users.exists():
            raise serializers.ValidationError(
                "A user with this email address already exists."
            )

        return normalized_email

    def validate(self, attrs):
        request = self.context.get("request")
        target_user = self.instance

        if (
            request
            and target_user
            and request.user.pk == target_user.pk
        ):
            profile_data = attrs.get("profile", {})

            if (
                "role" in profile_data
                and profile_data["role"]
                != UserProfile.Role.ADMIN
            ):
                raise serializers.ValidationError(
                    {
                        "role": (
                            "You cannot remove your own "
                            "administrator role."
                        )
                    }
                )

            if attrs.get("is_active") is False:
                raise serializers.ValidationError(
                    {
                        "is_active": (
                            "You cannot deactivate your own account."
                        )
                    }
                )

        return attrs

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})

        for field, value in validated_data.items():
            setattr(instance, field, value)

        instance.save()

        if "role" in profile_data:
            instance.profile.role = profile_data["role"]

        if "phone_number" in profile_data:
            instance.profile.phone_number = (
                profile_data["phone_number"]
            )

        instance.profile.save()

        return instance


class MFASetupStartSerializer(serializers.Serializer):
    challenge_token = serializers.CharField(
        trim_whitespace=False,
    )


class MFACodeVerificationSerializer(serializers.Serializer):
    challenge_token = serializers.CharField(
        trim_whitespace=False,
    )

    code = serializers.CharField(
        trim_whitespace=True,
        min_length=6,
        max_length=32,
    )

