from django.contrib.auth.models import User
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