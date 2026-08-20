from django.db import migrations, models


LEGACY_TO_APPROVED_STATUS = {
    "FOLLOW_UP_REQUIRED": "CONTACTED",
    "PROPOSAL_SENT": "PROPOSAL",
    "NEGOTIATION": "PROPOSAL",
    "CONVERTED": "WON",
}

APPROVED_STATUSES = {
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "PROPOSAL",
    "WON",
    "LOST",
    "DISQUALIFIED",
}


def migrate_lead_statuses(apps, schema_editor):
    Lead = apps.get_model("crm", "Lead")

    database_alias = schema_editor.connection.alias
    leads = Lead.objects.using(database_alias)

    for old_status, new_status in LEGACY_TO_APPROVED_STATUS.items():
        leads.filter(
            status=old_status,
        ).update(
            status=new_status,
        )

    unexpected_statuses = list(
        leads.exclude(
            status__in=APPROVED_STATUSES,
        )
        .values_list(
            "status",
            flat=True,
        )
        .distinct()
    )

    if unexpected_statuses:
        raise RuntimeError(
            "Unexpected lead statuses remain after migration: "
            + ", ".join(unexpected_statuses)
        )


class Migration(migrations.Migration):

    dependencies = [
        (
            "crm",
            "0002_followup_completed_by_followup_updated_at",
        ),
    ]

    operations = [
        migrations.RunPython(
            migrate_lead_statuses,
        ),

        migrations.AlterField(
            model_name="lead",
            name="status",
            field=models.CharField(
                choices=[
                    ("NEW", "New"),
                    ("CONTACTED", "Contacted"),
                    ("QUALIFIED", "Qualified"),
                    ("PROPOSAL", "Proposal"),
                    ("WON", "Won"),
                    ("LOST", "Lost"),
                    (
                        "DISQUALIFIED",
                        "Disqualified",
                    ),
                ],
                default="NEW",
                max_length=30,
            ),
        ),
    ]