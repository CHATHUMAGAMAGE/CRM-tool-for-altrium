from django.contrib.auth import get_user_model
from decimal import Decimal
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, status
from rest_framework.permissions import BasePermission, IsAuthenticated, SAFE_METHODS
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile
from .models import (
    CommercialExceptionRequest, CommercialReview, FinancialAssessment,
    FinancialAssessmentHistory, Lead, LeadHistory, Notification,
)
from .notifications import create_notification

User = get_user_model()


def display_name(user):
    return user.get_full_name().strip() or user.username if user else None


def latest_completed_finance(lead):
    return lead.financial_assessments.filter(
        status__in=[FinancialAssessment.Status.SUBMITTED, FinancialAssessment.Status.REVIEWED]
    ).order_by("-submitted_at", "-id").first()


class CommercialWorkflowPermission(BasePermission):
    def has_permission(self, request, view):
        role = getattr(getattr(request.user, "profile", None), "role", None)
        allowed = {UserProfile.Role.SALES_MANAGER}
        if getattr(view, "director_action", False):
            allowed = {UserProfile.Role.DIRECTOR, UserProfile.Role.EXECUTIVE}
        elif request.method in SAFE_METHODS:
            allowed |= {UserProfile.Role.DIRECTOR, UserProfile.Role.EXECUTIVE}
        return bool(request.user and request.user.is_authenticated and role in allowed)


class CommercialReviewSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    created_by_name = serializers.SerializerMethodField()
    financial_outcome = serializers.CharField(source="financial_assessment.outcome", read_only=True)
    assessed_by_name = serializers.SerializerMethodField()
    estimated_delivery_cost = serializers.DecimalField(
        source="financial_assessment.estimated_delivery_cost",
        max_digits=14, decimal_places=2, read_only=True, allow_null=True,
    )
    budget_shortfall = serializers.SerializerMethodField()

    class Meta:
        model = CommercialReview
        fields = "__all__"
        read_only_fields = ["lead", "financial_assessment", "status", "created_by"]

    def get_created_by_name(self, obj): return display_name(obj.created_by)
    def get_assessed_by_name(self, obj): return display_name(obj.financial_assessment.assigned_to)
    def get_budget_shortfall(self, obj):
        cost = obj.financial_assessment.estimated_delivery_cost
        budget_max = obj.lead.budget_max
        if cost is None or budget_max is None:
            return None
        return f'{max(cost - budget_max, Decimal("0.00")):.2f}'


class CommercialExceptionSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    reviewed_by_name = serializers.SerializerMethodField()
    lead_name = serializers.CharField(source="lead.project_name", read_only=True)
    company_name = serializers.CharField(source="lead.company_name", read_only=True)
    financial_outcome = serializers.CharField(source="financial_assessment.outcome", read_only=True)
    client_budget_min = serializers.DecimalField(source="lead.budget_min", max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    client_budget_max = serializers.DecimalField(source="lead.budget_max", max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    currency = serializers.CharField(source="lead.budget_currency", read_only=True)
    estimated_delivery_cost = serializers.DecimalField(source="financial_assessment.estimated_delivery_cost", max_digits=14, decimal_places=2, read_only=True, allow_null=True)
    budget_shortfall = serializers.SerializerMethodField()

    class Meta:
        model = CommercialExceptionRequest
        fields = "__all__"
        read_only_fields = ["lead", "financial_assessment", "requested_by", "status", "reviewed_by", "reviewed_at"]

    def get_requested_by_name(self, obj): return display_name(obj.requested_by)
    def get_reviewed_by_name(self, obj): return display_name(obj.reviewed_by)
    def get_budget_shortfall(self, obj):
        cost = obj.financial_assessment.estimated_delivery_cost
        budget_max = obj.lead.budget_max
        if cost is None or budget_max is None:
            return None
        return f'{max(cost - budget_max, Decimal("0.00")):.2f}'


class LeadCommercialReviewView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]

    def get(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        reviews = CommercialReview.objects.filter(lead=lead).select_related("financial_assessment__assigned_to", "created_by")
        exceptions = CommercialExceptionRequest.objects.filter(lead=lead).select_related("requested_by", "reviewed_by", "financial_assessment")
        return Response({
            "commercial_review_required": reviews.filter(status__in=[CommercialReview.Status.REQUIRED, CommercialReview.Status.REVISED, CommercialReview.Status.REASSESSMENT_REQUESTED]).exists(),
            "reviews": CommercialReviewSerializer(reviews, many=True).data,
            "exceptions": CommercialExceptionSerializer(exceptions, many=True).data,
        })


class ReviseCommercialTermsView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]

    @transaction.atomic
    def post(self, request, pk):
        lead = get_object_or_404(Lead.objects.select_for_update(), pk=pk)
        finance = latest_completed_finance(lead)
        if not finance or finance.outcome != FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE:
            raise serializers.ValidationError({"detail": "Commercial terms can only be revised after a completed Not Financially Viable assessment."})
        if finance.status != FinancialAssessment.Status.REVIEWED:
            raise serializers.ValidationError({"detail": "The Sales Manager must review the submitted Financial Assessment before revising commercial terms."})
        reason = str(request.data.get("reason", "")).strip()
        scope = str(request.data.get("revised_scope", "")).strip()
        if not reason or not scope:
            raise serializers.ValidationError({"detail": "Reason for revision and revised scope/commercial terms are required."})
        review = CommercialReview.objects.filter(lead=lead, financial_assessment=finance).first()
        if review is None:
            review = CommercialReview(lead=lead, financial_assessment=finance, created_by=request.user)
        serializer = CommercialReviewSerializer(review, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        review = serializer.save(status=CommercialReview.Status.REVISED)
        LeadHistory.objects.create(lead=lead, event_type=LeadHistory.EventType.UPDATED, description="Commercial terms revised after financial review.", performed_by=request.user, metadata={"workflow_event": "COMMERCIAL_TERMS_REVISED", "commercial_review_id": review.id})
        return Response(CommercialReviewSerializer(review).data)


class RequestFinancialReassessmentView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]

    @transaction.atomic
    def post(self, request, pk):
        lead = get_object_or_404(Lead.objects.select_for_update(), pk=pk)
        review = CommercialReview.objects.filter(lead=lead, status=CommercialReview.Status.REVISED).select_related("financial_assessment").first()
        if review is None:
            raise serializers.ValidationError({"detail": "Commercial terms must be revised before requesting reassessment."})
        if lead.financial_assessments.filter(status__in=[FinancialAssessment.Status.REQUESTED, FinancialAssessment.Status.IN_PROGRESS, FinancialAssessment.Status.SUBMITTED]).exists():
            raise serializers.ValidationError({"detail": "This Lead already has an active Financial Assessment."})
        assigned_to_id = request.data.get("assigned_to") or review.financial_assessment.assigned_to_id
        assigned_to = get_object_or_404(User, pk=assigned_to_id, is_active=True, profile__role=UserProfile.Role.FINANCIAL_OFFICER)
        requirements = str(request.data.get("requirements", "")).strip() or f"Reassess revised commercial terms. Reason: {review.reason}\nRevised scope: {review.revised_scope}"
        assessment = FinancialAssessment.objects.create(lead=lead, requested_by=request.user, assigned_to=assigned_to, requirements=requirements)
        FinancialAssessmentHistory.objects.create(assessment=assessment, event_type=FinancialAssessmentHistory.EventType.REQUESTED, description="Financial reassessment requested after revised commercial terms.", performed_by=request.user, metadata={"previous_assessment_id": review.financial_assessment_id, "commercial_review_id": review.id})
        review.status = CommercialReview.Status.REASSESSMENT_REQUESTED
        review.save(update_fields=["status", "updated_at"])
        LeadHistory.objects.create(lead=lead, event_type=LeadHistory.EventType.UPDATED, description="Financial reassessment requested.", performed_by=request.user, metadata={"workflow_event": "FINANCIAL_REASSESSMENT_REQUESTED", "assessment_id": assessment.id})
        create_notification(recipient=assigned_to, actor=request.user, kind=Notification.Kind.ASSIGNMENT, title="Financial reassessment assigned to you", message=f"Financial reassessment requested for {lead.project_name or lead.company_name} after revised commercial terms.", target_url=f"/financial-assessments/{assessment.id}")
        from .financial_serializers import FinancialAssessmentSerializer
        return Response(FinancialAssessmentSerializer(assessment, context={"request": request}).data, status=status.HTTP_201_CREATED)


class RequestCommercialExceptionView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]

    @transaction.atomic
    def post(self, request, pk):
        lead = get_object_or_404(Lead, pk=pk)
        finance = latest_completed_finance(lead)
        if not finance or finance.outcome != FinancialAssessment.Outcome.FINANCIALLY_UNSUITABLE:
            raise serializers.ValidationError({"detail": "An exception can only be requested for a completed Not Financially Viable assessment."})
        if finance.status != FinancialAssessment.Status.REVIEWED:
            raise serializers.ValidationError({"detail": "The Sales Manager must review the submitted Financial Assessment before requesting an exception."})
        justification = str(request.data.get("justification", "")).strip()
        if not justification:
            raise serializers.ValidationError({"justification": "Exception justification is required."})
        if CommercialExceptionRequest.objects.filter(financial_assessment=finance, status=CommercialExceptionRequest.Status.PENDING).exists():
            raise serializers.ValidationError({"detail": "A commercial exception is already pending for this assessment."})
        exception = CommercialExceptionRequest.objects.create(lead=lead, financial_assessment=finance, requested_by=request.user, justification=justification, supporting_notes=str(request.data.get("supporting_notes", "")).strip())
        reviewers = User.objects.filter(
            is_active=True,
            profile__role__in=[UserProfile.Role.DIRECTOR, UserProfile.Role.EXECUTIVE],
        )
        for reviewer in reviewers:
            create_notification(recipient=reviewer, actor=request.user, kind=Notification.Kind.REVIEW, title="Commercial exception approval requested", message=f"Commercial exception approval requested for {lead.project_name or lead.company_name}.", target_url="/executive/approvals")
        LeadHistory.objects.create(lead=lead, event_type=LeadHistory.EventType.UPDATED, description="Commercial exception approval requested.", performed_by=request.user, metadata={"workflow_event": "COMMERCIAL_EXCEPTION_REQUESTED", "exception_id": exception.id})
        return Response(CommercialExceptionSerializer(exception).data, status=status.HTTP_201_CREATED)


class CommercialExceptionListView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]
    director_action = True

    def get(self, request):
        qs = CommercialExceptionRequest.objects.select_related("lead", "financial_assessment", "requested_by", "reviewed_by")
        return Response(CommercialExceptionSerializer(qs, many=True).data)


class CommercialExceptionReviewView(APIView):
    permission_classes = [IsAuthenticated, CommercialWorkflowPermission]
    director_action = True

    @transaction.atomic
    def post(self, request, pk, action):
        exception = get_object_or_404(CommercialExceptionRequest.objects.select_for_update().select_related("lead", "requested_by"), pk=pk)
        if exception.status != CommercialExceptionRequest.Status.PENDING:
            raise serializers.ValidationError({"detail": "This commercial exception has already been reviewed."})
        if exception.requested_by_id == request.user.id:
            raise serializers.ValidationError({"detail": "You cannot approve your own exception request."})
        if action not in {"approve", "reject"}:
            raise serializers.ValidationError({"detail": "Invalid exception action."})
        comments = str(request.data.get("reviewer_comments", "")).strip()
        if not comments:
            raise serializers.ValidationError({"reviewer_comments": "A reviewer comment is required."})
        exception.status = CommercialExceptionRequest.Status.APPROVED if action == "approve" else CommercialExceptionRequest.Status.REJECTED
        exception.reviewed_by = request.user
        exception.reviewed_at = timezone.now()
        exception.reviewer_comments = comments
        exception.save(update_fields=["status", "reviewed_by", "reviewed_at", "reviewer_comments"])
        LeadHistory.objects.create(lead=exception.lead, event_type=LeadHistory.EventType.UPDATED, description=f"Commercial exception {exception.status.lower()}.", performed_by=request.user, metadata={"workflow_event": f"COMMERCIAL_EXCEPTION_{exception.status}", "exception_id": exception.id})
        create_notification(recipient=exception.requested_by, actor=request.user, kind=Notification.Kind.REVIEW, title=f"Commercial exception {exception.status.lower()}", message=comments, target_url=f"/leads/{exception.lead_id}")
        return Response(CommercialExceptionSerializer(exception).data)
