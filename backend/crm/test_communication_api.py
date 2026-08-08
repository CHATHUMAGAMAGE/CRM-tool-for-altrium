from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import Communication, Lead


User = get_user_model()


class CommunicationApiTests(APITestCase):
    def create_user(self, username, role):
        user = User.objects.create_user(
            username=username,
            password="TestPass123!",
        )

        # UserProfile is created automatically by the accounts signal.
        # Update the persisted role, then reload the User so the reverse
        # one-to-one profile cache cannot retain the default SALES_REP role.
        UserProfile.objects.filter(
            user=user,
        ).update(
            role=role,
        )

        return User.objects.get(pk=user.pk)

    def setUp(self):
        self.admin = self.create_user(
            "communication_admin",
            UserProfile.Role.ADMIN,
        )
        self.sales_rep = self.create_user(
            "communication_rep",
            UserProfile.Role.SALES_REP,
        )
        self.other_sales_rep = self.create_user(
            "other_communication_rep",
            UserProfile.Role.SALES_REP,
        )
        self.sales_manager = self.create_user(
            "communication_manager",
            UserProfile.Role.SALES_MANAGER,
        )
        self.project_manager = self.create_user(
            "communication_project_manager",
            UserProfile.Role.PROJECT_MANAGER,
        )
        self.marketing = self.create_user(
            "communication_marketing",
            UserProfile.Role.MARKETING,
        )
        self.director = self.create_user(
            "communication_director",
            UserProfile.Role.DIRECTOR,
        )
        self.software_engineer = self.create_user(
            "communication_engineer",
            UserProfile.Role.SOFTWARE_ENGINEER,
        )

        self.lead = Lead.objects.create(
            company_name="Nova Solutions",
            contact_name="Amal Perera",
            email="amal@example.com",
            phone="0771234567",
            source="Website",
            assigned_to=self.sales_rep,
            created_by=self.admin,
        )

        self.other_lead = Lead.objects.create(
            company_name="Orbit Systems",
            contact_name="Nimal Silva",
            email="nimal@example.com",
            phone="0777654321",
            source="Referral",
            assigned_to=self.other_sales_rep,
            created_by=self.admin,
        )

        self.communication = Communication.objects.create(
            lead=self.lead,
            communication_type=Communication.CommunicationType.CALL,
            communication_date=timezone.now() - timedelta(hours=1),
            summary="Discussed current requirements",
            notes="Customer requested a follow-up call.",
            created_by=self.sales_rep,
        )

    def url(self, lead):
        return reverse(
            "crm:communication-list-create",
            kwargs={"lead_id": lead.id},
        )

    def payload(self):
        return {
            "communication_type": Communication.CommunicationType.EMAIL,
            "communication_date": (
                timezone.now() - timedelta(minutes=5)
            ).isoformat(),
            "summary": "Sent product information",
            "notes": "Included the requested product overview.",
        }

    def test_unauthenticated_user_cannot_list_communications(self):
        response = self.client.get(self.url(self.lead))

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_sales_rep_can_list_communications_for_assigned_lead(self):
        self.client.force_authenticate(self.sales_rep)

        response = self.client.get(self.url(self.lead))

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(len(response.data), 1)
        self.assertEqual(
            response.data[0]["id"],
            self.communication.id,
        )

    def test_sales_rep_cannot_access_another_reps_lead(self):
        self.client.force_authenticate(self.sales_rep)

        response = self.client.get(self.url(self.other_lead))

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_sales_rep_can_create_communication_for_assigned_lead(self):
        self.client.force_authenticate(self.sales_rep)

        response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

        created = Communication.objects.get(
            id=response.data["id"],
        )

        self.assertEqual(created.lead, self.lead)
        self.assertEqual(created.created_by, self.sales_rep)

    def test_sales_rep_cannot_create_for_another_reps_lead(self):
        self.client.force_authenticate(self.sales_rep)

        response = self.client.post(
            self.url(self.other_lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_sales_manager_can_create_communication(self):
        self.client.force_authenticate(self.sales_manager)

        response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_project_manager_can_create_communication(self):
        self.client.force_authenticate(self.project_manager)

        response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
        )

    def test_marketing_can_read_but_cannot_create(self):
        self.client.force_authenticate(self.marketing)

        get_response = self.client.get(self.url(self.lead))
        post_response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            get_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            post_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_director_can_read_but_cannot_create(self):
        self.client.force_authenticate(self.director)

        get_response = self.client.get(self.url(self.lead))
        post_response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            get_response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            post_response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_software_engineer_is_blocked(self):
        self.client.force_authenticate(self.software_engineer)

        response = self.client.get(self.url(self.lead))

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_future_communication_date_is_rejected(self):
        self.client.force_authenticate(self.sales_rep)

        payload = self.payload()
        payload["communication_date"] = (
            timezone.now() + timedelta(hours=1)
        ).isoformat()

        response = self.client.post(
            self.url(self.lead),
            payload,
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn(
            "communication_date",
            response.data,
        )

    def test_closed_lead_rejects_new_communication(self):
        self.lead.status = Lead.Status.LOST
        self.lead.lost_reason = "Customer selected another supplier."
        self.lead.save(
            update_fields=[
                "status",
                "lost_reason",
            ]
        )

        self.client.force_authenticate(self.sales_rep)

        response = self.client.post(
            self.url(self.lead),
            self.payload(),
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertIn("lead", response.data)