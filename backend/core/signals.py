import json
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import ChangeLog


@receiver(pre_save)
def capture_old_instance(sender, instance, **kwargs):
    #Сохраняем старое состояние объекта перед сохранением
    monitored_models = ["Supplier", "Product", "Estimate", "EstimatePosition"]
    if sender.__name__ not in monitored_models:
        return

    if instance.pk:
        try:
            instance._old_instance = sender.objects.get(pk=instance.pk)
        except sender.DoesNotExist:
            instance._old_instance = None
    else:
        instance._old_instance = None


def get_model_changes(instance):
    #Сравнивает текущий объект со старым состоянием
    old_instance = getattr(instance, "_old_instance", None)
    if not old_instance:
        return {}

    changes = {}
    for field in instance._meta.fields:
        field_name = field.name
        if field_name in ["updated_at", "processed_rows"]:
            continue
            
        old_value = getattr(old_instance, field_name)
        new_value = getattr(instance, field_name)

        if old_value != new_value:
            changes[field_name] = [str(old_value), str(new_value)]

    return changes


@receiver(post_save)
def audit_log_save(sender, instance, created, **kwargs):
    #Логирование изменений
    monitored_models = ["Supplier", "Product", "Estimate", "EstimatePosition"]
    if sender.__name__ not in monitored_models:
        return

    action = "create" if created else "update"
    changes = {}

    if not created:
        changes = get_model_changes(instance)
        if not changes:
            return
    else:
        for field in instance._meta.fields:
            val = getattr(instance, field.name)
            if val is not None:
                changes[field.name] = [None, str(val)]

    ChangeLog.objects.create(
        content_type=ContentType.objects.get_for_model(instance),
        object_id=instance.pk,
        action=action,
        changes=changes,
    )
