from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("crm", "0009_lead_qualification_handover"),
    ]

    operations = [
        migrations.AddField(
            model_name="lead",
            name="requirement",
            field=models.TextField(blank=True),
        ),
    ]
