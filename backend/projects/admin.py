from django.contrib import admin

from .models import Project, Estimate, EstimatePosition


class EstimateInline(admin.TabularInline):
    model = Estimate
    extra = 0
    readonly_fields = ["status", "upload_date"]
    fields = ["name", "status", "original_filename", "upload_date"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "created_at"]
    search_fields = ["name"]
    inlines = [EstimateInline]


class EstimatePositionInline(admin.TabularInline):
    model = EstimatePosition
    extra = 0
    readonly_fields = [
        "row_number", "original_name", "original_article",
        "quantity", "matched_product", "confidence", "match_type",
    ]


@admin.register(Estimate)
class EstimateAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "name", "status", "upload_date"]
    list_filter = ["status", "project"]
    inlines = [EstimatePositionInline]


@admin.register(EstimatePosition)
class EstimatePositionAdmin(admin.ModelAdmin):
    list_display = [
        "row_number", "original_name", "original_article",
        "matched_product", "confidence", "match_type",
    ]
    list_filter = ["match_type", "estimate__project"]
    search_fields = ["original_name", "original_article"]
