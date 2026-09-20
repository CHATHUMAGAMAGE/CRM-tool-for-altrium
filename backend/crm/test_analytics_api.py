from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import (
    Deal,
    FinancialAssessment,
    FollowUp,
    Lead,
    LeadOpportunityDecision,
    TechnicalAssessment,
)
from .report_pdf import PdfReport, build_pdf_context, report_pdf_filename

REPORT_NAMES_FOR_TESTS = (
    "lead-sources", "lead-conversion", "lead-status",
    "sales-rep-performance", "deals",
)


class AnalyticsApiTests(APITestCase):
    def create_user(self, username, role):
        user = User.objects.create_user(username=username, password="TestPassword123!")
        user.profile.role = role
        user.profile.save(update_fields=["role"])
        return user

    def setUp(self):
        self.manager = self.create_user("analytics_manager", UserProfile.Role.SALES_MANAGER)
        self.manager.first_name = "Nishitha"
        self.manager.last_name = "Sellahennadi"
        self.manager.save(update_fields=["first_name", "last_name"])
        self.director = self.create_user("analytics_director", UserProfile.Role.DIRECTOR)
        self.executive = self.create_user("analytics_executive", UserProfile.Role.EXECUTIVE)
        self.rep = self.create_user("analytics_rep", UserProfile.Role.SALES_REP)
        self.finance = self.create_user("analytics_finance", UserProfile.Role.FINANCIAL_OFFICER)
        self.tech_lead = self.create_user("analytics_tech", UserProfile.Role.TECH_LEAD)
        self.admin = self.create_user("analytics_admin", UserProfile.Role.ADMIN)

        self.deal_lead = Lead.objects.create(
            company_name="Apex", contact_name="Nimal", phone="0770000001",
            project_name="Inventory Platform", source=Lead.Source.WEBSITE,
            assigned_to=self.rep, created_by=self.manager,
        )
        finance = FinancialAssessment.objects.create(
            lead=self.deal_lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess budget", status=FinancialAssessment.Status.REVIEWED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
            submitted_at=timezone.now(), reviewed_at=timezone.now(), reviewed_by=self.manager,
        )
        technical = TechnicalAssessment.objects.create(
            lead=self.deal_lead, requested_by=self.manager, assigned_to=self.tech_lead,
            requirements="Assess feasibility", status=TechnicalAssessment.Status.REVIEWED,
            technical_comments="Feasible", submitted_at=timezone.now(),
            reviewed_at=timezone.now(), reviewed_by=self.manager,
        )
        decision = LeadOpportunityDecision.objects.create(
            lead=self.deal_lead, financial_assessment=finance,
            technical_assessment=technical,
            decision=LeadOpportunityDecision.Decision.PROCEED,
            decision_notes="Proceed", decided_by=self.manager,
        )
        Deal.objects.create(
            source_lead=self.deal_lead, opportunity_decision=decision,
            name="Apex Deal", company_name="Apex", contact_name="Nimal",
            phone="0770000001", assigned_to=self.rep, created_by=self.manager,
        )

        self.unsuitable_lead = Lead.objects.create(
            company_name="Beta", contact_name="Mala", phone="0770000002",
            source=Lead.Source.REFERRAL, assigned_to=self.rep, created_by=self.manager,
        )
        FinancialAssessment.objects.create(
            lead=self.unsuitable_lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess budget", status=FinancialAssessment.Status.SUBMITTED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE,
            submitted_at=timezone.now(),
        )
        self.pending_lead = Lead.objects.create(
            company_name="Gamma", contact_name="Saman", phone="0770000003",
            source=Lead.Source.SOCIAL_MEDIA, assigned_to=self.rep, created_by=self.manager,
        )
        FinancialAssessment.objects.create(
            lead=self.pending_lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess budget", status=FinancialAssessment.Status.REQUESTED,
        )
        FollowUp.objects.create(
            lead=self.pending_lead, title="Call client",
            due_date=timezone.now() - timedelta(days=2), assigned_to=self.rep,
            created_by=self.rep,
        )

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_manager_dashboard_returns_operational_metrics(self):
        self.authenticate(self.manager)
        response = self.client.get(reverse("crm:manager-analytics-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kpis"]["leads_created"], 3)
        self.assertEqual(response.data["kpis"]["deals_generated"], 1)
        self.assertEqual(response.data["kpis"]["lead_to_deal_conversion_rate"], 33.3)
        self.assertEqual(response.data["kpis"]["overdue_follow_ups"], 1)
        self.assertTrue(response.data["attention_required"])
        self.assertEqual(response.data["team_performance"][0]["assigned_leads"], 3)

    def test_director_dashboard_uses_total_leads_for_lead_to_proceed_rate(self):
        self.authenticate(self.director)
        response = self.client.get(reverse("crm:executive-analytics-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["kpis"]["lead_to_proceed_rate"], 33.3)
        self.assertEqual(response.data["decision_outcomes"]["pending"], 2)

    def test_executive_dashboard_and_all_report_exports_are_available(self):
        self.authenticate(self.executive)
        dashboard = self.client.get(reverse("crm:executive-analytics-dashboard"))
        self.assertEqual(dashboard.status_code, status.HTTP_200_OK)
        self.assertIn("commercial_health", dashboard.data)
        self.assertIn("sales_rep_summary", dashboard.data)
        for report_name in REPORT_NAMES_FOR_TESTS:
            report = self.client.get(reverse("crm:analytics-report", kwargs={"report_name": report_name}))
            export = self.client.get(reverse("crm:analytics-report-export", kwargs={"report_name": report_name}))
            self.assertEqual(report.status_code, status.HTTP_200_OK)
            self.assertEqual(export.status_code, status.HTTP_200_OK)

    def test_dashboard_permissions_are_role_specific(self):
        manager_url = reverse("crm:manager-analytics-dashboard")
        executive_url = reverse("crm:executive-analytics-dashboard")
        for user in (self.rep, self.finance, self.admin, self.director, self.executive):
            self.authenticate(user)
            self.assertEqual(self.client.get(manager_url).status_code, status.HTTP_403_FORBIDDEN)
        self.authenticate(self.manager)
        self.assertEqual(self.client.get(executive_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_report_filters_and_empty_period_are_consistent(self):
        self.authenticate(self.manager)
        url = reverse("crm:analytics-report", kwargs={"report_name": "lead-sources"})
        response = self.client.get(url, {"source": Lead.Source.REFERRAL})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["records"]), 1)
        self.assertEqual(response.data["records"][0]["lead_id"], self.unsuitable_lead.id)
        future = (timezone.localdate() + timedelta(days=20)).isoformat()
        empty = self.client.get(url, {"date_from": future, "date_to": future})
        self.assertEqual(empty.data["records"], [])

    def test_all_five_reports_and_csv_exports_are_authorized(self):
        self.authenticate(self.director)
        for report_name in ("lead-sources", "lead-conversion", "lead-status", "sales-rep-performance", "deals"):
            report_url = reverse("crm:analytics-report", kwargs={"report_name": report_name})
            export_url = reverse("crm:analytics-report-export", kwargs={"report_name": report_name})
            self.assertEqual(self.client.get(report_url).status_code, status.HTTP_200_OK)
            export = self.client.get(export_url, {"source": Lead.Source.WEBSITE})
            self.assertEqual(export.status_code, status.HTTP_200_OK)
            self.assertEqual(export["Content-Type"], "text/csv; charset=utf-8")
            self.assertTrue(export.content.startswith(b"\xef\xbb\xbf"))

        self.authenticate(self.rep)
        self.assertEqual(self.client.get(report_url).status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(self.client.get(export_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_invalid_filters_return_400_instead_of_being_ignored(self):
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:manager-analytics-dashboard"), {"assessment_stage": "MADE_UP"}
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        invalid_rep = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-sources"}),
            {"sales_rep": "999999"},
        )
        self.assertEqual(invalid_rep.status_code, status.HTTP_400_BAD_REQUEST)
        unsupported = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-sources"}),
            {"made_up_filter": "value"},
        )
        self.assertEqual(unsupported.status_code, status.HTTP_400_BAD_REQUEST)

    @patch("crm.report_pdf.generate_report_pdf")
    def test_all_five_pdf_exports_return_binary_attachments(self, generate_pdf):
        generate_pdf.side_effect = lambda report_name, payload, filters, user: PdfReport(
            content=b"%PDF-1.7 test",
            filename=f'ELEVEN_{report_name}_{filters["date_from"]}_to_{filters["date_to"]}.pdf',
        )
        self.authenticate(self.manager)
        for report_name in ("lead-sources", "lead-conversion", "lead-status", "sales-rep-performance", "deals"):
            response = self.client.get(
                reverse("crm:analytics-report-pdf", kwargs={"report_name": report_name}),
                {"date_from": timezone.localdate().replace(day=1).isoformat(), "date_to": timezone.localdate().isoformat()},
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response["Content-Type"], "application/pdf")
            self.assertIn("attachment;", response["Content-Disposition"])
            self.assertIn(".pdf", response["Content-Disposition"])
            self.assertTrue(response.content.startswith(b"%PDF"))

    @patch("crm.report_pdf.generate_report_pdf")
    def test_pdf_export_uses_filters_and_supports_empty_results(self, generate_pdf):
        generate_pdf.return_value = PdfReport(b"%PDF-1.7 empty", "empty.pdf")
        self.authenticate(self.manager)
        url = reverse("crm:analytics-report-pdf", kwargs={"report_name": "lead-sources"})
        filtered = self.client.get(url, {"source": Lead.Source.REFERRAL})
        self.assertEqual(filtered.status_code, status.HTTP_200_OK)
        payload = generate_pdf.call_args.args[1]
        self.assertEqual([record["lead_id"] for record in payload["records"]], [self.unsuitable_lead.id])

        future = (timezone.localdate() + timedelta(days=30)).isoformat()
        empty = self.client.get(url, {"date_from": future, "date_to": future})
        self.assertEqual(empty.status_code, status.HTTP_200_OK)
        self.assertEqual(generate_pdf.call_args.args[1]["records"], [])

    @patch("crm.report_pdf.generate_report_pdf")
    def test_pdf_export_permissions_are_enforced(self, generate_pdf):
        generate_pdf.return_value = PdfReport(b"%PDF", "test.pdf")
        url = reverse("crm:analytics-report-pdf", kwargs={"report_name": "deals"})
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)
        for user in (self.rep, self.finance, self.tech_lead, self.admin):
            self.authenticate(user)
            self.assertEqual(self.client.get(url).status_code, status.HTTP_403_FORBIDDEN)
        for user in (self.manager, self.director, self.executive):
            self.authenticate(user)
            self.assertEqual(self.client.get(url).status_code, status.HTTP_200_OK)

    def test_pdf_context_uses_authenticated_identity_and_readable_filters(self):
        filters = {
            "date_from": timezone.localdate().replace(day=1),
            "date_to": timezone.localdate(),
            "sales_rep": self.rep.id,
            "source": Lead.Source.WEBSITE,
            "status": "",
            "assessment_stage": "",
            "final_decision": "",
            "deal_status": "",
        }
        from .analytics import report_payload

        context = build_pdf_context("lead-sources", report_payload("lead-sources", filters), filters, self.manager)
        self.assertEqual(context["generated_by"], "Nishitha Sellahennadi")
        self.assertEqual(context["generated_role"], "Sales Manager")
        self.assertTrue(context["logo_uri"].endswith("/static/reports/eleven-logo-horizontal.png"))
        self.assertIn(("Lead Source", "Website"), context["filters"])
        self.assertIn(("Sales Representative", "analytics_rep"), context["filters"])
        self.assertEqual(
            report_pdf_filename("lead-sources", filters),
            f'ELEVEN_Lead_Source_Report_{filters["date_from"]}_to_{filters["date_to"]}.pdf',
        )

    @patch("crm.report_pdf.generate_report_pdf")
    def test_pdf_endpoint_passes_workflow_filters_to_shared_report_payload(self, generate_pdf):
        generate_pdf.return_value = PdfReport(b"%PDF", "filtered.pdf")
        self.authenticate(self.manager)
        url = reverse("crm:analytics-report-pdf", kwargs={"report_name": "lead-status"})

        response = self.client.get(url, {"assessment_stage": "FINANCE_PENDING"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [record["lead_id"] for record in generate_pdf.call_args.args[1]["records"]],
            [self.pending_lead.id],
        )

        response = self.client.get(url, {"final_decision": "PROCEED"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [record["lead_id"] for record in generate_pdf.call_args.args[1]["records"]],
            [self.deal_lead.id],
        )

    def test_conversion_report_uses_explicit_funnel_denominators(self):
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-conversion"})
        )
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(values["total_leads"], 3)
        self.assertEqual(values["proceed"], 1)
        self.assertEqual(values["deals"], 1)
        self.assertEqual(values["lead_to_proceed"], 33.3)
        self.assertEqual(values["proceed_to_deal"], 100.0)
        self.assertEqual(values["lead_to_deal"], 33.3)

    def test_status_report_separates_final_decision_from_current_stage(self):
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-status"})
        )
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(values["proceed"], 1)
        self.assertEqual(values["deals"], 1)
        self.assertEqual(response.data["distributions"]["final_decisions"]["PROCEED"], 1)
        self.assertEqual(response.data["distributions"]["assessment_stages"]["DEAL_CREATED"], 1)

    def test_status_report_aging_orders_descending_and_uses_more_than_30_days(self):
        boundary = Lead.objects.create(
            company_name="Boundary", contact_name="Thirty Days", phone="0770000010",
            source=Lead.Source.DIRECT, created_by=self.manager,
        )
        stale = Lead.objects.create(
            company_name="Stale", contact_name="Thirty One Days", phone="0770000011",
            source=Lead.Source.DIRECT, created_by=self.manager,
        )
        Lead.objects.filter(pk=boundary.pk).update(created_at=timezone.now() - timedelta(days=30))
        Lead.objects.filter(pk=stale.pk).update(created_at=timezone.now() - timedelta(days=31))
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-status"}),
            {"date_from": (timezone.localdate() - timedelta(days=40)).isoformat(), "date_to": timezone.localdate().isoformat()},
        )
        aging = response.data["aging_records"]
        self.assertGreaterEqual(aging[0]["days_in_current_state"], aging[1]["days_in_current_state"])
        stale_note = next(note for note in response.data["observations"] if "more than 30 days" in note)
        self.assertIn("1 Lead", stale_note)

    def test_sales_rep_metrics_exclude_and_surface_unassigned_leads(self):
        Lead.objects.create(
            company_name="Unassigned", contact_name="No Owner", phone="0770000012",
            source=Lead.Source.OTHER, source_details="Walk-in", created_by=self.manager,
        )
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "sales-rep-performance"})
        )
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(response.data["summary"][0]["assigned_leads"], 3)
        self.assertEqual(response.data["summary"][0]["conversion_rate"], 33.3)
        self.assertEqual(values["unassigned"], 1)
        self.assertEqual(values["assigned_leads"], 3)

    def test_deal_pipeline_title_status_counts_and_traceability(self):
        self.authenticate(self.manager)
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "deals"})
        )
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(response.data["title"], "Deal Pipeline Report")
        self.assertEqual(values["open"], 1)
        self.assertEqual(values["won"], 0)
        self.assertEqual(values["lost"], 0)
        self.assertEqual(response.data["records"][0]["lead_id"], self.deal_lead.id)
        self.assertTrue(any("remain Open" in note for note in response.data["observations"]))
