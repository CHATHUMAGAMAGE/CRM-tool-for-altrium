from rest_framework.permissions import BasePermission

from .models import UserProfile


class IsAdminRole(BasePermission):
    message = "Administrator access is required."

    def has_permission(self, request, view):
        user = request.user
        profile = getattr(user, "profile", None)

        return bool(
            user
            and user.is_authenticated
            and profile
            and profile.role == UserProfile.Role.ADMIN
        )
