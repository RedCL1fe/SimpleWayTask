from django.db import models


class Product(models.Model):
    """Товар из общего каталога — центральная сущность для сопоставления."""

    article = models.CharField(
        max_length=100, unique=True, db_index=True, verbose_name="Артикул"
    )
    name = models.CharField(max_length=500, verbose_name="Наименование")
    unit = models.CharField(max_length=50, verbose_name="Ед. изм.")
    group = models.CharField(
        max_length=200, blank=True, db_index=True, verbose_name="Группа товаров"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Товар каталога"
        verbose_name_plural = "Товары каталога"
        ordering = ["article"]

    def __str__(self):
        return f"[{self.article}] {self.name}"
