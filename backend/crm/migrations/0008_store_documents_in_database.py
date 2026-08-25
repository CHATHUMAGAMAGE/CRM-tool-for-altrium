import mimetypes

from django.db import migrations, models


def copy_document(model, document):
    stored_file = document.file
    content = b""

    if stored_file:
        try:
            stored_file.open("rb")
            content = stored_file.read()
        except (FileNotFoundError, OSError):
            pass
        finally:
            try:
                stored_file.close()
            except Exception:
                pass

    document.file_data = content
    document.file_name = (
        stored_file.name.rsplit("/", 1)[-1]
        if stored_file
        else "document"
    )
    document.content_type = (
        mimetypes.guess_type(document.file_name)[0]
        or "application/octet-stream"
    )
    document.file_size = len(content)
    document.save(
        update_fields=[
            "file_data",
            "file_name",
            "content_type",
            "file_size",
        ]
    )


def copy_documents_to_database(apps, schema_editor):
    for model_name in (
        "TechnicalAssessmentDocument",
        "FinancialAssessmentDocument",
    ):
        model = apps.get_model("crm", model_name)

        for document in model.objects.all().iterator():
            copy_document(model, document)


class Migration(migrations.Migration):
    dependencies = [("crm", "0007_leadopportunitydecision_deal")]

    operations = []

    for model_name in (
        "technicalassessmentdocument",
        "financialassessmentdocument",
    ):
        operations.extend([
            migrations.AddField(
                model_name=model_name,
                name="file_data",
                field=models.BinaryField(blank=True, null=True),
            ),
            migrations.AddField(
                model_name=model_name,
                name="file_name",
                field=models.CharField(default="document", max_length=255),
                preserve_default=False,
            ),
            migrations.AddField(
                model_name=model_name,
                name="content_type",
                field=models.CharField(
                    default="application/octet-stream",
                    max_length=100,
                ),
            ),
            migrations.AddField(
                model_name=model_name,
                name="file_size",
                field=models.PositiveBigIntegerField(default=0),
            ),
        ])

    operations.append(
        migrations.RunPython(
            copy_documents_to_database,
            migrations.RunPython.noop,
        )
    )

    for model_name in (
        "technicalassessmentdocument",
        "financialassessmentdocument",
    ):
        operations.extend([
            migrations.RemoveField(
                model_name=model_name,
                name="file",
            ),
            migrations.AlterField(
                model_name=model_name,
                name="file_data",
                field=models.BinaryField(),
            ),
        ])
