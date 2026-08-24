from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import (
    BasePermission,
    IsAuthenticated,
)
from rest_framework.response import Response

from accounts.models import UserProfile

from .models import (
    Deal,
    FinancialAssessment,
    Lead,
    LeadHistory,
    LeadOpportunityDecision,
    TechnicalAssessment,
)

from .opportunity_serializers import (
    DealSerializer,
    LeadOpportunityDecisionSerializer,
    OpportunityDecisionInputSerializer,
)

from .serializers import (
    LeadSerializer,
)


class OpportunityManagementPermission(
    BasePermission,
):
    message = (
        "Only a Sales Manager or "
        "Administrator can perform "
        "this opportunity action."
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

        return profile.role in {
            UserProfile.Role.ADMIN,
            UserProfile.Role.SALES_MANAGER,
        }


def get_latest_reviewed_financial_assessment(
    lead,
):
    return (
        FinancialAssessment.objects
        .select_related(
            "lead",
            "technical_assessment",
            "requested_by",
            "assigned_to",
            "reviewed_by",
        )
        .filter(
            lead=lead,
            status=(
                FinancialAssessment
                .Status
                .REVIEWED
            ),
        )
        .order_by(
            "-reviewed_at",
            "-id",
        )
        .first()
    )


class LeadOpportunityDecisionView(
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        OpportunityManagementPermission,
    ]

    def get_lead(
        self,
    ):
        return get_object_or_404(
            Lead.objects.select_related(
                "assigned_to",
                "created_by",
            ),
            pk=self.kwargs[
                "pk"
            ],
        )

    def get(
        self,
        request,
        pk,
    ):
        lead = self.get_lead()

        try:
            decision = (
                LeadOpportunityDecision
                .objects
                .select_related(
                    "lead",
                    "technical_assessment",
                    "financial_assessment",
                    "decided_by",
                )
                .get(
                    lead=lead,
                )
            )

        except (
            LeadOpportunityDecision
            .DoesNotExist
        ):
            return Response(
                {
                    "decision":
                        None,

                    "can_convert":
                        False,

                    "deal":
                        None,
                },
                status=(
                    status
                    .HTTP_200_OK
                ),
            )

        deal = (
            Deal.objects
            .select_related(
                "source_lead",
                "opportunity_decision",
                "opportunity_decision__decided_by",
                "assigned_to",
                "created_by",
            )
            .filter(
                source_lead=lead,
            )
            .first()
        )

        return Response(
            {
                "decision":
                    (
                        LeadOpportunityDecisionSerializer(
                            decision,
                            context={
                                "request":
                                    request,
                            },
                        ).data
                    ),

                "can_convert":
                    (
                        decision.decision
                        == (
                            LeadOpportunityDecision
                            .Decision
                            .APPROVED
                        )
                        and deal is None
                        and lead.status
                        == Lead.Status.QUALIFIED
                    ),

                "deal":
                    (
                        DealSerializer(
                            deal,
                            context={
                                "request":
                                    request,
                            },
                        ).data
                        if deal is not None
                        else None
                    ),
            },
            status=(
                status
                .HTTP_200_OK
            ),
        )

    @transaction.atomic
    def post(
        self,
        request,
        pk,
    ):
        input_serializer = (
            OpportunityDecisionInputSerializer(
                data=request.data,
            )
        )

        input_serializer.is_valid(
            raise_exception=True,
        )

        try:
            lead = (
                Lead.objects
                .select_for_update()
                .get(
                    pk=pk,
                )
            )

        except Lead.DoesNotExist:
            raise NotFound(
                "Lead not found."
            )

        if (
            LeadOpportunityDecision
            .objects
            .filter(
                lead=lead,
            )
            .exists()
        ):
            return Response(
                {
                    "detail": (
                        "An opportunity decision "
                        "has already been recorded "
                        "for this lead."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            lead.status
            != Lead.Status.QUALIFIED
        ):
            return Response(
                {
                    "detail": (
                        "Only a qualified lead "
                        "can be submitted for "
                        "opportunity approval."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        financial_assessment = (
            get_latest_reviewed_financial_assessment(
                lead,
            )
        )

        if (
            financial_assessment
            is None
        ):
            return Response(
                {
                    "detail": (
                        "A reviewed financial "
                        "assessment is required "
                        "before the opportunity "
                        "decision can be made."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        technical_assessment = (
            financial_assessment
            .technical_assessment
        )

        if (
            technical_assessment.status
            != TechnicalAssessment
            .Status
            .REVIEWED
        ):
            return Response(
                {
                    "detail": (
                        "The technical assessment "
                        "linked to the financial "
                        "assessment must be reviewed."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        decision = (
            LeadOpportunityDecision(
                lead=lead,

                technical_assessment=(
                    technical_assessment
                ),

                financial_assessment=(
                    financial_assessment
                ),

                decision=(
                    input_serializer
                    .validated_data[
                        "decision"
                    ]
                ),

                decision_notes=(
                    input_serializer
                    .validated_data[
                        "decision_notes"
                    ]
                ),

                decided_by=request.user,

                decided_at=(
                    timezone.now()
                ),
            )
        )

        decision.full_clean()
        decision.save()

        if (
            decision.decision
            == (
                LeadOpportunityDecision
                .Decision
                .APPROVED
            )
        ):
            description = (
                "Opportunity approved "
                "for Deal conversion."
            )

            workflow_event = (
                "OPPORTUNITY_APPROVED"
            )

        else:
            description = (
                "Opportunity rejected."
            )

            workflow_event = (
                "OPPORTUNITY_REJECTED"
            )

        LeadHistory.objects.create(
            lead=lead,

            event_type=(
                LeadHistory
                .EventType
                .UPDATED
            ),

            description=description,

            performed_by=request.user,

            metadata={
                "workflow_event":
                    workflow_event,

                "opportunity_decision_id":
                    decision.id,

                "decision":
                    decision.decision,

                "decision_display":
                    decision
                    .get_decision_display(),

                "decision_notes":
                    decision
                    .decision_notes,

                "technical_assessment_id":
                    technical_assessment.id,

                "financial_assessment_id":
                    financial_assessment.id,
            },
        )

        return Response(
            LeadOpportunityDecisionSerializer(
                decision,
                context={
                    "request":
                        request,
                },
            ).data,
            status=(
                status
                .HTTP_201_CREATED
            ),
        )


class LeadConvertToDealView(
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        OpportunityManagementPermission,
    ]

    @transaction.atomic
    def post(
        self,
        request,
        pk,
    ):
        try:
            lead = (
                Lead.objects
                .select_for_update()
                .get(
                    pk=pk,
                )
            )

        except Lead.DoesNotExist:
            raise NotFound(
                "Lead not found."
            )

        existing_deal = (
            Deal.objects
            .filter(
                source_lead=lead,
            )
            .first()
        )

        if (
            existing_deal
            is not None
        ):
            return Response(
                {
                    "detail": (
                        "This lead has already "
                        "been converted to a Deal."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        try:
            decision = (
                LeadOpportunityDecision
                .objects
                .select_related(
                    "lead",
                    "technical_assessment",
                    "financial_assessment",
                    "decided_by",
                )
                .get(
                    lead=lead,
                )
            )

        except (
            LeadOpportunityDecision
            .DoesNotExist
        ):
            return Response(
                {
                    "detail": (
                        "The lead must be approved "
                        "before it can be converted "
                        "to a Deal."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            decision.decision
            != (
                LeadOpportunityDecision
                .Decision
                .APPROVED
            )
        ):
            return Response(
                {
                    "detail": (
                        "A rejected opportunity "
                        "cannot be converted "
                        "to a Deal."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            lead.status
            != Lead.Status.QUALIFIED
        ):
            return Response(
                {
                    "detail": (
                        "Only an approved qualified "
                        "lead can be converted "
                        "to a Deal."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            decision.technical_assessment.status
            != TechnicalAssessment
            .Status
            .REVIEWED
        ):
            return Response(
                {
                    "detail": (
                        "The technical assessment "
                        "must remain reviewed before "
                        "Deal conversion."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            decision.financial_assessment.status
            != FinancialAssessment
            .Status
            .REVIEWED
        ):
            return Response(
                {
                    "detail": (
                        "The financial assessment "
                        "must remain reviewed before "
                        "Deal conversion."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        deal = Deal(
            source_lead=lead,

            opportunity_decision=decision,

            name=(
                f"{lead.company_name} Deal"
            ),

            company_name=(
                lead.company_name
            ),

            contact_name=(
                lead.contact_name
            ),

            email=lead.email,

            phone=lead.phone,

            status=(
                Deal.Status.OPEN
            ),

            assigned_to=(
                lead.assigned_to
            ),

            created_by=request.user,
        )

        deal.full_clean()
        deal.save()

        previous_status = (
            lead.status
        )

        lead.status = (
            Lead.Status.PROPOSAL
        )

        lead.converted_at = (
            timezone.now()
        )

        lead.save(
            update_fields=[
                "status",
                "converted_at",
                "updated_at",
            ]
        )

        LeadHistory.objects.create(
            lead=lead,

            event_type=(
                LeadHistory
                .EventType
                .STATUS_CHANGED
            ),

            description=(
                "Approved lead converted "
                f"to Deal #{deal.id} and "
                "moved to Proposal."
            ),

            performed_by=request.user,

            metadata={
                "workflow_event":
                    "DEAL_CREATED",

                "previous_status":
                    previous_status,

                "previous_status_display":
                    dict(
                        Lead.Status.choices
                    ).get(
                        previous_status,
                        previous_status,
                    ),

                "status":
                    lead.status,

                "status_display":
                    lead
                    .get_status_display(),

                "deal_id":
                    deal.id,

                "opportunity_decision_id":
                    decision.id,
            },
        )

        return Response(
            {
                "lead":
                    LeadSerializer(
                        lead,
                        context={
                            "request":
                                request,
                        },
                    ).data,

                "opportunity_decision":
                    LeadOpportunityDecisionSerializer(
                        decision,
                        context={
                            "request":
                                request,
                        },
                    ).data,

                "deal":
                    DealSerializer(
                        deal,
                        context={
                            "request":
                                request,
                        },
                    ).data,
            },
            status=(
                status
                .HTTP_201_CREATED
            ),
        )