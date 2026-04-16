import apiClient from './client';
import type { Supplier, PaginatedResponse } from '../types';

export const suppliersApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Supplier>>('/suppliers/', { params }),

  get: (id: number) =>
    apiClient.get<Supplier>(`/suppliers/${id}/`),

  create: (data: Partial<Supplier>) =>
    apiClient.post<Supplier>('/suppliers/', data),

  update: (id: number, data: Partial<Supplier>) =>
    apiClient.put<Supplier>(`/suppliers/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/suppliers/${id}/`),
};
