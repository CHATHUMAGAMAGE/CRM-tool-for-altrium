from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0008_store_documents_in_database"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="handover_note",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="review_feedback",
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="submitted_for_qualification_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="lead",
            name="submitted_for_qualification_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="submitted_leads_for_qualification",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="lead",
            name="status",
            field=models.CharField(
                choices=[
                    ("NEW", "New"),
                    ("CONTACTED", "Contacted"),
                    ("SUBMITTED_FOR_QUALIFICATION", "Submitted for Qualification"),
                    ("QUALIFIED", "Qualified"),
                    ("PROPOSAL", "Proposal"),
                    ("WON", "Won"),
                    ("LOST", "Lost"),
                    ("DISQUALIFIED", "Disqualified"),
                ],
                default="NEW",
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="leadhistory",
            name="event_type",
            field=models.CharField(
                choices=[
                    ("CREATED", "Created"), ("UPDATED", "Updated"),
                    ("ASSIGNED", "Assigned"), ("UNASSIGNED", "Unassigned"),
                    ("STATUS_CHANGED", "Status Changed"),
                    ("QUALIFIED", "Qualified"), ("DISQUALIFIED", "Disqualified"),
                    ("SUBMITTED_FOR_QUALIFICATION", "Submitted for Qualification"),
                    ("RETURNED_FOR_MORE_INFORMATION", "Returned for More Information"),
                    ("WON", "Won"), ("LOST", "Lost"),
                ],
                max_length=30,
            ),
        ),
    ]
