from django.contrib.auth import (
    get_user_model,
)
from django.core.files.uploadedfile import (
    SimpleUploadedFile,
)
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import (
    FinancialAssessment,
    FinancialAssessmentHistory,
    Lead,
    TechnicalAssessment,
)


User = get_user_model()


class FinancialAssessmentAPITests(
    APITestCase,
):
    @classmethod
    def setUpTestData(
        cls,
    ):
        cls.sales_manager = (
            User.objects.create_user(
                username="finance_manager",
                email="finance_manager@example.com",
                password="Manager123!",
                first_name="Sales",
                last_name="Manager",
            )
        )

        cls.sales_manager.profile.role = (
            UserProfile
            .Role
            .SALES_MANAGER
        )

        cls.sales_manager.profile.save()

        cls.financial_officer = (
            User.objects.create_user(
                username="financialofficer1",
                email="financialofficer1@example.com",
                password="Finance123!",
                first_name="Financial",
                last_name="Officer",
            )
        )

        cls.financial_officer.profile.role = (
            UserProfile
            .Role
            .FINANCIAL_OFFICER
        )

        cls.financial_officer.profile.save()

        cls.other_financial_officer = (
            User.objects.create_user(
                username="financialofficer2",
                email="financialofficer2@example.com",
                password="Finance123!",
                first_name="Other",
                last_name="Officer",
            )
        )

        cls.other_financial_officer.profile.role = (
            UserProfile
            .Role
            .FINANCIAL_OFFICER
        )

        cls.other_financial_officer.profile.save()

        cls.tech_lead = (
            User.objects.create_user(
                username="finance_test_techlead",
                email="finance_test_techlead@example.com",
                password="TechLead123!",
                first_name="Tech",
                last_name="Lead",
            )
        )

        cls.tech_lead.profile.role = (
            UserProfile
            .Role
            .TECH_LEAD
        )

        cls.tech_lead.profile.save()

        cls.sales_rep = (
            User.objects.create_user(
                username="finance_test_rep",
                email="finance_test_rep@example.com",
                password="SalesRep123!",
                first_name="Sales",
                last_name="Rep",
            )
        )

        cls.sales_rep.profile.role = (
            UserProfile
            .Role
            .SALES_REP
        )

        cls.sales_rep.profile.save()

        cls.lead = Lead.objects.create(
            company_name="Finance Test Company",
            contact_name="Finance Contact",
            email="finance@example.com",
            phone="0711111111",
            source="Test",
            status=Lead.Status.QUALIFIED,
            qualification_notes=(
                "Qualified for assessment."
            ),
            assigned_to=cls.sales_rep,
            created_by=cls.sales_manager,
        )

        cls.reviewed_technical_assessment = (
            TechnicalAssessment.objects.create(
                lead=cls.lead,
                requested_by=cls.sales_manager,
                assigned_to=cls.tech_lead,
                requirements=(
                    "Assess technical feasibility."
                ),
                status=(
                    TechnicalAssessment
                    .Status
                    .REVIEWED
                ),
                technical_comments=(
                    "The proposed solution is "
                    "technically feasible."
                ),
                submitted_at=timezone.now(),
                reviewed_at=timezone.now(),
                reviewed_by=cls.sales_manager,
                review_notes=(
                    "Technical assessment approved."
                ),
            )
        )

    def create_financial_assessment(
        self,
        assigned_to=None,
        status_value=None,
        financial_comments="",
    ):
        if assigned_to is None:
            assigned_to = (
                self.financial_officer
            )

        if status_value is None:
            status_value = (
                FinancialAssessment
                .Status
                .REQUESTED
            )

        return (
            FinancialAssessment.objects.create(
                lead=self.lead,
                technical_assessment=(
                    self.reviewed_technical_assessment
                ),
                requested_by=(
                    self.sales_manager
                ),
                assigned_to=assigned_to,
                requirements=(
                    "Assess budget, cost and "
                    "financial viability."
                ),
                status=status_value,
                financial_comments=(
                    financial_comments
                ),
            )
        )

    def test_sales_manager_can_view_financial_officers(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.get(
            reverse(
                "crm:financial-assessment-officers"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            self.financial_officer.id,
            returned_ids,
        )

        self.assertIn(
            self.other_financial_officer.id,
            returned_ids,
        )

    def test_sales_manager_can_request_financial_assessment(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-list-create"
            ),
            {
                "lead":
                    self.lead.id,

                "technical_assessment":
                    self.reviewed_technical_assessment.id,

                "assigned_to":
                    self.financial_officer.id,

                "requirements": (
                    "Review budget and "
                    "financial feasibility."
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        assessment = (
            FinancialAssessment.objects.get(
                pk=response.data["id"],
            )
        )

        self.assertEqual(
            assessment.status,
            FinancialAssessment
            .Status
            .REQUESTED,
        )

        self.assertEqual(
            assessment.assigned_to,
            self.financial_officer,
        )

        self.assertTrue(
            FinancialAssessmentHistory
            .objects
            .filter(
                assessment=assessment,
                event_type=(
                    FinancialAssessmentHistory
                    .EventType
                    .REQUESTED
                ),
            )
            .exists()
        )

    def test_unreviewed_technical_assessment_is_rejected(
        self,
    ):
        technical_assessment = (
            TechnicalAssessment.objects.create(
                lead=self.lead,
                requested_by=self.sales_manager,
                assigned_to=self.tech_lead,
                requirements="Assess.",
                status=(
                    TechnicalAssessment
                    .Status
                    .SUBMITTED
                ),
                technical_comments="Completed.",
            )
        )

        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-list-create"
            ),
            {
                "lead":
                    self.lead.id,

                "technical_assessment":
                    technical_assessment.id,

                "assigned_to":
                    self.financial_officer.id,

                "requirements":
                    "Review finances.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "technical_assessment",
            response.data,
        )

    def test_technical_assessment_must_belong_to_same_lead(
        self,
    ):
        other_lead = Lead.objects.create(
            company_name="Other Company",
            contact_name="Other Contact",
            phone="0722222222",
            status=Lead.Status.QUALIFIED,
            qualification_notes="Qualified.",
            assigned_to=self.sales_rep,
            created_by=self.sales_manager,
        )

        other_technical_assessment = (
            TechnicalAssessment.objects.create(
                lead=other_lead,
                requested_by=self.sales_manager,
                assigned_to=self.tech_lead,
                requirements="Assess.",
                status=(
                    TechnicalAssessment
                    .Status
                    .REVIEWED
                ),
                technical_comments="Feasible.",
                reviewed_at=timezone.now(),
                reviewed_by=self.sales_manager,
            )
        )

        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-list-create"
            ),
            {
                "lead":
                    self.lead.id,

                "technical_assessment":
                    other_technical_assessment.id,

                "assigned_to":
                    self.financial_officer.id,

                "requirements":
                    "Review finances.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "technical_assessment",
            response.data,
        )

    def test_sales_rep_cannot_request_financial_assessment(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-list-create"
            ),
            {
                "lead":
                    self.lead.id,

                "technical_assessment":
                    self.reviewed_technical_assessment.id,

                "assigned_to":
                    self.financial_officer.id,

                "requirements":
                    "Review finances.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_financial_officer_only_sees_assigned_assessments(
        self,
    ):
        own_assessment = (
            self.create_financial_assessment()
        )

        other_assessment = (
            self.create_financial_assessment(
                assigned_to=(
                    self.other_financial_officer
                )
            )
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.get(
            reverse(
                "crm:financial-assessment-list-create"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            item["id"]
            for item in response.data
        }

        self.assertIn(
            own_assessment.id,
            returned_ids,
        )

        self.assertNotIn(
            other_assessment.id,
            returned_ids,
        )

    def test_financial_officer_cannot_use_normal_leads_api(
        self,
    ):
        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.get(
            reverse(
                "crm:lead-list-create"
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_assigned_financial_officer_can_start_assessment(
        self,
    ):
        assessment = (
            self.create_financial_assessment()
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-start",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            FinancialAssessment
            .Status
            .IN_PROGRESS,
        )

    def test_other_financial_officer_cannot_start_assessment(
        self,
    ):
        assessment = (
            self.create_financial_assessment()
        )

        self.client.force_authenticate(
            user=self.other_financial_officer,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-start",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_financial_officer_can_update_financial_comments(
        self,
    ):
        assessment = (
            self.create_financial_assessment(
                status_value=(
                    FinancialAssessment
                    .Status
                    .IN_PROGRESS
                ),
            )
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.patch(
            reverse(
                "crm:financial-assessment-work",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {
                "financial_comments": (
                    "Budget is viable and "
                    "projected costs are acceptable."
                ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        assessment.refresh_from_db()

        self.assertIn(
            "Budget is viable",
            assessment.financial_comments,
        )

    def test_financial_officer_can_upload_document(
        self,
    ):
        assessment = (
            self.create_financial_assessment(
                status_value=(
                    FinancialAssessment
                    .Status
                    .IN_PROGRESS
                ),
            )
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        uploaded_file = SimpleUploadedFile(
            "financial-test.txt",
            b"financial assessment test",
            content_type="text/plain",
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-documents",
                kwargs={
                    "assessment_id":
                        assessment.id,
                },
            ),
            {
                "title":
                    "Financial Estimate",

                "description":
                    "Test supporting document.",

                "file":
                    uploaded_file,
            },
            format="multipart",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.assertTrue(
            assessment.documents.exists()
        )

    def test_submit_requires_financial_comments(
        self,
    ):
        assessment = (
            self.create_financial_assessment(
                status_value=(
                    FinancialAssessment
                    .Status
                    .IN_PROGRESS
                ),
            )
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.post(
            reverse(
                "crm:financial-assessment-submit",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "financial_comments",
            response.data,
        )

    def test_complete_financial_assessment_workflow(
        self,
    ):
        assessment = (
            self.create_financial_assessment()
        )

        self.client.force_authenticate(
            user=self.financial_officer,
        )

        start_response = self.client.post(
            reverse(
                "crm:financial-assessment-start",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {},
            format="json",
        )

        self.assertEqual(
            start_response.status_code,
            status.HTTP_200_OK,
        )

        work_response = self.client.patch(
            reverse(
                "crm:financial-assessment-work",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {
                "financial_comments": (
                    "Estimated costs are within "
                    "the expected budget. "
                    "Financially viable."
                ),
            },
            format="json",
        )

        self.assertEqual(
            work_response.status_code,
            status.HTTP_200_OK,
        )

        submit_response = self.client.post(
            reverse(
                "crm:financial-assessment-submit",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {},
            format="json",
        )

        self.assertEqual(
            submit_response.status_code,
            status.HTTP_200_OK,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            FinancialAssessment
            .Status
            .SUBMITTED,
        )

        self.client.force_authenticate(
            user=self.sales_manager,
        )

        review_response = self.client.post(
            reverse(
                "crm:financial-assessment-review",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {
                "review_notes": (
                    "Financial assessment reviewed "
                    "and accepted."
                ),
            },
            format="json",
        )

        self.assertEqual(
            review_response.status_code,
            status.HTTP_200_OK,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            FinancialAssessment
            .Status
            .REVIEWED,
        )

        self.assertEqual(
            assessment.reviewed_by,
            self.sales_manager,
        )

        history_events = set(
            assessment.history.values_list(
                "event_type",
                flat=True,
            )
        )

        self.assertIn(
            FinancialAssessmentHistory
            .EventType
            .STARTED,
            history_events,
        )

        self.assertIn(
            FinancialAssessmentHistory
            .EventType
            .UPDATED,
            history_events,
        )

        self.assertIn(
            FinancialAssessmentHistory
            .EventType
            .SUBMITTED,
            history_events,
        )

        self.assertIn(
            FinancialAssessmentHistory
            .EventType
            .REVIEWED,
            history_events,
        )