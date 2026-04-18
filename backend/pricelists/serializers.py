from rest_framework import serializers

from core.file_validators import validate_excel_file
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
            "currency",
            "unit",
            "additional_data",
            "matched_product",
            "matched_product_name",
        ]


class GlobalPriceListPositionSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source="price_list.supplier.name", read_only=True)
    supplier_id = serializers.IntegerField(source="price_list.supplier.id", read_only=True)
    has_duplicates = serializers.BooleanField(read_only=True, default=False)
    matched_product_name = serializers.CharField(
        source="matched_product.__str__", read_only=True, default=None
    )

    class Meta:
        model = PriceListPosition
        fields = [
            "id", "article", "name", "price", "currency", "unit", "additional_data",
            "supplier_name", "supplier_id", "has_duplicates", 
            "matched_product", "matched_product_name"
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
            "start_row",
            "start_column",
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
    # Сериализатор для загрузки файла прайса

    supplier = serializers.IntegerField()
    file = serializers.FileField()

    def validate_supplier(self, value):
        from suppliers.models import Supplier
        if not Supplier.objects.filter(id=value).exists():
            raise serializers.ValidationError("Поставщик не найден.")
        return value

    def validate_file(self, value):
        return validate_excel_file(value)


class PriceListParseSerializer(serializers.Serializer):
    # Сериализатор для запуска парсинга с маппингом колонок

    mapping = serializers.DictField(child=serializers.CharField())
    start_row = serializers.IntegerField(default=1)
    start_column = serializers.IntegerField(default=1)
