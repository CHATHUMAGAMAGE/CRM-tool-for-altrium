from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from accounts.models import UserProfile


class FinancialAssessmentPermission(
    BasePermission,
):
    message = (
        "You do not have permission to perform "
        "this financial assessment action."
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

        if role == UserProfile.Role.ADMIN:
            return False

        if request.method in SAFE_METHODS:
            return role in {
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.FINANCIAL_OFFICER,
            }

        action = getattr(
            view,
            "financial_assessment_action",
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
            "document",
        }:
            return (
                role
                == UserProfile.Role.FINANCIAL_OFFICER
            )

        if action == "review":
            return (
                role
                == UserProfile.Role.SALES_MANAGER
            )

        return False
