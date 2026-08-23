from django.urls import path

from .reminders import FollowUpReminderListView

from .views import (
    CommunicationListCreateView,
    DashboardStatsView,
    FollowUpDetailView,
    FollowUpListCreateView,
    LeadConvertView,
    LeadDetailView,
    LeadHistoryListView,
    LeadListCreateView,
    LeadRescueRadarView,
)


app_name = "crm"


urlpatterns = [
    path(
        "dashboard/",
        DashboardStatsView.as_view(),
        name="dashboard-stats",
    ),

    path(
        "leads/",
        LeadListCreateView.as_view(),
        name="lead-list-create",
    ),

    path(
        "leads/<int:pk>/",
        LeadDetailView.as_view(),
        name="lead-detail",
    ),

    path(
        "leads/<int:lead_id>/history/",
        LeadHistoryListView.as_view(),
        name="lead-history",
    ),

    path(
        "leads/<int:pk>/rescue-radar/",
        LeadRescueRadarView.as_view(),
        name="lead-rescue-radar",
    ),

    path(
        "leads/<int:pk>/convert/",
        LeadConvertView.as_view(),
        name="lead-convert",
    ),

    path(
        "leads/<int:lead_id>/communications/",
        CommunicationListCreateView.as_view(),
        name="communication-list-create",
    ),

    path(
        "leads/<int:lead_id>/follow-ups/",
        FollowUpListCreateView.as_view(),
        name="follow-up-list-create",
    ),

    path(
        "follow-ups/<int:pk>/",
        FollowUpDetailView.as_view(),
        name="follow-up-detail",
    ),

    path(
        "follow-up-reminders/",
        FollowUpReminderListView.as_view(),
        name="follow-up-reminder-list",
    ),
]