from .models import (
    CommercialExceptionRequest,
    FinancialAssessment,
    Lead,
    LeadHistory,
    TechnicalAssessment,
)


def update_lead_status_from_workflow(lead, *, performed_by=None):
    """Advance an active Lead to Proposal once both reviews are authoritative."""
    if lead.status == Lead.Status.PROPOSAL:
        return False

    if lead.status not in {
        Lead.Status.NEW,
        Lead.Status.CONTACTED,
        Lead.Status.SUBMITTED_FOR_QUALIFICATION,
    }:
        return False

    financial = (
        FinancialAssessment.objects.filter(lead=lead)
        .order_by("-created_at", "-id")
        .first()
    )
    technical = (
        TechnicalAssessment.objects.filter(lead=lead)
        .order_by("-created_at", "-id")
        .first()
    )

    if (
        financial is None
        or financial.status != FinancialAssessment.Status.REVIEWED
        or technical is None
        or technical.status != TechnicalAssessment.Status.REVIEWED
    ):
        return False

    exception = None
    financially_authorised = (
        financial.outcome
        == FinancialAssessment.Outcome.FINANCIALLY_SUITABLE
    )
    if not financially_authorised:
        exception = (
            CommercialExceptionRequest.objects.filter(
                financial_assessment=financial,
                status=CommercialExceptionRequest.Status.APPROVED,
            )
            .order_by("-reviewed_at", "-id")
            .first()
        )
        financially_authorised = exception is not None

    if not financially_authorised:
        return False

    previous_status = lead.status
    lead.status = Lead.Status.PROPOSAL
    lead.save(update_fields=["status", "updated_at"])
    LeadHistory.objects.create(
        lead=lead,
        event_type=LeadHistory.EventType.STATUS_CHANGED,
        description=(
            "Financial and Technical Assessments completed. "
            "Lead moved to Proposal."
        ),
        performed_by=performed_by,
        metadata={
            "workflow_event": "ASSESSMENTS_COMPLETED",
            "previous_status": previous_status,
            "new_status": Lead.Status.PROPOSAL,
            "financial_assessment_id": financial.id,
            "technical_assessment_id": technical.id,
            "commercial_exception_id": exception.id if exception else None,
        },
    )
    return True
