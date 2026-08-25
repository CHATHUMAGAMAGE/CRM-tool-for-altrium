from django.urls import path

from .financial_assessments import (
    FinancialAssessmentDetailView,
    FinancialAssessmentDocumentDownloadView,
    FinancialAssessmentDocumentListCreateView,
    FinancialAssessmentHistoryListView,
    FinancialAssessmentListCreateView,
    FinancialAssessmentRequestUpdateView,
    FinancialAssessmentReviewView,
    FinancialAssessmentStartView,
    FinancialAssessmentSubmitView,
    FinancialAssessmentWorkView,
    FinancialOfficerLookupView,
)

from .opportunities import (
    LeadConvertToDealView,
    LeadOpportunityDecisionView,
)

from .reminders import (
    FollowUpReminderListView,
)

from .technical_assessments import (
    SoftwareEngineerLookupView,
    TechLeadLookupView,
    TechnicalAssessmentDetailView,
    TechnicalAssessmentDocumentDownloadView,
    TechnicalAssessmentDocumentListCreateView,
    TechnicalAssessmentHistoryListView,
    TechnicalAssessmentListCreateView,
    TechnicalAssessmentRecommendationDetailView,
    TechnicalAssessmentRecommendationListCreateView,
    TechnicalAssessmentRequestUpdateView,
    TechnicalAssessmentReviewView,
    TechnicalAssessmentStartView,
    TechnicalAssessmentSubmitView,
    TechnicalAssessmentWorkView,
)

from .views import (
    CommunicationListCreateView,
    DashboardStatsView,
    FollowUpDetailView,
    FollowUpListCreateView,
    LeadDetailView,
    LeadHistoryListView,
    LeadListCreateView,
    LeadRescueRadarView,
)


app_name = "crm"


urlpatterns = [
    path(
        "dashboard/",
        DashboardStatsView.as_view(),
        name="dashboard-stats",
    ),

    path(
        "leads/",
        LeadListCreateView.as_view(),
        name="lead-list-create",
    ),

    path(
        "leads/<int:pk>/",
        LeadDetailView.as_view(),
        name="lead-detail",
    ),

    path(
        "leads/<int:lead_id>/history/",
        LeadHistoryListView.as_view(),
        name="lead-history",
    ),

    path(
        "leads/<int:pk>/rescue-radar/",
        LeadRescueRadarView.as_view(),
        name="lead-rescue-radar",
    ),

    path(
        "leads/<int:pk>/opportunity-decision/",
        LeadOpportunityDecisionView.as_view(),
        name="lead-opportunity-decision",
    ),

    path(
        "leads/<int:pk>/convert/",
        LeadConvertToDealView.as_view(),
        name="lead-convert",
    ),

    path(
        "leads/<int:lead_id>/communications/",
        CommunicationListCreateView.as_view(),
        name="communication-list-create",
    ),

    path(
        "leads/<int:lead_id>/follow-ups/",
        FollowUpListCreateView.as_view(),
        name="follow-up-list-create",
    ),

    path(
        "follow-ups/<int:pk>/",
        FollowUpDetailView.as_view(),
        name="follow-up-detail",
    ),

    path(
        "follow-up-reminders/",
        FollowUpReminderListView.as_view(),
        name="follow-up-reminder-list",
    ),

    path(
        "technical-assessments/tech-leads/",
        TechLeadLookupView.as_view(),
        name="technical-assessment-tech-leads",
    ),

    path(
        "technical-assessments/software-engineers/",
        SoftwareEngineerLookupView.as_view(),
        name="technical-assessment-software-engineers",
    ),

    path(
        "technical-assessments/",
        TechnicalAssessmentListCreateView.as_view(),
        name="technical-assessment-list-create",
    ),

    path(
        "technical-assessments/<int:pk>/",
        TechnicalAssessmentDetailView.as_view(),
        name="technical-assessment-detail",
    ),

    path(
        "technical-assessments/<int:pk>/request/",
        TechnicalAssessmentRequestUpdateView.as_view(),
        name="technical-assessment-request-update",
    ),

    path(
        "technical-assessments/<int:pk>/start/",
        TechnicalAssessmentStartView.as_view(),
        name="technical-assessment-start",
    ),

    path(
        "technical-assessments/<int:pk>/work/",
        TechnicalAssessmentWorkView.as_view(),
        name="technical-assessment-work",
    ),

    path(
        "technical-assessments/<int:pk>/submit/",
        TechnicalAssessmentSubmitView.as_view(),
        name="technical-assessment-submit",
    ),

    path(
        "technical-assessments/<int:pk>/review/",
        TechnicalAssessmentReviewView.as_view(),
        name="technical-assessment-review",
    ),

    path(
        "technical-assessments/<int:assessment_id>/history/",
        TechnicalAssessmentHistoryListView.as_view(),
        name="technical-assessment-history",
    ),

    path(
        "technical-assessments/<int:assessment_id>/recommendations/",
        TechnicalAssessmentRecommendationListCreateView.as_view(),
        name="technical-assessment-recommendations",
    ),

    path(
        "technical-assessments/<int:assessment_id>/recommendations/<int:pk>/",
        TechnicalAssessmentRecommendationDetailView.as_view(),
        name="technical-assessment-recommendation-detail",
    ),

    path(
        "technical-assessments/<int:assessment_id>/documents/",
        TechnicalAssessmentDocumentListCreateView.as_view(),
        name="technical-assessment-documents",
    ),

    path(
        "technical-assessments/<int:assessment_id>/documents/<int:pk>/download/",
        TechnicalAssessmentDocumentDownloadView.as_view(),
        name="technical-assessment-document-download",
    ),

    path(
        "financial-assessments/officers/",
        FinancialOfficerLookupView.as_view(),
        name="financial-assessment-officers",
    ),

    path(
        "financial-assessments/",
        FinancialAssessmentListCreateView.as_view(),
        name="financial-assessment-list-create",
    ),

    path(
        "financial-assessments/<int:pk>/",
        FinancialAssessmentDetailView.as_view(),
        name="financial-assessment-detail",
    ),

    path(
        "financial-assessments/<int:pk>/request/",
        FinancialAssessmentRequestUpdateView.as_view(),
        name="financial-assessment-request-update",
    ),

    path(
        "financial-assessments/<int:pk>/start/",
        FinancialAssessmentStartView.as_view(),
        name="financial-assessment-start",
    ),

    path(
        "financial-assessments/<int:pk>/work/",
        FinancialAssessmentWorkView.as_view(),
        name="financial-assessment-work",
    ),

    path(
        "financial-assessments/<int:pk>/submit/",
        FinancialAssessmentSubmitView.as_view(),
        name="financial-assessment-submit",
    ),

    path(
        "financial-assessments/<int:pk>/review/",
        FinancialAssessmentReviewView.as_view(),
        name="financial-assessment-review",
    ),

    path(
        "financial-assessments/<int:assessment_id>/history/",
        FinancialAssessmentHistoryListView.as_view(),
        name="financial-assessment-history",
    ),

    path(
        "financial-assessments/<int:assessment_id>/documents/",
        FinancialAssessmentDocumentListCreateView.as_view(),
        name="financial-assessment-documents",
    ),

    path(
        "financial-assessments/<int:assessment_id>/documents/<int:pk>/download/",
        FinancialAssessmentDocumentDownloadView.as_view(),
        name="financial-assessment-document-download",
    ),
]
