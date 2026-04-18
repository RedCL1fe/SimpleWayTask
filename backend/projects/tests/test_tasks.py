import pytest
from unittest.mock import MagicMock, patch
from projects.tasks import normalize_text, get_embedding, vector_search, auto_match_estimate_positions
from projects.models import EstimatePosition, Estimate

def test_normalize_text():
    assert normalize_text("  PUMP-123 (red)  ") == "pump 123 red"
    assert normalize_text("Насос №45!") == "насос 45"
    assert normalize_text("") == ""

def test_get_embedding():
    vector = get_embedding("test")
    assert len(vector) == 128
    assert all(v == 0.0 for v in vector)

@pytest.mark.django_db
def test_vector_search_returns_candidates(sample_product):
    candidates = vector_search([0]*128, limit=1)
    assert len(candidates) > 0
    assert candidates[0].id == sample_product.id

@pytest.mark.django_db
def test_auto_match_pipeline_success(sample_estimate, sample_product):
    # Setup position
    pos = EstimatePosition.objects.create(
        estimate=sample_estimate,
        row_number=1,
        original_name="Test Product",
        original_article="TEST-001"
    )
    
    # Run task
    with patch('projects.tasks.vector_search') as mock_search:
        mock_search.return_value = [sample_product]
        
        result = auto_match_estimate_positions(sample_estimate.id)
        
    assert result["matched"] == 1
    pos.refresh_from_db()
    assert pos.matched_product_id == sample_product.id
    assert pos.match_type == "auto"
    assert pos.confidence == 1.0 # Exact match after normalization
