import { apiClient } from './client';

export interface AuctionProtocol {
  accessibility: string;
  direction: string;
  dimension: string;
  participantVisibility: string;
  offerVisibility: string;
}

export interface AuctionMonetaryOptions {
  currencyUnit: string;
  precision: number;
  roundingMode: string;
}

export interface AuctionSchedule {
  startTime?: string;
  endTime?: string;
}

export type AuctionUnitType = 'SINGLE_UNIT' | 'BUNDLE' | 'MULTI_UNIT' | 'LOT';

export interface AuctionUnitBody {
  type: AuctionUnitType;
  openingPrice: number;
  item?: string; // SINGLE_UNIT
  items?: string[]; // BUNDLE / MULTI_UNIT / LOT
}

export interface AuctionUnit {
  type: AuctionUnitType;
  openingPrice?: number;
  item?: string;
  items?: string[];
}

export interface AuctionPolicies {
  basePrice?: number;
  stepPrice?: number;
  reservePrice?: number;
}

export interface AuctionVM {
  id: string;
  type?: string;
  format?: string;
  status?: string;
  title: string;
  description?: string;
  referenceId?: string;
  protocol?: AuctionProtocol;
  monetaryOptions?: AuctionMonetaryOptions;
  schedule?: AuctionSchedule;
  policies?: AuctionPolicies;
  units?: AuctionUnit[];
  blobs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedAuctions {
  content?: AuctionVM[];
  page?: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
    hasNext: boolean;
    hasPrevious: boolean;
    isFirst?: boolean;
    isLast?: boolean;
  };
}

export interface AuctionCreationRQ {
  type: string;
  format: string;
  protocol: AuctionProtocol;
  title: string;
  description?: string;
  referenceId?: string;
  monetaryOptions: AuctionMonetaryOptions;
  tags?: string[];
  subCategories?: string[];
  unit?: AuctionUnitBody;
}

export interface AuctionUpdationRQ {
  title?: string;
  description?: string;
  referenceId?: string;
  protocol?: Partial<AuctionProtocol>;
  monetaryOptions?: Partial<AuctionMonetaryOptions>;
}

export interface AuctionScheduleRQ {
  startTime: string;
  endTime: string;
}

export interface AuctionPoliciesCreationRQ {
  basePrice: number;
  stepPrice: number;
  reservePrice?: number;
}

export interface AuctionUnitCreationRQ {
  tags?: string[];
  subCategories?: string[];
  unit: AuctionUnitBody;
}

export interface AuctionBlobsCreationRQ {
  blobIds: string[];
}

/** Model endpoints return arrays of single-key objects: [{ "KEY": "Label" }, ...] */
export type AuctionModelEntry = Record<string, string>;

function parseModelOptions(entries: AuctionModelEntry[]): { value: string; label: string }[] {
  return entries.flatMap((entry) =>
    Object.entries(entry).map(([value, label]) => ({ value, label })),
  );
}

export const auctionsApi = {
  createAuction: async (data: AuctionCreationRQ): Promise<string> => {
    const response = await apiClient.post<{ id: string }>('/api/v1/auctions', data);
    return response.data.id;
  },

  updateAuction: async (id: string, data: AuctionUpdationRQ): Promise<void> => {
    await apiClient.patch(`/api/v1/auctions/${id}`, data);
  },

  getAuctions: async (
    params: { page?: number; size?: number } = {},
  ): Promise<PaginatedAuctions> => {
    const response = await apiClient.get<PaginatedAuctions>('/api/v1/auctions', {
      params: { page: params.page ?? 0, size: params.size ?? 20 },
    });
    return response.data;
  },

  getAuctionById: async (id: string): Promise<AuctionVM> => {
    const response = await apiClient.get<AuctionVM>(`/api/v1/auctions/${id}`);
    return response.data;
  },

  deleteAuction: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}`);
  },

  scheduleAuction: async (id: string, data: AuctionScheduleRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/schedule`, data);
  },

  setAuctionPolicies: async (id: string, data: AuctionPoliciesCreationRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/policies`, data);
  },

  setAuctionUnits: async (id: string, data: AuctionUnitCreationRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/units`, data);
  },

  setAuctionBlobs: async (id: string, data: AuctionBlobsCreationRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/blobs`, data);
  },

  getAccessibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/accessibility-types',
    );
    return parseModelOptions(response.data);
  },

  getFormats: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/auction/formats',
    );
    return parseModelOptions(response.data);
  },

  getDimensionTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/dimension-types',
    );
    return parseModelOptions(response.data);
  },

  getDirectionTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/direction-types',
    );
    return parseModelOptions(response.data);
  },

  getOfferVisibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/offer-visibility-types',
    );
    return parseModelOptions(response.data);
  },

  getUnitTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>('/api/v1/auctions/model/unit-types');
    return parseModelOptions(response.data);
  },
};
