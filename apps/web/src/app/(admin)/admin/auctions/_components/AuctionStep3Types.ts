export interface PreconditionItem {
  /** Present only when this item was loaded from a previously saved policy. */
  id?: string;
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
  participationValidationHours: string;
  participationValidationMinutes: string;
  /** Present only when participation was loaded from a previously saved policy. */
  participationPolicyId?: string;
  preconditions: PreconditionItem[];
  priceChangePolicies: PriceChangeItem[];
  /** Present only when the price progression wrapper was loaded from a previously saved policy. */
  priceProgressionPolicyId?: string;
  extensionEnabled: boolean;
  extensionType: string;
  extensionName: string;
  extensionDescription: string;
  extensionReference: string;
  extensionDurationMinutes: string;
  extensionLimit: string;
  /** Present only when extension was loaded from a previously saved policy. */
  extensionPolicyId?: string;
  winnerDeterminationType: string;
  winnerDeterminationKth: string;
  winnerDeterminationName: string;
  winnerDeterminationDescription: string;
  /** Present only when winner determination was loaded from a previously saved policy. */
  winnerDeterminationPolicyId?: string;
  winnerPriceDeterminationType: string;
  winnerPriceDeterminationKth: string;
  winnerPriceDeterminationName: string;
  winnerPriceDeterminationDescription: string;
  /** Present only when winner price determination was loaded from a previously saved policy. */
  winnerPriceDeterminationPolicyId?: string;
}

export const initialStep3: Step3State = {
  participationEnabled: false,
  participationName: '',
  participationDescription: '',
  participationTypeId: '',
  participationManualApproval: false,
  participationValidationHours: '0',
  participationValidationMinutes: '0',
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
