from rest_framework import serializers

from .models import Project, Estimate, EstimatePosition


class EstimatePositionSerializer(serializers.ModelSerializer):
    matched_product_name = serializers.SerializerMethodField()

    class Meta:
        model = EstimatePosition
        fields = [
            "id",
            "row_number",
            "original_name",
            "original_article",
            "unit",
            "quantity",
            "material_price",
            "installation_price",
            "matched_product",
            "matched_product_name",
            "confidence",
            "match_type",
        ]

    def get_matched_product_name(self, obj):
        if obj.matched_product:
            return f"[{obj.matched_product.article}] {obj.matched_product.name}"
        return None


class EstimateSerializer(serializers.ModelSerializer):
    progress = serializers.IntegerField(read_only=True)
    positions_count = serializers.IntegerField(read_only=True, default=0)
    matched_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Estimate
        fields = [
            "id",
            "project",
            "name",
            "original_filename",
            "status",
            "mapping_config",
            "total_rows",
            "processed_rows",
            "progress",
            "positions_count",
            "matched_count",
            "error_message",
            "upload_date",
        ]
        read_only_fields = [
            "id", "status", "total_rows", "processed_rows",
            "error_message", "upload_date",
        ]


class EstimateUploadSerializer(serializers.Serializer):
    project = serializers.IntegerField()
    name = serializers.CharField(required=False, default="")
    file = serializers.FileField()

    def validate_project(self, value):
        if not Project.objects.filter(id=value).exists():
            raise serializers.ValidationError("Проект не найден.")
        return value

    def validate_file(self, value):
        allowed = [".xlsx", ".xls"]
        ext = value.name.rsplit(".", 1)[-1].lower() if "." in value.name else ""
        if f".{ext}" not in allowed:
            raise serializers.ValidationError("Поддерживаются только .xlsx и .xls")
        return value


class EstimateParseSerializer(serializers.Serializer):
    mapping = serializers.DictField(child=serializers.CharField())


class ManualMatchSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_product_id(self, value):
        if value is not None:
            from catalog.models import Product
            if not Product.objects.filter(id=value).exists():
                raise serializers.ValidationError("Товар не найден.")
        return value


class ProjectSerializer(serializers.ModelSerializer):
    estimates_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "estimates_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ProjectDetailSerializer(ProjectSerializer):
    estimates = EstimateSerializer(many=True, read_only=True)

    class Meta(ProjectSerializer.Meta):
        fields = ProjectSerializer.Meta.fields + ["estimates"]
