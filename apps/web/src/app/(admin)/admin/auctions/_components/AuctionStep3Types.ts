export interface PolicyHeadItem {
  name: string;
  description: string;
  // type: string;
  basis: string;
  value: string;
  refundable: boolean;
}

export interface PaymentPolicyItem {
  name: string;
  description: string;
  scheduleReference: string;
  offsetDays: string;
  offsetHours: string;
  heads: PolicyHeadItem[];
  priority?: number;
  currency?: string;
  mode: string;
}

export interface PreconditionItem {
  name: string;
  description: string;
  type: string;
  count: string;
  validationDays: string;
  validationHours: string;
}

export interface PriceChangeItem {
  name: string;
  description: string;
  type: string;
  windowHours: string;
  windowMinutes: string;
  steps: number[];
  value: string;
}

export interface ParticipationItem {
  name: string;
  description: string;
}

export interface Step3State {
  participationEnabled: boolean;
  participationName: string;
  participationDescription: string;
  participationTypeId: string;
  participationManualApproval: boolean;
  paymentPolicies: PaymentPolicyItem[];
  preconditions: PreconditionItem[];
  priceChangePolicies: PriceChangeItem[];
  extensionEnabled: boolean;
  extensionType: string;
  extensionName: string;
  extensionDescription: string;
  extensionReference: string;
  extensionDurationMinutes: string;
  extensionLimit: string;
  winnerDeterminationType: string;
  winnerDeterminationKth: string;
  winnerDeterminationName: string;
  winnerDeterminationDescription: string;
  winnerPriceDeterminationType: string;
  winnerPriceDeterminationKth: string;
  winnerPriceDeterminationName: string;
  winnerPriceDeterminationDescription: string;
}

export const initialStep3: Step3State = {
  participationEnabled: false,
  participationName: '',
  participationDescription: '',
  participationTypeId: '',
  participationManualApproval: false,
  paymentPolicies: [],
  preconditions: [],
  priceChangePolicies: [],
  extensionEnabled: false,
  extensionType: '',
  extensionName: '',
  extensionDescription: '',
  extensionReference: 'FROM_AUCTION_END_TIME',
  extensionDurationMinutes: '10',
  extensionLimit: '0',
  winnerDeterminationType: '',
  winnerDeterminationKth: '1',
  winnerDeterminationName: '',
  winnerDeterminationDescription: '',
  winnerPriceDeterminationType: '',
  winnerPriceDeterminationKth: '1',
  winnerPriceDeterminationName: '',
  winnerPriceDeterminationDescription: '',
};
