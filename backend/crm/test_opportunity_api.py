from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import (
    Customer,
    Deal,
    FinancialAssessment,
    Lead,
    LeadHistory,
    LeadOpportunityDecision,
    TechnicalAssessment,
)


class OpportunityApiTests(APITestCase):
    def create_user(
        self,
        username,
        role,
    ):
        user = User.objects.create_user(
            username=username,
            password="StrongTestPassword123!",
        )

        user.profile.role = role
        user.profile.save(
            update_fields=[
                "role",
            ]
        )

        return user

    def setUp(self):
        self.admin = self.create_user(
            "opportunity_admin",
            UserProfile.Role.ADMIN,
        )

        self.sales_manager = (
            self.create_user(
                "opportunity_manager",
                UserProfile.Role.SALES_MANAGER,
            )
        )

        self.sales_rep = self.create_user(
            "opportunity_rep",
            UserProfile.Role.SALES_REP,
        )

        self.tech_lead = self.create_user(
            "opportunity_tech_lead",
            UserProfile.Role.TECH_LEAD,
        )

        self.financial_officer = (
            self.create_user(
                "opportunity_finance",
                UserProfile.Role.FINANCIAL_OFFICER,
            )
        )

        self.lead = Lead.objects.create(
            company_name="AAA PVT LTD",
            contact_name="Tharindu",
            email="tharindu@example.com",
            phone="0771002003",
            source="Referral",
            status=Lead.Status.QUALIFIED,
            qualification_notes=(
                "Lead satisfies qualification "
                "requirements."
            ),
            assigned_to=self.sales_rep,
            created_by=self.sales_manager,
        )

        self.technical_assessment = (
            TechnicalAssessment.objects.create(
                lead=self.lead,

                requested_by=(
                    self.sales_manager
                ),

                assigned_to=(
                    self.tech_lead
                ),

                requirements=(
                    "Review technical "
                    "feasibility."
                ),

                status=(
                    TechnicalAssessment
                    .Status
                    .REVIEWED
                ),

                technical_comments=(
                    "Technical solution "
                    "is feasible."
                ),

                submitted_at=(
                    timezone.now()
                ),

                reviewed_at=(
                    timezone.now()
                ),

                reviewed_by=(
                    self.sales_manager
                ),

                review_notes=(
                    "Technical assessment "
                    "accepted."
                ),
            )
        )

        self.financial_assessment = (
            FinancialAssessment
            .objects
            .create(
                lead=self.lead,

                technical_assessment=(
                    self.technical_assessment
                ),

                requested_by=(
                    self.sales_manager
                ),

                assigned_to=(
                    self.financial_officer
                ),

                requirements=(
                    "Review financial "
                    "viability."
                ),

                status=(
                    FinancialAssessment
                    .Status
                    .REVIEWED
                ),

                financial_comments=(
                    "Opportunity is "
                    "financially viable."
                ),

                submitted_at=(
                    timezone.now()
                ),

                reviewed_at=(
                    timezone.now()
                ),

                reviewed_by=(
                    self.sales_manager
                ),

                review_notes=(
                    "Financial assessment "
                    "accepted."
                ),
            )
        )

        self.decision_url = reverse(
            "crm:lead-opportunity-decision",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        self.convert_url = reverse(
            "crm:lead-convert",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

    def approve_lead(
        self,
        user=None,
    ):
        self.client.force_authenticate(
            user=(
                user
                or self.sales_manager
            ),
        )

        return self.client.post(
            self.decision_url,
            {
                "decision":
                    (
                        LeadOpportunityDecision
                        .Decision
                        .APPROVED
                    ),

                "decision_notes":
                    (
                        "Both assessments "
                        "have been reviewed "
                        "and the opportunity "
                        "is approved."
                    ),
            },
            format="json",
        )

    def reject_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        return self.client.post(
            self.decision_url,
            {
                "decision":
                    (
                        LeadOpportunityDecision
                        .Decision
                        .REJECTED
                    ),

                "decision_notes":
                    (
                        "The opportunity "
                        "will not proceed."
                    ),
            },
            format="json",
        )

    def test_unauthenticated_user_cannot_make_decision(
        self,
    ):
        response = self.client.post(
            self.decision_url,
            {
                "decision":
                    (
                        LeadOpportunityDecision
                        .Decision
                        .APPROVED
                    ),

                "decision_notes":
                    "Approve.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_sales_rep_cannot_make_opportunity_decision(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        response = self.client.post(
            self.decision_url,
            {
                "decision":
                    (
                        LeadOpportunityDecision
                        .Decision
                        .APPROVED
                    ),

                "decision_notes":
                    "Approve.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_sales_manager_can_approve_opportunity(
        self,
    ):
        response = self.approve_lead()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        decision = (
            LeadOpportunityDecision
            .objects
            .get(
                lead=self.lead,
            )
        )

        self.assertEqual(
            decision.decision,
            (
                LeadOpportunityDecision
                .Decision
                .APPROVED
            ),
        )

        self.assertEqual(
            decision.decided_by,
            self.sales_manager,
        )

        self.assertEqual(
            decision.technical_assessment,
            self.technical_assessment,
        )

        self.assertEqual(
            decision.financial_assessment,
            self.financial_assessment,
        )

    def test_admin_cannot_approve_opportunity(
        self,
    ):
        response = self.approve_lead(
            user=self.admin,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertFalse(
            LeadOpportunityDecision.objects.filter(
                lead=self.lead,
            ).exists()
        )

    def test_opportunity_decision_requires_qualified_lead(
        self,
    ):
        self.lead.status = (
            Lead.Status.CONTACTED
        )

        self.lead.save(
            update_fields=[
                "status",
            ]
        )

        response = self.approve_lead()

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            LeadOpportunityDecision
            .objects
            .filter(
                lead=self.lead,
            )
            .exists()
        )

    def test_opportunity_decision_requires_reviewed_financial_assessment(
        self,
    ):
        self.financial_assessment.status = (
            FinancialAssessment
            .Status
            .SUBMITTED
        )

        self.financial_assessment.save(
            update_fields=[
                "status",
            ]
        )

        response = self.approve_lead()

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertFalse(
            LeadOpportunityDecision
            .objects
            .filter(
                lead=self.lead,
            )
            .exists()
        )

    def test_sales_manager_can_reject_opportunity(
        self,
    ):
        response = self.reject_lead()

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        decision = (
            LeadOpportunityDecision
            .objects
            .get(
                lead=self.lead,
            )
        )

        self.assertEqual(
            decision.decision,
            (
                LeadOpportunityDecision
                .Decision
                .REJECTED
            ),
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.QUALIFIED,
        )

        self.assertFalse(
            Deal.objects
            .filter(
                source_lead=self.lead,
            )
            .exists()
        )

    def test_duplicate_opportunity_decision_is_rejected(
        self,
    ):
        first_response = (
            self.approve_lead()
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        second_response = (
            self.client.post(
                self.decision_url,
                {
                    "decision":
                        (
                            LeadOpportunityDecision
                            .Decision
                            .REJECTED
                        ),

                    "decision_notes":
                        "Try to change it.",
                },
                format="json",
            )
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            LeadOpportunityDecision
            .objects
            .filter(
                lead=self.lead,
            )
            .count(),
            1,
        )

    def test_get_decision_before_decision_returns_none(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.get(
            self.decision_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertIsNone(
            response.data[
                "decision"
            ]
        )

        self.assertFalse(
            response.data[
                "can_convert"
            ]
        )

        self.assertIsNone(
            response.data[
                "deal"
            ]
        )

    def test_get_approved_decision_allows_conversion(
        self,
    ):
        self.approve_lead()

        response = self.client.get(
            self.decision_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[
                "decision"
            ][
                "decision"
            ],
            (
                LeadOpportunityDecision
                .Decision
                .APPROVED
            ),
        )

        self.assertTrue(
            response.data[
                "can_convert"
            ]
        )

    def test_approved_lead_can_be_converted_to_deal(
        self,
    ):
        approval_response = (
            self.approve_lead()
        )

        self.assertEqual(
            approval_response.status_code,
            status.HTTP_201_CREATED,
        )

        response = self.client.post(
            self.convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertEqual(
            Deal.objects.count(),
            1,
        )

        deal = Deal.objects.get(
            source_lead=self.lead,
        )

        self.assertEqual(
            deal.status,
            Deal.Status.OPEN,
        )

        self.assertEqual(
            deal.company_name,
            self.lead.company_name,
        )

        self.assertEqual(
            deal.contact_name,
            self.lead.contact_name,
        )

        self.assertEqual(
            deal.email,
            self.lead.email,
        )

        self.assertEqual(
            deal.phone,
            self.lead.phone,
        )

        self.assertEqual(
            deal.assigned_to,
            self.sales_rep,
        )

        self.assertEqual(
            deal.created_by,
            self.sales_manager,
        )

        self.assertEqual(
            deal.opportunity_decision.decision,
            (
                LeadOpportunityDecision
                .Decision
                .APPROVED
            ),
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.PROPOSAL,
        )

        self.assertIsNotNone(
            self.lead.converted_at,
        )

        self.assertEqual(
            Customer.objects.count(),
            0,
        )

        self.assertFalse(
            hasattr(
                self.lead,
                "customer",
            )
        )

    def test_conversion_creates_history_event(
        self,
    ):
        self.approve_lead()

        response = self.client.post(
            self.convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        history_item = (
            LeadHistory.objects
            .filter(
                lead=self.lead,
                metadata__workflow_event=(
                    "DEAL_CREATED"
                ),
            )
            .first()
        )

        self.assertIsNotNone(
            history_item,
        )

        self.assertEqual(
            history_item.performed_by,
            self.sales_manager,
        )

    def test_lead_cannot_convert_without_approval(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.post(
            self.convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Deal.objects.count(),
            0,
        )

    def test_rejected_opportunity_cannot_be_converted(
        self,
    ):
        rejection_response = (
            self.reject_lead()
        )

        self.assertEqual(
            rejection_response.status_code,
            status.HTTP_201_CREATED,
        )

        response = self.client.post(
            self.convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Deal.objects.count(),
            0,
        )

    def test_sales_rep_cannot_convert_approved_opportunity(
        self,
    ):
        approval_response = (
            self.approve_lead()
        )

        self.assertEqual(
            approval_response.status_code,
            status.HTTP_201_CREATED,
        )

        self.client.force_authenticate(
            user=self.sales_rep,
        )

        response = self.client.post(
            self.convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        self.assertEqual(
            Deal.objects.count(),
            0,
        )

    def test_lead_cannot_be_converted_to_deal_twice(
        self,
    ):
        self.approve_lead()

        first_response = (
            self.client.post(
                self.convert_url,
                format="json",
            )
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        second_response = (
            self.client.post(
                self.convert_url,
                format="json",
            )
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertEqual(
            Deal.objects.count(),
            1,
        )
