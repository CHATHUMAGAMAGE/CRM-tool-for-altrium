from django.contrib.auth.models import User
from django.urls import reverse

from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import Lead, Notification


class LeadApiTests(APITestCase):
    def create_user(
        self,
        username,
        role,
        first_name="",
        last_name="",
    ):
        user = User.objects.create_user(
            username=username,
            password="StrongTestPassword123!",
            first_name=first_name,
            last_name=last_name,
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
            "admin_test",
            UserProfile.Role.ADMIN,
        )

        self.marketing = self.create_user(
            "marketing_test",
            UserProfile.Role.MARKETING,
        )

        self.sales_rep = self.create_user(
            "sales_rep_test",
            UserProfile.Role.SALES_REP,
            first_name="Nuwan",
            last_name="Perera",
        )

        self.other_sales_rep = self.create_user(
            "other_sales_rep",
            UserProfile.Role.SALES_REP,
        )

        self.sales_manager = self.create_user(
            "sales_manager_test",
            UserProfile.Role.SALES_MANAGER,
        )

        self.project_manager = self.create_user(
            "project_manager_test",
            UserProfile.Role.PROJECT_MANAGER,
        )

        self.director = self.create_user(
            "director_test",
            UserProfile.Role.DIRECTOR,
        )

        self.executive = self.create_user(
            "executive_test",
            UserProfile.Role.EXECUTIVE,
        )

        self.software_engineer = self.create_user(
            "engineer_test",
            UserProfile.Role.SOFTWARE_ENGINEER,
        )

        self.tech_lead = self.create_user(
            "tech_lead_test",
            UserProfile.Role.TECH_LEAD,
        )

        self.financial_officer = self.create_user(
            "financial_officer_test",
            UserProfile.Role.FINANCIAL_OFFICER,
        )

        self.lead = Lead.objects.create(
            company_name="Nova Solutions",
            contact_name="Amal Perera",
            email="amal@example.com",
            phone="0771234567",
            source="Website",
            assigned_to=self.sales_rep,
            responsible_manager=self.sales_manager,
            created_by=self.marketing,
        )

        self.other_lead = Lead.objects.create(
            company_name="Vertex Holdings",
            contact_name="Dinithi Silva",
            email="dinithi@example.com",
            phone="0777654321",
            source="Referral",
            assigned_to=self.other_sales_rep,
            responsible_manager=self.sales_manager,
            created_by=self.marketing,
        )

        self.list_url = reverse(
            "crm:lead-list-create",
        )

    def test_executive_has_organisation_read_scope_without_write_scope(self):
        self.client.force_authenticate(user=self.executive)
        listed = self.client.get(self.list_url)
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        self.assertEqual({item["id"] for item in listed.data}, {self.lead.id, self.other_lead.id})

        created = self.client.post(
            self.list_url,
            {"company_name": "Forbidden", "contact_name": "No Write", "phone": "0770000000"},
            format="json",
        )
        self.assertEqual(created.status_code, status.HTTP_403_FORBIDDEN)
        updated = self.client.patch(
            reverse("crm:lead-detail", kwargs={"pk": self.lead.id}),
            {"company_name": "Changed"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_user_cannot_list_leads(
        self,
    ):
        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_admin_cannot_access_operational_leads(
        self,
    ):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

        dashboard_response = self.client.get(
            reverse("crm:dashboard-stats"),
        )
        self.assertEqual(
            dashboard_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_sales_rep_only_sees_assigned_leads(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        returned_ids = {
            lead["id"]
            for lead in response.data
        }

        self.assertEqual(
            returned_ids,
            {
                self.lead.id,
            },
        )

    def test_sales_manager_can_filter_leads_by_structured_source_and_date(self):
        self.client.force_authenticate(user=self.sales_manager)
        created_date = self.lead.created_at.date().isoformat()

        response = self.client.get(
            self.list_url,
            {
                "source": Lead.Source.WEBSITE,
                "created_from": created_date,
                "created_to": created_date,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [self.lead.id])

    def test_invalid_lead_created_date_filter_returns_validation_error(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.get(self.list_url, {"created_from": "not-a-date"})

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("created_from", response.data)

    def test_software_engineer_cannot_access_leads(
        self,
    ):
        self.client.force_authenticate(
            user=self.software_engineer,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_tech_lead_cannot_access_leads(
        self,
    ):
        self.client.force_authenticate(
            user=self.tech_lead,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_financial_officer_cannot_access_leads(
        self,
    ):
        self.client.force_authenticate(
            user=self.financial_officer,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_marketing_can_create_unassigned_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.marketing,
        )

        payload = {
            "company_name":
                "Peak Digital",

            "contact_name":
                "Kasun Jayawardena",

            "email":
                "kasun@example.com",

            "phone":
                "0712345678",

            "source":
                Lead.Source.OTHER,

            "source_details":
                "Campaign",
        }

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        created_lead = (
            Lead.objects.get(
                id=response.data[
                    "id"
                ],
            )
        )

        self.assertEqual(
            created_lead.created_by,
            self.marketing,
        )

        self.assertIsNone(
            created_lead.assigned_to,
        )

    def test_sales_rep_cannot_create_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        payload = {
            "company_name":
                "Blocked Company",

            "contact_name":
                "Blocked User",

            "phone":
                "0700000000",
        }

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_marketing_cannot_assign_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.marketing,
        )

        payload = {
            "company_name":
                "Assignment Test",

            "contact_name":
                "Test Contact",

            "phone":
                "0711111111",

            "assigned_to":
                self.sales_rep.id,
        }

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "assigned_to",
            response.data,
        )

    def test_sales_manager_can_create_and_assign_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        payload = {
            "company_name":
                "Assigned Company",

            "contact_name":
                "Assigned Contact",

            "phone":
                "0722222222",

            "source":
                Lead.Source.REFERRAL,

            "assigned_to":
                self.sales_rep.id,
        }

        response = self.client.post(
            self.list_url,
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        created_lead = (
            Lead.objects.get(
                id=response.data[
                    "id"
                ],
            )
        )

        self.assertEqual(
            created_lead.assigned_to,
            self.sales_rep,
        )

    def test_sales_manager_can_capture_assessment_ready_lead_information(self):
        self.client.force_authenticate(user=self.sales_manager)

        payload = {
            "company_name": "Assessment Ready Company",
            "contact_name": "Assessment Contact",
            "phone": "0712345678",
            "source": Lead.Source.WEBSITE,
            "project_name": "Customer Service Platform",
            "project_nature": "CRM implementation",
            "requirement": "Centralize customer enquiries and case handling.",
            "project_scope": "Discovery, implementation, migration and training.",
            "budget_min": "2500000.00",
            "budget_max": "4000000.00",
            "budget_currency": "lkr",
            "expected_timeline": "Within six months",
        }

        response = self.client.post(self.list_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created_lead = Lead.objects.get(pk=response.data["id"])
        self.assertEqual(created_lead.project_name, payload["project_name"])
        self.assertEqual(created_lead.project_nature, payload["project_nature"])
        self.assertEqual(created_lead.project_scope, payload["project_scope"])
        self.assertEqual(str(created_lead.budget_min), payload["budget_min"])
        self.assertEqual(str(created_lead.budget_max), payload["budget_max"])
        self.assertEqual(created_lead.budget_currency, "LKR")
        self.assertEqual(response.data["expected_timeline"], payload["expected_timeline"])
        self.assertEqual(response.data["requirement"], payload["requirement"])

    def test_lead_rejects_invalid_structured_source(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.post(
            self.list_url,
            {
                "company_name": "Invalid Source Company",
                "contact_name": "Source Contact",
                "phone": "0712345678",
                "source": "Trade show",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("source", response.data)

    def test_other_lead_source_requires_details(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.post(
            self.list_url,
            {
                "company_name": "Other Source Company",
                "contact_name": "Source Contact",
                "phone": "0712345678",
                "source": Lead.Source.OTHER,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("source_details", response.data)

    def test_standard_sources_accept_missing_or_null_source_details(self):
        self.client.force_authenticate(user=self.sales_manager)

        cases = [
            (Lead.Source.WEBSITE, {}),
            (Lead.Source.SOCIAL_MEDIA, {"source_details": None}),
            (Lead.Source.REFERRAL, {}),
            (Lead.Source.DIRECT, {"source_details": None}),
        ]

        for index, (lead_source, extra_payload) in enumerate(cases):
            with self.subTest(source=lead_source):
                response = self.client.post(
                    self.list_url,
                    {
                        "company_name": f"Source Company {index}",
                        "contact_name": f"Source Contact {index}",
                        "phone": f"07123456{index:02d}",
                        "source": lead_source,
                        **extra_payload,
                    },
                    format="json",
                )

                self.assertEqual(
                    response.status_code,
                    status.HTTP_201_CREATED,
                    response.data,
                )
                lead = Lead.objects.get(pk=response.data["id"])
                self.assertEqual(lead.source_details, "")
                self.assertEqual(response.data["source_details"], "")

    def test_model_normalizes_null_source_details_before_persistence(self):
        lead = Lead.objects.create(
            company_name="Persistence Boundary Company",
            contact_name="Persistence Boundary Contact",
            phone="0712345678",
            source=Lead.Source.WEBSITE,
            source_details=None,
            created_by=self.sales_manager,
        )

        lead.refresh_from_db()
        self.assertEqual(lead.source_details, "")

    def test_other_source_with_details_creates_successfully(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.post(
            self.list_url,
            {
                "company_name": "Event Lead Company",
                "contact_name": "Event Contact",
                "phone": "0712345678",
                "source": Lead.Source.OTHER,
                "source_details": "Industry conference",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["source_details"], "Industry conference")

    def test_updating_other_source_to_standard_source_clears_details(self):
        lead = Lead.objects.create(
            company_name="Update Source Company",
            contact_name="Update Contact",
            phone="0712345678",
            source=Lead.Source.OTHER,
            source_details="Industry conference",
            created_by=self.sales_manager,
            responsible_manager=self.sales_manager,
        )
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.patch(
            reverse("crm:lead-detail", kwargs={"pk": lead.pk}),
            {"source": Lead.Source.WEBSITE, "source_details": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lead.refresh_from_db()
        self.assertEqual(lead.source, Lead.Source.WEBSITE)
        self.assertEqual(lead.source_details, "")

    def test_updating_standard_source_to_other_requires_details(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.patch(
            reverse("crm:lead-detail", kwargs={"pk": self.lead.pk}),
            {"source": Lead.Source.OTHER, "source_details": None},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("source_details", response.data)

    def test_lead_rejects_invalid_budget_range(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.post(
            self.list_url,
            {
                "company_name": "Invalid Budget Company",
                "contact_name": "Budget Contact",
                "phone": "0712345678",
                "budget_min": "5000.00",
                "budget_max": "1000.00",
                "budget_currency": "USD",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("budget_max", response.data)

    def test_sales_rep_can_retrieve_assigned_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        response = self.client.get(
            detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data[
                "id"
            ],
            self.lead.id,
        )

    def test_sales_rep_cannot_retrieve_another_reps_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={
                "pk":
                    self.other_lead.pk,
            },
        )

        response = self.client.get(
            detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_director_can_read_but_cannot_modify_lead(
        self,
    ):
        self.client.force_authenticate(
            user=self.director,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        read_response = (
            self.client.get(
                detail_url,
            )
        )

        self.assertEqual(
            read_response.status_code,
            status.HTTP_200_OK,
        )

        update_response = (
            self.client.patch(
                detail_url,
                {
                    "source":
                        "Updated Source",
                },
                format="json",
            )
        )

        self.assertEqual(
            update_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_lost_status_requires_reason(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        response = self.client.patch(
            detail_url,
            {
                "status":
                    Lead.Status.LOST,

                "lost_reason":
                    "",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "lost_reason",
            response.data,
        )

    def test_generic_update_cannot_mark_lead_won(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        response = self.client.patch(
            detail_url,
            {
                "status":
                    Lead.Status.WON,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "status",
            response.data,
        )

    def test_financial_officer_cannot_access_lead_history(
        self,
    ):
        self.client.force_authenticate(
            user=self.financial_officer,
        )

        history_url = reverse(
            "crm:lead-history",
            kwargs={
                "lead_id":
                    self.lead.pk,
            },
        )

        response = self.client.get(
            history_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_sales_rep_can_add_internal_note_to_assigned_lead(self):
        self.client.force_authenticate(user=self.sales_rep)
        history_url = reverse(
            "crm:lead-history",
            kwargs={"lead_id": self.lead.pk},
        )

        response = self.client.post(
            history_url,
            {"note": "Client confirmed hosting is outside the stated budget."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["metadata"]["kind"], "INTERNAL_NOTE")
        self.assertEqual(response.data["performed_by"], self.sales_rep.id)

    def test_sales_rep_cannot_add_note_to_another_reps_lead(self):
        self.client.force_authenticate(user=self.sales_rep)

        response = self.client.post(
            reverse(
                "crm:lead-history",
                kwargs={"lead_id": self.other_lead.pk},
            ),
            {"note": "Unauthorized note."},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_rescue_radar_endpoint_is_removed(self):
        self.client.force_authenticate(user=self.sales_manager)

        response = self.client.post(
            f"/api/v1/crm/leads/{self.lead.pk}/rescue-radar/",
            {},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_rep_cannot_record_opportunity_decision(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        decision_url = reverse(
            "crm:lead-opportunity-decision",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        response = self.client.post(
            decision_url,
            {
                "decision":
                    "PROCEED",

                "decision_notes":
                    "Attempted authorization bypass.",
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_sales_rep_cannot_use_deal_conversion_endpoint(
        self,
    ):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        conversion_url = reverse(
            "crm:lead-convert",
            kwargs={
                "pk":
                    self.lead.pk,
            },
        )

        response = self.client.post(
            conversion_url,
            {},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_legacy_qualification_handover_endpoints_are_removed(self):
        self.client.force_authenticate(user=self.sales_rep)

        submit_response = self.client.post(
            f"/api/v1/crm/leads/{self.lead.pk}/submit-for-qualification/",
            {"handover_note": "Obsolete workflow."},
            format="json",
        )
        return_response = self.client.post(
            f"/api/v1/crm/leads/{self.lead.pk}/return-for-information/",
            {"review_feedback": "Obsolete workflow."},
            format="json",
        )

        self.assertEqual(submit_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(return_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_can_only_read_own_notifications(self):
        own = Notification.objects.create(
            recipient=self.sales_rep,
            actor=self.sales_manager,
            kind=Notification.Kind.ASSIGNMENT,
            title="Assigned",
            target_url=f"/leads/{self.lead.id}",
        )
        Notification.objects.create(
            recipient=self.other_sales_rep,
            actor=self.sales_manager,
            kind=Notification.Kind.ASSIGNMENT,
            title="Other assignment",
            target_url=f"/leads/{self.other_lead.id}",
        )
        self.client.force_authenticate(user=self.sales_rep)
        response = self.client.get(reverse("crm:notification-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in response.data], [own.id])
        read_response = self.client.post(
            reverse("crm:notification-read", kwargs={"pk": own.id}),
            {},
            format="json",
        )
        self.assertEqual(read_response.status_code, status.HTTP_200_OK)
        own.refresh_from_db()
        self.assertIsNotNone(own.read_at)
