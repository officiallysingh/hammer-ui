import { apiClient } from './client';

export interface ListingCategoryRef {
  id: string;
  name: string;
  icon?: string;
}

export interface ListingBlobRef {
  id: string;
  fileName?: string;
  mediaType?: string;
  size?: string;
  classifier?: string;
  type?: string;
  metadata?: Record<string, string>;
}

export interface ListingQuantity {
  allocated?: number | null;
  available?: number | null;
  inAuction?: number | null;
  sold?: number | null;
}

export interface ListingVM {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  /** API returns either the subcategory id (string) or a full object */
  subCategory?: string | ListingCategoryRef;
  category?: ListingCategoryRef;
  status?: string;
  available?: boolean;
  quantity?: ListingQuantity;
  blobs?: ListingBlobRef[];
  embedded?: Record<string, unknown>;
}

export interface PaginatedListings {
  content?: ListingVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
    header?: string;
  };
}

export interface ListingCreationRQ {
  name: string;
  description?: string;
  tags?: string[];
  subCategory: string;
  quantity?: number;
  embedded?: { typeId: string; pathWiseState: Record<string, unknown> };
}

export interface BlobPropertyPatch {
  bucket?: string;
  classifier?: string;
  entityId?: string;
  metadata?: Record<string, string>;
}

export interface ListingUpdationRQ {
  name?: string;
  description?: string;
  tags?: string[];
  subCategory?: string;
  quantity?: number;
  blobs?: string[];
  blobProperties?: Record<string, BlobPropertyPatch>; // key = blobId
  embedded?: { typeId: string; pathWiseState: Record<string, unknown> };
}

export interface ListingsFilter {
  phrases?: string[];
  available?: boolean;
  categories?: string[];
  subCategories?: string[];
  page?: number;
  size?: number;
}

export const listingsApi = {
  getListings: async (filter: ListingsFilter = {}): Promise<PaginatedListings> => {
    const { phrases, available, categories, subCategories, page = 0, size = 16 } = filter;
    const response = await apiClient.get<PaginatedListings>('/api/v1/listings', {
      params: {
        ...(phrases?.length ? { phrases } : {}),
        ...(available !== undefined ? { available } : {}),
        ...(categories?.length ? { categories } : {}),
        ...(subCategories?.length ? { subCategories } : {}),
        page,
        size,
      },
    });
    return response.data;
  },

  getListingById: async (id: string): Promise<ListingVM> => {
    const response = await apiClient.get<ListingVM>(`/api/v1/listings/${id}`, {
      headers: { 'x-expand': 'true' },
    });
    return response.data;
  },

  createListing: async (data: ListingCreationRQ) => {
    const response = await apiClient.post<{ id: string }>('/api/v1/listings', data);
    return response.data.id;
  },

  updateListing: async (id: string, data: ListingUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/listings/${id}`, data);
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/listings/${id}`, { params: { id } });
  },
};
