from rest_framework import serializers

from .models import PriceList, PriceListPosition


class PriceListPositionSerializer(serializers.ModelSerializer):
    matched_product_name = serializers.CharField(
        source="matched_product.__str__", read_only=True, default=None
    )

    class Meta:
        model = PriceListPosition
        fields = [
            "id",
            "row_number",
            "article",
            "name",
            "price",
            "unit",
            "matched_product",
            "matched_product_name",
        ]


class PriceListSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    progress = serializers.IntegerField(read_only=True)
    positions_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = PriceList
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "original_filename",
            "status",
            "mapping_config",
            "total_rows",
            "processed_rows",
            "progress",
            "positions_count",
            "error_message",
            "upload_date",
        ]
        read_only_fields = [
            "id", "status", "total_rows", "processed_rows",
            "error_message", "upload_date",
        ]


class PriceListUploadSerializer(serializers.Serializer):
    """Сериализатор для загрузки файла прайса."""

    supplier = serializers.IntegerField()
    file = serializers.FileField()

    def validate_supplier(self, value):
        from suppliers.models import Supplier
        if not Supplier.objects.filter(id=value).exists():
            raise serializers.ValidationError("Поставщик не найден.")
        return value

    def validate_file(self, value):
        allowed_extensions = [".xlsx", ".xls"]
        ext = value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        if f".{ext}" not in allowed_extensions:
            raise serializers.ValidationError(
                "Поддерживаются только файлы .xlsx и .xls"
            )
        return value


class PriceListParseSerializer(serializers.Serializer):
    """Сериализатор для запуска парсинга с маппингом колонок."""

    mapping = serializers.DictField(child=serializers.CharField())
