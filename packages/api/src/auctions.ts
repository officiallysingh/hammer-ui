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

export interface AuctionUnitItemBody {
  id: string;
  quantity: number;
}

export interface AuctionUnitBody {
  type: AuctionUnitType;
  openingPrice: number;
  quantity?: number;
  item?: string; // SINGLE_UNIT
  items?: AuctionUnitItemBody[]; // BUNDLE / MULTI_UNIT / LOT
}

export interface AuctionUnit {
  type: AuctionUnitType;
  openingPrice?: number;
  item?: string;
  items?: string[];
}

export interface AuctionUnitVM {
  id?: string;
  type?: AuctionUnitType | Record<string, string>;
  openingPrice?: number;
  standingPrice?: number;
  item?: string | { id: string; name: string; description?: string };
  items?: (string | { id: string; name: string; description?: string })[];
}

export interface AuctionPolicies {
  basePrice?: number;
  stepPrice?: number;
  reservePrice?: number;
}

export interface AuctionVM {
  id: string;
  type?: string | Record<string, string>;
  format?: string | Record<string, string>;
  status?: string | Record<string, string>;
  title: string;
  description?: string;
  referenceId?: string;
  protocol?: AuctionProtocol;
  monetaryOptions?: AuctionMonetaryOptions;
  schedule?: AuctionSchedule;
  policies?: AuctionPolicies;
  policyGroups?: Record<string, PolicyItemRQ[]>;
  unit?: AuctionUnitVM;
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
  policies?: Record<string, PolicyItemRQ[]>;
}

export interface AuctionUpdationRQ {
  title?: string;
  description?: string;
  referenceId?: string;
  accessibility?: string;
  direction?: string;
  participantVisibility?: string;
  offerVisibility?: string;
  monetaryOptions?: Partial<AuctionMonetaryOptions>;
  unit?: AuctionUnitBody;
  subCategories?: string[];
  tags?: string[];
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

export interface PolicyGroup {
  name: string;
  description: string;
  types: Record<string, string>[];
}

export interface PolicyItemRQ {
  type: string;
  name?: string;
  description?: string;
  basis?: 'FIXED_AMOUNT' | 'PERCENTAGE';
  value?: number;
  priority?: number;
  preStartDeadlineDuration?: string;
  preStartValidationDuration?: string;
  count?: number;
  reference?: string;
  duration?: string;
  limit?: number;
  windowDuration?: string;
  steps?: number[];
  kth?: number;
}

export type AuctionPoliciesGroupRQ = Record<string, PolicyItemRQ[]>;

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

  getAuctionById: async (id: string, expand?: string[]): Promise<AuctionVM> => {
    const response = await apiClient.get<AuctionVM>(`/api/v1/auctions/${id}`, {
      headers: expand?.length ? { 'x-expand': expand } : undefined,
    });
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

  getPolicyGroups: async (auctionType: string): Promise<PolicyGroup[]> => {
    const response = await apiClient.get<PolicyGroup[]>(
      `/api/v1/auctions/model/policies/groups/${encodeURIComponent(auctionType)}`,
    );
    return response.data;
  },

  setAuctionPolicyGroups: async (id: string, data: AuctionPoliciesGroupRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/policies`, data);
  },

  getRoundingModeTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/monetary-rounding-mode-types',
    );
    return parseModelOptions(response.data);
  },

  getParticipantVisibilityTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      '/api/v1/auctions/model/participant-identity-visibility-types',
    );
    return parseModelOptions(response.data);
  },

  getUnitTypes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>('/api/v1/auctions/model/unit-types');
    return parseModelOptions(response.data);
  },
};
