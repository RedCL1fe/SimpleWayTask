import pytest
import pandas as pd
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
from pricelists.tasks import parse_pricelist_task
from pricelists.models import PriceList, PriceListPosition


@pytest.fixture
def sample_pricelist(db, sample_supplier):
    """Создаём прайс-лист с фиктивным файлом и маппингом колонок."""
    pricelist = PriceList.objects.create(
        supplier=sample_supplier,
        mapping_config={
            "article": "Колонка 1",
            "name": "Колонка 2",
            "price": "Колонка 3"
        },
        original_file=SimpleUploadedFile("dummy.xlsx", b"dummy content"),
        original_filename="dummy.xlsx",
    )
    return pricelist


@pytest.mark.django_db
def test_parse_pricelist_task_success(sample_pricelist):
    """Парсинг прайс-листа должен создать позиции с правильными данными."""
    data = {
        "Колонка 1": ["A-1", "A-2"],
        "Колонка 2": ["Product 1", "Product 2"],
        "Колонка 3": ["100.50", "200.00"]
    }
    df = pd.DataFrame(data)

    # Мокаем pd.read_excel, чтобы не читать настоящий файл
    with patch('pricelists.tasks.pd.read_excel', return_value=df):
        parse_pricelist_task(sample_pricelist.id)

    sample_pricelist.refresh_from_db()
    assert sample_pricelist.status == "done"
    assert sample_pricelist.total_rows == 2
    assert sample_pricelist.positions.count() == 2

    pos1 = sample_pricelist.positions.order_by("row_number").first()
    assert pos1.article == "A-1"
    assert float(pos1.price) == 100.50
