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

from .assessment_permissions import (
    TechnicalAssessmentPermission,
)

from .models import (
    Lead,
    TechnicalAssessment,
    TechnicalAssessmentDocument,
    TechnicalAssessmentHistory,
    Notification,
    TechnicalAssessmentRecommendation,
)
from .notifications import create_notification

from .serializers import (
    TechnicalAssessmentCreateSerializer,
    TechnicalAssessmentDocumentSerializer,
    TechnicalAssessmentHistorySerializer,
    TechnicalAssessmentRecommendationSerializer,
    TechnicalAssessmentRequestUpdateSerializer,
    TechnicalAssessmentReviewSerializer,
    TechnicalAssessmentSerializer,
    TechnicalAssessmentWorkSerializer,
)


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


class TechnicalAssessmentAccessMixin:
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
            TechnicalAssessment.objects
            .select_related(
                "lead",
                "lead__assigned_to",
                "requested_by",
                "requested_by__profile",
                "assigned_to",
                "assigned_to__profile",
                "reviewed_by",
                "reviewed_by__profile",
            )
            .prefetch_related(
                "recommendations",
                "recommendations__engineer",
                "recommendations__engineer__profile",
                "recommendations__recommended_by",
                Prefetch(
                    "documents",
                    queryset=(
                        TechnicalAssessmentDocument.objects
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
            == UserProfile.Role.TECH_LEAD
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


class TechnicalAssessmentQuerysetMixin(
    TechnicalAssessmentAccessMixin,
):
    def get_queryset(
        self,
    ):
        return (
            self.get_assessment_queryset()
        )


class TechnicalAssessmentListCreateView(
    TechnicalAssessmentQuerysetMixin,
    generics.ListCreateAPIView,
):
    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
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
                TechnicalAssessmentCreateSerializer
            )

        return (
            TechnicalAssessmentSerializer
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

        if (
            lead.status
            != Lead.Status.QUALIFIED
        ):
            raise ValidationError(
                {
                    "lead": (
                        "The lead must be qualified "
                        "before a technical assessment "
                        "can be requested."
                    )
                }
            )

        serializer.save()


class TechnicalAssessmentDetailView(
    TechnicalAssessmentQuerysetMixin,
    generics.RetrieveAPIView,
):
    serializer_class = (
        TechnicalAssessmentSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]


class TechnicalAssessmentRequestUpdateView(
    TechnicalAssessmentQuerysetMixin,
    generics.UpdateAPIView,
):
    serializer_class = (
        TechnicalAssessmentRequestUpdateSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
        "request_update"
    )

    http_method_names = [
        "patch",
        "head",
        "options",
    ]


class TechnicalAssessmentStartView(
    TechnicalAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
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
            != TechnicalAssessment
            .Status
            .REQUESTED
        ):
            raise ValidationError(
                {
                    "status": (
                        "Only a requested technical "
                        "assessment can be started."
                    )
                }
            )

        assessment.status = (
            TechnicalAssessment
            .Status
            .IN_PROGRESS
        )

        assessment.save(
            update_fields=[
                "status",
                "updated_at",
            ]
        )

        TechnicalAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .STARTED
            ),
            description=(
                "Technical assessment started."
            ),
            performed_by=request.user,
        )

        return Response(
            TechnicalAssessmentSerializer(
                assessment,
                context={
                    "request":
                        request,
                },
            ).data
        )


class TechnicalAssessmentWorkView(
    TechnicalAssessmentQuerysetMixin,
    generics.UpdateAPIView,
):
    serializer_class = (
        TechnicalAssessmentWorkSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
        "work"
    )

    http_method_names = [
        "patch",
        "head",
        "options",
    ]


class TechnicalAssessmentSubmitView(
    TechnicalAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
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
            != TechnicalAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "status": (
                        "Only an in-progress technical "
                        "assessment can be submitted."
                    )
                }
            )

        if not (
            assessment.technical_comments
            or ""
        ).strip():
            raise ValidationError(
                {
                    "technical_comments": (
                        "Technical comments are "
                        "required before submitting "
                        "the assessment."
                    )
                }
            )

        assessment.status = (
            TechnicalAssessment
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

        TechnicalAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .SUBMITTED
            ),
            description=(
                "Technical assessment submitted "
                "for Sales Manager review."
            ),
            performed_by=request.user,
        )

        create_notification(
            recipient=(assessment.lead.responsible_manager or assessment.requested_by),
            actor=request.user,
            kind=Notification.Kind.SUBMISSION,
            title="Technical assessment submitted",
            message=f"The technical assessment for {assessment.lead.company_name} is ready for review.",
            target_url=f"/technical-assessments/{assessment.id}",
        )

        return Response(
            TechnicalAssessmentSerializer(
                assessment,
                context={
                    "request":
                        request,
                },
            ).data
        )


class TechnicalAssessmentReviewView(
    TechnicalAssessmentQuerysetMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
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
            TechnicalAssessmentReviewSerializer(
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
                TechnicalAssessment
                .Status
                .REVIEWED
            ),
            reviewed_at=(
                timezone.now()
            ),
            reviewed_by=request.user,
        )

        TechnicalAssessmentHistory.objects.create(
            assessment=reviewed,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .REVIEWED
            ),
            description=(
                "Technical assessment reviewed "
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
            title="Technical assessment reviewed",
            message=reviewed.review_notes,
            target_url=f"/technical-assessments/{reviewed.id}",
        )

        return Response(
            TechnicalAssessmentSerializer(
                reviewed,
                context={
                    "request":
                        request,
                },
            ).data
        )


class TechnicalAssessmentHistoryListView(
    TechnicalAssessmentAccessMixin,
    generics.ListAPIView,
):
    serializer_class = (
        TechnicalAssessmentHistorySerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
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
            TechnicalAssessmentHistory
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


class TechnicalAssessmentRecommendationListCreateView(
    TechnicalAssessmentAccessMixin,
    generics.ListCreateAPIView,
):
    serializer_class = (
        TechnicalAssessmentRecommendationSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
        "recommendation"
    )

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
            TechnicalAssessmentRecommendation
            .objects
            .filter(
                assessment=assessment,
            )
            .select_related(
                "engineer",
                "engineer__profile",
                "recommended_by",
                "recommended_by__profile",
            )
            .order_by(
                "created_at",
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
            != TechnicalAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "assessment": (
                        "Recommendations can only "
                        "be added while the technical "
                        "assessment is in progress."
                    )
                }
            )

        serializer.save(
            assessment=assessment,
            recommended_by=
                self.request.user,
        )


class TechnicalAssessmentRecommendationDetailView(
    TechnicalAssessmentAccessMixin,
    generics.DestroyAPIView,
):
    serializer_class = (
        TechnicalAssessmentRecommendationSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
        "recommendation_delete"
    )

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
            TechnicalAssessmentRecommendation
            .objects
            .filter(
                assessment=assessment,
            )
            .select_related(
                "engineer",
                "engineer__profile",
                "recommended_by",
            )
        )

    @transaction.atomic
    def perform_destroy(
        self,
        instance,
    ):
        assessment = (
            self.get_assessment_instance()
        )

        if (
            assessment.status
            != TechnicalAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "assessment": (
                        "Recommendations can only "
                        "be removed while the technical "
                        "assessment is in progress."
                    )
                }
            )

        engineer_id = (
            instance.engineer_id
        )

        engineer_name = (
            get_user_display_name(
                instance.engineer,
            )
        )

        TechnicalAssessmentHistory.objects.create(
            assessment=assessment,
            event_type=(
                TechnicalAssessmentHistory
                .EventType
                .RECOMMENDATION_REMOVED
            ),
            description=(
                "Software Engineer recommendation "
                f"removed: {engineer_name}."
            ),
            performed_by=
                self.request.user,
            metadata={
                "engineer_id":
                    engineer_id,

                "engineer_name":
                    engineer_name,
            },
        )

        instance.delete()


class TechnicalAssessmentDocumentListCreateView(
    TechnicalAssessmentAccessMixin,
    generics.ListCreateAPIView,
):
    serializer_class = (
        TechnicalAssessmentDocumentSerializer
    )

    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]

    technical_assessment_action = (
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
            TechnicalAssessmentDocument
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
            != TechnicalAssessment
            .Status
            .IN_PROGRESS
        ):
            raise ValidationError(
                {
                    "assessment": (
                        "Documents can only be added "
                        "while the technical assessment "
                        "is in progress."
                    )
                }
            )

        serializer.save(
            assessment=assessment,
            uploaded_by=
                self.request.user,
        )


class TechnicalAssessmentDocumentDownloadView(
    TechnicalAssessmentAccessMixin,
    generics.GenericAPIView,
):
    permission_classes = [
        IsAuthenticated,
        TechnicalAssessmentPermission,
    ]
    technical_assessment_action = "document"

    def get(self, request, assessment_id, pk):
        assessment = self.get_assessment("assessment_id")
        document = get_object_or_404(
            TechnicalAssessmentDocument,
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


class TechLeadLookupView(
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
                "Administrators can view Tech Leads."
            )

        users = (
            User.objects
            .filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .TECH_LEAD
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


class SoftwareEngineerLookupView(
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
                UserProfile.Role.TECH_LEAD,
            }
        ):
            raise PermissionDenied(
                "Only Tech Leads or "
                "Administrators can view "
                "Software Engineers."
            )

        users = (
            User.objects
            .filter(
                is_active=True,
                profile__role=(
                    UserProfile
                    .Role
                    .SOFTWARE_ENGINEER
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
