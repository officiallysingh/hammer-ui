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
   * The server returns 201. We try to get the blob ID from the Location header,
   * but if CORS doesn't expose it we fall back to fetching all blobs for the
   * entity and matching by fileName.
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

    // Try Location header first: e.g. /api/v1/blobs/abc123
    const location: string = response.headers['location'] ?? response.headers['Location'] ?? '';
    const idFromLocation = location.split('/').filter(Boolean).pop() ?? '';

    if (idFromLocation) {
      return blobsApi.getBlobById(idFromLocation);
    }

    // Fallback: body may contain id directly
    const body = response.data as Record<string, unknown> | null;
    if (body && typeof body === 'object' && typeof body['id'] === 'string') {
      return body as unknown as BlobVM;
    }

    // Last resort: fetch all blobs for the entity and find the one matching this file name.
    // The server upload succeeded (2xx) so the blob exists — we just can't get its ID directly.
    if (properties.entityId) {
      const blobs = await blobsApi.getBlobsByEntityId(properties.entityId);
      // Most recently uploaded will be last; match by fileName
      const match = [...blobs].reverse().find((b) => b.fileName === file.name);
      if (match) return match;
      // If no name match, return the most recent blob for this entity
      if (blobs.length > 0) return blobs[blobs.length - 1]!;
    }

    // Upload succeeded but we truly cannot identify the blob — return a minimal stub
    // so the UI doesn't show "Upload failed". The blob IS on the server.
    return { id: '', fileName: file.name, classifier: properties.classifier };
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
