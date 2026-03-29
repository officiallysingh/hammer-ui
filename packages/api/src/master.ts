import { apiClient } from './client';

// ── View Models ──────────────────────────────────────────────────────────────

export interface CategoryVM {
  id: string;
  code: string;
  name: string;
  icon?: string;
  subCategories?: SubCategoryVM[];
}

export interface SubCategoryVM {
  id: string;
  code: string;
  name: string;
  icon?: string;
  category?: CategoryVM;
}

// ── Request Models ───────────────────────────────────────────────────────────

export interface CategoryCreationRQ {
  name: string;
  icon?: string;
}

export interface CategoryUpdationRQ {
  name?: string;
  icon?: string;
}

export interface SubCategoryCreationRQ {
  name: string;
  icon?: string;
}

export interface SubCategoryUpdationRQ {
  categoryId: string;
  name?: string;
  icon?: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

export const masterApi = {
  // Categories
  getCategories: async (includeSubCategories = false, phrases?: string): Promise<CategoryVM[]> => {
    const response = await apiClient.get('/api/v1/master/categories', {
      headers: { 'x-expand': includeSubCategories },
      params: phrases ? { phrases } : undefined,
    });
    return response.data;
  },

  getCategoryById: async (id: string, includeSubCategories = false): Promise<CategoryVM> => {
    const response = await apiClient.get(`/api/v1/master/categories/${id}`, {
      headers: { 'x-expand': includeSubCategories },
    });
    return response.data;
  },

  createCategory: async (data: CategoryCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/master/categories', data);
  },

  updateCategory: async (id: string, data: CategoryUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/categories/${id}`, data);
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/categories/${id}`);
  },

  // Sub Categories
  getSubCategoriesByCategory: async (
    categoryId: string,
    includeCategory = false,
  ): Promise<SubCategoryVM[]> => {
    const response = await apiClient.get(`/api/v1/master/categories/${categoryId}/sub-categories`, {
      headers: { 'x-expand': includeCategory },
    });
    return response.data;
  },

  createSubCategory: async (categoryId: string, data: SubCategoryCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/categories/${categoryId}/sub-categories`, data);
  },

  updateSubCategory: async (id: string, data: SubCategoryUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/master/sub-categories/${id}`, data);
  },

  deleteSubCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/master/sub-categories/${id}`);
  },
};
