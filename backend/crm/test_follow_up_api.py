from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import FollowUp, Lead


User = get_user_model()


class FollowUpApiTests(APITestCase):
    def create_user(self, username, role):
        user = User.objects.create_user(
            username=username,
            password="TestPass123!",
        )

        UserProfile.objects.filter(
            user=user,
        ).update(
            role=role,
        )

        return User.objects.get(pk=user.pk)

    def setUp(self):
        self.admin = self.create_user(
            "followup_admin",
            UserProfile.Role.ADMIN,
        )
        self.sales_rep = self.create_user(
            "followup_rep",
            UserProfile.Role.SALES_REP,
        )
        self.other_sales_rep = self.create_user(
            "other_followup_rep",
            UserProfile.Role.SALES_REP,
        )
        self.sales_manager = self.create_user(
            "followup_manager",
            UserProfile.Role.SALES_MANAGER,
        )
        self.project_manager = self.create_user(
            "followup_project_manager",
            UserProfile.Role.PROJECT_MANAGER,
        )
        self.marketing = self.create_user(
            "followup_marketing",
            UserProfile.Role.MARKETING,
        )
        self.director = self.create_user(
            "followup_director",
            UserProfile.Role.DIRECTOR,
        )
        self.software_engineer = self.create_user(
            "followup_engineer",
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

        self.follow_up = FollowUp.objects.create(
            lead=self.lead,
            title="Discuss pricing",
            description="Review requested pricing options.",
            due_date=timezone.now() + timedelta(days=1),
            assigned_to=self.sales_rep,
            created_by=self.sales_rep,
        )

    def list_url(self, lead):
        return reverse(
            "crm:follow-up-list-create",
            kwargs={"lead_id": lead.id},
        )

    def detail_url(self, follow_up):
        return reverse(
            "crm:follow-up-detail",
            kwargs={"pk": follow_up.id},
        )

    def payload(self):
        return {
            "title": "Follow up on proposal",
            "description": "Confirm whether the client reviewed it.",
            "due_date": (
                timezone.now() + timedelta(days=2)
            ).isoformat(),
        }

    def test_unauthenticated_user_cannot_list_follow_ups(self):
        response = self.client.get(self.list_url(self.lead))
        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_sales_rep_can_list_follow_ups_for_assigned_lead(self):
        self.client.force_authenticate(self.sales_rep)
        response = self.client.get(self.list_url(self.lead))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.follow_up.id)
        self.assertIsNone(response.data[0]["completed_by"])
        self.assertIsNone(response.data[0]["completed_by_name"])
        self.assertIsNone(response.data[0]["completed_by_username"])
        self.assertIn("updated_at", response.data[0])

    def test_sales_rep_cannot_access_another_reps_lead(self):
        self.client.force_authenticate(self.sales_rep)
        response = self.client.get(self.list_url(self.other_lead))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_sales_rep_can_create_follow_up_for_assigned_lead(self):
        self.client.force_authenticate(self.sales_rep)
        response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        created = FollowUp.objects.get(id=response.data["id"])
        self.assertEqual(created.lead, self.lead)
        self.assertEqual(created.assigned_to, self.sales_rep)
        self.assertEqual(created.created_by, self.sales_rep)
        self.assertEqual(created.status, FollowUp.Status.PENDING)

    def test_sales_manager_can_create_follow_up(self):
        self.client.force_authenticate(self.sales_manager)
        response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = FollowUp.objects.get(id=response.data["id"])
        self.assertEqual(created.assigned_to, self.sales_rep)

    def test_project_manager_can_create_follow_up(self):
        self.client.force_authenticate(self.project_manager)
        response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_marketing_can_read_but_cannot_create(self):
        self.client.force_authenticate(self.marketing)
        get_response = self.client.get(self.list_url(self.lead))
        post_response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_director_can_read_but_cannot_create(self):
        self.client.force_authenticate(self.director)
        get_response = self.client.get(self.list_url(self.lead))
        post_response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(get_response.status_code, status.HTTP_200_OK)
        self.assertEqual(post_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_software_engineer_is_blocked(self):
        self.client.force_authenticate(self.software_engineer)
        response = self.client.get(self.list_url(self.lead))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_past_due_date_is_rejected_on_create(self):
        self.client.force_authenticate(self.sales_rep)
        payload = self.payload()
        payload["due_date"] = (
            timezone.now() - timedelta(minutes=5)
        ).isoformat()
        response = self.client.post(
            self.list_url(self.lead),
            payload,
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("due_date", response.data)

    def test_closed_lead_rejects_new_follow_up(self):
        self.lead.status = Lead.Status.LOST
        self.lead.lost_reason = "Customer chose another supplier."
        self.lead.save(update_fields=["status", "lost_reason"])
        self.client.force_authenticate(self.sales_rep)
        response = self.client.post(
            self.list_url(self.lead),
            self.payload(),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("lead", response.data)

    def test_sales_rep_can_complete_assigned_follow_up(self):
        self.client.force_authenticate(self.sales_rep)
        response = self.client.patch(
            self.detail_url(self.follow_up),
            {
                "status": FollowUp.Status.COMPLETED,
                "completed_by": self.other_sales_rep.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.follow_up.refresh_from_db()

        self.assertEqual(
            self.follow_up.status,
            FollowUp.Status.COMPLETED,
        )
        self.assertIsNotNone(self.follow_up.completed_at)
        self.assertEqual(
            self.follow_up.completed_by,
            self.sales_rep,
        )

        self.assertEqual(
            response.data["completed_by"],
            self.sales_rep.id,
        )
        self.assertEqual(
            response.data["completed_by_name"],
            self.sales_rep.username,
        )
        self.assertEqual(
            response.data["completed_by_username"],
            self.sales_rep.username,
        )
        self.assertIn("updated_at", response.data)

    def test_completed_by_cannot_be_spoofed_without_completion(self):
        self.client.force_authenticate(self.sales_rep)

        response = self.client.patch(
            self.detail_url(self.follow_up),
            {
                "title": "Updated follow-up title",
                "completed_by": self.other_sales_rep.id,
            },
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )

        self.follow_up.refresh_from_db()

        self.assertIsNone(self.follow_up.completed_by)
        self.assertIsNone(response.data["completed_by"])

    def test_sales_rep_cannot_update_other_reps_follow_up(self):
        other_follow_up = FollowUp.objects.create(
            lead=self.other_lead,
            title="Other representative follow-up",
            due_date=timezone.now() + timedelta(days=2),
            assigned_to=self.other_sales_rep,
            created_by=self.other_sales_rep,
        )
        self.client.force_authenticate(self.sales_rep)
        response = self.client.patch(
            self.detail_url(other_follow_up),
            {"status": FollowUp.Status.COMPLETED},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cancelled_follow_up_cannot_be_reopened(self):
        self.follow_up.status = FollowUp.Status.CANCELLED
        self.follow_up.save(update_fields=["status"])
        self.client.force_authenticate(self.sales_rep)
        response = self.client.patch(
            self.detail_url(self.follow_up),
            {"status": FollowUp.Status.PENDING},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)