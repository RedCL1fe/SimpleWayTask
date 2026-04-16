import pandas as pd
from django.db.models import Count, Q
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import Project, Estimate, EstimatePosition
from .serializers import (
    ProjectSerializer,
    ProjectDetailSerializer,
    EstimateSerializer,
    EstimatePositionSerializer,
    EstimateUploadSerializer,
    EstimateParseSerializer,
    ManualMatchSerializer,
)
from .tasks import parse_estimate_task, auto_match_estimate_positions


class ProjectViewSet(viewsets.ModelViewSet):
    """CRUD проектов."""

    serializer_class = ProjectSerializer
    search_fields = ["name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return Project.objects.annotate(estimates_count=Count("estimates"))

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ProjectDetailSerializer
        return ProjectSerializer


class EstimateViewSet(viewsets.ModelViewSet):
    """
    ViewSet для смет.
    Поддерживает: list, retrieve, upload, preview, parse, status, auto-match, manual match.
    """

    serializer_class = EstimateSerializer
    filterset_fields = ["project", "status"]
    ordering = ["-upload_date"]

    def get_queryset(self):
        return (
            Estimate.objects.select_related("project")
            .annotate(
                positions_count=Count("positions"),
                matched_count=Count(
                    "positions", filter=Q(positions__match_type__in=["auto", "manual"])
                ),
            )
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request):
        """Загрузка Excel-файла сметы."""
        serializer = EstimateUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        estimate = Estimate.objects.create(
            project_id=serializer.validated_data["project"],
            name=serializer.validated_data.get("name", ""),
            original_file=serializer.validated_data["file"],
            original_filename=serializer.validated_data["file"].name,
            status="uploaded",
        )
        return Response(
            EstimateSerializer(estimate).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """Превью: первые 50 строк + список колонок."""
        estimate = self.get_object()

        try:
            file_path = estimate.original_file.path
            engine = "xlrd" if file_path.endswith(".xls") else "openpyxl"
            df = pd.read_excel(file_path, engine=engine, dtype=str, nrows=50)
            df = df.fillna("")

            return Response({
                "columns": list(df.columns),
                "rows": df.values.tolist(),
                "total_preview_rows": len(df),
            })
        except Exception as exc:
            return Response(
                {"error": f"Не удалось прочитать файл: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def parse(self, request, pk=None):
        """Запуск парсинга сметы."""
        estimate = self.get_object()

        if estimate.status in ("processing", "done"):
            return Response(
                {"error": f"Смета уже в статусе '{estimate.get_status_display()}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = EstimateParseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        estimate.mapping_config = serializer.validated_data["mapping"]
        estimate.status = "processing"
        estimate.error_message = ""
        estimate.processed_rows = 0
        estimate.save()

        estimate.positions.all().delete()

        task = parse_estimate_task.delay(estimate.id)
        estimate.celery_task_id = task.id
        estimate.save(update_fields=["celery_task_id"])

        return Response({"status": "processing", "task_id": task.id})

    @action(detail=True, methods=["get"], url_path="status")
    def parse_status(self, request, pk=None):
        """Статус парсинга для polling."""
        estimate = self.get_object()
        return Response({
            "status": estimate.status,
            "total_rows": estimate.total_rows,
            "processed_rows": estimate.processed_rows,
            "progress": estimate.progress,
            "error_message": estimate.error_message,
        })

    @action(detail=True, methods=["post"], url_path="auto-match")
    def auto_match(self, request, pk=None):
        """Запуск автоматического AI-сопоставления."""
        estimate = self.get_object()

        if estimate.status != "done":
            return Response(
                {"error": "Сначала необходимо распарсить смету"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = auto_match_estimate_positions.delay(estimate.id)
        return Response({"status": "matching", "task_id": task.id})

    @action(detail=True, methods=["get"])
    def positions(self, request, pk=None):
        """Список позиций сметы с информацией о сопоставлении."""
        estimate = self.get_object()
        positions = estimate.positions.select_related("matched_product").all()

        page = self.paginate_queryset(positions)
        if page is not None:
            serializer = EstimatePositionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = EstimatePositionSerializer(positions, many=True)
        return Response(serializer.data)


class EstimatePositionViewSet(viewsets.GenericViewSet):
    """Ручное сопоставление отдельной позиции сметы."""

    queryset = EstimatePosition.objects.all()
    serializer_class = EstimatePositionSerializer

    @action(detail=True, methods=["patch"])
    def match(self, request, pk=None):
        """Ручное сопоставление позиции с товаром каталога."""
        position = self.get_object()
        serializer = ManualMatchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product_id = serializer.validated_data.get("product_id")

        if product_id is None:
            # Сброс сопоставления
            position.matched_product = None
            position.confidence = None
            position.match_type = "none"
        else:
            position.matched_product_id = product_id
            position.confidence = 1.0
            position.match_type = "manual"

        position.save(
            update_fields=["matched_product_id", "confidence", "match_type"]
        )
        return Response(EstimatePositionSerializer(position).data)
