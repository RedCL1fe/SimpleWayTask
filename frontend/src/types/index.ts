// --- Поставщики ---
export interface Supplier {
  id: number;
  name: string;
  inn: string;
  contact_person: string;
  phone: string;
  email: string;
  currency: string;
  pricelists_count: number;
  created_at: string;
  updated_at: string;
}

// --- Каталог ---
export interface Product {
  id: number;
  article: string;
  name: string;
  unit: string;
  group: string;
  created_at: string;
}

export interface ProductShort {
  id: number;
  article: string;
  name: string;
  label: string;
}

// --- Прайс-листы ---
export interface PriceList {
  id: number;
  supplier: number;
  supplier_name: string;
  original_filename: string;
  status: 'uploaded' | 'processing' | 'done' | 'error';
  mapping_config: Record<string, string>;
  total_rows: number;
  processed_rows: number;
  progress: number;
  positions_count: number;
  error_message: string;
  upload_date: string;
}

export interface PriceListPosition {
  id: number;
  row_number: number;
  article: string;
  name: string;
  price: number;
  unit: string;
  matched_product: number | null;
  matched_product_name: string | null;
}

// --- Проекты ---
export interface Project {
  id: number;
  name: string;
  description: string;
  estimates_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends Project {
  estimates: Estimate[];
}

// --- Сметы ---
export interface Estimate {
  id: number;
  project: number;
  name: string;
  original_filename: string;
  status: 'uploaded' | 'processing' | 'done' | 'error';
  mapping_config: Record<string, string>;
  total_rows: number;
  processed_rows: number;
  progress: number;
  positions_count: number;
  matched_count: number;
  error_message: string;
  upload_date: string;
}

export interface EstimatePosition {
  id: number;
  row_number: number;
  original_name: string;
  original_article: string;
  unit: string;
  quantity: number;
  material_price: number | null;
  installation_price: number | null;
  matched_product: number | null;
  matched_product_name: string | null;
  confidence: number | null;
  match_type: 'none' | 'auto' | 'manual';
}

// --- Превью ---
export interface PreviewData {
  columns: string[];
  rows: string[][];
  total_preview_rows: number;
}

// --- Пагинация ---
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Статус парсинга ---
export interface ParseStatus {
  status: string;
  total_rows: number;
  processed_rows: number;
  progress: number;
  error_message: string;
}
