from rest_framework.permissions import (
    BasePermission,
    SAFE_METHODS,
)

from accounts.models import UserProfile


class LeadPermission(BasePermission):
    message = (
        "You do not have permission "
        "to perform this lead action."
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

        if role in {
            UserProfile.Role.SOFTWARE_ENGINEER,
            UserProfile.Role.TECH_LEAD,
            UserProfile.Role.FINANCIAL_OFFICER,
        }:
            return False

        if getattr(
            view,
            "is_lead_conversion",
            False,
        ):
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        if request.method in SAFE_METHODS:
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.MARKETING,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
                UserProfile.Role.DIRECTOR,
            }

        if request.method == "POST":
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.MARKETING,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        if request.method in {
            "PUT",
            "PATCH",
        }:
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.MARKETING,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        return False

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        user = request.user

        profile = getattr(
            user,
            "profile",
            None,
        )

        if profile is None:
            return False

        role = profile.role

        if role in {
            UserProfile.Role.SOFTWARE_ENGINEER,
            UserProfile.Role.TECH_LEAD,
            UserProfile.Role.FINANCIAL_OFFICER,
        }:
            return False

        if role in {
            UserProfile.Role.ADMIN,
            UserProfile.Role.SALES_MANAGER,
            UserProfile.Role.PROJECT_MANAGER,
        }:
            return True

        if (
            role
            == UserProfile.Role.DIRECTOR
        ):
            return (
                request.method
                in SAFE_METHODS
            )

        if (
            role
            == UserProfile.Role.SALES_REP
        ):
            return (
                obj.assigned_to_id
                == user.id
            )

        if (
            role
            == UserProfile.Role.MARKETING
        ):
            if (
                request.method
                in SAFE_METHODS
            ):
                return True

            return (
                obj.created_by_id
                == user.id
                and obj.status
                == obj.Status.NEW
            )

        return False


class CommunicationPermission(
    BasePermission,
):
    message = (
        "You do not have permission "
        "to perform this communication action."
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

        if role in {
            UserProfile.Role.SOFTWARE_ENGINEER,
            UserProfile.Role.TECH_LEAD,
            UserProfile.Role.FINANCIAL_OFFICER,
        }:
            return False

        if request.method in SAFE_METHODS:
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.MARKETING,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
                UserProfile.Role.DIRECTOR,
            }

        if request.method == "POST":
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        return False


class FollowUpPermission(
    BasePermission,
):
    message = (
        "You do not have permission "
        "to perform this follow-up action."
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

        if role in {
            UserProfile.Role.SOFTWARE_ENGINEER,
            UserProfile.Role.TECH_LEAD,
            UserProfile.Role.FINANCIAL_OFFICER,
        }:
            return False

        if request.method in SAFE_METHODS:
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.MARKETING,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
                UserProfile.Role.DIRECTOR,
            }

        if request.method == "POST":
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        if request.method in {
            "PUT",
            "PATCH",
        }:
            return role in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_REP,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
            }

        return False


class LeadInsightPermission(
    BasePermission,
):
    """
    Read/analysis permission for lead-adjacent endpoints whose HTTP
    method does not map neatly to LeadPermission's CRUD rules.

    Lead history is a read operation and Rescue Radar is an advisory
    analysis operation even though it uses POST. Both must obey the same
    lead visibility boundary and must never become an alternate route
    around LeadPermission.
    """

    message = (
        "You do not have permission "
        "to access this lead insight."
    )

    allowed_roles = {
        UserProfile.Role.ADMIN,
        UserProfile.Role.MARKETING,
        UserProfile.Role.SALES_REP,
        UserProfile.Role.SALES_MANAGER,
        UserProfile.Role.PROJECT_MANAGER,
        UserProfile.Role.DIRECTOR,
    }

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

        return (
            profile.role
            in self.allowed_roles
        )

    def has_object_permission(
        self,
        request,
        view,
        obj,
    ):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if profile is None:
            return False

        if (
            profile.role
            not in self.allowed_roles
        ):
            return False

        if (
            profile.role
            == UserProfile.Role.SALES_REP
        ):
            return (
                obj.assigned_to_id
                == request.user.id
            )

        return True

