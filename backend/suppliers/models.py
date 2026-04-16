from django.db import models


class Supplier(models.Model):
    """Поставщик — основной владелец прайс-листов."""

    name = models.CharField(max_length=255, verbose_name="Название")
    inn = models.CharField(max_length=12, unique=True, verbose_name="ИНН")
    contact_person = models.CharField(
        max_length=255, blank=True, verbose_name="Контактное лицо"
    )
    phone = models.CharField(max_length=20, blank=True, verbose_name="Телефон")
    email = models.EmailField(blank=True, verbose_name="Email")
    currency = models.CharField(
        max_length=3,
        choices=[("RUB", "₽ Рубль"), ("USD", "$ Доллар"), ("EUR", "€ Евро")],
        default="RUB",
        verbose_name="Валюта",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Поставщик"
        verbose_name_plural = "Поставщики"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.inn})"
