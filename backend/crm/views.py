from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated

from accounts.models import UserProfile

from .models import Communication, Lead
from .permissions import CommunicationPermission, LeadPermission
from .serializers import CommunicationSerializer, LeadSerializer


class LeadQuerysetMixin:
    def get_queryset(self):
        user = self.request.user
        profile = getattr(user, "profile", None)

        queryset = Lead.objects.select_related(
            "assigned_to",
            "assigned_to__profile",
            "created_by",
            "created_by__profile",
        )

        if profile is None:
            return queryset.none()

        role = profile.role

        if role == UserProfile.Role.SOFTWARE_ENGINEER:
            return queryset.none()

        if role == UserProfile.Role.SALES_REP:
            queryset = queryset.filter(
                assigned_to=user,
            )

        search = self.request.query_params.get(
            "search",
            "",
        ).strip()

        if search:
            queryset = queryset.filter(
                Q(contact_name__icontains=search)
                | Q(company_name__icontains=search)
                | Q(email__icontains=search)
                | Q(phone__icontains=search)
            )

        status = self.request.query_params.get("status")

        if status:
            queryset = queryset.filter(status=status)

        source = self.request.query_params.get("source")

        if source:
            queryset = queryset.filter(
                source__iexact=source,
            )

        assigned_to = self.request.query_params.get(
            "assigned_to",
        )

        if (
            assigned_to
            and role
            in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_MANAGER,
                UserProfile.Role.PROJECT_MANAGER,
                UserProfile.Role.DIRECTOR,
                UserProfile.Role.MARKETING,
            }
        ):
            if assigned_to.lower() == "unassigned":
                queryset = queryset.filter(
                    assigned_to__isnull=True,
                )
            else:
                queryset = queryset.filter(
                    assigned_to_id=assigned_to,
                )

        lead_view = self.request.query_params.get(
            "view",
        )

        active_statuses = [
            Lead.Status.NEW,
            Lead.Status.CONTACTED,
            Lead.Status.FOLLOW_UP_REQUIRED,
            Lead.Status.QUALIFIED,
            Lead.Status.PROPOSAL_SENT,
            Lead.Status.NEGOTIATION,
        ]

        closed_statuses = [
            Lead.Status.CONVERTED,
            Lead.Status.LOST,
        ]

        if lead_view == "active":
            queryset = queryset.filter(
                status__in=active_statuses,
            )

        elif lead_view == "closed":
            queryset = queryset.filter(
                status__in=closed_statuses,
            )

        return queryset


class LeadListCreateView(
    LeadQuerysetMixin,
    generics.ListCreateAPIView,
):
    serializer_class = LeadSerializer

    permission_classes = [
        IsAuthenticated,
        LeadPermission,
    ]

    filter_backends = [
        SearchFilter,
        OrderingFilter,
    ]

    search_fields = [
        "contact_name",
        "company_name",
        "email",
        "phone",
        "source",
    ]

    ordering_fields = [
        "created_at",
        "updated_at",
        "company_name",
        "contact_name",
        "status",
    ]

    ordering = [
        "-created_at",
    ]


class LeadDetailView(
    LeadQuerysetMixin,
    generics.RetrieveUpdateAPIView,
):
    serializer_class = LeadSerializer

    permission_classes = [
        IsAuthenticated,
        LeadPermission,
    ]


class CommunicationListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = CommunicationSerializer

    permission_classes = [
        IsAuthenticated,
        CommunicationPermission,
    ]

    def get_accessible_leads(self):
        user = self.request.user
        profile = getattr(user, "profile", None)

        queryset = Lead.objects.select_related(
            "assigned_to",
            "created_by",
        )

        if profile is None:
            return queryset.none()

        role = profile.role

        if role == UserProfile.Role.SOFTWARE_ENGINEER:
            return queryset.none()

        if role == UserProfile.Role.SALES_REP:
            return queryset.filter(
                assigned_to=user,
            )

        return queryset

    def get_lead(self):
        if hasattr(self, "_lead"):
            return self._lead

        self._lead = get_object_or_404(
            self.get_accessible_leads(),
            pk=self.kwargs["lead_id"],
        )

        return self._lead

    def get_queryset(self):
        lead = self.get_lead()

        return Communication.objects.filter(
            lead=lead,
        ).select_related(
            "created_by",
            "created_by__profile",
        ).order_by(
            "-communication_date",
            "-created_at",
        )

    def perform_create(self, serializer):
        lead = self.get_lead()

        if lead.status in {
            Lead.Status.CONVERTED,
            Lead.Status.LOST,
        }:
            raise ValidationError(
                {
                    "lead": (
                        "Communications cannot be added to a "
                        "closed lead."
                    )
                }
            )

        serializer.save(
            lead=lead,
            created_by=self.request.user,
        )
