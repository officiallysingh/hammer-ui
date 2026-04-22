import { apiClient } from './client';

// Matches BlobProperties in spec
export interface BlobProperties {
  bucket: string;
  classifier?: string;
  entityId?: string;
  metadata?: Record<string, string>; // arbitrary key/value, e.g. { thumbnail: "true", entityType: "listing" }
}

// Matches MediaType in spec
export interface BlobMediaType {
  type?: string;
  subtype?: string;
  parameters?: Record<string, string>;
  qualityValue?: number;
  charset?: string;
  concrete?: boolean;
  wildcardSubtype?: boolean;
  subtypeSuffix?: string;
  wildcardType?: boolean;
}

// Matches BlobVM in spec
export interface BlobVM {
  id: string;
  bucket?: string;
  fileName?: string;
  mediaType?: BlobMediaType;
  size?: { negative?: boolean }; // DataSize — not a raw number per spec
  classifier?: string; // top-level, not inside metadata
  entityId?: string;
  owner?: string;
  metadata?: Record<string, string>; // arbitrary key/value (e.g. thumbnail, entityType)
}

export const blobsApi = {
  /**
   * POST /api/v1/blobs — multipart upload.
   * The server returns 201 with the new blob ID in the Location header.
   * We extract the ID from the Location path and then fetch the full BlobVM.
   */
  upload: async (file: File, properties: BlobProperties): Promise<BlobVM> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append(
      'properties',
      new Blob([JSON.stringify(properties)], { type: 'application/json' }),
    );

    const response = await apiClient.post<unknown>('/api/v1/blobs', formData, {
      headers: { 'Content-Type': undefined },
    });

    // Extract blob ID from Location header: e.g. /api/v1/blobs/abc123
    const location: string = response.headers['location'] ?? response.headers['Location'] ?? '';
    const id = location.split('/').filter(Boolean).pop() ?? '';

    if (!id) {
      // Fallback: if server ever returns body with id
      const body = response.data as Record<string, unknown> | null;
      if (body && typeof body === 'object' && typeof body['id'] === 'string') {
        return body as unknown as BlobVM;
      }
      throw new Error('Blob upload succeeded but no ID could be determined from Location header.');
    }

    // Fetch the full BlobVM so callers have all metadata
    return blobsApi.getBlobById(id);
  },

  getBlobById: async (id: string): Promise<BlobVM> => {
    const response = await apiClient.get<BlobVM>(`/api/v1/blobs/${id}`);
    return response.data;
  },

  getBlobsByEntityId: async (entityId: string): Promise<BlobVM[]> => {
    const response = await apiClient.get<BlobVM[]>(`/api/v1/blobs/entity/${entityId}`);
    return response.data;
  },

  /** Returns the absolute URL to stream/download the raw file */
  getDownloadUrl: (id: string): string =>
    `${apiClient.defaults.baseURL}/api/v1/blobs/${id}/download`,

  deleteBlob: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/blobs/${id}`);
  },
};
