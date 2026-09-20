from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile
from .models import (
    CommercialExceptionRequest, CommercialReview, FinancialAssessment,
    Lead, LeadHistory, Notification, TechnicalAssessment,
)

User = get_user_model()


class CommercialReviewWorkflowTests(APITestCase):
    def user(self, name, role):
        user = User.objects.create_user(username=name, password="StrongTestPassword123!")
        user.profile.role = role
        user.profile.save(update_fields=["role"])
        return user

    def setUp(self):
        self.manager = self.user("commercial_manager", UserProfile.Role.SALES_MANAGER)
        self.finance = self.user("commercial_finance", UserProfile.Role.FINANCIAL_OFFICER)
        self.director = self.user("commercial_director", UserProfile.Role.DIRECTOR)
        self.executive = self.user("commercial_executive", UserProfile.Role.EXECUTIVE)
        self.tech = self.user("commercial_tech", UserProfile.Role.TECH_LEAD)
        self.lead = Lead.objects.create(
            company_name="GreenMart Retail (Pvt) Ltd", contact_name="GreenMart Contact",
            phone="0771234567", source=Lead.Source.DIRECT,
            project_name="GreenMart Inventory & POS Integration",
            requirement="Inventory and POS integration", budget_min="2500000", budget_max="4000000",
            budget_currency="LKR", expected_timeline="6 months", status=Lead.Status.QUALIFIED,
            created_by=self.manager, responsible_manager=self.manager,
        )
        self.assessment = FinancialAssessment.objects.create(
            lead=self.lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess commercial viability", status=FinancialAssessment.Status.IN_PROGRESS,
            financial_comments="Estimated delivery cost LKR 4,850,000; risk is high.",
            estimated_delivery_cost="4850000.00",
            outcome=FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE,
        )

    def submit_failed_finance(self):
        self.client.force_authenticate(self.finance)
        return self.client.post(reverse("crm:financial-assessment-submit", kwargs={"pk": self.assessment.id}), {})

    def mark_finance_reviewed(self):
        self.assessment.refresh_from_db()
        self.assessment.status = FinancialAssessment.Status.REVIEWED
        self.assessment.reviewed_by = self.manager
        self.assessment.reviewed_at = timezone.now()
        self.assessment.save(update_fields=["status", "reviewed_by", "reviewed_at"])

    def test_failed_finance_creates_commercial_review_notification_and_audit(self):
        response = self.submit_failed_finance()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(CommercialReview.objects.filter(lead=self.lead, status=CommercialReview.Status.REQUIRED).exists())
        self.assertTrue(LeadHistory.objects.filter(lead=self.lead, metadata__workflow_event="COMMERCIAL_REVIEW_REQUIRED").exists())
        self.assertTrue(Notification.objects.filter(recipient=self.manager, message__icontains="Commercial review").exists())
        self.client.force_authenticate(self.manager)
        card = self.client.get(reverse("crm:lead-commercial-review", kwargs={"pk": self.lead.id}))
        self.assertEqual(card.data["reviews"][0]["estimated_delivery_cost"], "4850000.00")
        self.assertEqual(card.data["reviews"][0]["budget_shortfall"], "850000.00")

    def test_manager_cannot_proceed_after_failed_finance(self):
        self.submit_failed_finance()
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("crm:lead-opportunity-decision", kwargs={"pk": self.lead.id}), {"decision": "PROCEED", "decision_notes": "Proceed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("no approved commercial exception", str(response.data))

    def test_submitted_cost_is_read_only_to_sales_manager(self):
        self.submit_failed_finance()
        self.client.force_authenticate(self.manager)
        response = self.client.patch(
            reverse("crm:financial-assessment-work", kwargs={"pk": self.assessment.id}),
            {"estimated_delivery_cost": "100.00", "financial_comments": "Changed", "outcome": "FINANCIALLY_SUITABLE"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assessment.refresh_from_db()
        self.assertEqual(str(self.assessment.estimated_delivery_cost), "4850000.00")

    def test_revision_then_reassessment_preserves_original(self):
        self.submit_failed_finance()
        self.mark_finance_reviewed()
        self.client.force_authenticate(self.manager)
        revise = self.client.post(reverse("crm:revise-commercial-terms", kwargs={"pk": self.lead.id}), {"reason": "Budget constraint", "revised_scope": "Phase 1 core inventory and POS only."}, format="json")
        self.assertEqual(revise.status_code, status.HTTP_200_OK)
        response = self.client.post(reverse("crm:request-financial-reassessment", kwargs={"pk": self.lead.id}), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.lead.financial_assessments.count(), 2)
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.outcome, FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE)

    def test_reassessment_requires_revision(self):
        self.submit_failed_finance()
        self.mark_finance_reviewed()
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("crm:request-financial-reassessment", kwargs={"pk": self.lead.id}), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_exception_permissions_and_finance_evidence_immutability(self):
        self.submit_failed_finance()
        self.mark_finance_reviewed()
        self.client.force_authenticate(self.manager)
        requested = self.client.post(reverse("crm:request-commercial-exception", kwargs={"pk": self.lead.id}), {"justification": "Strategically important customer."}, format="json")
        self.assertEqual(requested.status_code, status.HTTP_201_CREATED)
        exception_id = requested.data["id"]
        own_review = self.client.post(reverse("crm:commercial-exception-review", kwargs={"pk": exception_id, "action": "approve"}), {"reviewer_comments": "Self approval"}, format="json")
        self.assertEqual(own_review.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.director)
        approved = self.client.post(reverse("crm:commercial-exception-review", kwargs={"pk": exception_id, "action": "approve"}), {"reviewer_comments": "Approved for strategic reasons."}, format="json")
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.outcome, FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE)

    def test_executive_can_review_exception_and_audit_records_actor(self):
        self.submit_failed_finance()
        self.mark_finance_reviewed()
        self.client.force_authenticate(self.manager)
        requested = self.client.post(
            reverse("crm:request-commercial-exception", kwargs={"pk": self.lead.id}),
            {"justification": "Strategic account."}, format="json",
        )
        self.client.force_authenticate(self.executive)
        listed = self.client.get(reverse("crm:commercial-exception-list"))
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        approved = self.client.post(
            reverse("crm:commercial-exception-review", kwargs={"pk": requested.data["id"], "action": "approve"}),
            {"reviewer_comments": "Approved with executive oversight."}, format="json",
        )
        self.assertEqual(approved.status_code, status.HTTP_200_OK)
        self.assessment.refresh_from_db()
        self.assertEqual(self.assessment.outcome, FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE)
        self.assertTrue(LeadHistory.objects.filter(performed_by=self.executive, metadata__workflow_event="COMMERCIAL_EXCEPTION_APPROVED").exists())

    def test_executive_cannot_self_approve_or_review_without_comment(self):
        exception = CommercialExceptionRequest.objects.create(
            lead=self.lead, financial_assessment=self.assessment,
            requested_by=self.executive, justification="Own request",
        )
        self.client.force_authenticate(self.executive)
        url = reverse("crm:commercial-exception-review", kwargs={"pk": exception.id, "action": "approve"})
        self.assertEqual(self.client.post(url, {"reviewer_comments": "No"}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

        exception.requested_by = self.manager
        exception.save(update_fields=["requested_by"])
        self.assertEqual(self.client.post(url, {"reviewer_comments": ""}, format="json").status_code, status.HTTP_400_BAD_REQUEST)

    def test_executive_can_reject_exception_with_audited_comment(self):
        exception = CommercialExceptionRequest.objects.create(
            lead=self.lead, financial_assessment=self.assessment,
            requested_by=self.manager, justification="Strategic request",
        )
        self.client.force_authenticate(self.executive)
        response = self.client.post(
            reverse("crm:commercial-exception-review", kwargs={"pk": exception.id, "action": "reject"}),
            {"reviewer_comments": "Shortfall is outside approved tolerance."}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        exception.refresh_from_db()
        self.assertEqual(exception.status, CommercialExceptionRequest.Status.REJECTED)
        self.assertEqual(exception.reviewed_by, self.executive)

    def test_approved_exception_allows_technical_then_proceed(self):
        self.submit_failed_finance()
        exception = CommercialExceptionRequest.objects.create(lead=self.lead, financial_assessment=self.assessment, requested_by=self.manager, justification="Strategic", status=CommercialExceptionRequest.Status.APPROVED, reviewed_by=self.director, reviewed_at=timezone.now())
        technical = TechnicalAssessment.objects.create(lead=self.lead, requested_by=self.manager, assigned_to=self.tech, requirements="Assess", status=TechnicalAssessment.Status.REVIEWED, technical_comments="Feasible", submitted_at=timezone.now(), reviewed_at=timezone.now(), reviewed_by=self.manager)
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("crm:lead-opportunity-decision", kwargs={"pk": self.lead.id}), {"decision": "PROCEED", "decision_notes": "Director exception approved."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["technical_assessment"], technical.id)
        exception.refresh_from_db()
        self.assertEqual(exception.status, CommercialExceptionRequest.Status.APPROVED)

    def test_pending_or_rejected_exception_does_not_allow_proceed(self):
        self.submit_failed_finance()
        exception = CommercialExceptionRequest.objects.create(lead=self.lead, financial_assessment=self.assessment, requested_by=self.manager, justification="Strategic")
        self.client.force_authenticate(self.manager)
        url = reverse("crm:lead-opportunity-decision", kwargs={"pk": self.lead.id})
        self.assertEqual(self.client.post(url, {"decision": "PROCEED", "decision_notes": "Pending"}, format="json").status_code, 400)
        exception.status = CommercialExceptionRequest.Status.REJECTED
        exception.save(update_fields=["status"])
        self.assertEqual(self.client.post(url, {"decision": "PROCEED", "decision_notes": "Rejected"}, format="json").status_code, 400)

    def test_unauthorised_roles_cannot_manage_commercial_review(self):
        self.submit_failed_finance()
        self.client.force_authenticate(self.finance)
        response = self.client.post(reverse("crm:revise-commercial-terms", kwargs={"pk": self.lead.id}), {"reason": "x", "revised_scope": "y"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_do_not_proceed_closes_lead_and_commercial_review(self):
        self.submit_failed_finance()
        self.client.force_authenticate(self.manager)
        response = self.client.post(reverse("crm:lead-opportunity-decision", kwargs={"pk": self.lead.id}), {"decision": "DO_NOT_PROCEED", "decision_notes": "Client budget cannot support the required scope."}, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.lead.refresh_from_db()
        self.assertEqual(self.lead.status, Lead.Status.LOST)
        self.assertEqual(CommercialReview.objects.get(lead=self.lead).status, CommercialReview.Status.CLOSED)

    def test_viable_reassessment_resolves_commercial_review(self):
        self.submit_failed_finance()
        review = CommercialReview.objects.get(lead=self.lead)
        review.status = CommercialReview.Status.REASSESSMENT_REQUESTED
        review.save(update_fields=["status"])
        second = FinancialAssessment.objects.create(lead=self.lead, requested_by=self.manager, assigned_to=self.finance, requirements="Reassess revised terms", status=FinancialAssessment.Status.IN_PROGRESS, financial_comments="Revised cost is viable.", estimated_delivery_cost="3250000.00", outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE)
        self.client.force_authenticate(self.finance)
        response = self.client.post(reverse("crm:financial-assessment-submit", kwargs={"pk": second.id}), {})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        review.refresh_from_db()
        self.assertEqual(review.status, CommercialReview.Status.RESOLVED)
        self.assessment.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(str(self.assessment.estimated_delivery_cost), "4850000.00")
        self.assertEqual(str(second.estimated_delivery_cost), "3250000.00")

    def test_budget_shortfall_never_negative_and_null_history_is_safe(self):
        self.assessment.estimated_delivery_cost = "3500000.00"
        self.assessment.save(update_fields=["estimated_delivery_cost"])
        self.submit_failed_finance()
        self.client.force_authenticate(self.manager)
        url = reverse("crm:lead-commercial-review", kwargs={"pk": self.lead.id})
        response = self.client.get(url)
        self.assertEqual(response.data["reviews"][0]["budget_shortfall"], "0.00")
        historical = FinancialAssessment.objects.create(lead=self.lead, requested_by=self.manager, assigned_to=self.finance, requirements="Legacy", status=FinancialAssessment.Status.REVIEWED, financial_comments="Legacy text only", outcome=FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE)
        CommercialReview.objects.create(lead=self.lead, financial_assessment=historical, created_by=self.manager)
        response = self.client.get(url)
        self.assertIsNone(response.data["reviews"][0]["estimated_delivery_cost"])
        self.assertIsNone(response.data["reviews"][0]["budget_shortfall"])

    def test_equal_budget_has_zero_shortfall(self):
        self.assessment.estimated_delivery_cost = "4000000.00"
        self.assessment.save(update_fields=["estimated_delivery_cost"])
        self.submit_failed_finance()
        self.client.force_authenticate(self.manager)
        response = self.client.get(reverse("crm:lead-commercial-review", kwargs={"pk": self.lead.id}))
        self.assertEqual(response.data["reviews"][0]["budget_shortfall"], "0.00")
