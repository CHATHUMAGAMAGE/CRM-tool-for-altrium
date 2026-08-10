from django.urls import path

from .views import (
    CommunicationListCreateView,
    DashboardStatsView,
    FollowUpDetailView,
    FollowUpListCreateView,
    LeadConvertView,
    LeadDetailView,
    LeadListCreateView,
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
]