from django.urls import path

from .views import (
    LeadConvertView,
    LeadDetailView,
    LeadListCreateView,
)


app_name = "crm"


urlpatterns = [
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

]
