from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from .models import Communication, Customer, FollowUp, Lead


User = get_user_model()


class LeadModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="leadtester",
            email="leadtester@example.com",
            password="TestPassword123!",
        )

    def test_create_lead_with_default_status(self):
        lead = Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            email="kamal@example.com",
            phone="0712345678",
            source="Website",
            assigned_to=self.user,
            created_by=self.user,
        )

        self.assertEqual(lead.status, Lead.Status.NEW)
        self.assertEqual(lead.created_by, self.user)
        self.assertEqual(lead.assigned_to, self.user)

    def test_lead_string_representation(self):
        lead = Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            created_by=self.user,
        )

        self.assertEqual(
            str(lead),
            "ABC Company - Kamal Perera",
        )

    def test_lost_lead_requires_lost_reason(self):
        lead = Lead(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            status=Lead.Status.LOST,
            lost_reason="",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            lead.full_clean()

    def test_lead_requires_phone_number(self):
        lead = Lead(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            lead.full_clean()

    def test_lead_requires_company_name(self):
        lead = Lead(
            company_name="",
            contact_name="Kamal Perera",
            phone="0712345678",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            lead.full_clean()

    def test_lead_requires_contact_name(self):
        lead = Lead(
            company_name="ABC Company",
            contact_name="",
            phone="0712345678",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            lead.full_clean()

    def test_invalid_lead_status_is_rejected(self):
        lead = Lead(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            status="INVALID_STATUS",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            lead.full_clean()

    def test_duplicate_lead_email_is_allowed(self):
        Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            email="contact@example.com",
            phone="0712345678",
            created_by=self.user,
        )

        second_lead = Lead.objects.create(
            company_name="XYZ Company",
            contact_name="Nimal Silva",
            email="contact@example.com",
            phone="0771234567",
            created_by=self.user,
        )

        self.assertEqual(
            Lead.objects.filter(
                email="contact@example.com"
            ).count(),
            2,
        )
        self.assertEqual(second_lead.email, "contact@example.com")


class CommunicationModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="communicationtester",
            email="communicationtester@example.com",
            password="TestPassword123!",
        )

        cls.lead = Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            created_by=cls.user,
        )

    def test_create_communication(self):
        communication = Communication.objects.create(
            lead=self.lead,
            communication_type=(
                Communication.CommunicationType.CALL
            ),
            communication_date=timezone.now(),
            summary="Discussed product requirements",
            notes="Customer requested more information.",
            created_by=self.user,
        )

        self.assertEqual(communication.lead, self.lead)
        self.assertEqual(communication.created_by, self.user)
        self.assertEqual(
            communication.communication_type,
            Communication.CommunicationType.CALL,
        )

    def test_communication_string_representation(self):
        communication = Communication.objects.create(
            lead=self.lead,
            communication_type=(
                Communication.CommunicationType.EMAIL
            ),
            communication_date=timezone.now(),
            summary="Sent proposal",
            created_by=self.user,
        )

        self.assertEqual(
            str(communication),
            "Email - ABC Company - Kamal Perera",
        )

    def test_communication_requires_summary(self):
        communication = Communication(
            lead=self.lead,
            communication_type=(
                Communication.CommunicationType.CALL
            ),
            communication_date=timezone.now(),
            summary="",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            communication.full_clean()

    def test_invalid_communication_type_is_rejected(self):
        communication = Communication(
            lead=self.lead,
            communication_type="INVALID_TYPE",
            communication_date=timezone.now(),
            summary="Test communication",
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            communication.full_clean()

    def test_lead_communication_relationship(self):
        Communication.objects.create(
            lead=self.lead,
            communication_type=(
                Communication.CommunicationType.WHATSAPP
            ),
            communication_date=timezone.now(),
            summary="WhatsApp conversation",
            created_by=self.user,
        )

        self.assertEqual(self.lead.communications.count(), 1)


class FollowUpModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="followuptester",
            email="followuptester@example.com",
            password="TestPassword123!",
        )

        cls.lead = Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            created_by=cls.user,
        )

    def test_create_follow_up_with_default_status(self):
        follow_up = FollowUp.objects.create(
            lead=self.lead,
            title="Call the customer",
            description="Discuss the proposal.",
            due_date=timezone.now() + timedelta(days=1),
            assigned_to=self.user,
            created_by=self.user,
        )

        self.assertEqual(
            follow_up.status,
            FollowUp.Status.PENDING,
        )
        self.assertEqual(follow_up.lead, self.lead)
        self.assertEqual(follow_up.assigned_to, self.user)

    def test_follow_up_string_representation(self):
        follow_up = FollowUp.objects.create(
            lead=self.lead,
            title="Send quotation",
            due_date=timezone.now() + timedelta(days=1),
            created_by=self.user,
        )

        self.assertEqual(
            str(follow_up),
            "Send quotation - ABC Company - Kamal Perera",
        )

    def test_new_follow_up_cannot_have_past_due_date(self):
        follow_up = FollowUp(
            lead=self.lead,
            title="Expired follow-up",
            due_date=timezone.now() - timedelta(days=1),
            created_by=self.user,
        )

        with self.assertRaises(ValidationError):
            follow_up.full_clean()

    def test_pending_past_follow_up_is_overdue(self):
        follow_up = FollowUp.objects.create(
            lead=self.lead,
            title="Overdue follow-up",
            due_date=timezone.now() - timedelta(days=1),
            status=FollowUp.Status.PENDING,
            created_by=self.user,
        )

        self.assertTrue(follow_up.is_overdue)

    def test_completed_follow_up_is_not_overdue(self):
        follow_up = FollowUp.objects.create(
            lead=self.lead,
            title="Completed follow-up",
            due_date=timezone.now() - timedelta(days=1),
            status=FollowUp.Status.COMPLETED,
            completed_at=timezone.now(),
            created_by=self.user,
        )

        self.assertFalse(follow_up.is_overdue)

    def test_lead_follow_up_relationship(self):
        FollowUp.objects.create(
            lead=self.lead,
            title="Contact customer",
            due_date=timezone.now() + timedelta(days=2),
            created_by=self.user,
        )

        self.assertEqual(self.lead.follow_ups.count(), 1)


class CustomerModelTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(
            username="customertester",
            email="customertester@example.com",
            password="TestPassword123!",
        )

        cls.lead = Lead.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            email="kamal@example.com",
            phone="0712345678",
            status=Lead.Status.WON,
            created_by=cls.user,
        )

    def test_create_customer_from_lead(self):
        customer = Customer.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            email="kamal@example.com",
            phone="0712345678",
            source_lead=self.lead,
            assigned_to=self.user,
        )

        self.assertEqual(customer.source_lead, self.lead)
        self.assertEqual(customer.assigned_to, self.user)
        self.assertEqual(self.lead.customer, customer)

    def test_customer_string_representation(self):
        customer = Customer.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            source_lead=self.lead,
        )

        self.assertEqual(
            str(customer),
            "ABC Company - Kamal Perera",
        )

    def test_source_lead_cannot_be_used_twice(self):
        Customer.objects.create(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="0712345678",
            source_lead=self.lead,
        )

        duplicate_customer = Customer(
            company_name="Second Customer",
            contact_name="Nimal Silva",
            phone="0771234567",
            source_lead=self.lead,
        )

        with self.assertRaises(ValidationError):
            duplicate_customer.full_clean()

    def test_customer_requires_phone_number(self):
        customer = Customer(
            company_name="ABC Company",
            contact_name="Kamal Perera",
            phone="",
            source_lead=self.lead,
        )

        with self.assertRaises(ValidationError):
            customer.full_clean()

    def test_customer_requires_company_name(self):
        customer = Customer(
            company_name="",
            contact_name="Kamal Perera",
            phone="0712345678",
            source_lead=self.lead,
        )

        with self.assertRaises(ValidationError):
            customer.full_clean()

    def test_customer_requires_contact_name(self):
        customer = Customer(
            company_name="ABC Company",
            contact_name="",
            phone="0712345678",
            source_lead=self.lead,
        )

        with self.assertRaises(ValidationError):
            customer.full_clean()