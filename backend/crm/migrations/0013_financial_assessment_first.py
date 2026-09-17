from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0012_lead_assessment_context"),
    ]

    operations = [
        migrations.AddField(
            model_name="financialassessment",
            name="outcome",
            field=models.CharField(
                blank=True,
                choices=[
                    ("FINANCIALLY_SUITABLE", "Financially suitable"),
                    ("FINANCIALLY_UNSUITABLE", "Financially unsuitable"),
                ],
                max_length=30,
            ),
        ),
        migrations.AlterField(
            model_name="financialassessment",
            name="technical_assessment",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name="financial_assessments",
                to="crm.technicalassessment",
            ),
        ),
    ]
