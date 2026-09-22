from django.db import migrations


def normalize_legacy_lead_statuses(apps, schema_editor):
    """Move current Lead rows onto the modern lifecycle.

    LeadHistory is intentionally not changed: historical events remain an
    accurate record of the workflow that existed when they were written.
    """
    Lead = apps.get_model("crm", "Lead")

    Lead.objects.filter(status="QUALIFIED").update(status="PROPOSAL")
    Lead.objects.filter(status="SUBMITTED_FOR_QUALIFICATION").update(
        status="CONTACTED"
    )


class Migration(migrations.Migration):
    dependencies = [("crm", "0015_commercial_review_workflow")]

    operations = [
        # A reverse migration cannot distinguish modern CONTACTED/PROPOSAL
        # rows from rows normalized here, so guessing their former value
        # would corrupt valid data. Reversal is intentionally a no-op.
        migrations.RunPython(
            normalize_legacy_lead_statuses,
            migrations.RunPython.noop,
        ),
    ]
