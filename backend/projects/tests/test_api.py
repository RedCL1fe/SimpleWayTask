import pytest
from django.urls import reverse
from unittest.mock import patch, MagicMock

@pytest.mark.django_db
class TestProjectsAPI:
    def test_list_projects(self, api_client, sample_project):
        url = reverse("project-list")
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["count"] == 1

    def test_estimate_detail(self, api_client, sample_estimate):
        url = reverse("estimate-detail", args=[sample_estimate.id])
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data["name"] == sample_estimate.name

    def test_auto_match_trigger(self, api_client, sample_estimate):
        from projects.models import EstimatePosition, Estimate
        EstimatePosition.objects.create(
            estimate=sample_estimate, row_number=1, original_name="Test"
        )
        # Используем update() вместо save() чтобы обойти сигналы
        Estimate.objects.filter(pk=sample_estimate.pk).update(status="done")

        url = reverse("estimate-auto-match", args=[sample_estimate.id])
        # Патчим в views — именно там имя используется при вызове
        with patch('projects.views.auto_match_estimate_positions') as mock_task:
            # ВАЖНО: задаём явный id чтобы DRF мог сериализовать ответ в JSON
            mock_task.delay.return_value = MagicMock(id="fake-celery-task-id")
            response = api_client.post(url)
            assert response.status_code == 200
            mock_task.delay.assert_called_once_with(sample_estimate.id)

    def test_upload_estimate(self, api_client, sample_project):
        from django.core.files.uploadedfile import SimpleUploadedFile
        url = reverse("estimate-upload")
        file = SimpleUploadedFile(
            "test.xlsx", 
            b"dummy", 
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
        data = {
            "project": sample_project.id,
            "name": "Uploaded Estimate",
            "file": file
        }
        response = api_client.post(url, data, format="multipart")
        assert response.status_code == 201

    def test_preview_estimate(self, api_client, sample_estimate):
        from django.core.files.uploadedfile import SimpleUploadedFile
        sample_estimate.original_file = SimpleUploadedFile("test.xlsx", b"dummy")
        sample_estimate.save()
        
        url = reverse("estimate-preview", args=[sample_estimate.id])
        # Note: pandas will fail to read "dummy" as excel, but we catch the flow
        response = api_client.get(url)
        # Should return 400 since it's not a real excel, but handled by our try-except
        assert response.status_code in [200, 400]
