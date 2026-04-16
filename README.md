# 📊 Система работы с прайс-листами и сметами

Полноценное веб-приложение для управления поставщиками, прайс-листами, каталогом товаров, проектами и сметами с AI-сопоставлением позиций.

## Стек технологий

| Компонент | Технология |
|---|---|
| Backend | Django 5.1 + Django REST Framework |
| Frontend | React 18 + TypeScript + Vite + Ant Design 5 |
| Database | PostgreSQL 16 |
| Task Queue | Celery 5 + Redis 7 |
| Excel | pandas + openpyxl |
| AI Matching | rapidfuzz (fuzzy matching) |
| Containerization | Docker + Docker Compose |

## Быстрый старт

### Требования

- Docker Desktop
- Docker Compose

### Запуск

```bash
# 1. Клонировать репозиторий и перейти в папку
cd test_simple_way

# 2. Запустить все сервисы
docker compose up --build

# 3. Приложение доступно:
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000/api/
# Admin:     http://localhost:8000/admin/
```

### Создание суперпользователя (для Django Admin)

```bash
docker compose exec backend python manage.py createsuperuser
```

## Архитектура

```
├── backend/
│   ├── price_system/    # Django project (settings, celery, urls)
│   ├── suppliers/       # Приложение «Поставщики»
│   ├── pricelists/      # Приложение «Прайс-листы»
│   ├── catalog/         # Приложение «Каталог товаров»
│   ├── projects/        # Приложение «Проекты и сметы»
│   └── core/            # Общие утилиты
├── frontend/
│   └── src/
│       ├── pages/       # Страницы приложения
│       ├── components/  # UI-компоненты
│       ├── api/         # API-клиент
│       └── types/       # TypeScript типы
└── docker-compose.yml
```

## Функциональность

### 1. Поставщики
- CRUD с поиском по названию и ИНН
- Привязка прайс-листов к поставщику

### 2. Прайс-листы
- Загрузка Excel (.xlsx, .xls)
- Превью данных перед парсингом
- Гибкая настройка маппинга колонок
- Фоновый парсинг через Celery с прогресс-баром

### 3. Каталог товаров
- CRUD товаров (артикул, название, ед. изм., группа)
- Поиск и фильтрация

### 4. Проекты и сметы
- Проекты содержат сметы
- Загрузка сметы из Excel с маппингом колонок
- Расширенный набор полей: кол-во, цена материалов, цена монтажа

### 5. AI-сопоставление
- Автоматическое сопоставление позиций сметы с товарами каталога
- Алгоритм: rapidfuzz token_sort_ratio (fuzzy matching)
- Порог совпадения: 75% (настраивается через MATCH_THRESHOLD)
- Цветовая индикация:
  - 🟢 > 80% — высокая уверенность
  - 🟡 50–80% — средняя
  - 🔴 < 50% — низкая
- Ручное сопоставление через dropdown

## API Endpoints

| Группа | URL | Описание |
|---|---|---|
| Поставщики | `/api/suppliers/` | CRUD + поиск |
| Прайсы | `/api/pricelists/` | CRUD + upload/preview/parse/status |
| Каталог | `/api/catalog/products/` | CRUD + поиск |
| Проекты | `/api/projects/` | CRUD |
| Сметы | `/api/projects/estimates/` | CRUD + upload/preview/parse/auto-match |
| Позиции | `/api/projects/estimate-positions/` | Ручное сопоставление |

## Переменные окружения

Настраиваются в файле `.env`:

| Переменная | Описание | По умолчанию |
|---|---|---|
| `POSTGRES_DB` | Имя БД | price_system |
| `POSTGRES_USER` | Пользователь | postgres |
| `POSTGRES_PASSWORD` | Пароль | postgres |
| `DJANGO_SECRET_KEY` | Секретный ключ | dev key |
| `MATCH_THRESHOLD` | Порог AI-сопоставления (%) | 75 |
