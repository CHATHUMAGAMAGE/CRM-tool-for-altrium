from django.db import models

# Create your models here.
from django.contrib.auth.models import User
from django.db import models


class UserProfile(models.Model):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrator"
        MARKETING = "MARKETING", "Marketing Employee"
        PROJECT_MANAGER = "PROJECT_MANAGER", "Project Manager"
        SALES_REP = "SALES_REP", "Sales Representative"
        DIRECTOR = "DIRECTOR", "Director"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile",
    )

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.SALES_REP,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()}"