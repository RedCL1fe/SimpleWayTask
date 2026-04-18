import logging

import pandas as pd
from celery import shared_task
from django.conf import settings
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def parse_estimate_task(self, estimate_id: int):
    # Фоновый парсинг ексель сметы по сохранённому маппингу колонок
    from .models import Estimate, EstimatePosition

    estimate = Estimate.objects.get(id=estimate_id)
    estimate.status = "processing"
    estimate.celery_task_id = self.request.id or ""
    estimate.save(update_fields=["status", "celery_task_id"])

    try:
        file_path = estimate.original_file.path
        mapping = estimate.mapping_config
        start_row = getattr(estimate, "start_row", 1)
        header_row = start_row - 1 if start_row > 0 else 0

        engine = "xlrd" if file_path.endswith(".xls") else "openpyxl"
        # Читаем Excel пропускаем строки до заголовка
        df = pd.read_excel(file_path, engine=engine, dtype=str, skiprows=header_row)
        df = df.dropna(how="all")

        estimate.total_rows = len(df)
        estimate.save(update_fields=["total_rows"])

        col_name = mapping.get("name", "")
        col_article = mapping.get("article", "")
        col_unit = mapping.get("unit", "")
        col_quantity = mapping.get("quantity", "")
        col_material_price = mapping.get("material_price", "")
        col_installation_price = mapping.get("installation_price", "")

        positions = []
        batch_size = 500

        for idx, row in df.iterrows():
            name = str(row.get(col_name, "")).strip() if col_name else ""
            article = str(row.get(col_article, "")).strip() if col_article else ""
            unit = str(row.get(col_unit, "")).strip() if col_unit else ""

            def parse_decimal(val_str):
                if not val_str:
                    return None
                val_str = val_str.replace(" ", "").replace(",", ".")
                try:
                    return round(float(val_str), 2)
                except (ValueError, TypeError):
                    return None

            quantity_raw = str(row.get(col_quantity, "")).strip() if col_quantity else ""
            mat_price_raw = str(row.get(col_material_price, "")).strip() if col_material_price else ""
            inst_price_raw = str(row.get(col_installation_price, "")).strip() if col_installation_price else ""

            quantity = parse_decimal(quantity_raw) or 0
            material_price = parse_decimal(mat_price_raw)
            installation_price = parse_decimal(inst_price_raw)

            if not name and not article:
                continue

            positions.append(
                EstimatePosition(
                    estimate=estimate,
                    row_number=idx + 1,
                    original_name=name[:500],
                    original_article=article[:100],
                    unit=unit[:50],
                    quantity=quantity,
                    material_price=material_price,
                    installation_price=installation_price,
                )
            )

            if len(positions) >= batch_size:
                EstimatePosition.objects.bulk_create(positions)
                estimate.processed_rows += len(positions)
                estimate.save(update_fields=["processed_rows"])
                positions = []

        if positions:
            EstimatePosition.objects.bulk_create(positions)
            estimate.processed_rows = estimate.total_rows
            estimate.save(update_fields=["processed_rows"])

        estimate.status = "done"
        estimate.save(update_fields=["status"])
        logger.info("Смета #%s распарсена: %s позиций", estimate_id, estimate.positions.count())

    except Exception as exc:
        estimate.status = "error"
        estimate.error_message = str(exc)[:2000]
        estimate.save(update_fields=["status", "error_message"])
        logger.exception("Ошибка парсинга сметы #%s", estimate_id)
        raise


# --- AI Pipeline Utilities ---

def normalize_text(text: str) -> str:
    # Нормализация текста очистка от лишних символов
    if not text:
        return ""
    import re
    # Приводим к нижнему регистру и убираем спецсимволы
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9\sа-яА-Я]', ' ', text)
    return " ".join(text.split())


def get_embedding(text: str):
    # Генерация эмбеддинга (заглушка для модели типа sentence-transformers)
    # В реальной системе здесь будет вызов модели или API (например, OpenAI Embeddings)
    # Возвращаем список нулей как имитацию вектора
    return [0.0] * 128


def vector_search(query_embedding, limit=5):
    # Векторный поиск (заглушка для pgvector/Pinecone)
    from catalog.models import Product
    # В реальности здесь будет: Product.objects.order_by(CosineDistance('embedding', query_embedding))[:limit]
    # Пока просто возвращаем первые N товаров для имитации поиска
    return Product.objects.all()[:limit]


@shared_task(bind=True)
def auto_match_estimate_positions(self, estimate_id: int):
  
    # Автоматическое AI-сопоставление позиций сметы (пайплан версия).
    # пайплайн -  нормализация -> эмбединг -> векторный поиск -> финальная оценка (RapidFuzz).
    
    from catalog.models import Product
    from .models import Estimate, EstimatePosition

    estimate = Estimate.objects.get(id=estimate_id)
    threshold = getattr(settings, "MATCH_THRESHOLD", 75)

    positions = EstimatePosition.objects.filter(
        estimate_id=estimate_id, match_type="none"
    )
    all_products_count = Product.objects.count()

    if all_products_count == 0:
        logger.warning("Каталог пуст — сопоставление невозможно")
        return {"matched": 0, "total": positions.count()}

    matched_count = 0
    total = positions.count()

    for pos in positions:
        # нормализация
        original_query = f"{pos.original_article} {pos.original_name}".strip()
        normalized_query = normalize_text(original_query)
        
        if not normalized_query:
            continue

        # генерация эмблднга
        query_vector = get_embedding(normalized_query)

        # Векторынй поиск
        # Получаем кандидатов для более детального сравнения
        candidates = vector_search(query_vector, limit=10)
        
        # Нормализуем строки кандидатов для корректного сравнения на шаге 4
        candidate_strings = [normalize_text(f"{p.article} {p.name}") for p in candidates]
        candidate_ids = [p.id for p in candidates]

        # финальная оценка\выбор
        # Используем нечеткий поиск для выбора лучшего из отобранных ИИ кандидатов
        result = process.extractOne(
            normalized_query,
            candidate_strings,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold,
        )

        if result:
            matched_string, score, idx = result
            pos.matched_product_id = candidate_ids[idx]
            pos.confidence = round(score / 100.0, 2)
            pos.match_type = "auto"
            pos.save(update_fields=["matched_product_id", "confidence", "match_type"])
            matched_count += 1

    logger.info(
        "AI Pipeline завершен для сметы #%s: %s/%s сопоставлено",
        estimate_id, matched_count, total
    )
    return {"matched": matched_count, "total": total}
