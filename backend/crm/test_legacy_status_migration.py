from importlib import import_module
from unittest.mock import call, Mock

from django.test import SimpleTestCase


class LegacyLeadStatusMigrationTests(SimpleTestCase):
    def test_only_legacy_current_statuses_are_normalized(self):
        migration = import_module(
            "crm.migrations.0016_normalize_legacy_lead_statuses"
        )
        lead_model = Mock()
        apps = Mock()
        apps.get_model.return_value = lead_model

        migration.normalize_legacy_lead_statuses(apps, None)

        apps.get_model.assert_called_once_with("crm", "Lead")
        self.assertEqual(
            lead_model.objects.filter.call_args_list,
            [
                call(status="QUALIFIED"),
                call(status="SUBMITTED_FOR_QUALIFICATION"),
            ],
        )
        lead_model.objects.filter.return_value.update.assert_has_calls(
            [call(status="PROPOSAL"), call(status="CONTACTED")]
        )

    def test_reverse_migration_is_intentionally_noop(self):
        migration = import_module(
            "crm.migrations.0016_normalize_legacy_lead_statuses"
        )
        operation = migration.Migration.operations[0]

        self.assertIs(operation.reverse_code, migration.migrations.RunPython.noop)
