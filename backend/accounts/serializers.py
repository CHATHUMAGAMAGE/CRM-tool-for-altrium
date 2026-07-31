from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


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