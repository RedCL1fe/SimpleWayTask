from rest_framework import serializers

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    pricelists_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "inn",
            "contact_person",
            "phone",
            "email",
            "currency",
            "pricelists_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
