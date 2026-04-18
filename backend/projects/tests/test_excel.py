import pytest
import pandas as pd
from unittest.mock import MagicMock, patch
from projects.tasks import parse_estimate_task
from projects.models import EstimatePosition

@pytest.mark.django_db
def test_parse_estimate_task_success(sample_estimate):
    from django.core.files.uploadedfile import SimpleUploadedFile
    sample_estimate.mapping_config = {
        "article": "Art",
        "name": "Name",
        "quantity": "Qty"
    }
    sample_estimate.original_file = SimpleUploadedFile("estimate.xlsx", b"dummy")
    sample_estimate.save()

    # Mock data
    data = {
        "Art": ["ART-1", "ART-2"],
        "Name": ["Item 1", "Item 2"],
        "Qty": ["10", "20"]
    }
    df = pd.DataFrame(data)
    
    with patch('pandas.read_excel') as mock_read:
        mock_read.return_value = df
        
        parse_estimate_task(sample_estimate.id)
        
    sample_estimate.refresh_from_db()
    assert sample_estimate.status == "done"
    assert sample_estimate.positions.count() == 2
    
    pos1 = sample_estimate.positions.get(row_number=1)
    assert pos1.original_article == "ART-1"
    assert pos1.quantity == 10.0
