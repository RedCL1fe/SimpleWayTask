from django.db import models
from django.conf import settings
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class ChangeLog(models.Model):
    # Модель для хранения истории изменений объектов системы

    ACTION_CHOICES = [
        ("create", "Создание"),
        ("update", "Изменение"),
        ("delete", "Удаление"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Пользователь",
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey("content_type", "object_id")

    action = models.CharField(max_length=10, choices=ACTION_CHOICES, verbose_name="Действие")
    changes = models.JSONField(default=dict, verbose_name="Изменения", blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, verbose_name="Дата и время")

    class Meta:
        verbose_name = "Лог изменений"
        verbose_name_plural = "Логи изменений"
        ordering = ["-timestamp"]

    def __str__(self):
        return f"{self.get_action_display()} {self.content_type} #{self.object_id} ({self.timestamp})"
