export interface ParticipationEligibilityItem {
  name: string;
  description: string;
  type: string;
  basis: 'FIXED_AMOUNT' | 'PERCENTAGE' | '';
  value: string;
  deadlineDays: string;
  deadlineHours: string;
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
  steps: string;
  value: string;
}

export interface Step3State {
  participationPolicies: ParticipationEligibilityItem[];
  preconditions: PreconditionItem[];
  priceChangePolicies: PriceChangeItem[];
  priceChangePolicyType: string;
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
  clearingType: string;
  clearingName: string;
  clearingDescription: string;
  tieBreakingType: string;
  tieBreakingName: string;
  tieBreakingDescription: string;
}

export const initialStep3: Step3State = {
  participationPolicies: [],
  preconditions: [],
  priceChangePolicies: [],
  priceChangePolicyType: '',
  extensionEnabled: false,
  extensionType: '',
  extensionName: '',
  extensionDescription: '',
  extensionReference: 'FROM_LATEST_OFFER_TIME',
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
  clearingType: '',
  clearingName: '',
  clearingDescription: '',
  tieBreakingType: '',
  tieBreakingName: '',
  tieBreakingDescription: '',
};
