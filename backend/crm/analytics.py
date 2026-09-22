import csv
from collections import Counter, defaultdict
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import BasePermission, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile

from .models import (
    CommercialExceptionRequest,
    CommercialReview,
    Communication,
    Deal,
    FinancialAssessment,
    FollowUp,
    Lead,
    LeadOpportunityDecision,
    TechnicalAssessment,
)


ACTIVE_LEAD_STATUSES = {
    Lead.Status.NEW,
    Lead.Status.CONTACTED,
    Lead.Status.PROPOSAL,
}
COMPLETED_ASSESSMENT_STATUSES = {
    FinancialAssessment.Status.REVIEWED,
}
ASSESSMENT_STAGES = (
    "FINANCE_NOT_REQUESTED",
    "FINANCE_PENDING",
    "REASSESSMENT_REQUESTED",
    "FINANCIALLY_UNSUITABLE",
    "COMMERCIAL_REVIEW_REQUIRED",
    "EXCEPTION_PENDING",
    "EXCEPTION_APPROVED",
    "AWAITING_TECHNICAL",
    "TECHNICAL_PENDING",
    "DECISION_READY",
    "PROCEED",
    "DO_NOT_PROCEED",
    "DEAL_CREATED",
)
REPORT_STALE_LEAD_DAYS = 30
REPORT_NAMES = {
    "lead-sources": "Lead Source Report",
    "lead-conversion": "Lead Conversion Report",
    "lead-status": "Lead Status & Assessment Report",
    "sales-rep-performance": "Sales Rep Performance Report",
    "deals": "Deal Pipeline Report",
}


class AnalyticsRolePermission(BasePermission):
    allowed_roles = {
        UserProfile.Role.SALES_MANAGER,
        UserProfile.Role.DIRECTOR,
        UserProfile.Role.EXECUTIVE,
    }

    def has_permission(self, request, view):
        profile = getattr(request.user, "profile", None)
        return bool(
            request.user
            and request.user.is_authenticated
            and profile
            and profile.role in self.allowed_roles
        )


class ManagerAnalyticsPermission(AnalyticsRolePermission):
    allowed_roles = {UserProfile.Role.SALES_MANAGER}


class DirectorAnalyticsPermission(AnalyticsRolePermission):
    allowed_roles = {UserProfile.Role.DIRECTOR, UserProfile.Role.EXECUTIVE}


def percentage(numerator, denominator):
    """Return a stable percentage, avoiding NaN/Infinity for empty cohorts."""
    if not denominator:
        return 0.0
    return round((numerator / denominator) * 100, 1)


def display_name(user):
    if user is None:
        return "Unassigned"
    return user.get_full_name().strip() or user.username


def parse_filters(query_params):
    supported_filters = {
        "date_from",
        "date_to",
        "sales_rep",
        "source",
        "status",
        "assessment_stage",
        "final_decision",
        "deal_status",
    }
    unsupported = sorted(set(query_params.keys()) - supported_filters)
    if unsupported:
        raise ValidationError(
            {"filters": f'Unsupported filter(s): {", ".join(unsupported)}.'}
        )

    today = timezone.localdate()
    default_from = today.replace(day=1)
    raw_from = query_params.get("date_from")
    raw_to = query_params.get("date_to")
    date_from = parse_date(raw_from) if raw_from else default_from
    date_to = parse_date(raw_to) if raw_to else today
    if raw_from and date_from is None:
        raise ValidationError({"date_from": "Use YYYY-MM-DD."})
    if raw_to and date_to is None:
        raise ValidationError({"date_to": "Use YYYY-MM-DD."})
    if date_from > date_to:
        raise ValidationError({"date_to": "Date to must not be before date from."})

    sales_rep = query_params.get("sales_rep") or ""
    if sales_rep and not sales_rep.isdigit():
        raise ValidationError({"sales_rep": "Select a valid Sales Representative."})
    if sales_rep and not User.objects.filter(
        id=int(sales_rep),
        is_active=True,
        profile__role=UserProfile.Role.SALES_REP,
    ).exists():
        raise ValidationError({"sales_rep": "Select a valid Sales Representative."})

    source = query_params.get("source") or ""
    status_value = query_params.get("status") or ""
    final_decision = query_params.get("final_decision") or ""
    assessment_stage = query_params.get("assessment_stage") or ""
    deal_status = query_params.get("deal_status") or ""

    valid_sources = {choice for choice, _ in Lead.Source.choices}
    valid_statuses = {
        choice
        for choice, _ in Lead.Status.choices
        if choice not in {
            Lead.Status.QUALIFIED,
            Lead.Status.SUBMITTED_FOR_QUALIFICATION,
        }
    }
    valid_decisions = {choice for choice, _ in LeadOpportunityDecision.Decision.choices}
    valid_deal_statuses = {choice for choice, _ in Deal.Status.choices}
    validations = (
        ("source", source, valid_sources),
        ("status", status_value, valid_statuses),
        ("final_decision", final_decision, valid_decisions),
        ("assessment_stage", assessment_stage, set(ASSESSMENT_STAGES)),
        ("deal_status", deal_status, valid_deal_statuses),
    )
    for name, value, choices in validations:
        if value and value not in choices:
            raise ValidationError({name: "Select a valid value."})

    return {
        "date_from": date_from,
        "date_to": date_to,
        "sales_rep": int(sales_rep) if sales_rep else None,
        "source": source,
        "status": status_value,
        "assessment_stage": assessment_stage,
        "final_decision": final_decision,
        "deal_status": deal_status,
    }


def lead_queryset(filters):
    queryset = (
        Lead.objects.filter(
            created_at__date__gte=filters["date_from"],
            created_at__date__lte=filters["date_to"],
        )
        .select_related(
            "assigned_to",
            "assigned_to__profile",
            "opportunity_decision",
            "deal",
        )
        .prefetch_related(
            Prefetch(
                "financial_assessments",
                queryset=FinancialAssessment.objects.order_by("-created_at", "-id"),
                to_attr="analytics_financial_assessments",
            ),
            Prefetch(
                "technical_assessments",
                queryset=TechnicalAssessment.objects.order_by("-created_at", "-id"),
                to_attr="analytics_technical_assessments",
            ),
        )
    )
    if filters["sales_rep"]:
        queryset = queryset.filter(assigned_to_id=filters["sales_rep"])
    if filters["source"]:
        queryset = queryset.filter(source=filters["source"])
    if filters["status"]:
        queryset = queryset.filter(status=filters["status"])
    if filters["final_decision"]:
        queryset = queryset.filter(
            opportunity_decision__decision=filters["final_decision"]
        )
    if filters["deal_status"]:
        queryset = queryset.filter(deal__status=filters["deal_status"])
    return queryset


def latest_related(lead, attribute):
    items = getattr(lead, attribute, [])
    return items[0] if items else None


def optional_related(instance, attribute):
    """Return an optional reverse one-to-one relation without leaking 500s."""
    try:
        return getattr(instance, attribute)
    except ObjectDoesNotExist:
        return None


def assessment_stage(lead):
    """Derive reporting stage without changing the Lead lifecycle model."""
    if optional_related(lead, "deal"):
        return "DEAL_CREATED"
    decision = optional_related(lead, "opportunity_decision")
    if decision:
        return decision.decision
    finance = latest_related(lead, "analytics_financial_assessments")
    if finance is None:
        return "FINANCE_NOT_REQUESTED"
    if finance.status not in COMPLETED_ASSESSMENT_STATUSES:
        if CommercialReview.objects.filter(
            lead=lead, status=CommercialReview.Status.REASSESSMENT_REQUESTED
        ).exists():
            return "REASSESSMENT_REQUESTED"
        return "FINANCE_PENDING"
    if finance.outcome == FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE:
        exception = CommercialExceptionRequest.objects.filter(
            financial_assessment=finance
        ).order_by("-requested_at", "-id").first()
        if exception and exception.status == CommercialExceptionRequest.Status.PENDING:
            return "EXCEPTION_PENDING"
        if not exception or exception.status != CommercialExceptionRequest.Status.APPROVED:
            return "COMMERCIAL_REVIEW_REQUIRED"
    technical = latest_related(lead, "analytics_technical_assessments")
    if technical is None:
        if (
            finance.outcome == FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE
        ):
            return "EXCEPTION_APPROVED"
        return "AWAITING_TECHNICAL"
    if technical.status not in COMPLETED_ASSESSMENT_STATUSES:
        return "TECHNICAL_PENDING"
    return "DECISION_READY"


def assessment_stage_since(lead):
    """Best available timestamp for the start of the derived current stage."""
    deal = optional_related(lead, "deal")
    if deal:
        return deal.created_at
    decision = optional_related(lead, "opportunity_decision")
    if decision:
        return decision.decided_at
    finance = latest_related(lead, "analytics_financial_assessments")
    if finance is None:
        return lead.created_at
    if finance.status not in COMPLETED_ASSESSMENT_STATUSES:
        return finance.created_at
    technical = latest_related(lead, "analytics_technical_assessments")
    if technical is None:
        return finance.submitted_at or finance.updated_at
    if technical.status not in COMPLETED_ASSESSMENT_STATUSES:
        return technical.created_at
    return technical.submitted_at or technical.updated_at


def selected_leads(filters):
    leads = list(lead_queryset(filters))
    if filters["assessment_stage"]:
        leads = [lead for lead in leads if assessment_stage(lead) == filters["assessment_stage"]]
    return leads


def serialized_filters(filters):
    return {
        key: value.isoformat() if hasattr(value, "isoformat") else value
        for key, value in filters.items()
        if value not in (None, "")
    }


def filter_options():
    reps = User.objects.filter(
        is_active=True,
        profile__role=UserProfile.Role.SALES_REP,
    ).order_by("first_name", "last_name", "username")
    return {
        "sales_reps": [
            {"id": user.id, "name": display_name(user)} for user in reps
        ],
        "sources": [{"value": value, "label": label} for value, label in Lead.Source.choices],
        "statuses": [
            {"value": value, "label": label}
            for value, label in Lead.Status.choices
            if value not in {
                Lead.Status.QUALIFIED,
                Lead.Status.SUBMITTED_FOR_QUALIFICATION,
            }
        ],
        "assessment_stages": [
            {"value": value, "label": value.replace("_", " ").title()}
            for value in ASSESSMENT_STAGES
        ],
        "final_decisions": [
            {"value": value, "label": label}
            for value, label in LeadOpportunityDecision.Decision.choices
        ],
        "deal_statuses": [
            {"value": value, "label": label} for value, label in Deal.Status.choices
        ],
    }


def source_rows(leads):
    grouped = defaultdict(lambda: {"leads": 0, "proceed": 0, "deals": 0})
    labels = dict(Lead.Source.choices)
    for lead in leads:
        source = lead.source or "UNSPECIFIED"
        row = grouped[source]
        row["leads"] += 1
        decision = optional_related(lead, "opportunity_decision")
        if decision and decision.decision == LeadOpportunityDecision.Decision.PROCEED:
            row["proceed"] += 1
        if optional_related(lead, "deal"):
            row["deals"] += 1
    return [
        {
            "source": source,
            "source_display": labels.get(source, "Unspecified"),
            **values,
            "conversion_rate": percentage(values["deals"], values["leads"]),
        }
        for source, values in sorted(grouped.items(), key=lambda item: (-item[1]["leads"], item[0]))
    ]


def trend_rows(leads, include_proceed=False):
    if not leads:
        return []
    first_date = min(lead.created_at.date() for lead in leads)
    last_date = max(lead.created_at.date() for lead in leads)
    day_span = (last_date - first_date).days + 1
    grouping = "day" if day_span <= 31 else "week" if day_span <= 180 else "month"

    def bucket(value):
        date_value = value.date()
        if grouping == "day":
            return date_value
        if grouping == "week":
            return date_value - timedelta(days=date_value.weekday())
        return date_value.replace(day=1)

    rows = defaultdict(lambda: {"leads": 0, "deals": 0, "proceed": 0})
    for lead in leads:
        item = rows[bucket(lead.created_at)]
        item["leads"] += 1
        if optional_related(lead, "deal"):
            item["deals"] += 1
        decision = optional_related(lead, "opportunity_decision")
        if decision and decision.decision == LeadOpportunityDecision.Decision.PROCEED:
            item["proceed"] += 1
    return [
        {
            "period": period.isoformat(),
            "grouping": grouping,
            "leads": counts["leads"],
            "deals": counts["deals"],
            **({"proceed": counts["proceed"]} if include_proceed else {}),
        }
        for period, counts in sorted(rows.items())
    ]


def pipeline_counts(leads):
    stages = Counter()
    for lead in leads:
        stages["leads_created"] += 1
        finance = latest_related(lead, "analytics_financial_assessments")
        technical = latest_related(lead, "analytics_technical_assessments")
        decision = optional_related(lead, "opportunity_decision")
        if finance:
            stages["finance_requested"] += 1
            if (
                finance.status == FinancialAssessment.Status.REVIEWED
                and finance.outcome
                == FinancialAssessment.Outcome.FINANCIALLY_SUITABLE
            ):
                stages["financially_suitable"] += 1
        if technical:
            stages["technical_assessment"] += 1
        if assessment_stage(lead) == "DECISION_READY" or decision:
            stages["decision_ready"] += 1
        if decision and decision.decision == LeadOpportunityDecision.Decision.PROCEED:
            stages["proceed"] += 1
        if optional_related(lead, "deal"):
            stages["deal_created"] += 1
    return dict(stages)


def team_rows(leads):
    lead_ids = [lead.id for lead in leads]
    reps = {lead.assigned_to_id: lead.assigned_to for lead in leads if lead.assigned_to_id}
    communications = Counter(
        Communication.objects.filter(lead_id__in=lead_ids)
        .values_list("lead__assigned_to_id", flat=True)
    )
    completed = Counter(
        FollowUp.objects.filter(
            lead_id__in=lead_ids,
            status=FollowUp.Status.COMPLETED,
        ).values_list("lead__assigned_to_id", flat=True)
    )
    overdue = Counter(
        FollowUp.objects.filter(
            lead_id__in=lead_ids,
            status=FollowUp.Status.PENDING,
            due_date__lt=timezone.now(),
        ).values_list("lead__assigned_to_id", flat=True)
    )
    rows = []
    for rep_id, rep in reps.items():
        rep_leads = [lead for lead in leads if lead.assigned_to_id == rep_id]
        deals = sum(1 for lead in rep_leads if optional_related(lead, "deal"))
        proceed = sum(
            1
            for lead in rep_leads
            if optional_related(lead, "opportunity_decision")
            and optional_related(lead, "opportunity_decision").decision
            == LeadOpportunityDecision.Decision.PROCEED
        )
        rows.append(
            {
                "sales_rep": rep_id,
                "sales_rep_name": display_name(rep),
                "assigned_leads": len(rep_leads),
                "communications": communications[rep_id],
                "follow_ups_completed": completed[rep_id],
                "overdue_follow_ups": overdue[rep_id],
                "proceed": proceed,
                "deals": deals,
                "conversion_rate": percentage(deals, len(rep_leads)),
            }
        )
    return sorted(rows, key=lambda row: row["sales_rep_name"].lower())


def attention_rows(leads):
    now = timezone.now()
    items = []
    for lead in leads:
        finance = latest_related(lead, "analytics_financial_assessments")
        technical = latest_related(lead, "analytics_technical_assessments")
        stage = assessment_stage(lead)
        if stage == "FINANCE_PENDING":
            items.append((lead, "Financial assessment pending", finance.created_at))
        elif stage == "AWAITING_TECHNICAL":
            items.append((lead, "Technical assessment not requested", finance.submitted_at or finance.updated_at))
        elif stage == "TECHNICAL_PENDING":
            items.append((lead, "Technical assessment pending", technical.created_at))
        elif stage == "DECISION_READY":
            items.append((lead, "Final decision ready", technical.submitted_at or technical.updated_at))

    lead_ids = [lead.id for lead in leads]
    overdue_followups = FollowUp.objects.filter(
        lead_id__in=lead_ids,
        status=FollowUp.Status.PENDING,
        due_date__lt=now,
    ).select_related("lead").order_by("due_date")
    for follow_up in overdue_followups:
        items.append((follow_up.lead, f"Overdue follow-up: {follow_up.title}", follow_up.due_date))

    serialized = []
    for lead, issue, waiting_since in items:
        waiting_days = max((now.date() - waiting_since.date()).days, 0)
        serialized.append(
            {
                "lead_id": lead.id,
                "lead": lead.project_name or lead.company_name,
                "company": lead.company_name,
                "issue": issue,
                "waiting_days": waiting_days,
                "waiting_since": waiting_since.isoformat(),
            }
        )
    return sorted(serialized, key=lambda item: (-item["waiting_days"], item["lead_id"]))[:25]


def common_metrics(leads):
    deals = sum(1 for lead in leads if optional_related(lead, "deal"))
    decisions = [
        lead.opportunity_decision
        for lead in leads
        if optional_related(lead, "opportunity_decision")
    ]
    proceed = sum(
        1 for decision in decisions
        if decision.decision == LeadOpportunityDecision.Decision.PROCEED
    )
    deals_from_proceed = sum(
        1
        for lead in leads
        if optional_related(lead, "deal")
        and optional_related(lead, "opportunity_decision")
        and lead.opportunity_decision.decision
        == LeadOpportunityDecision.Decision.PROCEED
    )
    return {
        "leads_created": len(leads),
        "active_leads": sum(1 for lead in leads if lead.status in ACTIVE_LEAD_STATUSES),
        "deals_generated": deals,
        "lead_to_deal_conversion_rate": percentage(deals, len(leads)),
        "lead_to_proceed_rate": percentage(proceed, len(leads)),
        "proceed_to_deal_conversion_rate": percentage(deals_from_proceed, proceed),
        "deals_from_proceed": deals_from_proceed,
        "proceed": proceed,
        "do_not_proceed": len(decisions) - proceed,
        "pending_final_decision": len(leads) - len(decisions),
        "proceed_rate": percentage(proceed, len(decisions)),
    }


def manager_dashboard(filters):
    leads = selected_leads(filters)
    metrics = common_metrics(leads)
    lead_ids = [lead.id for lead in leads]
    metrics["pending_assessments"] = sum(
        1 for lead in leads if assessment_stage(lead) in {"FINANCE_PENDING", "AWAITING_TECHNICAL", "TECHNICAL_PENDING"}
    )
    metrics["overdue_follow_ups"] = FollowUp.objects.filter(
        lead_id__in=lead_ids,
        status=FollowUp.Status.PENDING,
        due_date__lt=timezone.now(),
    ).count()
    return {
        "filters": serialized_filters(filters),
        "filter_options": filter_options(),
        "metric_definitions": {
            "lead_to_deal_conversion_rate": "Percentage of Leads created during the selected period that have produced a Deal.",
            "pending_assessments": "Leads waiting for completion or initiation of a required specialist assessment.",
            "overdue_follow_ups": "Follow-ups whose due date has passed and are still pending.",
        },
        "kpis": metrics,
        "assessment_pipeline": pipeline_counts(leads),
        "trend": trend_rows(leads),
        "source_performance": source_rows(leads),
        "team_performance": team_rows(leads),
        "attention_required": attention_rows(leads),
    }


def executive_dashboard(filters):
    leads = selected_leads(filters)
    metrics = common_metrics(leads)
    lead_ids = [lead.id for lead in leads]
    stage_counts = Counter(assessment_stage(lead) for lead in leads)
    deal_statuses = Counter(
        lead.deal.status for lead in leads if optional_related(lead, "deal")
    )
    overdue = FollowUp.objects.filter(
        lead_id__in=lead_ids,
        status=FollowUp.Status.PENDING,
        due_date__lt=timezone.now(),
    ).count()
    pending_exceptions = CommercialExceptionRequest.objects.filter(
        lead_id__in=lead_ids,
        status=CommercialExceptionRequest.Status.PENDING,
    ).count()
    return {
        "filters": serialized_filters(filters),
        "filter_options": filter_options(),
        "metric_definitions": {
            "lead_to_deal_conversion_rate": "Percentage of Leads created during the selected period that have produced a Deal.",
            "lead_to_proceed_rate": "Percentage of all selected Leads that received a Proceed decision.",
        },
        "kpis": {
            **metrics,
            "open_deals": deal_statuses.get(Deal.Status.OPEN, 0),
            "won_deals": deal_statuses.get(Deal.Status.WON, 0),
            "lost_deals": deal_statuses.get(Deal.Status.LOST, 0),
            "financially_viable": stage_counts.get("AWAITING_TECHNICAL", 0) + stage_counts.get("TECHNICAL_PENDING", 0) + stage_counts.get("DECISION_READY", 0) + stage_counts.get("PROCEED", 0) + stage_counts.get("DEAL_CREATED", 0),
            "not_financially_viable": stage_counts.get("FINANCIALLY_UNSUITABLE", 0),
            "commercial_reviews_required": stage_counts.get("COMMERCIAL_REVIEW_REQUIRED", 0),
            "pending_commercial_exceptions": pending_exceptions,
            "overdue_follow_ups": overdue,
            "unassigned_leads": sum(1 for lead in leads if not lead.assigned_to_id),
            "pending_assessments": sum(1 for lead in leads if assessment_stage(lead) in {"FINANCE_PENDING", "AWAITING_TECHNICAL", "TECHNICAL_PENDING"}),
        },
        "pipeline_summary": pipeline_counts(leads),
        "source_performance": source_rows(leads),
        "sales_rep_summary": team_rows(leads),
        "attention_required": attention_rows(leads),
        "commercial_health": {
            "financially_viable": stage_counts.get("AWAITING_TECHNICAL", 0) + stage_counts.get("TECHNICAL_PENDING", 0) + stage_counts.get("DECISION_READY", 0) + stage_counts.get("PROCEED", 0) + stage_counts.get("DEAL_CREATED", 0),
            "not_financially_viable": stage_counts.get("FINANCIALLY_UNSUITABLE", 0),
            "commercial_reviews_required": stage_counts.get("COMMERCIAL_REVIEW_REQUIRED", 0),
            "pending_commercial_exceptions": pending_exceptions,
        },
        "pending_approvals": pending_exceptions,
        "decision_outcomes": {
            "proceed": metrics["proceed"],
            "do_not_proceed": metrics["do_not_proceed"],
            "pending": metrics["pending_final_decision"],
        },
        "business_trend": trend_rows(leads, include_proceed=True),
    }


def lead_record(lead):
    finance = latest_related(lead, "analytics_financial_assessments")
    technical = latest_related(lead, "analytics_technical_assessments")
    decision = optional_related(lead, "opportunity_decision")
    deal = optional_related(lead, "deal")
    stage_since = assessment_stage_since(lead)
    return {
        "lead_id": lead.id,
        "lead": lead.project_name or lead.company_name,
        "company": lead.company_name,
        "created_at": lead.created_at.isoformat(),
        "source": lead.source,
        "source_display": lead.get_source_display() if lead.source else "Unspecified",
        "source_details": lead.source_details,
        "sales_rep": lead.assigned_to_id,
        "sales_rep_name": display_name(lead.assigned_to),
        "status": lead.status,
        "status_display": lead.get_status_display(),
        "assessment_stage": assessment_stage(lead),
        "assessment_stage_display": assessment_stage(lead).replace("_", " ").title(),
        "days_in_current_state": max(
            (timezone.localdate() - stage_since.date()).days,
            0,
        ),
        "finance_state": finance.get_status_display() if finance else "Not requested",
        "finance_outcome": finance.get_outcome_display() if finance and finance.outcome else "Pending",
        "technical_state": technical.get_status_display() if technical else "Not requested",
        # TechnicalAssessment intentionally has no explicit outcome enum. Do not
        # mislabel free-text comments as a business outcome.
        "technical_outcome": "Completed" if technical and technical.status in COMPLETED_ASSESSMENT_STATUSES else "Pending",
        "final_decision": decision.get_decision_display() if decision else "Pending",
        "deal_id": deal.id if deal else None,
        "deal": deal.name if deal else "",
        "deal_status": deal.get_status_display() if deal else "",
        "deal_created_at": deal.created_at.isoformat() if deal else None,
    }


def _plural(count, singular, plural=None):
    return singular if count == 1 else (plural or f"{singular}s")


def report_semantics(report_name, leads, records, summary, metrics):
    """Presentation-ready facts shared by JSON, React and PDF exports."""
    observations = []
    distributions = {}
    aging_records = []
    report_metrics = []

    if report_name == "lead-sources":
        report_metrics = [
            {"key": "total_leads", "label": "Total Leads", "value": len(leads)},
            {"key": "proceed", "label": "Leads Proceeding", "value": metrics["proceed"]},
            {"key": "deals", "label": "Deals Created", "value": metrics["deals_generated"]},
            {"key": "lead_to_deal", "label": "Lead-to-Deal Conversion", "value": metrics["lead_to_deal_conversion_rate"], "suffix": "%"},
        ]
        if summary:
            highest_volume = max(row["leads"] for row in summary)
            volume_rows = [row for row in summary if row["leads"] == highest_volume]
            volume_names = " and ".join(row["source_display"] for row in volume_rows)
            share = percentage(highest_volume, len(leads))
            observations.append(f'{volume_names} accounted for {highest_volume} of {len(leads)} {_plural(len(leads), "Lead")} ({share}%) in the selected reporting period.')
            if len(volume_rows) == 1 and volume_rows[0]["source"] == Lead.Source.OTHER and share > 50:
                observations.append("More than half of the selected Leads are classified under Other, indicating that Lead Source attribution may require review.")
            highest_conversion = max(row["conversion_rate"] for row in summary)
            conversion_rows = [row for row in summary if row["conversion_rate"] == highest_conversion]
            if len(conversion_rows) == 1:
                row = conversion_rows[0]
                observations.append(f'{row["source_display"]} generated {row["deals"]} {_plural(row["deals"], "Deal")} from {row["leads"]} {_plural(row["leads"], "Lead")}, resulting in a {row["conversion_rate"]}% Lead-to-Deal conversion rate.')
            elif conversion_rows and len({(row["deals"], row["leads"]) for row in conversion_rows}) == 1:
                deals, source_leads = conversion_rows[0]["deals"], conversion_rows[0]["leads"]
                names = ", ".join(row["source_display"] for row in conversion_rows[:-1]) + f' and {conversion_rows[-1]["source_display"]}'
                observations.append(f'{names} each generated {deals} {_plural(deals, "Deal")} from {source_leads} {_plural(source_leads, "Lead")}, resulting in a {highest_conversion}% Lead-to-Deal conversion rate.')
    elif report_name == "lead-conversion":
        report_metrics = [
            {"key": "total_leads", "label": "Total Leads", "value": len(leads)},
            {"key": "proceed", "label": "Leads Proceeding", "value": metrics["proceed"]},
            {"key": "deals", "label": "Deals Created", "value": metrics["deals_generated"]},
            {"key": "lead_to_proceed", "label": "Lead-to-Proceed Rate", "value": metrics["lead_to_proceed_rate"], "suffix": "%"},
            {"key": "proceed_to_deal", "label": "Proceed-to-Deal Conversion", "value": metrics["proceed_to_deal_conversion_rate"], "suffix": "%"},
            {"key": "lead_to_deal", "label": "Lead-to-Deal Conversion", "value": metrics["lead_to_deal_conversion_rate"], "suffix": "%"},
        ]
        observations.append(f'{metrics["proceed"]} of {len(leads)} {_plural(len(leads), "Lead")} received a Proceed decision ({metrics["lead_to_proceed_rate"]}%).')
        if metrics["proceed"]:
            deals_from_proceed = metrics["deals_from_proceed"]
            prefix = "All" if deals_from_proceed == metrics["proceed"] else str(deals_from_proceed)
            observations.append(f'{prefix} {metrics["proceed"]} Leads with a Proceed decision generated a Deal, resulting in a {metrics["proceed_to_deal_conversion_rate"]}% Proceed-to-Deal conversion rate.' if prefix == "All" else f'{deals_from_proceed} of {metrics["proceed"]} Proceed Leads generated Deals, resulting in a {metrics["proceed_to_deal_conversion_rate"]}% Proceed-to-Deal conversion rate.')
    elif report_name == "lead-status":
        stage_counts = dict(Counter(record["assessment_stage"] for record in records))
        decision_counts = {"PENDING": metrics["pending_final_decision"], "PROCEED": metrics["proceed"], "DO_NOT_PROCEED": metrics["do_not_proceed"]}
        distributions = {"assessment_stages": stage_counts, "final_decisions": decision_counts}
        aging_records = sorted(records, key=lambda record: (-record["days_in_current_state"], record["lead"].lower()))
        stale = [record for record in aging_records if record["days_in_current_state"] > REPORT_STALE_LEAD_DAYS]
        report_metrics = [
            {"key": "total_leads", "label": "Total Leads", "value": len(leads)},
            {"key": "pending_decision", "label": "Pending Final Decision", "value": metrics["pending_final_decision"]},
            {"key": "proceed", "label": "Leads Proceeding", "value": metrics["proceed"]},
            {"key": "deals", "label": "Deals Created", "value": metrics["deals_generated"]},
            {"key": "awaiting_finance", "label": "Awaiting Finance Initiation", "value": stage_counts.get("FINANCE_NOT_REQUESTED", 0)},
        ]
        observations.append(f'{metrics["pending_final_decision"]} of {len(leads)} {_plural(len(leads), "Lead")} currently have a Pending final decision.')
        observations.append(f'{len(stale)} {_plural(len(stale), "Lead")} have remained in their current assessment state for more than {REPORT_STALE_LEAD_DAYS} days.')
        if stale:
            observations.append(f'The longest-running Lead has remained in its current state for {stale[0]["days_in_current_state"]} days.')
    elif report_name == "sales-rep-performance":
        assigned = sum(row["assigned_leads"] for row in summary)
        deals = sum(row["deals"] for row in summary)
        completed = sum(row["follow_ups_completed"] for row in summary)
        overdue = sum(row["overdue_follow_ups"] for row in summary)
        unassigned = sum(1 for lead in leads if not lead.assigned_to_id)
        report_metrics = [
            {"key": "assigned_leads", "label": "Assigned Leads", "value": assigned},
            {"key": "deals", "label": "Deals Generated", "value": deals},
            {"key": "conversion", "label": "Lead-to-Deal Conversion", "value": percentage(deals, assigned), "suffix": "%"},
            {"key": "completed_followups", "label": "Completed Follow-ups", "value": completed},
            {"key": "overdue_followups", "label": "Overdue Follow-ups", "value": overdue},
            {"key": "unassigned", "label": "Unassigned Leads", "value": unassigned},
        ]
        observations.append(f'{len(summary)} {_plural(len(summary), "Sales Representative")} had assigned Leads in the selected cohort.')
        observations.append(f'{overdue} overdue {_plural(overdue, "follow-up")} remain across the selected Sales Representatives.')
        if unassigned:
            observations.append(f'{unassigned} {_plural(unassigned, "Lead")} in the selected cohort are unassigned.')
    else:
        deal_counts = dict(Counter(record["deal_status"] for record in records))
        distributions = {"deal_statuses": deal_counts}
        report_metrics = [
            {"key": "total_deals", "label": "Total Deals", "value": len(records)},
            {"key": "open", "label": "Open", "value": deal_counts.get("Open", 0)},
            {"key": "won", "label": "Won", "value": deal_counts.get("Won", 0)},
            {"key": "lost", "label": "Lost", "value": deal_counts.get("Lost", 0)},
        ]
        if records and deal_counts.get("Open", 0) == len(records):
            observations.append(f'All {len(records)} {_plural(len(records), "Deal")} in the selected reporting period remain Open; no Won or Lost outcomes have been recorded.')
        sources = sorted({record["source_display"] for record in records})
        if sources:
            source_text = sources[0] if len(sources) == 1 else ", ".join(sources[:-1]) + f" and {sources[-1]}"
            observations.append(f'The selected Deals originated from {source_text} Lead Sources.')
    return {"metrics": report_metrics, "observations": observations, "distributions": distributions, "aging_records": aging_records, "stale_lead_days": REPORT_STALE_LEAD_DAYS}


def report_payload(report_name, filters):
    if report_name not in REPORT_NAMES:
        return None
    leads = selected_leads(filters)
    records = [lead_record(lead) for lead in leads]
    metrics = common_metrics(leads)
    if report_name == "lead-sources":
        summary = source_rows(leads)
    elif report_name == "lead-conversion":
        summary = metrics
    elif report_name == "lead-status":
        summary = dict(Counter(record["assessment_stage"] for record in records))
    elif report_name == "sales-rep-performance":
        summary = team_rows(leads)
        records = summary
    else:
        records = [record for record in records if record["deal_id"]]
        summary = {"deals": len(records)}
    semantics = report_semantics(report_name, leads, records, summary, metrics)
    return {
        "report": report_name,
        "title": REPORT_NAMES[report_name],
        "filters": serialized_filters(filters),
        "filter_options": filter_options(),
        "summary": summary,
        "records": records,
        **semantics,
    }


CSV_COLUMNS = {
    "lead-sources": (
        ("created_at", "Created Date"), ("lead", "Lead"), ("company", "Company"),
        ("source_display", "Source"), ("source_details", "Source Details"),
        ("sales_rep_name", "Assigned Rep"), ("status_display", "Current Status"),
        ("final_decision", "Final Decision"), ("deal", "Deal Created"),
    ),
    "lead-conversion": (
        ("lead", "Lead"), ("created_at", "Created"), ("source_display", "Source"),
        ("sales_rep_name", "Sales Rep"), ("finance_outcome", "Finance Outcome"),
        ("technical_state", "Technical State"), ("final_decision", "Final Decision"),
        ("deal", "Deal"), ("deal_created_at", "Deal Created Date"),
    ),
    "lead-status": (
        ("lead", "Lead"), ("company", "Company"), ("sales_rep_name", "Assigned Rep"),
        ("finance_state", "Finance State"), ("technical_state", "Technical State"),
        ("final_decision", "Final Decision"), ("assessment_stage", "Assessment Stage"),
        ("days_in_current_state", "Days in Current State"),
    ),
    "sales-rep-performance": (
        ("sales_rep_name", "Sales Rep"), ("assigned_leads", "Assigned Leads"),
        ("communications", "Communications"), ("follow_ups_completed", "Follow-ups Completed"),
        ("overdue_follow_ups", "Overdue Follow-ups"), ("proceed", "Proceed Leads"),
        ("deals", "Deals Generated"), ("conversion_rate", "Lead to Deal Conversion %"),
    ),
    "deals": (
        ("deal", "Deal"), ("lead", "Originating Lead"), ("company", "Company"),
        ("source_display", "Lead Source"), ("sales_rep_name", "Sales Rep"),
        ("deal_created_at", "Created Date"), ("deal_status", "Current Deal Status"),
    ),
}

PDF_COLUMNS = {
    "lead-sources": (("created_at", "Created"), ("lead", "Lead"), ("company", "Company"), ("source_display", "Source"), ("sales_rep_name", "Sales Rep"), ("final_decision", "Final Decision"), ("deal", "Deal")),
    "lead-conversion": (("lead", "Lead"), ("created_at", "Created"), ("source_display", "Source"), ("sales_rep_name", "Sales Rep"), ("final_decision", "Final Decision"), ("deal", "Deal"), ("deal_created_at", "Deal Created")),
    "lead-status": CSV_COLUMNS["lead-status"],
    "sales-rep-performance": CSV_COLUMNS["sales-rep-performance"],
    "deals": CSV_COLUMNS["deals"],
}


class ManagerDashboardView(APIView):
    permission_classes = [IsAuthenticated, ManagerAnalyticsPermission]

    def get(self, request):
        return Response(manager_dashboard(parse_filters(request.query_params)))


class ExecutiveDashboardView(APIView):
    permission_classes = [IsAuthenticated, DirectorAnalyticsPermission]

    def get(self, request):
        return Response(executive_dashboard(parse_filters(request.query_params)))


class ReportView(APIView):
    permission_classes = [IsAuthenticated, AnalyticsRolePermission]

    def get(self, request, report_name):
        payload = report_payload(report_name, parse_filters(request.query_params))
        if payload is None:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(payload)


class ReportCsvExportView(APIView):
    permission_classes = [IsAuthenticated, AnalyticsRolePermission]

    def get(self, request, report_name):
        filters = parse_filters(request.query_params)
        payload = report_payload(report_name, filters)
        if payload is None:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = (
            f'attachment; filename="{report_name}-report-'
            f'{filters["date_from"].isoformat()}-to-{filters["date_to"].isoformat()}.csv"'
        )
        response.write("\ufeff")
        writer = csv.writer(response)
        columns = CSV_COLUMNS[report_name]
        writer.writerow([label for _, label in columns])
        for record in payload["records"]:
            writer.writerow([record.get(key, "") for key, _ in columns])
        return response


class ReportPdfExportView(APIView):
    permission_classes = [IsAuthenticated, AnalyticsRolePermission]

    def get(self, request, report_name):
        from .report_pdf import generate_report_pdf

        filters = parse_filters(request.query_params)
        payload = report_payload(report_name, filters)
        if payload is None:
            return Response({"detail": "Report not found."}, status=status.HTTP_404_NOT_FOUND)
        document = generate_report_pdf(report_name, payload, filters, request.user)
        response = HttpResponse(document.content, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{document.filename}"'
        return response
