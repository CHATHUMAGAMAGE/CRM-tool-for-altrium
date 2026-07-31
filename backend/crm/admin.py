from django.contrib import admin

from .models import Communication, Customer, FollowUp, Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "contact_name",
        "status",
        "assigned_to",
        "created_by",
        "created_at",
    )

    list_filter = (
        "status",
        "created_at",
    )

    search_fields = (
        "company_name",
        "contact_name",
        "email",
        "phone",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
        "converted_at",
    )


@admin.register(Communication)
class CommunicationAdmin(admin.ModelAdmin):
    list_display = (
        "lead",
        "communication_type",
        "communication_date",
        "created_by",
        "created_at",
    )

    list_filter = (
        "communication_type",
        "communication_date",
    )

    search_fields = (
        "lead__company_name",
        "lead__contact_name",
        "summary",
    )

    readonly_fields = (
        "created_at",
    )


@admin.register(FollowUp)
class FollowUpAdmin(admin.ModelAdmin):
    list_display = (
        "title",
        "lead",
        "due_date",
        "status",
        "assigned_to",
        "created_by",
    )

    list_filter = (
        "status",
        "due_date",
    )

    search_fields = (
        "title",
        "lead__company_name",
        "lead__contact_name",
    )

    readonly_fields = (
        "created_at",
        "completed_at",
    )


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = (
        "company_name",
        "contact_name",
        "source_lead",
        "assigned_to",
        "created_at",
    )

    search_fields = (
        "company_name",
        "contact_name",
        "email",
        "phone",
    )

    readonly_fields = (
        "created_at",
        "updated_at",
    )