# Утилиты безопасности для валидации загружаемых файлов

from rest_framework import serializers

ALLOWED_EXCEL_EXTENSIONS = {".xlsx", ".xls"}

# Допустимые MIME-типы для Excel-файлов
ALLOWED_EXCEL_MIME_TYPES = {
    "application/vnd.ms-excel",                                          # .xls
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", # .xlsx
    "application/octet-stream",  # некоторые браузеры отправляют так
    "application/zip",           # .xlsx — это zip-архив, ряд браузеров детектирует так
}

MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


def validate_excel_file(value):
    #
    # Валидирует загружаемый Excel-файл:
    # Проверяет расширение файла
    # Проверяет MIME-тип
    # Проверяет размер файла
    #
    # Проверка расширения
    filename = value.name or ""
    ext = f".{filename.rsplit('.', 1)[-1].lower()}" if "." in filename else ""
    if ext not in ALLOWED_EXCEL_EXTENSIONS:
        raise serializers.ValidationError(
            f"Недопустимый формат файла '{ext}'. Поддерживаются только .xlsx и .xls"
        )

    # Проверка MIME-типа
    content_type = getattr(value, "content_type", None)
    if content_type and content_type not in ALLOWED_EXCEL_MIME_TYPES:
        raise serializers.ValidationError(
            f"Недопустимый тип файла '{content_type}'. Ожидается Excel-документ."
        )

    # Проверка размера
    if value.size > MAX_FILE_SIZE_BYTES:
        raise serializers.ValidationError(
            f"Файл слишком большой ({value.size // (1024*1024)} МБ). "
            f"Максимальный размер: {MAX_FILE_SIZE_MB} МБ."
        )

    return value
