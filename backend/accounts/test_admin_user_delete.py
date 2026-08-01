from unittest.mock import patch

from django.contrib.auth.models import User
from django.db.models.deletion import ProtectedError
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import UserProfile


class AdminUserDeleteViewTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username="delete_admin",
            email="delete-admin@example.com",
            password="StrongPassword123!",
        )
        self.admin.profile.role = UserProfile.Role.ADMIN
        self.admin.profile.save(update_fields=["role"])

        self.target_user = User.objects.create_user(
            username="delete_target",
            email="delete-target@example.com",
            password="StrongPassword123!",
        )
        self.target_user.profile.role = (
            UserProfile.Role.SALES_REP
        )
        self.target_user.profile.save(update_fields=["role"])

        self.delete_url = reverse(
            "admin-user-delete",
            kwargs={"pk": self.target_user.pk},
        )

        self.client.force_authenticate(user=self.admin)

    def test_admin_can_delete_user(self):
        response = self.client.delete(self.delete_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
        )
        self.assertEqual(
            response.data["detail"],
            'User "delete_target" was deleted successfully.',
        )
        self.assertFalse(
            User.objects.filter(
                pk=self.target_user.pk,
            ).exists()
        )

    def test_admin_cannot_delete_own_account(self):
        own_delete_url = reverse(
            "admin-user-delete",
            kwargs={"pk": self.admin.pk},
        )

        response = self.client.delete(own_delete_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["detail"],
            "You cannot delete your own account.",
        )
        self.assertTrue(
            User.objects.filter(
                pk=self.admin.pk,
            ).exists()
        )

    def test_non_admin_cannot_delete_user(self):
        sales_user = User.objects.create_user(
            username="sales_employee",
            email="sales@example.com",
            password="StrongPassword123!",
        )
        sales_user.profile.role = UserProfile.Role.SALES_REP
        sales_user.profile.save(update_fields=["role"])

        self.client.force_authenticate(user=sales_user)

        response = self.client.delete(self.delete_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_403_FORBIDDEN,
        )
        self.assertTrue(
            User.objects.filter(
                pk=self.target_user.pk,
            ).exists()
        )

    def test_unauthenticated_user_cannot_delete_user(self):
        self.client.force_authenticate(user=None)

        response = self.client.delete(self.delete_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertTrue(
            User.objects.filter(
                pk=self.target_user.pk,
            ).exists()
        )

    def test_missing_user_returns_not_found(self):
        missing_user_url = reverse(
            "admin-user-delete",
            kwargs={"pk": 999999},
        )

        response = self.client.delete(missing_user_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_404_NOT_FOUND,
        )

    def test_final_active_administrator_cannot_be_deleted(self):
        self.admin.is_active = False
        self.admin.save(update_fields=["is_active"])

        final_admin = User.objects.create_user(
            username="final_admin",
            email="final-admin@example.com",
            password="StrongPassword123!",
        )
        final_admin.profile.role = UserProfile.Role.ADMIN
        final_admin.profile.save(update_fields=["role"])

        final_admin_url = reverse(
            "admin-user-delete",
            kwargs={"pk": final_admin.pk},
        )

        response = self.client.delete(final_admin_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            response.data["detail"],
            "The final active administrator cannot be deleted.",
        )
        self.assertTrue(
            User.objects.filter(
                pk=final_admin.pk,
            ).exists()
        )

    def test_user_with_protected_records_cannot_be_deleted(self):
        protected_error = ProtectedError(
            "The user is referenced by protected records.",
            [],
        )

        with patch.object(
            User,
            "delete",
            side_effect=protected_error,
        ):
            response = self.client.delete(self.delete_url)

        self.assertEqual(
            response.status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertEqual(
            response.data["detail"],
            (
                "This user cannot be deleted because "
                "they are connected to existing CRM records. "
                "Deactivate the account instead."
            ),
        )
        self.assertTrue(
            User.objects.filter(
                pk=self.target_user.pk,
            ).exists()
        )