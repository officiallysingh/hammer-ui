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
  value?: unknown;
  validators?: ValidatorDef[];
  // for COMPOSITE_PROPERTY
  subProperties?: PropertyDef[];
  // for COMPLEX_PROPERTY
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

export interface ManagedTypeCreationReq {
  name: string;
  description: string;
  type: ManagedTypeType;
  classifier: ManagedTypeClassifier;
  properties: PropertyDef[];
  tags?: string[];
}

export interface ManagedTypeUpdationReq {
  name?: string;
  description?: string;
  type: ManagedTypeType; // required per spec
  classifier?: ManagedTypeClassifier;
  properties?: PropertyDef[];
  tags?: string[];
}

// Normalize the API's single-key-object format [{"BOOLEAN": "Boolean"}, ...] → [{key, value}]
function normalizePairs(data: Record<string, string>[]): { key: string; value: string }[] {
  return data.map((item) => {
    const key = Object.keys(item)[0] ?? '';
    return { key, value: item[key] ?? key };
  });
}

export const metadataApi = {
  getManagedTypes: async (params?: {
    phrases?: string[];
    type?: ManagedTypeType;
    page?: number;
    size?: number;
  }): Promise<PaginatedManagedTypes> => {
    const response = await apiClient.get<PaginatedManagedTypes>('/api/v1/meta-data', {
      params: {
        ...(params?.phrases?.length ? { phrases: params.phrases } : {}),
        ...(params?.type ? { type: params.type } : {}),
        page: params?.page ?? 0,
        size: params?.size ?? 16,
      },
    });
    return response.data;
  },

  getManagedTypeById: async (id: string): Promise<ManagedTypeVM> => {
    const response = await apiClient.get<ManagedTypeVM>(`/api/v1/meta-data/managed-types/${id}`);
    return response.data;
  },

  createManagedType: async (data: ManagedTypeCreationReq): Promise<void> => {
    await apiClient.post('/api/v1/meta-data/managed-types', data);
  },

  updateManagedType: async (id: string, data: ManagedTypeUpdationReq): Promise<void> => {
    await apiClient.patch(`/api/v1/meta-data/managed-types/${id}`, data, {
      params: { id },
    });
  },

  deleteManagedType: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/meta-data/${id}`);
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
