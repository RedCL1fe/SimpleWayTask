from rest_framework import viewsets

from .models import Product
from .serializers import ProductSerializer, ProductShortSerializer


class ProductViewSet(viewsets.ModelViewSet):
    """CRUD каталога товаров с поиском по артикулу и названию."""

    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    search_fields = ["article", "name"]
    filterset_fields = ["group"]
    ordering_fields = ["article", "name", "created_at"]
    ordering = ["article"]

    def get_serializer_class(self):
        if self.request.query_params.get("short") == "true":
            return ProductShortSerializer
        return ProductSerializer
