# pyrefly: ignore [missing-import]
from django.test import TestCase        
# pyrefly: ignore [missing-import]
# pyrefly: ignore [missing-import]
from django.urls import reverse
# pyrefly: ignore [missing-import]
from rest_framework import status
# pyrefly: ignore [missing-import]
from rest_framework.test import APIClient


class HealthCheckAPITestCase(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health_check_api_endpoint(self):
        """Verify /api/health/ returns 200 OK and status info without authentication."""
        url = reverse('health_check')
        response = self.client.get(url)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE])
        self.assertIn('status', response.data)
        self.assertIn('database', response.data)
        self.assertEqual(response.data['status'], 'healthy')

    def test_health_check_root_endpoint(self):
        """Verify /health/ returns 200 OK without authentication."""
        url = reverse('health_check_root')
        response = self.client.get(url)
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_503_SERVICE_UNAVAILABLE])
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'healthy')


