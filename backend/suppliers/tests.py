import pytest
from django.urls import reverse
from suppliers.models import Supplier

@pytest.mark.django_db
class TestSuppliersAPI:
    def test_list_suppliers(self, api_client, sample_supplier):
        url = reverse("supplier-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] == 1
        assert response.data["results"][0]["inn"] == sample_supplier.inn

    def test_create_supplier(self, api_client):
        url = reverse("supplier-list")
        data = {
            "name": "New Supplier",
            "inn": "0987654321"
        }
        response = api_client.post(url, data)
        assert response.status_code == 201
        assert Supplier.objects.count() == 1

    def test_delete_supplier(self, api_client, sample_supplier):
        url = reverse("supplier-detail", args=[sample_supplier.id])
        response = api_client.delete(url)
        assert response.status_code == 204
        assert Supplier.objects.count() == 0
