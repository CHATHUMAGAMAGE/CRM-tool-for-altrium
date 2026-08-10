from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import Lead


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
        user.profile.save(update_fields=["role"])

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

        self.software_engineer = self.create_user(
            "engineer_test",
            UserProfile.Role.SOFTWARE_ENGINEER,
        )

        self.lead = Lead.objects.create(
            company_name="Nova Solutions",
            contact_name="Amal Perera",
            email="amal@example.com",
            phone="0771234567",
            source="Website",
            assigned_to=self.sales_rep,
            created_by=self.marketing,
        )

        self.other_lead = Lead.objects.create(
            company_name="Vertex Holdings",
            contact_name="Dinithi Silva",
            email="dinithi@example.com",
            phone="0777654321",
            source="Referral",
            assigned_to=self.other_sales_rep,
            created_by=self.marketing,
        )

        self.list_url = reverse(
            "crm:lead-list-create",
        )

    def test_unauthenticated_user_cannot_list_leads(self):
        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_admin_can_list_all_leads(self):
        self.client.force_authenticate(
            user=self.admin,
        )

        response = self.client.get(
            self.list_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            len(response.data),
            2,
        )

    def test_sales_rep_only_sees_assigned_leads(self):
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
            {self.lead.id},
        )

    def test_software_engineer_cannot_access_leads(self):
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

    def test_marketing_can_create_unassigned_lead(self):
        self.client.force_authenticate(
            user=self.marketing,
        )

        payload = {
            "company_name": "Peak Digital",
            "contact_name": "Kasun Jayawardena",
            "email": "kasun@example.com",
            "phone": "0712345678",
            "source": "Campaign",
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

        created_lead = Lead.objects.get(
            id=response.data["id"],
        )

        self.assertEqual(
            created_lead.created_by,
            self.marketing,
        )

        self.assertIsNone(
            created_lead.assigned_to,
        )

    def test_sales_rep_cannot_create_lead(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        payload = {
            "company_name": "Blocked Company",
            "contact_name": "Blocked User",
            "phone": "0700000000",
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

    def test_marketing_cannot_assign_lead(self):
        self.client.force_authenticate(
            user=self.marketing,
        )

        payload = {
            "company_name": "Assignment Test",
            "contact_name": "Test Contact",
            "phone": "0711111111",
            "assigned_to": self.sales_rep.id,
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

    def test_sales_manager_can_create_and_assign_lead(self):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        payload = {
            "company_name": "Assigned Company",
            "contact_name": "Assigned Contact",
            "phone": "0722222222",
            "source": "Referral",
            "assigned_to": self.sales_rep.id,
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

        created_lead = Lead.objects.get(
            id=response.data["id"],
        )

        self.assertEqual(
            created_lead.assigned_to,
            self.sales_rep,
        )

    def test_sales_rep_can_retrieve_assigned_lead(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={"pk": self.lead.pk},
        )

        response = self.client.get(
            detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.assertEqual(
            response.data["id"],
            self.lead.id,
        )

    def test_sales_rep_cannot_retrieve_another_reps_lead(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={"pk": self.other_lead.pk},
        )

        response = self.client.get(
            detail_url,
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_director_can_read_but_cannot_modify_lead(self):
        self.client.force_authenticate(
            user=self.director,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={"pk": self.lead.pk},
        )

        read_response = self.client.get(
            detail_url,
        )

        self.assertEqual(
            read_response.status_code,
            status.HTTP_200_OK,
        )

        update_response = self.client.patch(
            detail_url,
            {
                "source": "Updated Source",
            },
            format="json",
        )

        self.assertEqual(
            update_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_lost_status_requires_reason(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={"pk": self.lead.pk},
        )

        response = self.client.patch(
            detail_url,
            {
                "status": Lead.Status.LOST,
                "lost_reason": "",
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

    def test_generic_update_cannot_convert_lead(self):
        self.client.force_authenticate(
            user=self.sales_manager,
        )

        detail_url = reverse(
            "crm:lead-detail",
            kwargs={"pk": self.lead.pk},
        )

        response = self.client.patch(
            detail_url,
            {
                "status": Lead.Status.CONVERTED,
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

    def test_sales_rep_can_convert_assigned_lead(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        convert_url = reverse(
            "crm:lead-convert",
            kwargs={"pk": self.lead.pk},
        )

        response = self.client.post(
            convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        self.lead.refresh_from_db()

        self.assertEqual(
            self.lead.status,
            Lead.Status.CONVERTED,
        )

        self.assertIsNotNone(
            self.lead.converted_at,
        )

        self.assertTrue(
            hasattr(self.lead, "customer"),
        )

        customer = self.lead.customer

        self.assertEqual(
            customer.company_name,
            self.lead.company_name,
        )

        self.assertEqual(
            customer.contact_name,
            self.lead.contact_name,
        )

        self.assertEqual(
            customer.email,
            self.lead.email,
        )

        self.assertEqual(
            customer.phone,
            self.lead.phone,
        )

        self.assertEqual(
            customer.source_lead,
            self.lead,
        )

        self.assertEqual(
            customer.assigned_to,
            self.sales_rep,
        )

    def test_sales_rep_cannot_convert_another_sales_reps_lead(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        convert_url = reverse(
            "crm:lead-convert",
            kwargs={"pk": self.other_lead.pk},
        )

        response = self.client.post(
            convert_url,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

        self.assertFalse(
            hasattr(self.other_lead, "customer"),
        )

        self.other_lead.refresh_from_db()

        self.assertEqual(
            self.other_lead.status,
            Lead.Status.NEW,
        )

    def test_converted_lead_cannot_be_converted_again(self):
        self.client.force_authenticate(
            user=self.sales_rep,
        )

        convert_url = reverse(
            "crm:lead-convert",
            kwargs={"pk": self.lead.pk},
        )

        first_response = self.client.post(
            convert_url,
            format="json",
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_201_CREATED,
        )

        second_response = self.client.post(
            convert_url,
            format="json",
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )

        self.assertIn(
            "detail",
            second_response.data,
        )