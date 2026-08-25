from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "accounts",
            "0006_userprofile_mfa_challenge_nonce_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="avatar",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="profile_avatars/%Y/%m/",
            ),
        ),
    ]
