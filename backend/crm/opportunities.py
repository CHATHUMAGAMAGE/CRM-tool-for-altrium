from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import (
    BasePermission,
    IsAuthenticated,
    SAFE_METHODS,
)
from rest_framework.response import Response

from accounts.models import UserProfile

from .models import (
    CommercialExceptionRequest,
    CommercialReview,
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

        if profile.role == UserProfile.Role.SALES_MANAGER:
            return True
        return request.method in SAFE_METHODS and profile.role == UserProfile.Role.EXECUTIVE


def get_latest_completed_financial_assessment(
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
            status__in=[
                FinancialAssessment.Status.SUBMITTED,
                FinancialAssessment.Status.REVIEWED,
            ],
        )
        .order_by(
            "-submitted_at",
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
                            .PROCEED
                        )
                        and (
                            decision.financial_assessment.outcome == FinancialAssessment.Outcome.FINANCIALLY_SUITABLE
                            or CommercialExceptionRequest.objects.filter(
                                financial_assessment=decision.financial_assessment,
                                status=CommercialExceptionRequest.Status.APPROVED,
                            ).exists()
                        )
                        and decision.technical_assessment_id is not None
                        and not FinancialAssessment.objects.filter(
                            lead=lead,
                            status__in=[FinancialAssessment.Status.REQUESTED, FinancialAssessment.Status.IN_PROGRESS],
                        ).exclude(pk=decision.financial_assessment_id).exists()
                        and deal is None
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

        financial_assessment = (
            get_latest_completed_financial_assessment(
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
                        "A completed financial "
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

        requested_decision = input_serializer.validated_data["decision"]
        financially_suitable = (
            financial_assessment.outcome
            == FinancialAssessment.Outcome.FINANCIALLY_SUITABLE
        )
        approved_exception = CommercialExceptionRequest.objects.filter(
            financial_assessment=financial_assessment,
            status=CommercialExceptionRequest.Status.APPROVED,
        ).exists()
        financially_authorised = financially_suitable or approved_exception
        reassessment_pending = FinancialAssessment.objects.filter(
            lead=lead,
            status__in=[FinancialAssessment.Status.REQUESTED, FinancialAssessment.Status.IN_PROGRESS],
        ).exclude(pk=financial_assessment.pk).exists()

        if requested_decision == LeadOpportunityDecision.Decision.PROCEED and reassessment_pending:
            return Response(
                {"detail": "Proceed is not permitted while a Financial Reassessment is pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        technical_assessment = (
            TechnicalAssessment.objects.filter(
                lead=lead,
                status__in=[
                    TechnicalAssessment.Status.SUBMITTED,
                    TechnicalAssessment.Status.REVIEWED,
                ],
            )
            .order_by("-submitted_at", "-id")
            .first()
        )

        if financially_authorised and technical_assessment is None:
            return Response(
                {
                    "detail": (
                        "A completed Technical Assessment is required "
                        "after financial approval or an approved commercial exception."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if (
            requested_decision == LeadOpportunityDecision.Decision.PROCEED
            and not financially_authorised
        ):
            return Response(
                {"detail": "Proceed is not permitted because the latest Financial Assessment is Not Financially Viable and no approved commercial exception exists."},
                status=status.HTTP_400_BAD_REQUEST,
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
                        .validated_data["decision"]
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
                .PROCEED
            )
        ):
            description = (
                "Proceed decision recorded "
                "for Deal conversion."
            )

            workflow_event = (
                "OPPORTUNITY_PROCEED"
            )

        else:
            description = (
                "Do Not Proceed decision recorded."
            )

            workflow_event = (
                "OPPORTUNITY_DO_NOT_PROCEED"
            )
            lead.status = Lead.Status.LOST
            lead.lost_reason = decision.decision_notes
            lead.save(update_fields=["status", "lost_reason", "updated_at"])
            CommercialReview.objects.filter(
                lead=lead,
                status__in=[CommercialReview.Status.REQUIRED, CommercialReview.Status.REVISED, CommercialReview.Status.REASSESSMENT_REQUESTED],
            ).update(status=CommercialReview.Status.CLOSED, updated_at=timezone.now())

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
                    technical_assessment.id if technical_assessment else None,

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
                        "The Lead must have a Proceed decision "
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
                .PROCEED
            )
        ):
            return Response(
                {
                    "detail": (
                        "A Do Not Proceed opportunity "
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
            decision.technical_assessment is None
            or decision.technical_assessment.status
            not in {
                TechnicalAssessment.Status.SUBMITTED,
                TechnicalAssessment.Status.REVIEWED,
            }
        ):
            return Response(
                {
                    "detail": (
                        "The technical assessment "
                        "must remain completed before "
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
            not in {
                FinancialAssessment.Status.SUBMITTED,
                FinancialAssessment.Status.REVIEWED,
            }
        ):
            return Response(
                {
                    "detail": (
                        "The financial assessment "
                        "must remain completed before "
                        "Deal conversion."
                    )
                },
                status=(
                    status
                    .HTTP_400_BAD_REQUEST
                ),
            )

        if FinancialAssessment.objects.filter(
            lead=lead,
            status__in=[FinancialAssessment.Status.REQUESTED, FinancialAssessment.Status.IN_PROGRESS],
        ).exclude(pk=decision.financial_assessment_id).exists():
            return Response(
                {"detail": "Deal conversion is not permitted while a Financial Reassessment is pending."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if (
            decision.financial_assessment.outcome
            != FinancialAssessment.Outcome.FINANCIALLY_SUITABLE
            and not CommercialExceptionRequest.objects.filter(
                financial_assessment=decision.financial_assessment,
                status=CommercialExceptionRequest.Status.APPROVED,
            ).exists()
        ):
            return Response(
                {
                    "detail": (
                        "Deal conversion requires a Financially Viable outcome "
                        "or an approved commercial exception."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
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
                "Proceeding Lead converted "
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
