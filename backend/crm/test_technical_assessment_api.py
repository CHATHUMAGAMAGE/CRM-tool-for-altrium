from django.contrib.auth import get_user_model
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import (
    Lead,
    TechnicalAssessment,
    TechnicalAssessmentHistory,
    TechnicalAssessmentRecommendation,
)


User = get_user_model()


class TechnicalAssessmentAPITests(
    APITestCase,
):
    @classmethod
    def setUpTestData(cls):
        cls.sales_manager = (
            User.objects.create_user(
                username="assessment_manager",
                email="assessment_manager@example.com",
                password="TestPassword123!",
                first_name="Sales",
                last_name="Manager",
            )
        )

        cls.sales_manager.profile.role = (
            UserProfile.Role.SALES_MANAGER
        )

        cls.sales_manager.profile.save(
            update_fields=[
                "role",
            ]
        )


        cls.tech_lead = (
            User.objects.create_user(
                username="tech_lead_one",
                email="techlead1@example.com",
                password="TestPassword123!",
                first_name="Tech",
                last_name="Lead",
            )
        )

        cls.tech_lead.profile.role = (
            UserProfile.Role.TECH_LEAD
        )

        cls.tech_lead.profile.save(
            update_fields=[
                "role",
            ]
        )


        cls.other_tech_lead = (
            User.objects.create_user(
                username="tech_lead_two",
                email="techlead2@example.com",
                password="TestPassword123!",
                first_name="Second",
                last_name="Tech Lead",
            )
        )

        cls.other_tech_lead.profile.role = (
            UserProfile.Role.TECH_LEAD
        )

        cls.other_tech_lead.profile.save(
            update_fields=[
                "role",
            ]
        )


        cls.sales_rep = (
            User.objects.create_user(
                username="assessment_sales_rep",
                email="assessment_rep@example.com",
                password="TestPassword123!",
                first_name="Sales",
                last_name="Representative",
            )
        )

        cls.sales_rep.profile.role = (
            UserProfile.Role.SALES_REP
        )

        cls.sales_rep.profile.save(
            update_fields=[
                "role",
            ]
        )


        cls.software_engineer = (
            User.objects.create_user(
                username="assessment_engineer",
                email="assessment_engineer@example.com",
                password="TestPassword123!",
                first_name="Software",
                last_name="Engineer",
            )
        )

        cls.software_engineer.profile.role = (
            UserProfile.Role.SOFTWARE_ENGINEER
        )

        cls.software_engineer.profile.save(
            update_fields=[
                "role",
            ]
        )


        cls.qualified_lead = (
            Lead.objects.create(
                company_name="Qualified Company",
                contact_name="Qualified Contact",
                email="qualified@example.com",
                phone="0711111111",
                source="Website",
                status=Lead.Status.QUALIFIED,
                qualification_notes=(
                    "Lead meets qualification criteria."
                ),
                assigned_to=cls.sales_rep,
                created_by=cls.sales_manager,
            )
        )


        cls.new_lead = (
            Lead.objects.create(
                company_name="New Company",
                contact_name="New Contact",
                email="new@example.com",
                phone="0722222222",
                source="Campaign",
                status=Lead.Status.NEW,
                assigned_to=cls.sales_rep,
                created_by=cls.sales_manager,
            )
        )


    def create_assessment(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        url = reverse(
            "crm:technical-assessment-list-create",
        )

        response = self.client.post(
            url,
            {
                "lead":
                    self.qualified_lead.id,

                "assigned_to":
                    self.tech_lead.id,

                "requirements":
                    (
                        "Review the proposed solution, "
                        "technical feasibility, risks, "
                        "required skills and resource needs."
                    ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        return (
            TechnicalAssessment.objects.get(
                pk=response.data[
                    "id"
                ],
            )
        )


    def test_sales_manager_can_request_assessment(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        self.assertEqual(
            assessment.lead,
            self.qualified_lead,
        )

        self.assertEqual(
            assessment.requested_by,
            self.sales_manager,
        )

        self.assertEqual(
            assessment.assigned_to,
            self.tech_lead,
        )

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .REQUESTED,
        )

        self.assertTrue(
            TechnicalAssessmentHistory
            .objects
            .filter(
                assessment=assessment,
                event_type=(
                    TechnicalAssessmentHistory
                    .EventType
                    .REQUESTED
                ),
            )
            .exists()
        )


    def test_unqualified_lead_cannot_receive_assessment(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-list-create",
            ),
            {
                "lead":
                    self.new_lead.id,

                "assigned_to":
                    self.tech_lead.id,

                "requirements":
                    "Check technical feasibility.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            response.data,
        )

        self.assertIn(
            "lead",
            response.data,
        )

        self.assertFalse(
            TechnicalAssessment.objects.filter(
                lead=self.new_lead,
            ).exists()
        )


    def test_sales_rep_cannot_request_assessment(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-list-create",
            ),
            {
                "lead":
                    self.qualified_lead.id,

                "assigned_to":
                    self.tech_lead.id,

                "requirements":
                    "Check technical feasibility.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    def test_tech_lead_only_sees_assigned_assessments(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.get(
            reverse(
                "crm:technical-assessment-list-create",
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        response_ids = [
            item["id"]
            for item in response.data
        ]

        self.assertIn(
            assessment.id,
            response_ids,
        )


        self.client.force_authenticate(
            user=self.other_tech_lead,
        )

        response = self.client.get(
            reverse(
                "crm:technical-assessment-list-create",
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        response_ids = [
            item["id"]
            for item in response.data
        ]

        self.assertNotIn(
            assessment.id,
            response_ids,
        )


    def test_tech_lead_cannot_open_normal_leads_module(
        self,
    ):
        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.get(
            reverse(
                "crm:lead-list-create",
            )
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )


    def test_assigned_tech_lead_can_start_assessment(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-start",
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
            response.data,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .IN_PROGRESS,
        )

        self.assertTrue(
            TechnicalAssessmentHistory
            .objects
            .filter(
                assessment=assessment,
                event_type=(
                    TechnicalAssessmentHistory
                    .EventType
                    .STARTED
                ),
            )
            .exists()
        )


    def test_other_tech_lead_cannot_start_assessment(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        self.client.force_authenticate(
            user=self.other_tech_lead,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-start",
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

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .REQUESTED,
        )


    def test_tech_lead_can_update_comments(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        assessment.status = (
            TechnicalAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )


        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.patch(
            reverse(
                "crm:technical-assessment-work",
                kwargs={
                    "pk":
                        assessment.id,
                },
            ),
            {
                "technical_comments": (
                    "The proposed implementation is "
                    "technically feasible. Primary risks "
                    "relate to integration and deployment."
                )
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            response.data,
        )

        assessment.refresh_from_db()

        self.assertIn(
            "technically feasible",
            assessment.technical_comments,
        )


    def test_tech_lead_can_recommend_software_engineer(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        assessment.status = (
            TechnicalAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )


        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-recommendations",
                kwargs={
                    "assessment_id":
                        assessment.id,
                },
            ),
            {
                "engineer":
                    self.software_engineer.id,

                "availability":
                    "AVAILABLE",

                "recommendation_notes":
                    (
                        "Recommended for the backend "
                        "and integration work."
                    ),
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        recommendation = (
            TechnicalAssessmentRecommendation
            .objects
            .get(
                assessment=assessment,
                engineer=self.software_engineer,
            )
        )

        self.assertEqual(
            recommendation.availability,
            TechnicalAssessmentRecommendation
            .Availability
            .AVAILABLE,
        )

        self.assertEqual(
            recommendation.recommended_by,
            self.tech_lead,
        )


    def test_duplicate_engineer_recommendation_is_rejected(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        assessment.status = (
            TechnicalAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )


        TechnicalAssessmentRecommendation.objects.create(
            assessment=assessment,
            engineer=self.software_engineer,
            availability=(
                TechnicalAssessmentRecommendation
                .Availability
                .AVAILABLE
            ),
            recommendation_notes=(
                "Initial recommendation."
            ),
            recommended_by=self.tech_lead,
        )


        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-recommendations",
                kwargs={
                    "assessment_id":
                        assessment.id,
                },
            ),
            {
                "engineer":
                    self.software_engineer.id,

                "availability":
                    "LIMITED",

                "recommendation_notes":
                    "Duplicate recommendation.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            response.data,
        )

        self.assertEqual(
            TechnicalAssessmentRecommendation
            .objects
            .filter(
                assessment=assessment,
                engineer=self.software_engineer,
            )
            .count(),
            1,
        )


    def test_assessment_requires_comments_before_submission(
        self,
    ):
        assessment = (
            self.create_assessment()
        )

        assessment.status = (
            TechnicalAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.technical_comments = ""

        assessment.save(
            update_fields=[
                "status",
                "technical_comments",
                "updated_at",
            ]
        )


        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.post(
            reverse(
                "crm:technical-assessment-submit",
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
            response.data,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .IN_PROGRESS,
        )


    def test_complete_technical_assessment_workflow(
        self,
    ):
        assessment = (
            self.create_assessment()
        )


        # Tech Lead starts the assessment.

        self.client.force_authenticate(
            user=self.tech_lead,
        )

        start_response = (
            self.client.post(
                reverse(
                    "crm:technical-assessment-start",
                    kwargs={
                        "pk":
                            assessment.id,
                    },
                ),
                {},
                format="json",
            )
        )

        self.assertEqual(
            start_response.status_code,
            status.HTTP_200_OK,
            start_response.data,
        )


        # Tech Lead records technical findings.

        work_response = (
            self.client.patch(
                reverse(
                    "crm:technical-assessment-work",
                    kwargs={
                        "pk":
                            assessment.id,
                    },
                ),
                {
                    "technical_comments": (
                        "The solution is technically feasible. "
                        "The main risks are integration effort "
                        "and deployment complexity."
                    )
                },
                format="json",
            )
        )

        self.assertEqual(
            work_response.status_code,
            status.HTTP_200_OK,
            work_response.data,
        )


        # Tech Lead recommends an engineer.

        recommendation_response = (
            self.client.post(
                reverse(
                    "crm:technical-assessment-recommendations",
                    kwargs={
                        "assessment_id":
                            assessment.id,
                    },
                ),
                {
                    "engineer":
                        self.software_engineer.id,

                    "availability":
                        "AVAILABLE",

                    "recommendation_notes":
                        (
                            "Suitable experience for "
                            "the required implementation."
                        ),
                },
                format="json",
            )
        )

        self.assertEqual(
            recommendation_response.status_code,
            status.HTTP_201_CREATED,
            recommendation_response.data,
        )


        # Tech Lead submits the assessment.

        submit_response = (
            self.client.post(
                reverse(
                    "crm:technical-assessment-submit",
                    kwargs={
                        "pk":
                            assessment.id,
                    },
                ),
                {},
                format="json",
            )
        )

        self.assertEqual(
            submit_response.status_code,
            status.HTTP_200_OK,
            submit_response.data,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .SUBMITTED,
        )

        self.assertIsNotNone(
            assessment.submitted_at,
        )


        # Sales Manager reviews the result.

        self.client.force_authenticate(
            user=self.sales_manager,
        )

        review_response = (
            self.client.post(
                reverse(
                    "crm:technical-assessment-review",
                    kwargs={
                        "pk":
                            assessment.id,
                    },
                ),
                {
                    "review_notes": (
                        "Technical assessment reviewed "
                        "and accepted for the next "
                        "decision stage."
                    )
                },
                format="json",
            )
        )

        self.assertEqual(
            review_response.status_code,
            status.HTTP_200_OK,
            review_response.data,
        )

        assessment.refresh_from_db()

        self.assertEqual(
            assessment.status,
            TechnicalAssessment
            .Status
            .REVIEWED,
        )

        self.assertEqual(
            assessment.reviewed_by,
            self.sales_manager,
        )

        self.assertIsNotNone(
            assessment.reviewed_at,
        )


        # Verify the complete audit trail.

        event_types = set(
            TechnicalAssessmentHistory
            .objects
            .filter(
                assessment=assessment,
            )
            .values_list(
                "event_type",
                flat=True,
            )
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .REQUESTED,
            event_types,
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .STARTED,
            event_types,
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .UPDATED,
            event_types,
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .RECOMMENDATION_ADDED,
            event_types,
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .SUBMITTED,
            event_types,
        )

        self.assertIn(
            TechnicalAssessmentHistory
            .EventType
            .REVIEWED,
            event_types,
        )