import { PolicyItemRQ } from '@repo/api';
import type { PreconditionItem, PriceChangeItem, Step3State } from './AuctionStep3Types';
import { POLICY_DEFAULTS, categoryForPolicyType } from './PolicyShared';

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

export function buildPreconditionItem(p: PreconditionItem, priority: number): PolicyItemRQ | null {
  if (!p.type) return null;
  const item: PolicyItemRQ = {
    type: p.type,
    name: p.name || undefined,
    description: p.description || undefined,
    priority,
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
    policies: priceItems.map((p, i, arr) => {
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

export function buildPolicies(step3: Step3State): PolicyItemRQ[] {
  const policies: PolicyItemRQ[] = [];
  let priority = 1;

  const participation = buildParticipationItem(step3);
  if (participation) policies.push({ ...participation, priority: priority++ });

  const preconditionItems = step3.preconditions
    .map((p) => buildPreconditionItem(p, priority))
    .filter((item): item is PolicyItemRQ => item !== null);
  for (const item of preconditionItems) {
    item.priority = priority++;
    policies.push(item);
  }

  const extension = buildExtensionItem(step3);
  if (extension) policies.push({ ...extension, priority: priority++ });

  const priceWrapper = buildPriceProgressionWrapper(step3.policies);
  if (priceWrapper) policies.push({ ...priceWrapper, priority: priority++ });

  const winnerDetermination = buildWinnerDeterminationItem(step3);
  if (winnerDetermination) policies.push({ ...winnerDetermination, priority: priority++ });

  const winnerPriceDetermination = buildWinnerPriceDeterminationItem(step3);
  if (winnerPriceDetermination)
    policies.push({ ...winnerPriceDetermination, priority: priority++ });

  return policies;
}

// ─── map (API payload → form state) ────────────────────────────────────────────

export function mapSavedPolicies(items: PolicyItemRQ[]): Partial<Step3State> {
  const out: Partial<Step3State> = {};

  const byCategory = new Map<string, PolicyItemRQ[]>();
  for (const item of items) {
    const category = categoryForPolicyType(item.type);
    const bucket = byCategory.get(category);
    if (bucket) bucket.push(item);
    else byCategory.set(category, [item]);
  }

  const participation = byCategory.get('PARTICIPATION');
  if (participation?.length) {
    const p = participation[0]!;
    out.participationEnabled = true;
    out.participationName = p.name ?? '';
    out.participationDescription = p.description ?? '';
    out.participationTypeId = p.typeId ?? '';
    out.participationManualApproval = p.manualApproval ?? false;
    out.participationPolicyId = p.id;
    const { hours, minutes } = parseDurationWindow(p.preStartValidationDuration ?? 'PT0S');
    out.participationValidationHours = hours;
    out.participationValidationMinutes = minutes;
  }

  const preconditions = byCategory.get('PRECONDITION');
  if (preconditions?.length) {
    out.preconditions = preconditions.map((p) => {
      const { days, hours } = parseDurationHours(p.preStartValidationDuration ?? 'PT0S');
      return {
        id: p.id,
        name: p.name ?? '',
        description: p.description ?? '',
        type: resolveType(p.type),
        count: String(p.count ?? ''),
        validationDays: days,
        validationHours: hours,
      };
    });
  }

  const priceProgression = byCategory.get('PRICE_PROGRESSION');
  if (priceProgression?.length) {
    const wrapper = priceProgression[0]!;
    out.priceProgressionPolicyId = wrapper.id;
    out.policies = (wrapper.policies ?? []).map((p): PriceChangeItem => {
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

  const extension = byCategory.get('EXTENSION');
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
    out.extensionPolicyId = ext.id;
  }

  const winnerDet = byCategory.get('WINNER_DETERMINATION');
  if (winnerDet?.length) {
    const w = winnerDet[0]!;
    out.winnerDeterminationType = resolveType(w.type);
    out.winnerDeterminationKth = String(w.kth ?? 1);
    out.winnerDeterminationName = w.name ?? '';
    out.winnerDeterminationDescription = w.description ?? '';
    out.winnerDeterminationPolicyId = w.id;
  }

  const winnerPrice = byCategory.get('WINNER_PRICE_DETERMINATION');
  if (winnerPrice?.length) {
    const w = winnerPrice[0]!;
    out.winnerPriceDeterminationType = resolveType(w.type);
    out.winnerPriceDeterminationKth = String(w.kth ?? 1);
    out.winnerPriceDeterminationName = w.name ?? '';
    out.winnerPriceDeterminationDescription = w.description ?? '';
    out.winnerPriceDeterminationPolicyId = w.id;
  }

  return out;
}

// ─── validation ────────────────────────────────────────────────────────────────

/** Every named policy currently present in the form, tagged with the field-error
 *  key it should be reported under. Used to enforce name uniqueness across the
 *  *whole* policies form, not just within a single section's list. */
function collectNamedEntries(step3: Step3State): { key: string; name: string }[] {
  const entries: { key: string; name: string }[] = [];

  if (step3.participationEnabled && step3.participationName) {
    entries.push({ key: 'participationName', name: step3.participationName });
  }
  step3.preconditions.forEach((p, i) => {
    if (p.name) entries.push({ key: `precondition_name_${i}`, name: p.name });
  });
  step3.policies.forEach((p, i) => {
    if (p.name) entries.push({ key: `priceChange_name_${i}`, name: p.name });
  });
  if (step3.extensionEnabled && step3.extensionName) {
    entries.push({ key: 'extensionName', name: step3.extensionName });
  }
  if (step3.winnerDeterminationType && step3.winnerDeterminationName) {
    entries.push({ key: 'winnerDeterminationName', name: step3.winnerDeterminationName });
  }
  if (step3.winnerPriceDeterminationType && step3.winnerPriceDeterminationName) {
    entries.push({
      key: 'winnerPriceDeterminationName',
      name: step3.winnerPriceDeterminationName,
    });
  }

  return entries;
}

/** Marks every duplicate occurrence of a name (by lowercase/trim) with the given error message. */
function markDuplicateNames(
  errs: Record<string, string>,
  entries: { key: string; name: string }[],
  message: string,
) {
  const seen = new Map<string, string[]>();
  entries.forEach(({ key, name }) => {
    const norm = name.trim().toLowerCase();
    if (!norm) return;
    seen.set(norm, [...(seen.get(norm) ?? []), key]);
  });
  for (const keys of seen.values()) {
    if (keys.length > 1) {
      keys.forEach((k) => {
        errs[k] = message;
      });
    }
  }
}

/** Name-uniqueness check only — cheap enough to run before saving a single
 *  already-saved policy inline, without requiring the rest of the form to be complete. */
export function validatePolicyNames(step3: Step3State): Record<string, string> {
  const errs: Record<string, string> = {};
  markDuplicateNames(
    errs,
    collectNamedEntries(step3),
    'Policy name must be unique across all policies.',
  );
  return errs;
}

export function validatePolicies(step3: Step3State): Record<string, string> {
  const errs: Record<string, string> = {};

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

  step3.policies.forEach((p, i) => {
    if (!p.type) {
      errs[`priceChange_type_${i}`] = 'Please select a policy type.';
    } else if (p.type === 'STEP_BASED_OFFER_PRICE_POLICY' && (!p.steps || p.steps.length === 0)) {
      errs[`priceChange_steps_${i}`] = 'At least one step multiplier is required.';
    } else if (!p.value || isNaN(parseFloat(p.value)) || parseFloat(p.value) <= 0) {
      errs[`priceChange_value_${i}`] = 'A positive step value is required.';
    }
  });

  Object.assign(errs, validatePolicyNames(step3));

  return errs;
}
