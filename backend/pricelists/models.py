from django.db import models


class PriceList(models.Model):
    """Один загруженный прайс-лист поставщика."""

    STATUS_CHOICES = [
        ("uploaded", "Загружен"),
        ("processing", "В обработке"),
        ("done", "Готов"),
        ("error", "Ошибка"),
    ]

    supplier = models.ForeignKey(
        "suppliers.Supplier",
        on_delete=models.CASCADE,
        related_name="pricelists",
        verbose_name="Поставщик",
    )
    original_file = models.FileField(
        upload_to="pricelists/%Y/%m/", verbose_name="Исходный Excel"
    )
    original_filename = models.CharField(
        max_length=255, blank=True, verbose_name="Имя файла"
    )
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="uploaded"
    )
    mapping_config = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Маппинг колонок",
        help_text='Пример: {"article": "Колонка A", "name": "Колонка B", "price": "Колонка C"}',
    )
    total_rows = models.IntegerField(default=0, verbose_name="Всего строк")
    processed_rows = models.IntegerField(default=0, verbose_name="Обработано строк")
    error_message = models.TextField(blank=True, verbose_name="Сообщение об ошибке")
    celery_task_id = models.CharField(max_length=255, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Прайс-лист"
        verbose_name_plural = "Прайс-листы"
        ordering = ["-upload_date"]

    def __str__(self):
        return f"Прайс #{self.id} — {self.supplier.name} ({self.upload_date:%d.%m.%Y})"

    @property
    def progress(self):
        if self.total_rows == 0:
            return 0
        return round(self.processed_rows / self.total_rows * 100)


class PriceListPosition(models.Model):
    """Строка из распарсенного прайс-листа."""

    price_list = models.ForeignKey(
        PriceList, on_delete=models.CASCADE, related_name="positions"
    )
    row_number = models.IntegerField(default=0, verbose_name="№ строки")
    article = models.CharField(max_length=100, verbose_name="Артикул")
    name = models.CharField(max_length=500, verbose_name="Наименование")
    price = models.DecimalField(
        max_digits=12, decimal_places=2, verbose_name="Цена"
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name="Ед. изм.")
    matched_product = models.ForeignKey(
        "catalog.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pricelist_positions",
        verbose_name="Товар каталога",
    )

    class Meta:
        verbose_name = "Позиция прайса"
        verbose_name_plural = "Позиции прайса"
        ordering = ["row_number"]

    def __str__(self):
        return f"[{self.article}] {self.name} — {self.price}"
