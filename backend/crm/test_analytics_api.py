from datetime import timedelta
from unittest.mock import patch

from django.contrib.auth.models import User
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import UserProfile

from .models import (
    CommercialExceptionRequest,
    Deal,
    FinancialAssessment,
    FollowUp,
    Lead,
    LeadOpportunityDecision,
    TechnicalAssessment,
)
from .analytics import parse_filters, report_payload
from .report_pdf import PdfReport, _visual_rows, build_pdf_context, report_pdf_filename

REPORT_NAMES_FOR_TESTS = (
    "lead-sources", "lead-conversion", "lead-status",
    "sales-rep-performance", "deals",
)


class GoldenReportReconciliationTests(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.manager = User.objects.create_user(
            username="golden_manager", password="TestPassword123!"
        )
        cls.manager.profile.role = UserProfile.Role.SALES_MANAGER
        cls.manager.profile.save(update_fields=["role"])

        cls.finance_user = User.objects.create_user(
            username="golden_finance", password="TestPassword123!"
        )
        cls.finance_user.profile.role = UserProfile.Role.FINANCIAL_OFFICER
        cls.finance_user.profile.save(update_fields=["role"])
        cls.tech_user = User.objects.create_user(
            username="golden_tech", password="TestPassword123!"
        )
        cls.tech_user.profile.role = UserProfile.Role.TECH_LEAD
        cls.tech_user.profile.save(update_fields=["role"])

        cls.rep_a = cls._create_rep("golden_rep_a", "Rep", "A")
        cls.rep_b = cls._create_rep("golden_rep_b", "Rep", "B")
        sources = (
            [Lead.Source.WEBSITE] * 4
            + [Lead.Source.REFERRAL] * 3
            + [Lead.Source.OTHER] * 3
        )
        assignments = [
            cls.rep_a,
            cls.rep_a,
            cls.rep_b,
            cls.rep_a,
            cls.rep_a,
            cls.rep_a,
            cls.rep_a,
            cls.rep_b,
            cls.rep_b,
            None,
        ]
        cls.leads = []
        for index, (source, assigned_to) in enumerate(
            zip(sources, assignments, strict=True), start=1
        ):
            lead = Lead.objects.create(
                company_name=f"Golden Company {index}",
                contact_name=f"Golden Contact {index}",
                phone=f"07700000{index:02d}",
                project_name=f"Golden Lead {index}",
                source=source,
                source_details="Golden campaign" if source == Lead.Source.OTHER else "",
                status=Lead.Status.PROPOSAL if index <= 6 else Lead.Status.CONTACTED,
                assigned_to=assigned_to,
                created_by=cls.manager,
            )
            cls.leads.append(lead)

        for index, lead in enumerate(cls.leads[:6]):
            finance = FinancialAssessment.objects.create(
                lead=lead,
                requested_by=cls.manager,
                assigned_to=cls.finance_user,
                requirements="Golden financial review",
                status=FinancialAssessment.Status.REVIEWED,
                outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
                reviewed_at=timezone.now(),
                reviewed_by=cls.manager,
            )
            technical = TechnicalAssessment.objects.create(
                lead=lead,
                requested_by=cls.manager,
                assigned_to=cls.tech_user,
                requirements="Golden technical review",
                status=TechnicalAssessment.Status.REVIEWED,
                technical_comments="Feasible",
                reviewed_at=timezone.now(),
                reviewed_by=cls.manager,
            )
            decision = LeadOpportunityDecision.objects.create(
                lead=lead,
                financial_assessment=finance,
                technical_assessment=technical,
                decision=(
                    LeadOpportunityDecision.Decision.PROCEED
                    if index < 4
                    else LeadOpportunityDecision.Decision.DO_NOT_PROCEED
                ),
                decision_notes="Golden decision",
                decided_by=cls.manager,
            )
            if index < 3:
                Deal.objects.create(
                    source_lead=lead,
                    opportunity_decision=decision,
                    name=f"Golden Deal {index + 1}",
                    company_name=lead.company_name,
                    contact_name=lead.contact_name,
                    phone=lead.phone,
                    status=Deal.Status.OPEN if index < 2 else Deal.Status.WON,
                    assigned_to=lead.assigned_to,
                    created_by=cls.manager,
                )

    @classmethod
    def _create_rep(cls, username, first_name, last_name):
        user = User.objects.create_user(
            username=username,
            password="TestPassword123!",
            first_name=first_name,
            last_name=last_name,
        )
        user.profile.role = UserProfile.Role.SALES_REP
        user.profile.save(update_fields=["role"])
        return user

    def setUp(self):
        self.client.force_authenticate(self.manager)

    @staticmethod
    def metric_values(payload):
        return {metric["key"]: metric["value"] for metric in payload["metrics"]}

    def get_report(self, report_name, params=None):
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": report_name}),
            params or {},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def test_all_five_reports_reconcile_against_golden_dataset(self):
        payloads = {
            name: self.get_report(name)
            for name in REPORT_NAMES_FOR_TESTS
        }

        conversion = self.metric_values(payloads["lead-conversion"])
        self.assertEqual(conversion["total_leads"], 10)
        self.assertEqual(conversion["proceed"], 4)
        self.assertEqual(conversion["deals"], 3)
        self.assertEqual(conversion["lead_to_proceed"], 40.0)
        self.assertEqual(conversion["proceed_to_deal"], 75.0)
        self.assertEqual(conversion["lead_to_deal"], 30.0)

        sources = {
            row["source"]: row for row in payloads["lead-sources"]["summary"]
        }
        self.assertEqual(
            {key: row["leads"] for key, row in sources.items()},
            {Lead.Source.WEBSITE: 4, Lead.Source.REFERRAL: 3, Lead.Source.OTHER: 3},
        )
        self.assertEqual(sum(row["leads"] for row in sources.values()), 10)
        self.assertEqual(sum(row["deals"] for row in sources.values()), 3)
        source_visuals = _visual_rows("lead-sources", payloads["lead-sources"])
        self.assertEqual(sum(row["percentage"] for row in source_visuals), 100.0)

        status_payload = payloads["lead-status"]
        decisions = status_payload["distributions"]["final_decisions"]
        self.assertEqual(decisions, {"PENDING": 4, "PROCEED": 4, "DO_NOT_PROCEED": 2})
        self.assertEqual(sum(decisions.values()), 10)
        self.assertEqual(sum(status_payload["summary"].values()), 10)

        reps = {
            row["sales_rep"]: row
            for row in payloads["sales-rep-performance"]["summary"]
        }
        self.assertEqual(reps[self.rep_a.id]["assigned_leads"], 6)
        self.assertEqual(reps[self.rep_a.id]["deals"], 2)
        self.assertEqual(reps[self.rep_a.id]["conversion_rate"], 33.3)
        self.assertEqual(reps[self.rep_b.id]["assigned_leads"], 3)
        self.assertEqual(reps[self.rep_b.id]["deals"], 1)
        self.assertEqual(reps[self.rep_b.id]["conversion_rate"], 33.3)
        performance = self.metric_values(payloads["sales-rep-performance"])
        self.assertEqual(performance["assigned_leads"], 9)
        self.assertEqual(performance["unassigned"], 1)
        self.assertEqual(performance["assigned_leads"] + performance["unassigned"], 10)

        deal_payload = payloads["deals"]
        deals = self.metric_values(deal_payload)
        self.assertEqual(deals["total_deals"], 3)
        self.assertEqual(deals["open"], 2)
        self.assertEqual(deals["won"], 1)
        self.assertEqual(deals["lost"], 0)
        self.assertEqual(deals["open"] + deals["won"] + deals["lost"], 3)
        self.assertEqual(len(deal_payload["records"]), 3)

    def test_csv_and_pdf_context_use_the_json_record_cohort(self):
        filters = parse_filters({})
        for report_name in REPORT_NAMES_FOR_TESTS:
            with self.subTest(report_name=report_name):
                payload = report_payload(report_name, filters)
                json_payload = self.get_report(report_name)
                self.assertEqual(payload["records"], json_payload["records"])

                csv_response = self.client.get(
                    reverse(
                        "crm:analytics-report-export",
                        kwargs={"report_name": report_name},
                    )
                )
                self.assertEqual(csv_response.status_code, status.HTTP_200_OK)
                csv_rows = csv_response.content.decode("utf-8-sig").splitlines()
                self.assertEqual(len(csv_rows) - 1, len(payload["records"]))

                context = build_pdf_context(
                    report_name, payload, filters, self.manager
                )
                self.assertEqual(context["records"], payload["records"])
                self.assertEqual(len(context["table_rows"]), len(payload["records"]))

    def test_supported_filters_reconcile_across_json_csv_and_pdf_context(self):
        today = timezone.localdate().isoformat()
        filter_cases = (
            {"date_from": today, "date_to": today},
            {"sales_rep": str(self.rep_a.id)},
            {"source": Lead.Source.WEBSITE},
            {"status": Lead.Status.PROPOSAL},
            {"assessment_stage": "DEAL_CREATED"},
            {"final_decision": LeadOpportunityDecision.Decision.PROCEED},
            {"deal_status": Deal.Status.OPEN},
        )
        url = reverse(
            "crm:analytics-report", kwargs={"report_name": "lead-conversion"}
        )
        csv_url = reverse(
            "crm:analytics-report-export",
            kwargs={"report_name": "lead-conversion"},
        )
        for query in filter_cases:
            with self.subTest(query=query):
                json_response = self.client.get(url, query)
                csv_response = self.client.get(csv_url, query)
                self.assertEqual(json_response.status_code, status.HTTP_200_OK)
                self.assertEqual(csv_response.status_code, status.HTTP_200_OK)

                filters = parse_filters(query)
                payload = report_payload("lead-conversion", filters)
                self.assertEqual(json_response.data["records"], payload["records"])
                self.assertEqual(
                    len(csv_response.content.decode("utf-8-sig").splitlines()) - 1,
                    len(payload["records"]),
                )
                context = build_pdf_context(
                    "lead-conversion", payload, filters, self.manager
                )
                self.assertEqual(context["records"], payload["records"])

    def test_submitted_assessments_remain_pending_until_reviewed(self):
        finance_lead = Lead.objects.create(
            company_name="Submitted Finance",
            contact_name="Finance Pending",
            phone="0779999901",
            source=Lead.Source.WEBSITE,
            assigned_to=self.rep_a,
            created_by=self.manager,
        )
        FinancialAssessment.objects.create(
            lead=finance_lead,
            requested_by=self.manager,
            assigned_to=self.finance_user,
            requirements="Await manager review",
            status=FinancialAssessment.Status.SUBMITTED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
        )

        technical_lead = Lead.objects.create(
            company_name="Submitted Technical",
            contact_name="Technical Pending",
            phone="0779999902",
            source=Lead.Source.WEBSITE,
            assigned_to=self.rep_a,
            created_by=self.manager,
        )
        FinancialAssessment.objects.create(
            lead=technical_lead,
            requested_by=self.manager,
            assigned_to=self.finance_user,
            requirements="Reviewed finance",
            status=FinancialAssessment.Status.REVIEWED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
            reviewed_at=timezone.now(),
            reviewed_by=self.manager,
        )
        TechnicalAssessment.objects.create(
            lead=technical_lead,
            requested_by=self.manager,
            assigned_to=self.tech_user,
            requirements="Await manager review",
            status=TechnicalAssessment.Status.SUBMITTED,
            technical_comments="Submitted findings",
        )

        payload = self.get_report("lead-status")
        stages = {record["lead_id"]: record["assessment_stage"] for record in payload["records"]}
        self.assertEqual(stages[finance_lead.id], "FINANCE_PENDING")
        self.assertEqual(stages[technical_lead.id], "TECHNICAL_PENDING")

    def test_approved_exception_progresses_into_technical_workflow(self):
        lead = Lead.objects.create(
            company_name="Approved Exception",
            contact_name="Exception Contact",
            phone="0779999903",
            source=Lead.Source.OTHER,
            source_details="Commercial exception",
            assigned_to=self.rep_a,
            created_by=self.manager,
        )
        finance = FinancialAssessment.objects.create(
            lead=lead,
            requested_by=self.manager,
            assigned_to=self.finance_user,
            requirements="Reviewed unsuitable finance",
            status=FinancialAssessment.Status.REVIEWED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE,
            reviewed_at=timezone.now(),
            reviewed_by=self.manager,
        )
        CommercialExceptionRequest.objects.create(
            lead=lead,
            financial_assessment=finance,
            requested_by=self.manager,
            justification="Strategic exception",
            status=CommercialExceptionRequest.Status.APPROVED,
            reviewed_by=self.manager,
            reviewed_at=timezone.now(),
        )

        payload = self.get_report("lead-status")
        stages = {record["lead_id"]: record["assessment_stage"] for record in payload["records"]}
        self.assertEqual(stages[lead.id], "EXCEPTION_APPROVED")

        TechnicalAssessment.objects.create(
            lead=lead,
            requested_by=self.manager,
            assigned_to=self.tech_user,
            requirements="Exception technical review",
            status=TechnicalAssessment.Status.REVIEWED,
            technical_comments="Feasible",
            reviewed_at=timezone.now(),
            reviewed_by=self.manager,
        )
        payload = self.get_report("lead-status")
        stages = {record["lead_id"]: record["assessment_stage"] for record in payload["records"]}
        self.assertEqual(stages[lead.id], "DECISION_READY")


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

    def create_proceed_lead(self, suffix, *, with_deal):
        lead = Lead.objects.create(
            company_name=f"Proceed {suffix}", contact_name=f"Contact {suffix}",
            phone=f"0771000{suffix:03d}", source=Lead.Source.WEBSITE,
            assigned_to=self.rep, created_by=self.manager,
        )
        finance = FinancialAssessment.objects.create(
            lead=lead, requested_by=self.manager, assigned_to=self.finance,
            requirements="Assess budget", status=FinancialAssessment.Status.REVIEWED,
            outcome=FinancialAssessment.Outcome.FINANCIALLY_SUITABLE,
            submitted_at=timezone.now(), reviewed_at=timezone.now(), reviewed_by=self.manager,
        )
        technical = TechnicalAssessment.objects.create(
            lead=lead, requested_by=self.manager, assigned_to=self.tech_lead,
            requirements="Assess feasibility", status=TechnicalAssessment.Status.REVIEWED,
            technical_comments="Feasible", submitted_at=timezone.now(),
            reviewed_at=timezone.now(), reviewed_by=self.manager,
        )
        decision = LeadOpportunityDecision.objects.create(
            lead=lead, financial_assessment=finance, technical_assessment=technical,
            decision=LeadOpportunityDecision.Decision.PROCEED,
            decision_notes="Proceed", decided_by=self.manager,
        )
        if with_deal:
            Deal.objects.create(
                source_lead=lead, opportunity_decision=decision,
                name=f"Proceed Deal {suffix}", company_name=lead.company_name,
                contact_name=lead.contact_name, phone=lead.phone,
                assigned_to=self.rep, created_by=self.manager,
            )
        return lead

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

        status_values = {
            option["value"] for option in response.data["filter_options"]["statuses"]
        }
        self.assertIn(Lead.Status.NEW, status_values)
        self.assertIn(Lead.Status.CONTACTED, status_values)
        self.assertIn(Lead.Status.PROPOSAL, status_values)
        self.assertNotIn(Lead.Status.QUALIFIED, status_values)
        self.assertNotIn(Lead.Status.SUBMITTED_FOR_QUALIFICATION, status_values)

    def test_legacy_statuses_are_rejected_as_current_report_filters(self):
        self.authenticate(self.manager)
        url = reverse("crm:analytics-report", kwargs={"report_name": "lead-status"})

        for legacy_status in (
            Lead.Status.QUALIFIED,
            Lead.Status.SUBMITTED_FOR_QUALIFICATION,
        ):
            with self.subTest(legacy_status=legacy_status):
                response = self.client.get(url, {"status": legacy_status})
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
        html = render_to_string("crm/reports/pdf/report.html", context)
        self.assertIn("Role: Sales Manager", html)
        self.assertNotIn("Nishitha Sellahennadi - Sales Manager", html)
        self.assertIn('style="width: 100.0%;"', html)
        self.assertNotIn("<svg", html)
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
            [self.pending_lead.id, self.unsuitable_lead.id],
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

    def test_visual_rows_scale_relative_to_the_largest_category(self):
        source_payload = {
            "summary": [
                {"source_display": "Other", "leads": 5},
                {"source_display": "Website", "leads": 3},
                {"source_display": "Referral", "leads": 3},
            ],
        }
        rows = _visual_rows("lead-sources", source_payload)
        self.assertEqual([row["width"] for row in rows], [100.0, 60.0, 60.0])
        self.assertEqual([row["percentage"] for row in rows], [45.5, 27.3, 27.3])
        self.assertEqual(rows[0]["display_value"], "5 (45.5%)")

        status_rows = _visual_rows("lead-status", {
            "distributions": {"assessment_stages": {
                "FINANCE_NOT_REQUESTED": 6, "DEAL_CREATED": 3,
                "DO_NOT_PROCEED": 1, "EXCEPTION_APPROVED": 1,
            }},
        })
        self.assertEqual([row["width"] for row in status_rows[:2]], [100.0, 50.0])
        self.assertAlmostEqual(status_rows[2]["width"], 16.7, places=1)
        self.assertAlmostEqual(status_rows[3]["width"], 16.7, places=1)

        zero_rows = _visual_rows("deals", {
            "distributions": {"deal_statuses": {"Won": 5, "Lost": 0}},
        })
        self.assertEqual([row["width"] for row in zero_rows], [100.0, 0.0])

    def test_sales_rep_and_deal_status_visuals_share_proportional_scaling(self):
        rep_rows = _visual_rows("sales-rep-performance", {
            "summary": [
                {"sales_rep_name": "Rep A", "deals": 6},
                {"sales_rep_name": "Rep B", "deals": 3},
                {"sales_rep_name": "Rep C", "deals": 1},
            ],
        })
        self.assertEqual([row["width"] for row in rep_rows], [100.0, 50.0, 16.7])
        deal_rows = _visual_rows("deals", {
            "distributions": {"deal_statuses": {"Open": 3, "Won": 5, "Lost": 2}},
        })
        self.assertEqual([row["width"] for row in deal_rows], [60.0, 100.0, 40.0])

    def test_proceed_to_deal_is_data_driven_for_three_of_three(self):
        self.create_proceed_lead(1, with_deal=True)
        self.create_proceed_lead(2, with_deal=True)
        self.authenticate(self.manager)
        response = self.client.get(reverse("crm:analytics-report", kwargs={"report_name": "lead-conversion"}))
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(values["proceed"], 3)
        self.assertEqual(values["proceed_to_deal"], 100.0)

    def test_proceed_to_deal_is_data_driven_for_two_of_four(self):
        self.create_proceed_lead(1, with_deal=True)
        self.create_proceed_lead(2, with_deal=False)
        self.create_proceed_lead(3, with_deal=False)
        self.authenticate(self.manager)
        response = self.client.get(reverse("crm:analytics-report", kwargs={"report_name": "lead-conversion"}))
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(values["proceed"], 4)
        self.assertEqual(values["proceed_to_deal"], 50.0)

    def test_proceed_to_deal_is_zero_for_empty_cohort(self):
        self.authenticate(self.manager)
        future = (timezone.localdate() + timedelta(days=30)).isoformat()
        response = self.client.get(
            reverse("crm:analytics-report", kwargs={"report_name": "lead-conversion"}),
            {"date_from": future, "date_to": future},
        )
        values = {metric["key"]: metric["value"] for metric in response.data["metrics"]}
        self.assertEqual(values["proceed"], 0)
        self.assertEqual(values["proceed_to_deal"], 0.0)

    def test_pdf_uses_clear_proceed_label_and_no_duplicate_conversion_section(self):
        self.authenticate(self.manager)
        response = self.client.get(reverse("crm:analytics-report", kwargs={"report_name": "lead-conversion"}))
        labels = [metric["label"] for metric in response.data["metrics"]]
        self.assertIn("Leads Proceeding", labels)
        self.assertNotIn("Proceed Decisions", labels)
        self.assertNotIn("<h2>Conversion Rates</h2>", render_to_string(
            "crm/reports/pdf/report.html",
            build_pdf_context(
                "lead-conversion", response.data,
                {
                    "date_from": timezone.localdate().replace(day=1),
                    "date_to": timezone.localdate(), "sales_rep": None,
                    "source": "", "status": "", "assessment_stage": "",
                    "final_decision": "", "deal_status": "",
                },
                self.manager,
            ),
        ))

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
