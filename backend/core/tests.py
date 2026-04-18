import pytest
from core.models import ChangeLog
from core.signals import get_model_changes
from catalog.models import Product


@pytest.mark.django_db
class TestAuditLog:
    def test_get_model_changes(self):
        #Проверяем, что get_model_changes корректно вычисляет дельту
        product = Product.objects.create(article="P1", name="Old")

        # Сохраняем старое состояние ДО изменения (именно так работает pre_save сигнал)
        old_snapshot = Product.objects.get(pk=product.pk)

        # Теперь меняем значение
        product.name = "New"
        #Имитируем поведение сигнала pre_save
        product._old_instance = old_snapshot

        changes = get_model_changes(product)

        assert "name" in changes
        assert changes["name"] == ["Old", "New"]
        assert "article" not in changes

    def test_audit_log_created_on_save(self):
        #Проверяем, что при создании объекта в ChangeLog появляется запись
        product = Product.objects.create(article="P-SIGNAL", name="Signal Test")

        log = ChangeLog.objects.filter(object_id=product.pk).first()
        assert log is not None
        assert log.action == "create"
        assert "name" in log.changes
        assert log.changes["name"] == [None, "Signal Test"]

    def test_audit_log_updated_on_save(self):
        #Проверяем что при обновлении объекта фиксируется ChangeLog с корректной дельтой
        product = Product.objects.create(article="P-UPDATE", name="Original")

        product.name = "Updated"
        product.save()

        logs = ChangeLog.objects.filter(object_id=product.pk).order_by("timestamp")
        assert logs.count() == 2
        assert logs[1].action == "update"
        assert logs[1].changes["name"] == ["Original", "Updated"]
