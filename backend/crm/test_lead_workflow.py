from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from accounts.models import UserProfile

from .lead_workflow import update_lead_status_from_workflow
from .models import (
    CommercialExceptionRequest,
    FinancialAssessment,
    Lead,
    LeadHistory,
    TechnicalAssessment,
)


User = get_user_model()


class LeadWorkflowTests(TestCase):
    def setUp(self):
        self.manager = User.objects.create_user(username="workflow_manager", password="TestPass123!")
        self.manager.profile.role = UserProfile.Role.SALES_MANAGER
        self.manager.profile.save(update_fields=["role"])
        self.finance = User.objects.create_user(username="workflow_finance", password="TestPass123!")
        self.finance.profile.role = UserProfile.Role.FINANCIAL_OFFICER
        self.finance.profile.save(update_fields=["role"])
        self.tech = User.objects.create_user(username="workflow_tech", password="TestPass123!")
        self.tech.profile.role = UserProfile.Role.TECH_LEAD
        self.tech.profile.save(update_fields=["role"])
        self.lead = Lead.objects.create(
            company_name="Workflow Company", contact_name="Workflow Contact",
            phone="0712345678", status=Lead.Status.CONTACTED,
            created_by=self.manager,
        )

    def create_finance(self, status_value=FinancialAssessment.Status.REVIEWED):
        return FinancialAssessment.objects.create(
            lead=self.lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess financial viability.", status=status_value,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
            reviewed_by=self.manager if status_value == FinancialAssessment.Status.REVIEWED else None,
            reviewed_at=timezone.now() if status_value == FinancialAssessment.Status.REVIEWED else None,
        )

    def create_technical(self, status_value=TechnicalAssessment.Status.REVIEWED):
        return TechnicalAssessment.objects.create(
            lead=self.lead, requested_by=self.manager, assigned_to=self.tech,
            requirements="Assess technical feasibility.", status=status_value,
            reviewed_by=self.manager if status_value == TechnicalAssessment.Status.REVIEWED else None,
            reviewed_at=timezone.now() if status_value == TechnicalAssessment.Status.REVIEWED else None,
        )

    def test_both_reviewed_assessments_move_lead_to_proposal_once(self):
        finance = self.create_finance()
        technical = self.create_technical()

        self.assertTrue(update_lead_status_from_workflow(self.lead, performed_by=self.manager))
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.Status.PROPOSAL)
        transition = LeadHistory.objects.get(
            lead=self.lead,
            metadata__workflow_event="ASSESSMENTS_COMPLETED",
        )
        self.assertEqual(transition.metadata["financial_assessment_id"], finance.id)
        self.assertEqual(transition.metadata["technical_assessment_id"], technical.id)
        self.assertFalse(update_lead_status_from_workflow(self.lead, performed_by=self.manager))

    def test_incomplete_or_unreviewed_assessments_do_not_move_lead(self):
        self.create_finance(FinancialAssessment.Status.SUBMITTED)
        self.create_technical()

        self.assertFalse(update_lead_status_from_workflow(self.lead, performed_by=self.manager))
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.Status.CONTACTED)

    def test_unsuitable_finance_requires_approved_exception_for_same_assessment(self):
        finance = self.create_finance()
        finance.outcome = FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE
        finance.save(update_fields=["outcome"])
        self.create_technical()

        self.assertFalse(update_lead_status_from_workflow(self.lead, performed_by=self.manager))
        exception = CommercialExceptionRequest.objects.create(
            lead=self.lead,
            financial_assessment=finance,
            requested_by=self.manager,
            justification="Strategic exception required.",
            status=CommercialExceptionRequest.Status.APPROVED,
            reviewed_by=self.manager,
            reviewed_at=timezone.now(),
            reviewer_comments="Approved with executive oversight.",
        )

        self.assertTrue(update_lead_status_from_workflow(self.lead, performed_by=self.manager))
        transition = LeadHistory.objects.get(
            lead=self.lead,
            metadata__workflow_event="ASSESSMENTS_COMPLETED",
        )
        self.assertEqual(transition.metadata["commercial_exception_id"], exception.id)

    def test_newer_unreviewed_reassessment_blocks_proposal(self):
        self.create_finance()
        self.create_technical()
        self.create_finance(FinancialAssessment.Status.REQUESTED)

        self.assertFalse(update_lead_status_from_workflow(self.lead, performed_by=self.manager))
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.Status.CONTACTED)
