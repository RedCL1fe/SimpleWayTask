import apiClient from './client';
import type {
  Project, ProjectDetail, Estimate, EstimatePosition,
  PaginatedResponse, PreviewData, ParseStatus,
} from '../types';

export const projectsApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Project>>('/projects/', { params }),

  get: (id: number) =>
    apiClient.get<ProjectDetail>(`/projects/${id}/`),

  create: (data: Partial<Project>) =>
    apiClient.post<Project>('/projects/', data),

  update: (id: number, data: Partial<Project>) =>
    apiClient.put<Project>(`/projects/${id}/`, data),

  delete: (id: number) =>
    apiClient.delete(`/projects/${id}/`),
};

export const estimatesApi = {
  list: (params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<Estimate>>('/projects/estimates/', { params }),

  get: (id: number) =>
    apiClient.get<Estimate>(`/projects/estimates/${id}/`),

  upload: (projectId: number, file: File, name?: string) => {
    const formData = new FormData();
    formData.append('project', String(projectId));
    formData.append('file', file);
    if (name) formData.append('name', name);
    return apiClient.post<Estimate>('/projects/estimates/upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  preview: (id: number, startRow: number = 1, startColumn: number = 1) =>
    apiClient.get<PreviewData>(`/projects/estimates/${id}/preview/`, { 
        params: { 
            start_row: startRow,
            start_column: startColumn
        } 
    }),

  parse: (id: number, mapping: Record<string, string>, startRow: number = 1, startColumn: number = 1) =>
    apiClient.post(`/projects/estimates/${id}/parse/`, { 
      mapping, 
      start_row: startRow, 
      start_column: startColumn 
    }),

  status: (id: number) =>
    apiClient.get<ParseStatus>(`/projects/estimates/${id}/status/`),

  positions: (id: number, params?: Record<string, string | number>) =>
    apiClient.get<PaginatedResponse<EstimatePosition>>(`/projects/estimates/${id}/positions/`, { params }),

  autoMatch: (id: number) =>
    apiClient.post(`/projects/estimates/${id}/auto-match/`),

  manualMatch: (positionId: number, productId: number | null) =>
    apiClient.patch(`/projects/estimate-positions/${positionId}/match/`, {
      product_id: productId,
    }),

  delete: (id: number) =>
    apiClient.delete(`/projects/estimates/${id}/`),
};
