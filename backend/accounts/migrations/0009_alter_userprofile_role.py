from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("accounts", "0008_store_avatar_in_database")]

    operations = [
        migrations.AlterField(
            model_name="userprofile",
            name="role",
            field=models.CharField(
                choices=[
                    ("ADMIN", "Administrator"),
                    ("MARKETING", "Marketing Employee"),
                    ("SALES_REP", "Sales Representative"),
                    ("SALES_MANAGER", "Sales Manager"),
                    ("TECH_LEAD", "Tech Lead"),
                    ("FINANCIAL_OFFICER", "Financial Officer"),
                    ("PROJECT_MANAGER", "Project Manager"),
                    ("SOFTWARE_ENGINEER", "Software Engineer"),
                    ("DIRECTOR", "Director"),
                    ("EXECUTIVE", "Executive"),
                ],
                default="SALES_REP",
                max_length=30,
            ),
        ),
    ]
