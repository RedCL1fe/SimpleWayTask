import apiClient from './client';
import type { PriceList, PriceListPosition, PaginatedResponse, PreviewData, ParseStatus } from '../types';

export const pricelistsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PriceList>>('/pricelists/', { params }),

  get: (id: number) =>
    apiClient.get<PriceList>(`/pricelists/${id}/`),

  upload: (supplierId: number, file: File) => {
    const formData = new FormData();
    formData.append('supplier', String(supplierId));
    formData.append('file', file);
    return apiClient.post<PriceList>('/pricelists/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  preview: (id: number) =>
    apiClient.get<PreviewData>(`/pricelists/${id}/preview/`),

  parse: (id: number, mapping: Record<string, string>) =>
    apiClient.post(`/pricelists/${id}/parse/`, { mapping }),

  status: (id: number) =>
    apiClient.get<ParseStatus>(`/pricelists/${id}/status/`),

  positions: (id: number, params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PriceListPosition>>(`/pricelists/${id}/positions/`, { params }),

  delete: (id: number) =>
    apiClient.delete(`/pricelists/${id}/`),
};
