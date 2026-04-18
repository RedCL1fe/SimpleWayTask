import json
from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import ChangeLog


@admin.register(ChangeLog)
class ChangeLogAdmin(admin.ModelAdmin):
    list_display = ("action", "content_type", "object_id", "timestamp", "user")
    list_filter = ("action", "content_type", "timestamp")
    readonly_fields = ("action", "content_type", "object_id", "user", "changes_display", "timestamp")
    exclude = ("changes",)

    def changes_display(self, obj):
        if not obj.changes:
            return "Нет изменений"
        
        html = '<table style="width:100%; border-collapse: collapse;">'
        html += '<thead><tr><th style="text-align:left; border-bottom:1px solid #ddd">Поле</th><th style="text-align:left; border-bottom:1px solid #ddd">Было</th><th style="text-align:left; border-bottom:1px solid #ddd">Стало</th></tr></thead>'
        html += '<tbody>'
        
        for field, values in obj.changes.items():
            old, new = values
            html += f'<tr><td style="padding:5px; border-bottom:1px solid #eee"><strong>{field}</strong></td>'
            html += f'<td style="padding:5px; border-bottom:1px solid #eee; color:#991b1b">{old if old is not None else "—"}</td>'
            html += f'<td style="padding:5px; border-bottom:1px solid #eee; color:#166534">{new if new is not None else "—"}</td></tr>'
        
        html += '</tbody></table>'
        return mark_safe(html)
    
    changes_display.short_description = "Детали изменений"

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
