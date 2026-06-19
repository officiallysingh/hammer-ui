'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { auctionsApi, PolicyGroup, PolicyItemRQ } from '@repo/api';
import { Button } from '@repo/ui';
import { SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS } from './PolicyShared';
import { PolicyParticipationSection } from './PolicyParticipationSection';
import { PolicyPreconditionsSection } from './PolicyPreconditionsSection';
import { PolicyPriceProgressionSection } from './PolicyPriceProgressionSection';
import { PolicyExtensionSection } from './PolicyExtensionSection';
import { PolicyWinnerSection } from './PolicyWinnerSection';
import { PolicyClearingSection } from './PolicyClearingSection';
import { PolicyTieBreakingSection } from './PolicyTieBreakingSection';

// Re-export types so pages can import from a single location
export type {
  ParticipationEligibilityItem,
  PreconditionItem,
  PriceChangeItem,
  Step3State,
} from './AuctionStep3Types';
export { initialStep3 } from './AuctionStep3Types';

import type { Step3State, PriceChangeItem } from './AuctionStep3Types';

// ─── helpers to parse durations ──────────────────────────────────────────────

function parseDurationHours(duration: string): { days: string; hours: string } {
  const match = duration.match(/PT(\d+)H/);
  const totalHours = match ? parseInt(match[1]!, 10) : 0;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return { days: days > 0 ? String(days) : '', hours: String(hours) };
}

function parseDurationWindow(duration: string): { hours: string; minutes: string } {
  const h = duration.match(/(\d+)H/);
  const m = duration.match(/(\d+)M/);
  return { hours: h ? h[1]! : '0', minutes: m ? m[1]! : '0' };
}

function parseDurationMinutes(duration: string): string {
  const m = duration.match(/(\d+)M/);
  return m ? m[1]! : '10';
}

/** Normalise a field that the API may return as either a plain string or { KEY: "Label" } */
function resolveType(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

/** Map saved policy groups from the API into Step3State fields */
function mapSavedPolicies(groups: Record<string, PolicyItemRQ[]>): Partial<Step3State> {
  const out: Partial<Step3State> = {};

  const participation = groups['PARTICIPATION_ELIGIBILITY'];
  if (participation?.length) {
    out.participationPolicies = participation.map((p) => {
      const { days, hours } = parseDurationHours(p.preStartDeadlineDuration ?? 'PT0S');
      return {
        name: p.name ?? '',
        description: p.description ?? '',
        type: resolveType(p.type),
        basis: resolveType(p.basis) as 'FIXED_AMOUNT' | 'PERCENTAGE' | '',
        value: String(p.value ?? ''),
        deadlineDays: days,
        deadlineHours: hours,
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

  const offerBased = groups['OFFER_BASED_PRICE_CHANGE'];
  if (offerBased?.length) {
    out.priceChangePolicies = offerBased.map((p) => {
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

  const clockBased = groups['CLOCK_BASED_PRICE_CHANGE'];
  if (clockBased?.length) {
    out.priceChangePolicyType = resolveType(clockBased[0]!.type);
  }

  const extension = groups['EXTENSION'] ?? groups['AUCTION_EXTENSION'];
  if (extension?.length) {
    const ext = extension[0]!;
    out.extensionEnabled = true;
    out.extensionType = resolveType(ext.type);
    out.extensionName = ext.name ?? '';
    out.extensionDescription = ext.description ?? '';
    out.extensionReference = resolveType(ext.reference) || 'FROM_LATEST_OFFER_TIME';
    out.extensionDurationMinutes = parseDurationMinutes(ext.duration ?? 'PT10M');
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

  const clearing = groups['CLEARING'];
  if (clearing?.length) {
    const c = clearing[0]!;
    out.clearingType = resolveType(c.type);
    out.clearingName = c.name ?? '';
    out.clearingDescription = c.description ?? '';
  }

  const tieBreaking = groups['TIE_BREAKING'];
  if (tieBreaking?.length) {
    const t = tieBreaking[0]!;
    out.tieBreakingType = resolveType(t.type);
    out.tieBreakingName = t.name ?? '';
    out.tieBreakingDescription = t.description ?? '';
  }

  return out;
}

/** For mandatory groups: seed one empty item if the group exists but form is empty */
function seedMandatoryDefaults(current: Step3State, groups: PolicyGroup[]): Partial<Step3State> {
  const patch: Partial<Step3State> = {};
  const hasGroup = (name: string) => groups.some((g) => g.name === name);
  const firstOption = (name: string): string => {
    const g = groups.find((g) => g.name === name);
    if (!g?.types.length) return '';
    return Object.keys(g.types[0]!)[0] ?? '';
  };

  // Price Progression — mandatory
  const isStepBased = hasGroup('OFFER_BASED_PRICE_CHANGE');
  const isClockBased = hasGroup('CLOCK_BASED_PRICE_CHANGE');
  if (isStepBased && current.priceChangePolicies.length === 0) {
    const firstType = firstOption('OFFER_BASED_PRICE_CHANGE');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    const item: PriceChangeItem = {
      type: firstType,
      name: defaults?.name ?? '',
      description: defaults?.description ?? '',
      windowHours: '0',
      windowMinutes: '0',
      steps: [],
      value: '',
    };
    patch.priceChangePolicies = [item];
  }
  if (isClockBased && !current.priceChangePolicyType) {
    patch.priceChangePolicyType = firstOption('CLOCK_BASED_PRICE_CHANGE');
  }

  // Winner Determination — mandatory
  if (hasGroup('WINNER_DETERMINATION') && !current.winnerDeterminationType) {
    const firstType = firstOption('WINNER_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerDeterminationType = firstType;
    patch.winnerDeterminationName = defaults?.name ?? '';
    patch.winnerDeterminationDescription = defaults?.description ?? '';
  }

  // Winner Price Determination — mandatory
  if (hasGroup('WINNER_PRICE_DETERMINATION') && !current.winnerPriceDeterminationType) {
    const firstType = firstOption('WINNER_PRICE_DETERMINATION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.winnerPriceDeterminationType = firstType;
    patch.winnerPriceDeterminationName = defaults?.name ?? '';
    patch.winnerPriceDeterminationDescription = defaults?.description ?? '';
  }

  // Clearing — mandatory
  if (hasGroup('CLEARING') && !current.clearingType) {
    const firstType = firstOption('CLEARING');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.clearingType = firstType;
    patch.clearingName = defaults?.name ?? '';
    patch.clearingDescription = defaults?.description ?? '';
  }

  return patch;
}

interface AuctionStep3PoliciesProps {
  auctionId?: string;
  form: Step3State;
  onChange: (updates: Partial<Step3State>) => void;
  auctionType: string;
  direction: string;
  priceProgression: string;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  submitLabel?: string;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip?: () => void;
}

export function AuctionStep3Policies({
  auctionId,
  form,
  onChange,
  auctionType,
  direction,
  priceProgression,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  generalError,
  saving,
  submitLabel = 'Save & Finish',
  onSubmit,
  onBack,
  onSkip,
}: AuctionStep3PoliciesProps) {
  const [groups, setGroups] = useState<PolicyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  // Track whether we've already seeded defaults so we only do it once
  const seededRef = useRef(false);

  useEffect(() => {
    if (!auctionType) return;
    seededRef.current = false;

    Promise.all([
      auctionsApi.getPolicyGroups(auctionType),
      auctionId
        ? auctionsApi.getAuctionPolicies(auctionId).catch(() => null)
        : Promise.resolve(null),
    ])
      .then(([fetchedGroups, savedGroups]) => {
        setGroups(fetchedGroups);

        if (seededRef.current) return;
        seededRef.current = true;

        let patch: Partial<Step3State> = {};

        if (savedGroups && Object.keys(savedGroups).length > 0) {
          patch = mapSavedPolicies(savedGroups);
        }

        // Then seed any mandatory groups that are still empty after restore
        const merged: Step3State = { ...form, ...patch };
        const mandatoryPatch = seedMandatoryDefaults(merged, fetchedGroups);
        onChange({ ...patch, ...mandatoryPatch });
      })
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auctionType, auctionId]);

  const getGroupOptions = (groupName: string): SelectOption[] => {
    const group = groups.find((g) => g.name === groupName);
    if (!group) return [];
    return group.types.flatMap((t) =>
      Object.entries(t).map(([value, label]) => ({ value, label })),
    );
  };

  const getGroupDescription = (groupName: string): string =>
    groups.find((g) => g.name === groupName)?.description ?? '';

  const hasGroup = (groupName: string) => groups.some((g) => g.name === groupName);

  const isStepBased = hasGroup('OFFER_BASED_PRICE_CHANGE');
  const isClockBased = hasGroup('CLOCK_BASED_PRICE_CHANGE');
  const priceChangeGroup = isClockBased ? 'CLOCK_BASED_PRICE_CHANGE' : 'OFFER_BASED_PRICE_CHANGE';
  const hasPriceChange = isStepBased || isClockBased;
  const extensionGroupName = hasGroup('EXTENSION') ? 'EXTENSION' : 'AUCTION_EXTENSION';
  const hasExtension = hasGroup('EXTENSION') || hasGroup('AUCTION_EXTENSION');

  const setField = (field: string, value: string) =>
    onChange({ [field]: value } as Partial<Step3State>);

  if (loadingGroups) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading policy options...</span>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
        </div>
      )}

      {/* Participation Eligibility */}
      <PolicyParticipationSection
        policies={form.participationPolicies}
        onChange={(v) => onChange({ participationPolicies: v })}
        options={getGroupOptions('PARTICIPATION_ELIGIBILITY')}
        openingPrice={openingPrice}
        precision={precision}
        currencyUnit={currencyUnit}
        fieldErrors={fieldErrors}
        groupDescription={getGroupDescription('PARTICIPATION_ELIGIBILITY')}
      />

      {/* Preconditions */}
      {(hasGroup('PRECONDITION') || getGroupOptions('PRECONDITION').length > 0) && (
        <PolicyPreconditionsSection
          preconditions={form.preconditions}
          onChange={(v) => onChange({ preconditions: v })}
          options={getGroupOptions('PRECONDITION')}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('PRECONDITION')}
        />
      )}

      {/* Price Progression */}
      {hasPriceChange && (
        <PolicyPriceProgressionSection
          auctionType={isStepBased ? 'STEP_BASED' : 'CLOCK_BASED'}
          priceChangePolicies={form.priceChangePolicies}
          priceChangePolicyType={form.priceChangePolicyType}
          onPoliciesChange={(v) => onChange({ priceChangePolicies: v })}
          onPolicyTypeChange={(v) => onChange({ priceChangePolicyType: v })}
          stepBasedOptions={getGroupOptions('OFFER_BASED_PRICE_CHANGE')}
          clockBasedOptions={getGroupOptions('CLOCK_BASED_PRICE_CHANGE')}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription(priceChangeGroup)}
        />
      )}

      {/* Extension */}
      {hasExtension && (
        <PolicyExtensionSection
          extensionEnabled={form.extensionEnabled}
          extensionType={form.extensionType}
          extensionName={form.extensionName}
          extensionDescription={form.extensionDescription}
          extensionReference={form.extensionReference}
          extensionDurationMinutes={form.extensionDurationMinutes}
          extensionLimit={form.extensionLimit}
          onAdd={() => {
            const opts = getGroupOptions(extensionGroupName);
            const first = opts[0];
            const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
            onChange({
              extensionEnabled: true,
              extensionType: first?.value ?? '',
              extensionName: defaults?.name ?? '',
              extensionDescription: defaults?.description ?? '',
            });
          }}
          onRemove={() =>
            onChange({
              extensionEnabled: false,
              extensionType: '',
              extensionName: '',
              extensionDescription: '',
            })
          }
          onFieldChange={setField}
          options={getGroupOptions(extensionGroupName)}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription(extensionGroupName)}
        />
      )}

      {/* Winner Determination + Winner Price Determination */}
      {(hasGroup('WINNER_DETERMINATION') || hasGroup('WINNER_PRICE_DETERMINATION')) && (
        <PolicyWinnerSection
          direction={direction}
          winnerDeterminationType={form.winnerDeterminationType}
          winnerDeterminationKth={form.winnerDeterminationKth}
          winnerDeterminationName={form.winnerDeterminationName}
          winnerDeterminationDescription={form.winnerDeterminationDescription}
          winnerPriceDeterminationType={form.winnerPriceDeterminationType}
          winnerPriceDeterminationKth={form.winnerPriceDeterminationKth}
          winnerPriceDeterminationName={form.winnerPriceDeterminationName}
          winnerPriceDeterminationDescription={form.winnerPriceDeterminationDescription}
          onFieldChange={setField}
          onWinnerAdd={() => {
            const opts = getGroupOptions('WINNER_DETERMINATION');
            const first = opts[0];
            const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
            onChange({
              winnerDeterminationType: first?.value ?? '',
              winnerDeterminationName: defaults?.name ?? '',
              winnerDeterminationDescription: defaults?.description ?? '',
            });
          }}
          onWinnerRemove={() =>
            onChange({
              winnerDeterminationType: '',
              winnerDeterminationName: '',
              winnerDeterminationDescription: '',
              winnerDeterminationKth: '1',
            })
          }
          onWinnerPriceAdd={() => {
            const opts = getGroupOptions('WINNER_PRICE_DETERMINATION');
            const first = opts[0];
            const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
            onChange({
              winnerPriceDeterminationType: first?.value ?? '',
              winnerPriceDeterminationName: defaults?.name ?? '',
              winnerPriceDeterminationDescription: defaults?.description ?? '',
            });
          }}
          onWinnerPriceRemove={() =>
            onChange({
              winnerPriceDeterminationType: '',
              winnerPriceDeterminationName: '',
              winnerPriceDeterminationDescription: '',
              winnerPriceDeterminationKth: '1',
            })
          }
          winnerDeterminationOptions={getGroupOptions('WINNER_DETERMINATION')}
          winnerPriceOptions={getGroupOptions('WINNER_PRICE_DETERMINATION')}
          fieldErrors={fieldErrors}
          winnerGroupInfo={getGroupDescription('WINNER_DETERMINATION')}
          winnerPriceGroupInfo={getGroupDescription('WINNER_PRICE_DETERMINATION')}
        />
      )}

      {/* Clearing */}
      {hasGroup('CLEARING') && (
        <PolicyClearingSection
          clearingType={form.clearingType}
          clearingName={form.clearingName}
          clearingDescription={form.clearingDescription}
          onFieldChange={setField}
          onAdd={() => {
            const opts = getGroupOptions('CLEARING');
            const first = opts[0];
            const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
            onChange({
              clearingType: first?.value ?? '',
              clearingName: defaults?.name ?? '',
              clearingDescription: defaults?.description ?? '',
            });
          }}
          onRemove={() => onChange({ clearingType: '', clearingName: '', clearingDescription: '' })}
          options={getGroupOptions('CLEARING')}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('CLEARING')}
        />
      )}

      {/* Tie Breaking */}
      {hasGroup('TIE_BREAKING') && (
        <PolicyTieBreakingSection
          tieBreakingType={form.tieBreakingType}
          tieBreakingName={form.tieBreakingName}
          tieBreakingDescription={form.tieBreakingDescription}
          onFieldChange={setField}
          onAdd={() => {
            const opts = getGroupOptions('TIE_BREAKING');
            const first = opts[0];
            const defaults = first ? POLICY_DEFAULTS[first.value] : undefined;
            onChange({
              tieBreakingType: first?.value ?? '',
              tieBreakingName: defaults?.name ?? '',
              tieBreakingDescription: defaults?.description ?? '',
            });
          }}
          onRemove={() =>
            onChange({ tieBreakingType: '', tieBreakingName: '', tieBreakingDescription: '' })
          }
          options={getGroupOptions('TIE_BREAKING')}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('TIE_BREAKING')}
        />
      )}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onSkip}
            disabled={saving}
            className="gap-2"
          >
            Skip <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
