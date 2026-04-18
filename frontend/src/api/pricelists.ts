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

  preview: (id: number, startRow?: number, startColumn?: number) =>
    apiClient.get<PreviewData>(`/pricelists/${id}/preview/`, { 
        params: { 
            start_row: startRow,
            start_column: startColumn 
        } 
    }),

  parse: (id: number, mapping: Record<string, string>, startRow?: number, startColumn?: number) =>
    apiClient.post(`/pricelists/${id}/parse/`, { mapping, start_row: startRow, start_column: startColumn }),

  status: (id: number) =>
    apiClient.get<ParseStatus>(`/pricelists/${id}/status/`),

  globalPositions: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PriceListPosition>>(`/pricelists/positions/`, { params }),

  positions: (id: number, params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<PriceListPosition>>(`/pricelists/${id}/positions/`, { params }),

  delete: (id: number) =>
    apiClient.delete(`/pricelists/${id}/`),
};
