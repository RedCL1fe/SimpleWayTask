import logging

import pandas as pd
from celery import shared_task
from django.db import transaction

logger = logging.getLogger(__name__)


@shared_task(bind=True)
def parse_pricelist_task(self, pricelist_id: int):
    # Фоновый парсинг Excel-прайса по сохранённому маппингу колонок
    from .models import PriceList, PriceListPosition

    pricelist = PriceList.objects.get(id=pricelist_id)
    pricelist.status = "processing"
    pricelist.celery_task_id = self.request.id or ""
    pricelist.save(update_fields=["status", "celery_task_id"])

    try:
        file_path = pricelist.original_file.path
        mapping = pricelist.mapping_config

        # Определяем движок по расширению
        engine = "openpyxl"
        if file_path.endswith(".xls"):
            engine = "xlrd"

        # Читаем весь файл без заголовков, чтобы маппинг был по абсолютным номерам колонок
        df = pd.read_excel(file_path, engine=engine, dtype=str, header=None)
        
        # Называем колонки "Колонка 1", "Колонка 2" и т.д. абсолютно (A=1, B=2...)
        df.columns = [f"Колонка {i+1}" for i in range(len(df.columns))]
        df = df.fillna("")

        # Всего строк для обработки
        total_rows = len(df)
        to_process = max(0, total_rows - (pricelist.start_row - 1))
        pricelist.total_rows = to_process
        pricelist.save(update_fields=["total_rows"])

        # Маппинг: ключ = поле модели, значение = название колонки Excel
        standard_keys = {"article", "name", "price", "unit", "currency"}
        
        col_article = mapping.get("article", "")
        col_name = mapping.get("name", "")
        col_price = mapping.get("price", "")
        col_unit = mapping.get("unit", "")
        col_currency = mapping.get("currency", "")
        
        # Динамические колонки берем только те, что НЕ левее start_column (по желанию пользователя игнорировать лево)
        dynamic_keys = {
            k: v for k, v in mapping.items() 
            if k not in standard_keys and v 
        }

        positions = []
        batch_size = 500

        # Итерируемся по строкам, начиная со start_row
        for idx, row in df.iterrows():
            row_idx = idx + 1 # 1-based index
            if row_idx < pricelist.start_row:
                continue

            article = str(row.get(col_article, "")).strip() if col_article else ""
            name = str(row.get(col_name, "")).strip() if col_name else ""
            price_raw = str(row.get(col_price, "0")).strip() if col_price else "0"
            unit = str(row.get(col_unit, "")).strip() if col_unit else ""
            currency = str(row.get(col_currency, "")).strip() if col_currency else ""

            # Парсим цену: убираем пробелы и заменяем запятую на точку
            price_raw = price_raw.replace(" ", "").replace(",", ".").replace("р.", "").replace("₽", "")
            try:
                price_val = round(float(price_raw), 2)
            except (ValueError, TypeError):
                price_val = 0.0

            # Пропускаем строки без названия и артикула
            if not name and not article:
                pricelist.processed_rows += 1
                continue
                
            additional_data = {}
            for d_key, d_col in dynamic_keys.items():
                val = str(row.get(d_col, "")).strip()
                if val and val.lower() != "nan":
                    additional_data[d_key] = val

            positions.append(
                PriceListPosition(
                    price_list=pricelist,
                    row_number=idx + 1,
                    article=article[:100],
                    name=name[:500],
                    price=price_val,
                    currency=currency[:10],
                    unit=unit[:50],
                    additional_data=additional_data,
                )
            )

            # Сохраняем батчами
            if len(positions) >= batch_size:
                PriceListPosition.objects.bulk_create(positions)
                pricelist.processed_rows += len(positions)
                pricelist.save(update_fields=["processed_rows"])
                positions = []

        # Дописываем оставшиеся
        if positions:
            PriceListPosition.objects.bulk_create(positions)
            pricelist.processed_rows = pricelist.total_rows
            pricelist.save(update_fields=["processed_rows"])

        pricelist.status = "done"
        pricelist.save(update_fields=["status"])
        logger.info("Прайс #%s успешно распарсен: %s позиций", pricelist_id, pricelist.positions.count())

    except Exception as exc:
        pricelist.status = "error"
        pricelist.error_message = str(exc)[:2000]
        pricelist.save(update_fields=["status", "error_message"])
        logger.exception("Ошибка парсинга прайса #%s", pricelist_id)
        raise
