from django.db.models import Count
from rest_framework import viewsets

from .models import Supplier
from .serializers import SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    # CRUD поставщиков с поиском по названию и инн

    serializer_class = SupplierSerializer
    search_fields = ["name", "inn"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        return Supplier.objects.annotate(
            pricelists_count=Count("pricelists")
        )
