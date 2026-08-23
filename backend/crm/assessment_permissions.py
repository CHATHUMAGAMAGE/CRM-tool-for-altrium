from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from accounts.models import UserProfile


class TechnicalAssessmentPermission(
    BasePermission,
):
    message = (
        "You do not have permission to perform "
        "this technical assessment action."
    )

    def has_permission(
        self,
        request,
        view,
    ):
        user = request.user

        if (
            not user
            or not user.is_authenticated
        ):
            return False

        profile = getattr(
            user,
            "profile",
            None,
        )

        if profile is None:
            return False

        role = profile.role

        if (
            role
            == UserProfile.Role.ADMIN
        ):
            return True

        if request.method in SAFE_METHODS:
            return role in {
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.TECH_LEAD,
            }

        action = getattr(
            view,
            "technical_assessment_action",
            None,
        )

        if action == "create":
            return (
                role
                == UserProfile.Role.SALES_MANAGER
            )

        if action == "request_update":
            return (
                role
                == UserProfile.Role.SALES_MANAGER
            )

        if action in {
            "start",
            "work",
            "submit",
            "recommendation",
            "recommendation_delete",
            "document",
        }:
            return (
                role
                == UserProfile.Role.TECH_LEAD
            )

        if action == "review":
            return (
                role
                == UserProfile.Role.SALES_MANAGER
            )

        return False