from django.db import migrations, models
import django.db.models.deletion


def migrate_decision_values(apps, schema_editor):
    Decision = apps.get_model("crm", "LeadOpportunityDecision")
    Decision.objects.filter(decision="APPROVED").update(decision="PROCEED")
    Decision.objects.filter(decision="REJECTED").update(decision="DO_NOT_PROCEED")


def reverse_decision_values(apps, schema_editor):
    Decision = apps.get_model("crm", "LeadOpportunityDecision")
    Decision.objects.filter(decision="PROCEED").update(decision="APPROVED")
    Decision.objects.filter(decision="DO_NOT_PROCEED").update(decision="REJECTED")


class Migration(migrations.Migration):
    dependencies = [("crm", "0013_financial_assessment_first")]

    operations = [
        migrations.AlterField(
            model_name="leadopportunitydecision",
            name="technical_assessment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="opportunity_decisions",
                to="crm.technicalassessment",
            ),
        ),
        migrations.RunPython(migrate_decision_values, reverse_decision_values),
        migrations.AlterField(
            model_name="leadopportunitydecision",
            name="decision",
            field=models.CharField(
                choices=[
                    ("PROCEED", "Proceed"),
                    ("DO_NOT_PROCEED", "Do Not Proceed"),
                ],
                max_length=20,
            ),
        ),
    ]
