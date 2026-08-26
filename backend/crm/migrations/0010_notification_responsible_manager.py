from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0009_lead_qualification_handover"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="responsible_manager",
            field=models.ForeignKey(
                blank=True, null=True,
                limit_choices_to={"profile__role": "SALES_MANAGER"},
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="managed_leads",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.CreateModel(
            name="Notification",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("ASSIGNMENT", "Assignment"), ("SUBMISSION", "Submission"), ("REVIEW", "Review"), ("RETURNED", "Returned")], max_length=20)),
                ("title", models.CharField(max_length=255)),
                ("message", models.TextField(blank=True)),
                ("target_url", models.CharField(max_length=500)),
                ("read_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("actor", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="sent_crm_notifications", to=settings.AUTH_USER_MODEL)),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="crm_notifications", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.AddIndex(
            model_name="notification",
            index=models.Index(fields=["recipient", "read_at", "created_at"], name="crm_notific_recipie_d47182_idx"),
        ),
    ]
