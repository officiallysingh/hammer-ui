import { apiClient } from './client';
import type { PropertyDef } from './metadata';

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

export type PaymentPhase = 'PRE_PAYMENT' | 'POST_PAYMENT';

export interface AuctionWorkflowStep {
  id: string;
  type?: string | Record<string, string>;
  name?: string;
  description?: string;
  order?: number;
  policies?: PolicyItemRQ[];
  /** PAYMENT_STEP returns a single embedded policy object, not an array. */
  policy?: PolicyItemRQ;
  /** FORM_STEP embeds the managed-type reference and its resolved property definitions. */
  embedded?: {
    typeId?: string;
    properties?: PropertyDef[];
  };
  /** PAYMENT_STEP fields — a workflow can carry multiple, one per phase or more. */
  mode?: string | Record<string, string>;
  phase?: PaymentPhase | Record<string, string>;
  offset?: string;
  heads?: PolicyHeadRQ[];
  implicit?: boolean;
  status?: {
    type?: string | Record<string, string>;
    updatedAt?: string | null;
    details?: Record<string, string>;
  };
}

export interface AuctionParticipation {
  id?: string;
  postPayment?: boolean;
  [key: string]: unknown;
}

export type AuctionUnitType = 'SINGLE_UNIT' | 'BUNDLE' | 'MULTI_UNIT' | 'LOT';

export interface AuctionUnitItemBody {
  id: string;
  quantity: number;
}

export interface AuctionItemBody {
  id: string;
  name: string;
  description?: string;
  quantity: number;
}

export interface AuctionUnitBody {
  type: AuctionUnitType;
  openingPrice: number;
  item?: AuctionItemBody; // SINGLE_UNIT
  items?: AuctionUnitItemBody[]; // BUNDLE / MULTI_UNIT / LOT
}

export interface AuctionUnit {
  id?: string;
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
  quantity?: number;
  item?: string | { id: string; name: string; description?: string; quantity?: number };
  items?: (string | { id: string; name: string; description?: string; quantity?: number })[];
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
  unit?: AuctionUnitVM;
  units?: AuctionUnit[];
  blobs?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuctionsFilter {
  phrases?: string[];
  categories?: string[];
  subCategories?: string[];
  fromTime?: string;
  tillTime?: string;
  page?: number;
  size?: number;
  sort?: string[];
  expand?: string[];
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
  publish?: boolean;
}

export interface AuctionUnitCreationRQ {
  tags?: string[];
  subCategories?: string[];
  unit: AuctionUnitBody;
}

export interface AuctionBlobsCreationRQ {
  blobs: string[];
}

export interface PolicyHeadRQ {
  name?: string;
  description?: string;
  type?: string;
  basis: string;
  value: number;
  refundable?: boolean;
}

export interface PolicySchedule {
  reference: 'AUCTION_START_TIME' | 'AUCTION_END_TIME';
  offset: string;
}

export interface PolicyItemRQ {
  id?: string;
  type?: string;
  name?: string;
  description?: string;
  basis?: string;
  value?: number;
  priority?: number;
  currency?: string;
  mode?: string;
  heads?: PolicyHeadRQ[];
  schedule?: PolicySchedule;
  preStartValidationDuration?: string;
  count?: number;
  reference?: string;
  duration?: string;
  limit?: number;
  windowDuration?: string;
  steps?: number[];
  kth?: number;
  priceChangePolicies?: PolicyItemRQ[];
  postPayment?: boolean;
  prePayment?: boolean;
  typeId?: string;
  manualApproval?: boolean;
}

/** Mirrors the backend's `Evaluation<E>` — result of running a policy's rule engine. */
export interface PolicyEvaluationStatus {
  type?: string | Record<string, string>;
  details?: Record<string, unknown>;
  updatedAt?: string | null;
}

export interface PolicyEvaluation<E = unknown> {
  result?: E;
  description?: string;
  condition?: boolean;
  status?: PolicyEvaluationStatus;
  details?: Record<string, unknown>;
}

/** Keyed by policy (or rule) name, as returned by the preview/evaluate endpoints. */
export type PolicyEvaluationMap = Record<string, PolicyEvaluation>;

// ── Workflow step creation ──────────────────────────────────────────────────

export type WorkflowStepType =
  | 'FORM_STEP'
  | 'TNC_FORM_STEP'
  | 'PAYMENT_STEP'
  | 'BANK_DETAIL_FORM_STEP';

export interface AddFormStepRQ {
  type: 'FORM_STEP';
  name?: string;
  description?: string;
  order?: number;
  embedded: {
    typeId: string;
    pathWiseState: Record<string, unknown>;
    properties?: PropertyDef[];
  };
}

export interface AddTnCFormStepRQ {
  type: 'TNC_FORM_STEP';
  name?: string;
  description?: string;
  order?: number;
  tncText?: string;
  tncBlobId?: string;
}

export interface AddBankDetailFormStepRQ {
  type: 'BANK_DETAIL_FORM_STEP';
  name?: string;
  description?: string;
  order?: number;
}

export interface AddPaymentStepRQ {
  type: 'PAYMENT_STEP';
  name?: string;
  description?: string;
  order?: number;
  mode: string;
  phase: PaymentPhase;
  offset: string;
  heads: PolicyHeadRQ[];
}

export type AddWorkflowStepRQ =
  | AddFormStepRQ
  | AddTnCFormStepRQ
  | AddBankDetailFormStepRQ
  | AddPaymentStepRQ;

export type AuctionPoliciesRQ = PolicyItemRQ[];

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

  getAuctions: async (filter: AuctionsFilter = {}): Promise<PaginatedAuctions> => {
    const {
      phrases,
      categories,
      subCategories,
      fromTime,
      tillTime,
      page = 0,
      size = 16,
      sort,
      expand,
    } = filter;
    const response = await apiClient.get<PaginatedAuctions>('/api/v1/auctions', {
      params: {
        ...(phrases?.length ? { phrases } : {}),
        ...(categories?.length ? { categories } : {}),
        ...(subCategories?.length ? { subCategories } : {}),
        ...(fromTime ? { fromTime } : {}),
        ...(tillTime ? { tillTime } : {}),
        ...(sort?.length ? { sort } : {}),
        page,
        size,
      },
      headers: expand?.length ? { 'x-expand': expand } : undefined,
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

  getAuctionWorkflow: async (id: string): Promise<AuctionWorkflowStep[]> => {
    const response = await apiClient.get<AuctionWorkflowStep[]>(`/api/v1/auctions/${id}/workflow`);
    return response.data;
  },

  // getAuctionParticipation: async (id: string): Promise<AuctionParticipation> => {
  //   const response = await apiClient.get<AuctionParticipation>(
  //     `/api/v1/auctions/${id}/participation`,
  //   );
  //   return response.data;
  // },

  /** Payload is a map of stepId -> new order (1-based), not an ordered id array. */
  reorderWorkflowSteps: async (id: string, order: Record<string, number>): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/workflow/reorder`, order);
  },

  addWorkflowStep: async (id: string, data: AddWorkflowStepRQ): Promise<void> => {
    await apiClient.post(`/api/v1/auctions/${id}/workflow`, data);
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

  getPolicyTypes: async (auctionType: string): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>(
      `/api/v1/auctions/model/policies/types/${encodeURIComponent(auctionType)}`,
    );
    return parseModelOptions(response.data);
  },

  getAuctionPolicies: async (id: string): Promise<AuctionPoliciesRQ> => {
    const response = await apiClient.get<AuctionPoliciesRQ>(`/api/v1/auctions/${id}/policies`);
    return response.data;
  },

  setAuctionPolicies: async (id: string, data: AuctionPoliciesRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/policies`, data);
  },

  /** Evaluates a draft policy that hasn't been saved yet (e.g. while editing in a form). */
  previewAuctionPolicy: async (id: string, policy: PolicyItemRQ): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/policies/preview`,
      policy,
    );
    return response.data;
  },

  /** Evaluates an already-saved policy by id. */
  evaluateAuctionPolicy: async (id: string, policyId: string): Promise<PolicyEvaluationMap> => {
    const response = await apiClient.post<PolicyEvaluationMap>(
      `/api/v1/auctions/${id}/policies/${policyId}/evaluate`,
    );
    return response.data;
  },

  /** Updates a single saved policy in place (and its related workflow steps). */
  updateAuctionPolicy: async (id: string, policyId: string, data: PolicyItemRQ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/policies/${policyId}`, data);
  },

  /** Deletes a single saved policy (and its related workflow steps). */
  deleteAuctionPolicy: async (id: string, policyId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/policies/${policyId}`);
  },

  /** Updates a workflow step's own fields (name/description/order, or full config for explicit steps). */
  updateWorkflowStep: async (
    id: string,
    stepId: string,
    data: Partial<AddWorkflowStepRQ> & { type: WorkflowStepType },
  ): Promise<void> => {
    await apiClient.put(`/api/v1/auctions/${id}/workflow/${stepId}`, data);
  },

  /** Deletes a single step from the auction workflow. */
  deleteWorkflowStep: async (id: string, stepId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/auctions/${id}/workflow/${stepId}`);
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

  getPaymentModes: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get<AuctionModelEntry[]>('/api/v1/payments/modes');
    return parseModelOptions(response.data);
  },
};
