import { apiClient } from './client';

// ── View Models ──────────────────────────────────────────────────────────────

// States / Cities / Areas
export interface StateVM {
  id: string;
  name: string;
  cities?: CityVM[];
}

export interface CityVM {
  id: string;
  name: string;
  state?: StateVM;
  areas?: AreaVM[];
}

export interface AreaVM {
  id: string;
  name: string;
  pinCode?: string;
  city?: CityVM;
}

// Request Models
export interface StateCreationRQ {
  name: string;
}

export interface CityCreationRQ {
  name: string;
}

export interface AreaCreationRQ {
  name: string;
}

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
  // States
  getStates: async (includeCities = false): Promise<StateVM[]> => {
    const response = await apiClient.get('/api/v1/master/states', {
      headers: includeCities ? { 'x-expand': 'cities' } : undefined,
    });
    return response.data;
  },

  createState: async (data: StateCreationRQ): Promise<void> => {
    await apiClient.post('/api/v1/master/states', data);
  },

  // Cities
  getCitiesByState: async (stateId: string, expand?: ('state' | 'areas')[]): Promise<CityVM[]> => {
    const response = await apiClient.get(`/api/v1/master/states/${stateId}/cities`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    return response.data;
  },

  createCity: async (stateId: string, data: CityCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/states/${stateId}/cities`, data);
  },

  // Areas
  getAreasByCity: async (cityId: string, includeCity = false): Promise<AreaVM[]> => {
    const response = await apiClient.get(`/api/v1/master/cities/${cityId}/areas`, {
      headers: includeCity ? { 'x-expand': 'city' } : undefined,
    });
    return response.data;
  },

  getAreasByPinCode: async (pinCode: string): Promise<AreaVM[]> => {
    const response = await apiClient.get(`/api/v1/master/areas/pin-code/${pinCode}`, {
      headers: { 'x-expand': 'city' },
    });
    return response.data;
  },

  getCityByPinCode: async (pinCode: string): Promise<CityVM> => {
    const response = await apiClient.get(`/api/v1/master/cities/pin-code/${pinCode}`, {
      headers: { 'x-expand': 'state,areas' },
    });
    return response.data;
  },

  getCityById: async (cityId: string, expand?: ('state' | 'areas')[]): Promise<CityVM> => {
    const response = await apiClient.get(`/api/v1/master/cities/${cityId}`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
    return response.data;
  },

  createArea: async (cityId: string, data: AreaCreationRQ): Promise<void> => {
    await apiClient.post(`/api/v1/master/cities/${cityId}/areas`, data);
  },

  // Categories
  getCategories: async (
    includeSubCategories = false,
    phrases?: string[],
  ): Promise<CategoryVM[]> => {
    const response = await apiClient.get('/api/v1/master/categories', {
      headers: { 'x-expand': includeSubCategories },
      params: phrases?.length ? { phrases } : undefined,
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
