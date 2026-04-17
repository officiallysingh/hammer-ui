import { apiClient } from './client';

export interface BlobMetadata {
  bucket: string;
  entityId?: string;
  classifier?: string;
  thumbnail?: string; // "true" | "false"
  [key: string]: string | undefined;
}

export interface BlobVM {
  id: string;
  fileName?: string;
  contentType?: string;
  size?: number;
  url?: string;
  metadata?: BlobMetadata;
}

export const blobsApi = {
  upload: async (file: File, metadata: BlobMetadata): Promise<BlobVM> => {
    const formData = new FormData();
    formData.append('file', file);
    // metadata sent as JSON string in `properties` field
    formData.append('properties', JSON.stringify(metadata));
    const response = await apiClient.post<BlobVM>('/api/v1/blobs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  getBlobsByEntityId: async (entityId: string): Promise<BlobVM[]> => {
    const response = await apiClient.get<BlobVM[]>(`/api/v1/blobs/entity/${entityId}`);
    return response.data;
  },

  deleteBlob: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/blobs/${id}`);
  },
};
