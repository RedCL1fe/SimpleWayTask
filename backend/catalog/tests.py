import pytest
from django.urls import reverse
from catalog.models import Product

@pytest.mark.django_db
class TestCatalogAPI:
    def test_list_products(self, api_client, sample_product):
        url = reverse("product-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["article"] == sample_product.article

    def test_create_product(self, api_client):
        url = reverse("product-list")
        data = {
            "article": "NEW-ART",
            "name": "New Product",
            "unit": "кг"
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        assert Product.objects.count() == 1

    def test_update_product(self, api_client, sample_product):
        url = reverse("product-detail", args=[sample_product.id])
        data = {"name": "Updated Name"}
        response = api_client.patch(url, data)
        assert response.status_code == 200
        sample_product.refresh_from_db()
        assert sample_product.name == "Updated Name"
