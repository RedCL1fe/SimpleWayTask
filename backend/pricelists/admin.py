from django.contrib import admin

from .models import PriceList, PriceListPosition


class PriceListPositionInline(admin.TabularInline):
    model = PriceListPosition
    extra = 0
    readonly_fields = ["row_number", "article", "name", "price", "unit"]


@admin.register(PriceList)
class PriceListAdmin(admin.ModelAdmin):
    list_display = ["id", "supplier", "status", "total_rows", "upload_date"]
    list_filter = ["status", "supplier"]
    inlines = [PriceListPositionInline]


@admin.register(PriceListPosition)
class PriceListPositionAdmin(admin.ModelAdmin):
    list_display = ["article", "name", "price", "unit", "matched_product"]
    search_fields = ["article", "name"]
    list_filter = ["price_list__supplier"]
