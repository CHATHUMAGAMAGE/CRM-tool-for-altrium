from django.contrib.auth import (
    get_user_model,
)
from django.db import transaction
from django.db.models import Prefetch
from django.http import HttpResponse
from django.utils.http import content_disposition_header
from django.shortcuts import (
    get_object_or_404,
)
from django.utils import timezone

from rest_framework import generics
from rest_framework.exceptions import (
    PermissionDenied,
    ValidationError,
)
from rest_framework.parsers import (
    FormParser,
    MultiPartParser,
)
from rest_framework.permissions import (
    IsAuthenticated,
)
from rest_framework.response import (
    Response,
)

from accounts.models import UserProfile

from .financial_assessment_permissions import (
    FinancialAssessmentPermission,
)

from .financial_serializers import (
    FinancialAssessmentCreateSerializer,
    FinancialAssessmentDocumentSerializer,
    FinancialAssessmentHistorySerializer,
    FinancialAssessmentRequestUpdateSerializer,
    FinancialAssessmentReviewSerializer,
    FinancialAssessmentSerializer,
    FinancialAssessmentWorkSerializer,
)

from .models import (
    FinancialAssessment,
    FinancialAssessmentDocument,
    FinancialAssessmentHistory,
    Lead,
    TechnicalAssessment,
    Notification,
)
from .notifications import create_notification


User = get_user_model()


def get_user_display_name(
    user,
):
    if user is None:
        return None

    full_name = (
        user
        .get_full_name()
        .strip()
    )

    return (
        full_name
        or user.username
    )


class FinancialAssessmentAccessMixin:
    def get_assessment_queryset(
        self,
    ):
        user = self.request.user

        profile = getattr(
            user,
            "profile",
            None,
        )

        queryset = (
            FinancialAssessment.objects
            .select_related(
                "lead",
                "lead__assigned_to",
                "technical_assessment",
                "technical_assessment__assigned_to",
                "technical_assessment__reviewed_by",
                "requested_by",
                "requested_by__profile",
                "assigned_to",
                "assigned_to__profile",
                "reviewed_by",
                "reviewed_by__profile",
            )
            .prefetch_related(
                Prefetch(
                    "documents",
                    queryset=(
                        FinancialAssessmentDocument.objects
                        .select_related(
                            "uploaded_by",
                            "uploaded_by__profile",
                        )
                        .defer("file_data")
                    ),
                ),
                "history",
                "history__performed_by",
            )
        )

        if profile is None:
            return queryset.none()

        role = profile.role

        if (
            role
            == UserProfile.Role.ADMIN
        ):
            return queryset

        if (
            role
            == UserProfile.Role.SALES_MANAGER
        ):
            return queryset

        if (
            role
            == UserProfile.Role.FINANCIAL_OFFICER
        ):
            return queryset.filter(
                assigned_to=user,
            )

        return queryset.none()

    def get_assessment(
        self,
        kwarg_name="pk",
    ):
        return get_object_or_404(
            self.get_assessment_queryset(),
            pk=self.kwargs[
                kwarg_name
            ],
        )


class FinancialAssessmentQuerysetMixin(
    FinancialAssessmentAccessMixin,
):
    def get_queryset(
        self,
    ):
        return (
            self.get_assessment_queryset()
        )


class FinancialAssessmentListCreateView(
    FinancialAssessmentQuerysetMixin,
    generics.ListCreateAPIView,
):
    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "create"
    )

    def get_serializer_class(
        self,
    ):
        if (
            self.request.method
            == "POST"
        ):
            return (
                FinancialAssessmentCreateSerializer
            )

        return (
            FinancialAssessmentSerializer
        )

    def perform_create(
        self,
        serializer,
    ):
        lead = (
            serializer
            .validated_data[
                "lead"
            ]
        )

        technical_assessment = (
            serializer
            .validated_data[
                "technical_assessment"
            ]
        )

        if (
            lead.status
            != Lead.Status.QUALIFIED
        ):
            raise ValidationError(
                {
                    "lead": (
                        "The lead must be qualified "
                        "before a financial assessment "
                        "can be requested."
                    )
                }
            )

        if (
            technical_assessment.status
            != TechnicalAssessment
            .Status
            .REVIEWED
        ):
            raise ValidationError(
                {
                    "technical_assessment": (
                        "The technical assessment "
                        "must be reviewed before a "
                        "financial assessment can "
                        "be requested."
                    )
                }
            )

        serializer.save()


class FinancialAssessmentDetailView(
    FinancialAssessmentQuerysetMixin,
    generics.RetrieveAPIView,
):
    serializer_class = (
        FinancialAssessmentSerializer
    )

    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]


class FinancialAssessmentRequestUpdateView(
    FinancialAssessmentQuerysetMixin,
    generics.UpdateAPIView,
):
    serializer_class = (
        FinancialAssessmentRequestUpdateSerializer
    )

    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "request_update"
    )

    http_method_names = [
        "patch",
        "head",
        "options",
    ]


class FinancialAssessmentStartView(
    FinancialAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "start"
    )

    @transaction.atomic
    def post(
        self,
        request,
        pk,
    ):
        assessment = (
            self.get_object()
        )

        if (
            assessment.status
            != FinancialAssessment
            .Status
            .REQUESTED
        ):
            raise ValidationError(
                {
                    "status": (
                        "Only a requested financial "
                        "assessment can be started."
                    )
                }
            )

        assessment.status = (
            FinancialAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        FinancialAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                FinancialAssessmentHistory
                .EventType
                .STARTED
            ),
            description=(
                "Financial assessment started."
            ),
            performed_by=request.user,
        )

        return Response(
            FinancialAssessmentSerializer(
                assessment,
                context={
                    "request":
                        request,
                },
            ).data
        )


class FinancialAssessmentWorkView(
    FinancialAssessmentQuerysetMixin,
    generics.UpdateAPIView,
):
    serializer_class = (
        FinancialAssessmentWorkSerializer
    )

    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "work"
    )

    http_method_names = [
        "patch",
        "head",
        "options",
    ]


class FinancialAssessmentSubmitView(
    FinancialAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "submit"
    )

    @transaction.atomic
    def post(
        self,
        request,
        pk,
    ):
        assessment = (
            self.get_object()
        )

        if (
            assessment.status
            != FinancialAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "status": (
                        "Only an in-progress financial "
                        "assessment can be submitted."
                    )
                }
            )

        if not (
            assessment.financial_comments
            or ""
        ).strip():
            raise ValidationError(
                {
                    "financial_comments": (
                        "Financial comments are "
                        "required before submitting "
                        "the assessment."
                    )
                }
            )

        assessment.status = (
            FinancialAssessment
            .Status
            .SUBMITTED
        )

        assessment.submitted_at = (
            timezone.now()
        )

        assessment.save(
            update_fields=[
                "status",
                "submitted_at",
                "updated_at",
            ]
        )

        FinancialAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                FinancialAssessmentHistory
                .EventType
                .SUBMITTED
            ),
            description=(
                "Financial assessment submitted "
                "for Sales Manager review."
            ),
            performed_by=request.user,
        )

        create_notification(
            recipient=(assessment.lead.responsible_manager or assessment.requested_by),
            actor=request.user,
            kind=Notification.Kind.SUBMISSION,
            title="Financial assessment submitted",
            message=f"The financial assessment for {assessment.lead.company_name} is ready for review.",
            target_url=f"/financial-assessments/{assessment.id}",
        )

        return Response(
            FinancialAssessmentSerializer(
                assessment,
                context={
                    "request":
                        request,
                },
            ).data
        )


class FinancialAssessmentReviewView(
    FinancialAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "review"
    )

    @transaction.atomic
    def post(
        self,
        request,
        pk,
    ):
        assessment = (
            self.get_object()
        )

        serializer = (
            FinancialAssessmentReviewSerializer(
                assessment,
                data=request.data,
                context={
                    "request":
                        request,
                },
            )
        )

        serializer.is_valid(
            raise_exception=True,
        )

        reviewed = serializer.save(
            status=(
                FinancialAssessment
                .Status
                .REVIEWED
            ),
            reviewed_at=(
                timezone.now()
            ),
            reviewed_by=request.user,
        )

        FinancialAssessmentHistory.objects.create(
            assessment=reviewed,
            event_type=(
                FinancialAssessmentHistory
                .EventType
                .REVIEWED
            ),
            description=(
                "Financial assessment reviewed "
                "by Sales Manager."
            ),
            performed_by=request.user,
            metadata={
                "review_notes":
                    reviewed.review_notes,
            },
        )

        create_notification(
            recipient=reviewed.assigned_to,
            actor=request.user,
            kind=Notification.Kind.REVIEW,
            title="Financial assessment reviewed",
            message=reviewed.review_notes,
            target_url=f"/financial-assessments/{reviewed.id}",
        )

        return Response(
            FinancialAssessmentSerializer(
                reviewed,
                context={
                    "request":
                        request,
                },
            ).data
        )


class FinancialAssessmentHistoryListView(
    FinancialAssessmentAccessMixin,
    generics.ListAPIView,
):
    serializer_class = (
        FinancialAssessmentHistorySerializer
    )

    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    def get_queryset(
        self,
    ):
        assessment = (
            self.get_assessment(
                "assessment_id",
            )
        )

        return (
            FinancialAssessmentHistory
            .objects
            .filter(
                assessment=assessment,
            )
            .select_related(
                "performed_by",
                "performed_by__profile",
            )
            .order_by(
                "-created_at",
                "-id",
            )
        )


class FinancialAssessmentDocumentListCreateView(
    FinancialAssessmentAccessMixin,
    generics.ListCreateAPIView,
):
    serializer_class = (
        FinancialAssessmentDocumentSerializer
    )

    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]

    financial_assessment_action = (
        "document"
    )

    parser_classes = [
        MultiPartParser,
        FormParser,
    ]

    def get_assessment_instance(
        self,
    ):
        if hasattr(
            self,
            "_assessment",
        ):
            return self._assessment

        self._assessment = (
            self.get_assessment(
                "assessment_id",
            )
        )

        return self._assessment

    def get_queryset(
        self,
    ):
        assessment = (
            self.get_assessment_instance()
        )

        return (
            FinancialAssessmentDocument
            .objects
            .filter(
                assessment=assessment,
            )
            .select_related(
                "uploaded_by",
                "uploaded_by__profile",
            )
            .defer("file_data")
            .order_by(
                "-uploaded_at",
            )
        )

    def perform_create(
        self,
        serializer,
    ):
        assessment = (
            self.get_assessment_instance()
        )

        if (
            assessment.status
            != FinancialAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "assessment": (
                        "Documents can only be added "
                        "while the financial assessment "
                        "is in progress."
                    )
                }
            )

        serializer.save(
            assessment=assessment,
            uploaded_by=
                self.request.user,
        )


class FinancialAssessmentDocumentDownloadView(
    FinancialAssessmentAccessMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        FinancialAssessmentPermission,
    ]
    financial_assessment_action = "document"

    def get(self, request, assessment_id, pk):
        assessment = self.get_assessment("assessment_id")
        document = get_object_or_404(
            FinancialAssessmentDocument,
            assessment=assessment,
            pk=pk,
        )
        response = HttpResponse(
            bytes(document.file_data),
            content_type=document.content_type,
        )
        response["Content-Disposition"] = content_disposition_header(
            False,
            document.file_name,
        )
        response["X-Content-Type-Options"] = "nosniff"
        return response


class FinancialOfficerLookupView(
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
    ]

    def get(
        self,
        request,
    ):
        profile = getattr(
            request.user,
            "profile",
            None,
        )

        if (
            profile is None
            or profile.role
            not in {
                UserProfile.Role.ADMIN,
                UserProfile.Role.SALES_MANAGER,
            }
        ):
            raise PermissionDenied(
                "Only Sales Managers or "
                "Administrators can view "
                "Financial Officers."
            )

        users = (
            User.objects
            .filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .FINANCIAL_OFFICER
                ),
            )
            .select_related(
                "profile",
            )
            .order_by(
                "first_name",
                "last_name",
                "username",
            )
        )

        return Response(
            [
                {
                    "id":
                        user.id,

                    "username":
                        user.username,

                    "full_name":
                        get_user_display_name(
                            user
                        ),

                    "role":
                        user.profile.role,

                    "role_display":
                        user.profile
                        .get_role_display(),
                }
                for user
                in users
            ]
        )
