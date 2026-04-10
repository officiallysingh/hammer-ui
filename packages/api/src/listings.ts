import { apiClient } from './client';

export interface ListingVM {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  subCategory?: string;
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
  embedded: { typeId: string; pathWiseState: Record<string, unknown> };
}

export interface ListingUpdationRQ {
  name?: string;
  description?: string;
  tags?: string[];
  subCategory: string; // required per spec
  embedded?: { typeId: string; pathWiseState: Record<string, unknown> };
}

export interface ListingsFilter {
  phrases?: string[];
  categories?: string[];
  subCategories?: string[];
  page?: number;
  size?: number;
}

export const listingsApi = {
  getListings: async (filter: ListingsFilter = {}): Promise<PaginatedListings> => {
    const { phrases, categories, subCategories, page = 0, size = 16 } = filter;
    const response = await apiClient.get<PaginatedListings>('/api/v1/listings', {
      params: {
        ...(phrases?.length ? { phrases } : {}),
        ...(categories?.length ? { categories } : {}),
        ...(subCategories?.length ? { subCategories } : {}),
        page,
        size,
      },
    });
    return response.data;
  },

  getListingById: async (id: string): Promise<ListingVM> => {
    const response = await apiClient.get<ListingVM>(`/api/v1/listings/${id}`);
    return response.data;
  },

  createListing: async (data: ListingCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/listings', data);
  },

  updateListing: async (id: string, data: ListingUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/listings/${id}`, data);
  },

  deleteListing: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/listings/${id}`, { params: { id } });
  },
};
