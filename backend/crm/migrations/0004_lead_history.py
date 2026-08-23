from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


def backfill_existing_leads(apps, schema_editor):
    Lead = apps.get_model(
        "crm",
        "Lead",
    )

    LeadHistory = apps.get_model(
        "crm",
        "LeadHistory",
    )

    for lead in Lead.objects.all().iterator():
        LeadHistory.objects.create(
            lead_id=lead.id,
            event_type="CREATED",
            description=(
                "Lead existed before history tracking was enabled."
            ),
            performed_by_id=lead.created_by_id,
            metadata={
                "status": lead.status,
                "backfilled": True,
            },
            created_at=lead.created_at,
        )


def reverse_backfill(apps, schema_editor):
    LeadHistory = apps.get_model(
        "crm",
        "LeadHistory",
    )

    LeadHistory.objects.filter(
        metadata__backfilled=True,
    ).delete()


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(
            settings.AUTH_USER_MODEL
        ),
        (
            "crm",
            "0003_align_lead_lifecycle",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="LeadHistory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "event_type",
                    models.CharField(
                        choices=[
                            (
                                "CREATED",
                                "Created",
                            ),
                            (
                                "UPDATED",
                                "Updated",
                            ),
                            (
                                "ASSIGNED",
                                "Assigned",
                            ),
                            (
                                "UNASSIGNED",
                                "Unassigned",
                            ),
                            (
                                "STATUS_CHANGED",
                                "Status Changed",
                            ),
                            (
                                "QUALIFIED",
                                "Qualified",
                            ),
                            (
                                "DISQUALIFIED",
                                "Disqualified",
                            ),
                            (
                                "WON",
                                "Won",
                            ),
                            (
                                "LOST",
                                "Lost",
                            ),
                        ],
                        max_length=30,
                    ),
                ),
                (
                    "description",
                    models.TextField(),
                ),
                (
                    "metadata",
                    models.JSONField(
                        blank=True,
                        default=dict,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(
                        default=django.utils.timezone.now,
                        editable=False,
                    ),
                ),
                (
                    "lead",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="history",
                        to="crm.lead",
                    ),
                ),
                (
                    "performed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="lead_history_events",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": [
                    "-created_at",
                    "-id",
                ],
            },
        ),

        migrations.RunPython(
            backfill_existing_leads,
            reverse_backfill,
        ),
    ]