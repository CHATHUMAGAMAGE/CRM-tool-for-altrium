from datetime import timedelta

from django.utils import timezone

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from accounts.models import UserProfile

from .models import FollowUp
from .permissions import OperationalCrmPermission
from .serializers import FollowUpSerializer


class FollowUpReminderListView(
    generics.ListAPIView,
):
    """
    Computed follow-up reminders.

    Sales Representatives:
        - Their own pending follow-ups
        - Overdue reminders
        - Follow-ups due within the next 24 hours

    Sales Manager / Admin / Project Manager:
        - Team overdue follow-ups only

    No notification records are stored in the database.
    """

    serializer_class = FollowUpSerializer

    permission_classes = [
        IsAuthenticated,
        OperationalCrmPermission,
    ]

    def get_queryset(self):
        user = self.request.user

        profile = getattr(
            user,
            "profile",
            None,
        )

        if profile is None:
            return FollowUp.objects.none()

        now = timezone.now()

        queryset = (
            FollowUp.objects
            .select_related(
                "lead",
                "lead__assigned_to",
                "assigned_to",
                "assigned_to__profile",
                "created_by",
                "created_by__profile",
                "completed_by",
                "completed_by__profile",
            )
            .filter(
                status=FollowUp.Status.PENDING,
            )
        )

        # Sales Representative:
        # Show their own reminders that are overdue
        # or due within the next 24 hours.
        if (
            profile.role ==
            UserProfile.Role.SALES_REP
        ):
            reminder_window_end = (
                now +
                timedelta(hours=24)
            )

            return (
                queryset
                .filter(
                    assigned_to=user,
                    due_date__lte=
                    reminder_window_end,
                )
                .order_by(
                    "due_date",
                )
            )

        # Managers:
        # Only surface overdue team follow-ups
        # so they are not flooded with every
        # Sales Rep reminder.
        if profile.role in {
            UserProfile.Role.ADMIN,
            UserProfile.Role.SALES_MANAGER,
            UserProfile.Role.PROJECT_MANAGER,
        }:
            return (
                queryset
                .filter(
                    due_date__lt=now,
                )
                .order_by(
                    "due_date",
                )
            )

        return FollowUp.objects.none()
