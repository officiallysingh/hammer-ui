import { apiClient } from './client';

export type MetaType =
  | 'BOOLEAN'
  | 'BYTE'
  | 'SHORT'
  | 'INTEGER'
  | 'LONG'
  | 'FLOAT'
  | 'DOUBLE'
  | 'BIG_INTEGER'
  | 'BIG_DECIMAL'
  | 'STRING'
  | 'YEAR'
  | 'MONTH'
  | 'DAY_OF_WEEK'
  | 'YEAR_MONTH'
  | 'LOCAL_DATE'
  | 'LOCAL_TIME'
  | 'LOCAL_DATE_TIME'
  | 'OFFSET_TIME'
  | 'OFFSET_DATE_TIME'
  | 'ZONED_DATE_TIME'
  | 'INSTANT'
  | 'LIST'
  | 'SET'
  | 'COORDINATES'
  | 'ADDRESS'
  | 'FILE';

export type PropertyType =
  | 'SIMPLE_PROPERTY'
  | 'COMPOSITE_PROPERTY'
  | 'COMPLEX_PROPERTY'
  | 'LIST_PROPERTY'
  | 'SET_PROPERTY';

export type ManagedTypeType = 'EMBEDDABLE' | 'ENTITY' | 'FORM' | 'WORKFLOW';
export type ManagedTypeClassifier = 'CATALOG' | 'AUCTION_PROPERTIES';

export interface ValidatorDef {
  type: string;
  message?: string;
}

export interface PropertyDef {
  type: PropertyType;
  name: string;
  label: string;
  metaType: MetaType;
  path?: string;
  value?: PropertyDef[]; // child properties for COMPOSITE/LIST/SET
  validators?: ValidatorDef[];
  subProperties?: PropertyDef; // single nested definition for COMPOSITE
  attributes?: Record<string, string>;
}

export interface ManagedTypeVM {
  id: string;
  name: string;
  description?: string;
  type: ManagedTypeType;
  classifier: ManagedTypeClassifier;
  properties?: PropertyDef[];
  tags?: string[];
}

export interface PaginatedManagedTypes {
  content?: ManagedTypeVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Matches ManagedTypeCreationRQ in spec
export interface ManagedTypeCreationReq {
  name: string;
  description: string;
  type: ManagedTypeType;
  classifier: ManagedTypeClassifier;
  properties: PropertyDef[];
  tags?: string[];
}

// Matches ManagedTypeUpdationRQ in spec — type is required
export interface ManagedTypeUpdationReq {
  name?: string;
  description?: string;
  type: ManagedTypeType;
  classifier?: ManagedTypeClassifier;
  properties?: PropertyDef[];
  tags?: string[];
}

// list-items endpoint returns PairStringString[] — normalize to {key, value}
export interface ManagedTypeListItem {
  key: string; // id
  value: string; // name
}

// Normalize [{"BOOLEAN": "Boolean"}, ...] → [{key, value}]
function normalizePairs(data: Record<string, string>[]): { key: string; value: string }[] {
  return data.map((item) => {
    const key = Object.keys(item)[0] ?? '';
    return { key, value: item[key] ?? key };
  });
}

export const metadataApi = {
  // GET /api/v1/meta-data/managed-types (updated path)
  getManagedTypes: async (params?: {
    phrases?: string[];
    type?: ManagedTypeType;
    page?: number;
    size?: number;
  }): Promise<PaginatedManagedTypes> => {
    const response = await apiClient.get<PaginatedManagedTypes>('/api/v1/meta-data/managed-types', {
      params: {
        ...(params?.phrases?.length ? { phrases: params.phrases } : {}),
        ...(params?.type ? { type: params.type } : {}),
        page: params?.page ?? 0,
        size: params?.size ?? 16,
      },
    });
    return response.data;
  },

  // GET /api/v1/meta-data/managed-types/{id}
  getManagedTypeById: async (id: string): Promise<ManagedTypeVM> => {
    const response = await apiClient.get<ManagedTypeVM>(`/api/v1/meta-data/managed-types/${id}`);
    return response.data;
  },

  // GET /api/v1/meta-data/managed-types/list-items → PairStringString[] (key=id, value=name)
  getManagedTypeListItems: async (): Promise<ManagedTypeListItem[]> => {
    const response = await apiClient.get<Record<string, string>[]>(
      '/api/v1/meta-data/managed-types/list-items',
    );
    return normalizePairs(response.data);
  },

  // POST /api/v1/meta-data/managed-types
  createManagedType: async (data: ManagedTypeCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/meta-data/managed-types', data);
  },

  // PATCH /api/v1/meta-data/managed-types/{id} (id also as query param per spec)
  updateManagedType: async (id: string, data: ManagedTypeUpdationReq): Promise<void> => {
    await apiClient.patch(`/api/v1/meta-data/managed-types/${id}`, data, {
      params: { id },
    });
  },

  // DELETE /api/v1/meta-data/managed-types/{id} (updated path)
  deleteManagedType: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/meta-data/managed-types/${id}`);
  },

  getManagedTypeTypes: async (): Promise<{ key: string; value: string }[]> => {
    const response = await apiClient.get<Record<string, string>[]>(
      '/api/v1/meta-data/model/managed-types/types',
    );
    return normalizePairs(response.data);
  },

  getClassifierTypes: async (): Promise<{ key: string; value: string }[]> => {
    const response = await apiClient.get<Record<string, string>[]>(
      '/api/v1/meta-data/model/classifier-types',
    );
    return normalizePairs(response.data);
  },

  getMetaTypes: async (): Promise<{ key: string; value: string }[]> => {
    const response = await apiClient.get<Record<string, string>[]>(
      '/api/v1/meta-data/model/meta-types',
    );
    return normalizePairs(response.data);
  },

  getValidatorsForMetaType: async (
    metaType: MetaType,
  ): Promise<{ key: string; value: string }[]> => {
    const response = await apiClient.get<Record<string, string>[]>(
      `/api/v1/meta-data/model/meta-types/${metaType}/validators`,
    );
    return normalizePairs(response.data);
  },
};
