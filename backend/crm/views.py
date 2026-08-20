from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile

from .models import Communication, Customer, FollowUp, Lead
from .permissions import (
    CommunicationPermission,
    FollowUpPermission,
    LeadPermission,
)
from .serializers import (
    CommunicationSerializer,
    CustomerSerializer,
    FollowUpSerializer,
    LeadSerializer,
)


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

        source = self.request.query_params.get(
            "source",
        )

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
            Lead.Status.QUALIFIED,
            Lead.Status.PROPOSAL,
        ]

        closed_statuses = [
            Lead.Status.WON,
            Lead.Status.LOST,
            Lead.Status.DISQUALIFIED,
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
            Lead.Status.WON,
            Lead.Status.LOST,
            Lead.Status.DISQUALIFIED,
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


class FollowUpListCreateView(
    generics.ListCreateAPIView,
):
    serializer_class = FollowUpSerializer

    permission_classes = [
        IsAuthenticated,
        FollowUpPermission,
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

        queryset = FollowUp.objects.filter(
            lead=lead,
        ).select_related(
            "assigned_to",
            "assigned_to__profile",
            "created_by",
            "created_by__profile",
            "completed_by",
            "completed_by__profile",
        )

        status_value = self.request.query_params.get("status")
        if status_value:
            queryset = queryset.filter(
                status=status_value,
            )

        return queryset.order_by(
            "due_date",
            "created_at",
        )

    def perform_create(self, serializer):
        lead = self.get_lead()
        user = self.request.user
        profile = getattr(
            user,
            "profile",
            None,
        )

        if lead.status in {
            Lead.Status.WON,
            Lead.Status.LOST,
            Lead.Status.DISQUALIFIED,
        }:
            raise ValidationError(
                {
                    "lead": (
                        "Follow-ups cannot be scheduled for a "
                        "closed lead."
                    )
                }
            )

        assigned_to = serializer.validated_data.get(
            "assigned_to",
        )

        if profile.role == UserProfile.Role.SALES_REP:
            assigned_to = user

        elif assigned_to is None:
            assigned_to = lead.assigned_to

        serializer.save(
            lead=lead,
            assigned_to=assigned_to,
            created_by=user,
            status=FollowUp.Status.PENDING,
        )


class FollowUpDetailView(
    generics.RetrieveUpdateAPIView,
):
    serializer_class = FollowUpSerializer

    permission_classes = [
        IsAuthenticated,
        FollowUpPermission,
    ]

    http_method_names = [
        "get",
        "patch",
        "head",
        "options",
    ]

    def get_queryset(self):
        user = self.request.user
        profile = getattr(
            user,
            "profile",
            None,
        )

        queryset = FollowUp.objects.select_related(
            "lead",
            "lead__assigned_to",
            "assigned_to",
            "assigned_to__profile",
            "created_by",
            "created_by__profile",
            "completed_by",
            "completed_by__profile",
        )

        if profile is None:
            return queryset.none()

        if (
            profile.role
            == UserProfile.Role.SOFTWARE_ENGINEER
        ):
            return queryset.none()

        if (
            profile.role
            == UserProfile.Role.SALES_REP
        ):
            return queryset.filter(
                lead__assigned_to=user,
                assigned_to=user,
            )

        return queryset


class DashboardStatsView(generics.GenericAPIView):
    permission_classes = [
        IsAuthenticated,
    ]

    def get(self, request):
        user = request.user
        profile = getattr(user, "profile", None)

        if profile is None:
            return Response(
                {
                    "customers": 0,
                    "leads": 0,
                    "opportunities": 0,
                    "projects": 0,
                }
            )

        role = profile.role

        active_statuses = [
            Lead.Status.NEW,
            Lead.Status.CONTACTED,
            Lead.Status.FOLLOW_UP_REQUIRED,
            Lead.Status.QUALIFIED,
            Lead.Status.PROPOSAL_SENT,
            Lead.Status.NEGOTIATION,
        ]

        if role == UserProfile.Role.SALES_REP:
            customers_count = Customer.objects.filter(
                assigned_to=user,
            ).count()

            leads_count = Lead.objects.filter(
                assigned_to=user,
                status__in=active_statuses,
            ).count()

        else:
            customers_count = Customer.objects.count()

            leads_count = Lead.objects.filter(
                status__in=active_statuses,
            ).count()

        return Response(
            {
                "customers": customers_count,
                "leads": leads_count,
                "opportunities": 0,
                "projects": 0,
            }
        )


class LeadConvertView(
    LeadQuerysetMixin,
    generics.GenericAPIView,
):
    serializer_class = CustomerSerializer

    permission_classes = [
        IsAuthenticated,
        LeadPermission,
    ]

    is_lead_conversion = True

    @transaction.atomic
    def post(self, request, pk):
        try:
            lead = (
                self.get_queryset()
                .select_related(None)
                .select_for_update()
                .get(pk=pk)
            )
        except Lead.DoesNotExist:
            from rest_framework.exceptions import NotFound

            raise NotFound("Lead not found.")

        self.check_object_permissions(
            request,
            lead,
        )

        if lead.status == Lead.Status.CONVERTED:
            return Response(
                {
                    "detail": (
                        "This lead has already been converted."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if hasattr(lead, "customer"):
            return Response(
                {
                    "detail": (
                        "A customer already exists for this lead."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        customer = Customer.objects.create(
            company_name=lead.company_name,
            contact_name=lead.contact_name,
            email=lead.email,
            phone=lead.phone,
            source_lead=lead,
            assigned_to=lead.assigned_to,
        )

        lead.status = Lead.Status.CONVERTED
        lead.converted_at = timezone.now()

        lead.save(
            update_fields=[
                "status",
                "converted_at",
                "updated_at",
            ]
        )

        return Response(
            {
                "lead": LeadSerializer(
                    lead,
                    context={
                        "request": request,
                    },
                ).data,
                "customer": CustomerSerializer(
                    customer,
                    context={
                        "request": request,
                    },
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )