import pandas as pd
from django.db.models import Count
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from .models import PriceList, PriceListPosition
from .serializers import (
    PriceListSerializer,
    PriceListPositionSerializer,
    PriceListUploadSerializer,
    PriceListParseSerializer,
)
from .tasks import parse_pricelist_task


class PriceListViewSet(viewsets.ModelViewSet):
    """
    ViewSet для прайс-листов.
    Поддерживает: list, retrieve, upload, preview, parse, status, positions.
    """

    serializer_class = PriceListSerializer
    filterset_fields = ["supplier", "status"]
    ordering = ["-upload_date"]

    def get_queryset(self):
        return PriceList.objects.select_related("supplier").annotate(
            positions_count=Count("positions")
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request):
        """Загрузка Excel-файла прайса."""
        serializer = PriceListUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pricelist = PriceList.objects.create(
            supplier_id=serializer.validated_data["supplier"],
            original_file=serializer.validated_data["file"],
            original_filename=serializer.validated_data["file"].name,
            status="uploaded",
        )
        return Response(
            PriceListSerializer(pricelist).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"])
    def preview(self, request, pk=None):
        """Превью: первые 50 строк + список колонок Excel."""
        pricelist = self.get_object()

        try:
            file_path = pricelist.original_file.path
            engine = "xlrd" if file_path.endswith(".xls") else "openpyxl"
            df = pd.read_excel(file_path, engine=engine, dtype=str, nrows=50)
            df = df.fillna("")

            columns = list(df.columns)
            rows = df.values.tolist()

            return Response({
                "columns": columns,
                "rows": rows,
                "total_preview_rows": len(rows),
            })
        except Exception as exc:
            return Response(
                {"error": f"Не удалось прочитать файл: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def parse(self, request, pk=None):
        """Запуск фонового парсинга с маппингом колонок."""
        pricelist = self.get_object()

        if pricelist.status in ("processing", "done"):
            return Response(
                {"error": f"Прайс уже в статусе '{pricelist.get_status_display()}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PriceListParseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pricelist.mapping_config = serializer.validated_data["mapping"]
        pricelist.status = "processing"
        pricelist.error_message = ""
        pricelist.processed_rows = 0
        pricelist.save()

        # Удаляем старые позиции при повторном парсинге
        pricelist.positions.all().delete()

        task = parse_pricelist_task.delay(pricelist.id)
        pricelist.celery_task_id = task.id
        pricelist.save(update_fields=["celery_task_id"])

        return Response({"status": "processing", "task_id": task.id})

    @action(detail=True, methods=["get"], url_path="status")
    def parse_status(self, request, pk=None):
        """Статус парсинга для polling."""
        pricelist = self.get_object()
        return Response({
            "status": pricelist.status,
            "total_rows": pricelist.total_rows,
            "processed_rows": pricelist.processed_rows,
            "progress": pricelist.progress,
            "error_message": pricelist.error_message,
        })

    @action(detail=True, methods=["get"])
    def positions(self, request, pk=None):
        """Список позиций распарсенного прайса."""
        pricelist = self.get_object()
        positions = pricelist.positions.select_related("matched_product").all()

        page = self.paginate_queryset(positions)
        if page is not None:
            serializer = PriceListPositionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PriceListPositionSerializer(positions, many=True)
        return Response(serializer.data)
