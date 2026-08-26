from django.utils import timezone
from rest_framework import generics, serializers, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id", "kind", "title", "message", "target_url",
            "actor", "actor_name", "read_at", "created_at",
        ]
        read_only_fields = fields

    def get_actor_name(self, obj):
        if obj.actor is None:
            return None
        return obj.actor.get_full_name().strip() or obj.actor.username


class NotificationListView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            recipient=self.request.user,
        ).select_related("actor")[:100]


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notification = Notification.objects.filter(
            pk=pk,
            recipient=request.user,
        ).first()
        if notification is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if notification.read_at is None:
            notification.read_at = timezone.now()
            notification.save(update_fields=["read_at"])
        return Response(NotificationSerializer(notification).data)


class NotificationReadAllView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user,
            read_at__isnull=True,
        ).update(read_at=timezone.now())
        return Response(status=status.HTTP_204_NO_CONTENT)
