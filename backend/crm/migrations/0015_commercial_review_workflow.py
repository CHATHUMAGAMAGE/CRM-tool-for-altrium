from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("crm", "0014_evidence_based_final_decision"), migrations.swappable_dependency(settings.AUTH_USER_MODEL)]

    operations = [
        migrations.AlterField(
            model_name="financialassessment",
            name="outcome",
            field=models.CharField(blank=True, choices=[("FINANCIALLY_SUITABLE", "Financially Viable"), ("FINANCIALLY_UNSUITABLE", "Not Financially Viable")], max_length=30),
        ),
        migrations.AddField(
            model_name="financialassessment", name="estimated_delivery_cost",
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True),
        ),
        migrations.CreateModel(
            name="CommercialReview",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("REQUIRED", "Commercial Review Required"), ("REVISED", "Commercial Terms Revised"), ("REASSESSMENT_REQUESTED", "Reassessment Requested"), ("RESOLVED", "Resolved"), ("CLOSED", "Closed")], default="REQUIRED", max_length=30)),
                ("reason", models.TextField(blank=True)), ("revised_scope", models.TextField(blank=True)),
                ("revised_budget_min", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("revised_budget_max", models.DecimalField(blank=True, decimal_places=2, max_digits=14, null=True)),
                ("currency", models.CharField(blank=True, max_length=3)), ("revised_timeline", models.CharField(blank=True, max_length=255)),
                ("notes", models.TextField(blank=True)), ("created_at", models.DateTimeField(auto_now_add=True)), ("updated_at", models.DateTimeField(auto_now=True)),
                ("created_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="created_commercial_reviews", to=settings.AUTH_USER_MODEL)),
                ("financial_assessment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="commercial_reviews", to="crm.financialassessment")),
                ("lead", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="commercial_reviews", to="crm.lead")),
            ], options={"ordering": ["-created_at", "-id"]},
        ),
        migrations.CreateModel(
            name="CommercialExceptionRequest",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("justification", models.TextField()), ("supporting_notes", models.TextField(blank=True)),
                ("status", models.CharField(choices=[("PENDING", "Pending"), ("APPROVED", "Approved"), ("REJECTED", "Rejected")], default="PENDING", max_length=20)),
                ("reviewer_comments", models.TextField(blank=True)), ("requested_at", models.DateTimeField(auto_now_add=True)), ("reviewed_at", models.DateTimeField(blank=True, null=True)),
                ("financial_assessment", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="commercial_exceptions", to="crm.financialassessment")),
                ("lead", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="commercial_exceptions", to="crm.lead")),
                ("requested_by", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="requested_commercial_exceptions", to=settings.AUTH_USER_MODEL)),
                ("reviewed_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="reviewed_commercial_exceptions", to=settings.AUTH_USER_MODEL)),
            ], options={"ordering": ["-requested_at", "-id"]},
        ),
    ]
