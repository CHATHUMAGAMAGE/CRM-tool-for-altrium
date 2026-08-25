import mimetypes

from django.db import migrations, models


def copy_avatars_to_database(apps, schema_editor):
    profile_model = apps.get_model("accounts", "UserProfile")

    for profile in profile_model.objects.exclude(avatar="").iterator():
        avatar = profile.avatar

        if not avatar:
            continue

        try:
            avatar.open("rb")
            content = avatar.read()
        except (FileNotFoundError, OSError):
            continue
        finally:
            try:
                avatar.close()
            except Exception:
                pass

        profile.avatar_data = content
        profile.avatar_name = avatar.name.rsplit("/", 1)[-1]
        profile.avatar_content_type = (
            mimetypes.guess_type(avatar.name)[0]
            or "application/octet-stream"
        )
        profile.avatar_size = len(content)
        profile.save(
            update_fields=[
                "avatar_data",
                "avatar_name",
                "avatar_content_type",
                "avatar_size",
            ]
        )


class Migration(migrations.Migration):
    dependencies = [("accounts", "0007_userprofile_avatar")]

    operations = [
        migrations.AddField(
            model_name="userprofile",
            name="avatar_data",
            field=models.BinaryField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="avatar_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="avatar_content_type",
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name="userprofile",
            name="avatar_size",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunPython(
            copy_avatars_to_database,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="userprofile",
            name="avatar",
        ),
    ]
