from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.models import UserProfile

from .models import Customer, Lead
from .permissions import LeadPermission
from .serializers import CustomerSerializer, LeadSerializer


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

        status_param = self.request.query_params.get("status")

        if status_param:
            queryset = queryset.filter(
                status=status_param,
            )

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