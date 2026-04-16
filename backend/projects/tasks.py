import logging

import pandas as pd
from celery import shared_task
from django.conf import settings
from rapidfuzz import fuzz, process

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def parse_estimate_task(self, estimate_id: int):
    """Фоновый парсинг Excel-сметы по сохранённому маппингу колонок."""
    from .models import Estimate, EstimatePosition

    estimate = Estimate.objects.get(id=estimate_id)
    estimate.status = "processing"
    estimate.celery_task_id = self.request.id or ""
    estimate.save(update_fields=["status", "celery_task_id"])

    try:
        file_path = estimate.original_file.path
        mapping = estimate.mapping_config

        engine = "xlrd" if file_path.endswith(".xls") else "openpyxl"
        df = pd.read_excel(file_path, engine=engine, dtype=str)
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


@shared_task(bind=True)
def auto_match_estimate_positions(self, estimate_id: int):
    """
    Автоматическое AI-сопоставление позиций сметы с товарами каталога.
    Использует rapidfuzz (token_sort_ratio) для fuzzy-matching по названию + артикулу.
    """
    from catalog.models import Product
    from .models import Estimate, EstimatePosition

    estimate = Estimate.objects.get(id=estimate_id)
    threshold = getattr(settings, "MATCH_THRESHOLD", 75)

    positions = EstimatePosition.objects.filter(
        estimate_id=estimate_id, match_type="none"
    )
    all_products = list(Product.objects.all().values("id", "article", "name"))

    if not all_products:
        logger.warning("Каталог пуст — сопоставление невозможно")
        return {"matched": 0, "total": positions.count()}

    # Формируем список для rapidfuzz: (строка_для_поиска, id_товара)
    product_strings = [f"{p['article']} {p['name']}" for p in all_products]
    product_ids = [p["id"] for p in all_products]

    matched_count = 0
    total = positions.count()

    for pos in positions:
        search_query = f"{pos.original_article} {pos.original_name}".strip()

        result = process.extractOne(
            search_query,
            product_strings,
            scorer=fuzz.token_sort_ratio,
            score_cutoff=threshold,
        )

        if result:
            matched_string, score, idx = result
            pos.matched_product_id = product_ids[idx]
            pos.confidence = round(score / 100.0, 2)
            pos.match_type = "auto"
            pos.save(update_fields=["matched_product_id", "confidence", "match_type"])
            matched_count += 1

    logger.info(
        "Сопоставление сметы #%s: %s/%s совпадений (порог %s%%)",
        estimate_id, matched_count, total, threshold,
    )
    return {"matched": matched_count, "total": total}
