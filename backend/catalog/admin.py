from django.contrib import admin

from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ["article", "name", "unit", "group"]
    search_fields = ["article", "name"]
    list_filter = ["group"]
