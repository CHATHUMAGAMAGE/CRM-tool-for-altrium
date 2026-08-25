from django.contrib.auth.models import User
from django.core import signing
from django.urls import reverse
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import UserProfile


PROFILE_AVATAR_SIGNING_SALT = (
    "eleven-crm-profile-avatar-v1"
)

ADMIN_ASSIGNABLE_ROLE_VALUES = {
    UserProfile.Role.ADMIN,
    UserProfile.Role.SALES_REP,
    UserProfile.Role.SALES_MANAGER,
    UserProfile.Role.TECH_LEAD,
    UserProfile.Role.FINANCIAL_OFFICER,
}

ADMIN_ASSIGNABLE_ROLE_CHOICES = [
    (role_value, role_label)
    for role_value, role_label
    in UserProfile.Role.choices
    if role_value
    in ADMIN_ASSIGNABLE_ROLE_VALUES
]


class CurrentUserSerializer(serializers.ModelSerializer):
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
    avatar_url = serializers.SerializerMethodField()

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
            "avatar_url",
        ]

    def get_avatar_url(self, obj):
        profile = getattr(
            obj,
            "profile",
            None,
        )

        if (
            profile is None
            or not profile.avatar_data
        ):
            return None

        token = signing.dumps(
            {
                "user_id": obj.pk,
                "avatar_name": profile.avatar_name,
            },
            salt=(
                PROFILE_AVATAR_SIGNING_SALT
            ),
        )

        path = reverse(
            "profile-avatar",
            kwargs={
                "token": token,
            },
        )

        request = self.context.get(
            "request"
        )

        if request is None:
            return path

        return request.build_absolute_uri(
            path
        )


class CurrentUserProfileUpdateSerializer(
    serializers.ModelSerializer,
):
    phone_number = serializers.CharField(
        source="profile.phone_number",
        required=False,
        allow_blank=True,
        max_length=20,
    )

    avatar = serializers.ImageField(
        source="profile.avatar_data",
        required=False,
        allow_null=True,
        write_only=True,
    )

    remove_avatar = serializers.BooleanField(
        required=False,
        default=False,
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "first_name",
            "last_name",
            "phone_number",
            "avatar",
            "remove_avatar",
        ]
        extra_kwargs = {
            "first_name": {
                "required": False,
                "allow_blank": True,
            },
            "last_name": {
                "required": False,
                "allow_blank": True,
            },
        }

    def validate_avatar(self, value):
        if value is None:
            return value

        maximum_size = 5 * 1024 * 1024

        if value.size > maximum_size:
            raise serializers.ValidationError(
                "Profile pictures must be 5 MB or smaller."
            )

        allowed_content_types = {
            "image/jpeg",
            "image/png",
            "image/webp",
        }

        content_type = getattr(
            value,
            "content_type",
            "",
        )

        if (
            content_type
            and content_type
            not in allowed_content_types
        ):
            raise serializers.ValidationError(
                "Use a JPEG, PNG, or WebP image."
            )

        return value

    def validate(self, attrs):
        profile_data = attrs.get(
            "profile",
            {},
        )

        if (
            attrs.get(
                "remove_avatar",
                False,
            )
            and profile_data.get(
                "avatar_data"
            ) is not None
        ):
            raise serializers.ValidationError(
                {
                    "avatar": (
                        "Upload a new picture or remove the existing "
                        "picture, not both at once."
                    )
                }
            )

        return attrs

    def update(
        self,
        instance,
        validated_data,
    ):
        profile_data = validated_data.pop(
            "profile",
            {},
        )

        remove_avatar = validated_data.pop(
            "remove_avatar",
            False,
        )

        user_update_fields = []

        for field in (
            "first_name",
            "last_name",
        ):
            if field in validated_data:
                setattr(
                    instance,
                    field,
                    validated_data[field],
                )
                user_update_fields.append(
                    field
                )

        if user_update_fields:
            instance.save(
                update_fields=(
                    user_update_fields
                )
            )

        profile = instance.profile
        profile_changed = False

        if "phone_number" in profile_data:
            profile.phone_number = (
                profile_data[
                    "phone_number"
                ]
            )
            profile_changed = True

        if remove_avatar:
            profile.avatar_data = None
            profile.avatar_name = ""
            profile.avatar_content_type = ""
            profile.avatar_size = None
            profile_changed = True

        elif "avatar_data" in profile_data:
            new_avatar = profile_data[
                "avatar_data"
            ]

            profile.avatar_data = new_avatar.read()
            profile.avatar_name = new_avatar.name
            profile.avatar_content_type = getattr(
                new_avatar,
                "content_type",
                "application/octet-stream",
            )
            profile.avatar_size = new_avatar.size
            profile_changed = True

        if profile_changed:
            profile.save()

        return instance


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
        choices=ADMIN_ASSIGNABLE_ROLE_CHOICES,
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

    def validate_role(self, value):
        if value in ADMIN_ASSIGNABLE_ROLE_VALUES:
            return value

        if (
            self.instance
            and self.instance.profile.role
            == value
        ):
            # Existing legacy roles can remain unchanged so an
            # administrator can still edit other account details.
            return value

        raise serializers.ValidationError(
            "This role is not assignable in the current CRM workflow."
        )

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
