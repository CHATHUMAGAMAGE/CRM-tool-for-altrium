# pyrefly: ignore [missing-import]
from rest_framework.decorators import api_view, permission_classes
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from django.db import connection


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Public Health Check API Endpoint.
    Returns the status of the system and database connectivity.
    No authentication required.
    """
    db_status = "connected"
    is_healthy = True

    try:
        connection.ensure_connection()
    except Exception as e:
        db_status = f"disconnected ({str(e)})"
        is_healthy = False

    http_status = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

    return Response(
        {
            "status": "healthy" if is_healthy else "unhealthy",
            "database": db_status,
        },
        status=http_status,
    )
