from django.contrib.auth.models import AnonymousUser, User
from rest_framework.test import APIRequestFactory, APITestCase

from .models import UserProfile
from .permissions import IsAdminRole


class IsAdminRolePermissionTests(APITestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.permission = IsAdminRole()

        self.admin = User.objects.create_user(
            username="permission_admin",
            password="TestPassword@2026",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save()

        self.sales_rep = User.objects.create_user(
            username="permission_sales_rep",
            password="TestPassword@2026",
        )

    def make_request(self, user):
        request = self.factory.get("/api/v1/admin/")
        request.user = user
        return request

    def test_admin_role_is_allowed(self):
        request = self.make_request(self.admin)

        self.assertTrue(
            self.permission.has_permission(request, None)
        )

    def test_non_admin_role_is_denied(self):
        request = self.make_request(self.sales_rep)

        self.assertFalse(
            self.permission.has_permission(request, None)
        )

    def test_anonymous_user_is_denied(self):
        request = self.make_request(AnonymousUser())

        self.assertFalse(
            self.permission.has_permission(request, None)
        )

    def test_user_without_profile_is_denied(self):
        self.sales_rep.profile.delete()
        request = self.make_request(self.sales_rep)

        self.assertFalse(
            self.permission.has_permission(request, None)
        )
