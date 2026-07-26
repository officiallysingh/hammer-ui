import { PolicyItemRQ } from '@repo/api';
import type {
  PaymentPolicyItem,
  PolicyHeadItem,
  PreconditionItem,
  PriceChangeItem,
  Step3State,
} from './AuctionStep3Types';
import { POLICY_DEFAULTS } from './PolicyShared';

// ─── duration helpers ─────────────────────────────────────────────────────────

export function buildDurationFromDaysHours(days: string, hours: string): string {
  const d = parseInt(days, 10) || 0;
  const h = parseInt(hours, 10) || 0;
  return `PT${d * 24 + h}H`;
}

export function buildWindowDuration(hours: string, minutes: string): string {
  const h = parseInt(hours, 10) || 0;
  const m = parseInt(minutes, 10) || 0;
  if (h > 0 && m > 0) return `PT${h}H${m}M`;
  if (h > 0) return `PT${h}H`;
  if (m > 0) return `PT${m}M`;
  return 'PT0S';
}

export function parseDurationHours(duration: string): { days: string; hours: string } {
  const match = duration.match(/PT(\d+)H/);
  const totalHours = match ? parseInt(match[1]!, 10) : 0;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days: days > 0 ? String(days) : '', hours: String(hours) };
}

export function parseDurationWindow(duration: string): { hours: string; minutes: string } {
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  return { hours: h ? h[1]! : '0', minutes: m ? m[1]! : '0' };
}

/** Normalise a field that the API may return as either a plain string or { KEY: "Label" } */
export function resolveType(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

// ─── build (form state → API payload) ─────────────────────────────────────────
// Each `build*Item` below builds a single leaf policy — reused both to assemble the
// full submission payload (buildPolicies) and to preview one item at a time.

export function buildPaymentPolicyItem(
  p: PaymentPolicyItem,
  priority: number,
  currencyUnit: string,
): PolicyItemRQ | null {
  const heads = p.heads.filter((h) => h.basis && h.value);
  if (heads.length === 0) return null;
  return {
    type: 'PAYMENT_POLICY',
    name: p.name || undefined,
    description: p.description || undefined,
    priority,
    currency: currencyUnit,
    mode: p.mode || 'ONLINE',
    schedule: {
      reference: (p.scheduleReference || 'AUCTION_START_TIME') as
        | 'AUCTION_START_TIME'
        | 'AUCTION_END_TIME',
      offset: buildDurationFromDaysHours(p.offsetDays, p.offsetHours),
    },
    heads: heads.map((h) => ({
      name: h.name || undefined,
      description: h.description || undefined,
      // type: h.type,
      basis: h.basis,
      value: parseFloat(h.value),
      refundable: h.refundable,
    })),
  };
}

export function buildPreconditionItem(p: PreconditionItem): PolicyItemRQ | null {
  if (!p.type) return null;
  const item: PolicyItemRQ = {
    type: p.type,
    name: p.name || undefined,
    description: p.description || undefined,
  };
  if (p.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY') {
    item.count = parseInt(p.count, 10);
  }
  if (p.validationDays || p.validationHours) {
    item.preStartValidationDuration = buildDurationFromDaysHours(
      p.validationDays,
      p.validationHours,
    );
  }
  return item;
}

/** Wraps every price-progression window into the single PRICE_PROGRESSION_POLICY the API expects. */
export function buildPriceProgressionWrapper(items: PriceChangeItem[]): PolicyItemRQ | null {
  const priceItems = items.filter((p) => p.type);
  if (priceItems.length === 0) return null;
  const wrapperDefaults = POLICY_DEFAULTS['PRICE_PROGRESSION_POLICY'];
  return {
    type: 'PRICE_PROGRESSION_POLICY',
    name: wrapperDefaults?.name,
    description: wrapperDefaults?.description,
    priceChangePolicies: priceItems.map((p, i, arr) => {
      const isLast = i === arr.length - 1;
      const item: PolicyItemRQ = {
        type: p.type,
        name: p.name || undefined,
        description: p.description || undefined,
        priority: i + 1,
        windowDuration: isLast ? 'PT0S' : buildWindowDuration(p.windowHours, p.windowMinutes),
      };
      if (p.value) item.value = parseFloat(p.value);
      if (p.type === 'STEP_BASED_OFFER_PRICE_POLICY' && p.steps.length > 0) {
        item.steps = p.steps;
      }
      return item;
    }),
  };
}

export function buildExtensionItem(step3: Step3State): PolicyItemRQ | null {
  if (!step3.extensionEnabled || !step3.extensionType) return null;
  return {
    type: step3.extensionType,
    name: step3.extensionName || undefined,
    description: step3.extensionDescription || undefined,
    reference: step3.extensionReference,
    duration: `PT${parseInt(step3.extensionDurationMinutes, 10) || 10}M`,
    limit: parseInt(step3.extensionLimit, 10) || 0,
  };
}

export function buildWinnerDeterminationItem(step3: Step3State): PolicyItemRQ | null {
  if (!step3.winnerDeterminationType) return null;
  const item: PolicyItemRQ = {
    type: step3.winnerDeterminationType,
    name: step3.winnerDeterminationName || undefined,
    description: step3.winnerDeterminationDescription || undefined,
  };
  if (step3.winnerDeterminationKth) item.kth = parseInt(step3.winnerDeterminationKth, 10);
  return item;
}

export function buildWinnerPriceDeterminationItem(step3: Step3State): PolicyItemRQ | null {
  if (!step3.winnerPriceDeterminationType) return null;
  const item: PolicyItemRQ = {
    type: step3.winnerPriceDeterminationType,
    name: step3.winnerPriceDeterminationName || undefined,
    description: step3.winnerPriceDeterminationDescription || undefined,
  };
  if (step3.winnerPriceDeterminationKth) item.kth = parseInt(step3.winnerPriceDeterminationKth, 10);
  return item;
}

export function buildParticipationItem(step3: Step3State): PolicyItemRQ | null {
  if (!step3.participationEnabled) return null;
  return {
    type: 'PARTICIPATION_POLICY',
    name: step3.participationName || undefined,
    description: step3.participationDescription || undefined,
    priority: 1,
    typeId: step3.participationTypeId || undefined,
    manualApproval: step3.participationManualApproval,
    preStartValidationDuration: buildWindowDuration(
      step3.participationValidationHours,
      step3.participationValidationMinutes,
    ),
  };
}

export function buildPolicies(
  step3: Step3State,
  currencyUnit: string,
): Record<string, PolicyItemRQ[]> {
  const policies: Record<string, PolicyItemRQ[]> = {};

  const participation = buildParticipationItem(step3);
  if (participation) policies['PARTICIPATION'] = [participation];

  const validPayments = step3.paymentPolicies.filter((p) =>
    p.heads.some((h) => h.basis && h.value),
  );
  if (validPayments.length > 0) {
    policies['PAYMENT'] = validPayments.map(
      (p, i) => buildPaymentPolicyItem(p, i + 1, currencyUnit)!,
    );
  }

  const preconditionItems = step3.preconditions
    .map(buildPreconditionItem)
    .filter((item): item is PolicyItemRQ => item !== null);
  if (preconditionItems.length > 0) policies['PRECONDITION'] = preconditionItems;

  const priceWrapper = buildPriceProgressionWrapper(step3.priceChangePolicies);
  if (priceWrapper) policies['PRICE_PROGRESSION'] = [priceWrapper];

  const extension = buildExtensionItem(step3);
  if (extension) policies['EXTENSION'] = [extension];

  const winnerDetermination = buildWinnerDeterminationItem(step3);
  if (winnerDetermination) policies['WINNER_DETERMINATION'] = [winnerDetermination];

  const winnerPriceDetermination = buildWinnerPriceDeterminationItem(step3);
  if (winnerPriceDetermination) policies['WINNER_PRICE_DETERMINATION'] = [winnerPriceDetermination];

  return policies;
}

// ─── map (API payload → form state) ────────────────────────────────────────────

export function mapSavedPolicies(groups: Record<string, PolicyItemRQ[]>): Partial<Step3State> {
  const out: Partial<Step3State> = {};

  const participation = groups['PARTICIPATION'];
  if (participation?.length) {
    const p = participation[0]!;
    out.participationEnabled = true;
    out.participationName = p.name ?? '';
    out.participationDescription = p.description ?? '';
    out.participationTypeId = p.typeId ?? '';
    out.participationManualApproval = p.manualApproval ?? false;
    const { hours, minutes } = parseDurationWindow(p.preStartValidationDuration ?? 'PT0S');
    out.participationValidationHours = hours;
    out.participationValidationMinutes = minutes;
  }

  const payment = groups['PAYMENT'];
  if (payment?.length) {
    out.paymentPolicies = payment.map((p): PaymentPolicyItem => {
      const { days, hours } = parseDurationHours(p.schedule?.offset ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        scheduleReference: resolveType(p.schedule?.reference) || 'AUCTION_START_TIME',
        offsetDays: days,
        offsetHours: hours,
        mode: resolveType(p.mode) || 'ONLINE',
        heads: (p.heads ?? []).map(
          (h): PolicyHeadItem => ({
            name: h.name ?? '',
            description: h.description ?? '',
            basis: resolveType(h.basis),
            value: String(h.value ?? ''),
            refundable: h.refundable ?? false,
          }),
        ),
      };
    });
  }

  const preconditions = groups['PRECONDITION'];
  if (preconditions?.length) {
    out.preconditions = preconditions.map((p) => {
      const { days, hours } = parseDurationHours(p.preStartValidationDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: resolveType(p.type),
        count: String(p.count ?? ''),
        validationDays: days,
        validationHours: hours,
      };
    });
  }

  const priceProgression = groups['PRICE_PROGRESSION'];
  if (priceProgression?.length) {
    const wrapper = priceProgression[0]!;
    out.priceChangePolicies = (wrapper.priceChangePolicies ?? []).map((p): PriceChangeItem => {
      const { hours, minutes } = parseDurationWindow(p.windowDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: resolveType(p.type),
        windowHours: hours,
        windowMinutes: minutes,
        steps: p.steps ?? [],
        value: String(p.value ?? ''),
      };
    });
  }

  const extension = groups['EXTENSION'] ?? groups['AUCTION_EXTENSION'];
  if (extension?.length) {
    const ext = extension[0]!;
    out.extensionEnabled = true;
    out.extensionType = resolveType(ext.type);
    out.extensionName = ext.name ?? '';
    out.extensionDescription = ext.description ?? '';
    out.extensionReference = resolveType(ext.reference) || 'FROM_LATEST_OFFER_TIME';
    out.extensionDurationMinutes = (() => {
      const m = (ext.duration ?? 'PT10M').match(/(\d+)M/);
      return m ? m[1]! : '10';
    })();
    out.extensionLimit = String(ext.limit ?? 0);
  }

  const winnerDet = groups['WINNER_DETERMINATION'];
  if (winnerDet?.length) {
    const w = winnerDet[0]!;
    out.winnerDeterminationType = resolveType(w.type);
    out.winnerDeterminationKth = String(w.kth ?? 1);
    out.winnerDeterminationName = w.name ?? '';
    out.winnerDeterminationDescription = w.description ?? '';
  }

  const winnerPrice = groups['WINNER_PRICE_DETERMINATION'];
  if (winnerPrice?.length) {
    const w = winnerPrice[0]!;
    out.winnerPriceDeterminationType = resolveType(w.type);
    out.winnerPriceDeterminationKth = String(w.kth ?? 1);
    out.winnerPriceDeterminationName = w.name ?? '';
    out.winnerPriceDeterminationDescription = w.description ?? '';
  }

  return out;
}

// ─── validation ────────────────────────────────────────────────────────────────

export function validatePolicies(step3: Step3State): Record<string, string> {
  const errs: Record<string, string> = {};

  const headNameSeen = new Map<string, { i: number; j: number }>();

  step3.paymentPolicies.forEach((policy, i) => {
    if (policy.heads.length === 0) {
      errs[`payment_heads_${i}`] = 'At least one fee head is required.';
      return;
    }
    policy.heads.forEach((h, j) => {
      if (!h.basis) {
        errs[`payment_head_basis_${i}_${j}`] = 'Please select a basis.';
      } else if (!h.value || isNaN(parseFloat(h.value)) || parseFloat(h.value) <= 0) {
        errs[`payment_head_value_${i}_${j}`] = 'A positive value is required.';
      }

      const key = h.name.trim().toLowerCase();
      if (key) {
        const dupe = headNameSeen.get(key);
        if (dupe) {
          errs[`payment_head_name_${dupe.i}_${dupe.j}`] = 'Payment head name must be unique.';
          errs[`payment_head_name_${i}_${j}`] = 'Payment head name must be unique.';
        } else {
          headNameSeen.set(key, { i, j });
        }
      }
    });
  });

  step3.preconditions.forEach((pc, i) => {
    if (!pc.type) {
      errs[`precondition_type_${i}`] = 'Please select a precondition type.';
    } else if (
      pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' &&
      (!pc.count || parseInt(pc.count, 10) < 1)
    ) {
      errs[`precondition_count_${i}`] = 'Minimum participants must be at least 1.';
    }
  });

  step3.priceChangePolicies.forEach((p, i) => {
    if (!p.type) {
      errs[`priceChange_type_${i}`] = 'Please select a policy type.';
    } else if (p.type === 'STEP_BASED_OFFER_PRICE_POLICY' && (!p.steps || p.steps.length === 0)) {
      errs[`priceChange_steps_${i}`] = 'At least one step multiplier is required.';
    } else if (!p.value || isNaN(parseFloat(p.value)) || parseFloat(p.value) <= 0) {
      errs[`priceChange_value_${i}`] = 'A positive step value is required.';
    }
  });

  return errs;
}
