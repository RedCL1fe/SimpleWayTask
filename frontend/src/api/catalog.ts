import apiClient from './client';
import type { Product, ProductShort, PaginatedResponse } from '../types';

export const catalogApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Product>>('/catalog/products/', { params }),

  listShort: (search?: string) =>
    apiClient.get<PaginatedResponse<ProductShort>>('/catalog/products/', {
      params: { short: 'true', search, page_size: 100 },
    }),

  get: (id: number) =>
    apiClient.get<Product>(`/catalog/products/${id}/`),

  create: (data: Partial<Product>) =>
    apiClient.post<Product>('/catalog/products/', data),

  update: (id: number, data: Partial<Product>) =>
    apiClient.put<Product>(`/catalog/products/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/catalog/products/${id}/`),
};
