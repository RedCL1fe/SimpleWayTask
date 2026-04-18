import pandas as pd
from django.db.models import Count, Exists, OuterRef
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
    GlobalPriceListPositionSerializer,
)
from .tasks import parse_pricelist_task


class PriceListViewSet(viewsets.ModelViewSet):
    
    #Вьюсет для прайс-листов.
    #Поддерживает: list, retrieve, upload, preview, parse, status, positions.
   

    serializer_class = PriceListSerializer
    filterset_fields = ["supplier", "status"]
    ordering = ["-upload_date"]

    def get_queryset(self):
        return PriceList.objects.select_related("supplier").annotate(
            positions_count=Count("positions")
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def upload(self, request):
        # Загрузка Excel-файла прайса
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
        # Превью для стабильности таблицы
        pricelist = self.get_object()
        start_row = int(request.query_params.get("start_row", 1))
        start_column = int(request.query_params.get("start_column", 1))

        try:
            file_path = pricelist.original_file.path
            engine = "xlrd" if file_path.endswith(".xls") else "openpyxl"
            
            # Всегда читаем от начала файла (Row 1), чтобы таблица не "прыгала"
            # Ограничиваем только количество строк для предпросмотра
            df = pd.read_excel(file_path, engine=engine, dtype=str, nrows=50, header=None)
            df = df.fillna("")

            # Именуем колонки абсолютно: Колонка 1 = A, Колонка 2 = B и т.д.
            # Теперь шапка таблицы ("Колонка X") будет статичной.
            columns = [f"Колонка {i+1}" for i in range(len(df.columns))]
            rows = df.values.tolist()
            
            return Response({
                "columns": columns,
                "rows": rows,
                "preview_start_row": 1, 
                "start_row": start_row,
                "start_column": start_column,
                "total_preview_rows": len(rows),
            })
        except Exception as exc:
            return Response(
                {"error": f"Не удалось прочитать файл: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

    @action(detail=True, methods=["post"])
    def parse(self, request, pk=None):
        # Запуск фонового парсинга с маппингом колонок
        pricelist = self.get_object()

        if pricelist.status in ("processing", "done"):
            return Response(
                {"error": f"Прайс уже в статусе '{pricelist.get_status_display()}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = PriceListParseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        pricelist.mapping_config = serializer.validated_data["mapping"]
        pricelist.start_row = serializer.validated_data.get("start_row", 1)
        pricelist.start_column = serializer.validated_data.get("start_column", 1)
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
        # Статус парсинга для пулинга
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
        # Список позиций распарсенного прайса
        pricelist = self.get_object()
        positions = pricelist.positions.select_related("matched_product").all()

        page = self.paginate_queryset(positions)
        if page is not None:
            serializer = PriceListPositionSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PriceListPositionSerializer(positions, many=True)
        return Response(serializer.data)


class PriceListPositionViewSet(viewsets.ReadOnlyModelViewSet):
   
    # Глобальный ViewSet для позиций всех прайс-листов
   
    serializer_class = GlobalPriceListPositionSerializer
    filterset_fields = ["price_list__supplier", "article"]
    search_fields = ["article", "name"]
    ordering_fields = ["price", "name"]
    ordering = ["name"]

    def get_queryset(self):
        other_positions = PriceListPosition.objects.filter(
            article=OuterRef('article')
        ).exclude(
            price_list__supplier_id=OuterRef('price_list__supplier_id')
        )
        return PriceListPosition.objects.select_related(
            "price_list__supplier", "matched_product"
        ).annotate(
            has_duplicates=Exists(other_positions)
        )
