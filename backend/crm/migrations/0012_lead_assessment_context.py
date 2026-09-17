from django.db import migrations, models


def normalize_lead_sources(apps, schema_editor):
    Lead = apps.get_model("crm", "Lead")
    source_map = {
        "website": "WEBSITE",
        "social media": "SOCIAL_MEDIA",
        "social_media": "SOCIAL_MEDIA",
        "referral": "REFERRAL",
        "direct": "DIRECT",
        "other": "OTHER",
    }

    for lead in Lead.objects.exclude(source="").iterator():
        original_source = lead.source.strip()
        normalized = source_map.get(original_source.lower(), "OTHER")
        if lead.source != normalized:
            lead.source = normalized
            if normalized == "OTHER" and original_source.lower() != "other":
                lead.source_details = original_source
            lead.save(update_fields=["source", "source_details"])


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0011_merge_20260830_1832"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="source_details",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="lead",
            name="project_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="lead",
            name="project_nature",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="lead",
            name="project_scope",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="budget_min",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="budget_max",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="budget_currency",
            field=models.CharField(blank=True, max_length=3),
        ),
        migrations.AddField(
            model_name="lead",
            name="expected_timeline",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.RunPython(normalize_lead_sources, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="lead",
            name="source",
            field=models.CharField(
                blank=True,
                choices=[
                    ("WEBSITE", "Website"),
                    ("SOCIAL_MEDIA", "Social media"),
                    ("REFERRAL", "Referral"),
                    ("DIRECT", "Direct"),
                    ("OTHER", "Other"),
                ],
                max_length=20,
            ),
        ),
    ]
