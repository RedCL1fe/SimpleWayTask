import pytest
from django.core.files.uploadedfile import SimpleUploadedFile


@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()


@pytest.fixture
def sample_product(db):
    from catalog.models import Product
    return Product.objects.create(
        article="TEST-001",
        name="Test Product",
        unit="шт",
        group="Test Group",
    )


@pytest.fixture
def sample_supplier(db):
    from suppliers.models import Supplier
    return Supplier.objects.create(
        name="Test Supplier",
        inn="1234567890",
    )


@pytest.fixture
def sample_project(db):
    from projects.models import Project
    return Project.objects.create(
        name="Test Project",
        description="A test project",
    )


@pytest.fixture
def sample_estimate(db, sample_project):
    from projects.models import Estimate
    return Estimate.objects.create(
        project=sample_project,
        name="Test Estimate",
        original_file=SimpleUploadedFile("estimate.xlsx", b"dummy"),
        original_filename="estimate.xlsx",
    )
