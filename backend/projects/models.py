from django.db import models


class Project(models.Model):
    # Проект контейнер для смет

    name = models.CharField(max_length=255, verbose_name="Название проекта")
    description = models.TextField(blank=True, verbose_name="Описание")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Проект"
        verbose_name_plural = "Проекты"
        ordering = ["-created_at"]

    def __str__(self):
        return self.name


class Estimate(models.Model):
    # Смета проекта загружается из Excel, содержит позиции

    STATUS_CHOICES = [
        ("uploaded", "Загружена"),
        ("processing", "В обработке"),
        ("done", "Готова"),
        ("error", "Ошибка"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="estimates",
        verbose_name="Проект",
    )
    name = models.CharField(max_length=255, blank=True, verbose_name="Название сметы")
    original_file = models.FileField(
        upload_to="estimates/%Y/%m/", verbose_name="Исходный Excel"
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
    )
    start_row = models.IntegerField(default=1, verbose_name="Стартовая строка")
    start_column = models.IntegerField(default=1, verbose_name="Стартовая колонка")
    total_rows = models.IntegerField(default=0)
    processed_rows = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    celery_task_id = models.CharField(max_length=255, blank=True)
    upload_date = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Смета"
        verbose_name_plural = "Сметы"
        ordering = ["-upload_date"]

    def __str__(self):
        return f"Смета #{self.id} — {self.project.name}"

    @property
    def progress(self):
        if self.total_rows == 0:
            return 0
        return round(self.processed_rows / self.total_rows * 100)


class EstimatePosition(models.Model):
    # Позиция сметы  основная строка для сопоставления с каталогом

    MATCH_TYPE_CHOICES = [
        ("none", "Не сопоставлено"),
        ("auto", "Автоматически"),
        ("manual", "Вручную"),
    ]

    estimate = models.ForeignKey(
        Estimate, on_delete=models.CASCADE, related_name="positions"
    )
    row_number = models.IntegerField(default=0, verbose_name="№ строки")
    original_name = models.CharField(max_length=500, verbose_name="Наименование")
    original_article = models.CharField(
        max_length=100, blank=True, verbose_name="Артикул"
    )
    unit = models.CharField(max_length=50, blank=True, verbose_name="Ед. изм.")
    quantity = models.DecimalField(
        max_digits=12, decimal_places=3, default=0, verbose_name="Количество"
    )
    material_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Цена материалов",
    )
    installation_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name="Цена монтажа",
    )
    matched_product = models.ForeignKey(
        "catalog.Product",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="estimate_positions",
        verbose_name="Товар каталога",
    )
    confidence = models.FloatField(
        null=True, blank=True, verbose_name="Уверенность (0.0–1.0)"
    )
    image = models.ImageField(
        upload_to="estimates/positions/", null=True, blank=True, 
        verbose_name="Фото позиции"
    )
    match_type = models.CharField(
        max_length=10,
        choices=MATCH_TYPE_CHOICES,
        default="none",
        verbose_name="Тип сопоставления",
    )

    class Meta:
        verbose_name = "Позиция сметы"
        verbose_name_plural = "Позиции сметы"
        ordering = ["row_number"]

    def __str__(self):
        return f"#{self.row_number} {self.original_name}"
