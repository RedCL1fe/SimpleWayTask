from rest_framework import serializers

from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ["id", "article", "name", "unit", "group", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductShortSerializer(serializers.ModelSerializer):
    # Краткий сериализатор для выпад. списков

    label = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = ["id", "article", "name", "label"]

    def get_label(self, obj):
        return f"[{obj.article}] {obj.name}"
