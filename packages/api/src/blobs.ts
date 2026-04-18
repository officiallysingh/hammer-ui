import { apiClient } from './client';

export interface BlobMetadata {
  bucket: string;
  entityId?: string;
  entityType?: string;
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

    formData.append(
      'properties',
      new Blob([JSON.stringify(metadata)], {
        type: 'application/json',
      }),
    );

    const response = await apiClient.post('/api/v1/blobs', formData, {
      headers: {
        // âœ… override/remove JSON header
        'Content-Type': undefined,
      },
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
