'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { auctionsApi, PolicyGroup } from '@repo/api';
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

import type { Step3State } from './AuctionStep3Types';

interface AuctionStep3PoliciesProps {
  form: Step3State;
  onChange: (updates: Partial<Step3State>) => void;
  auctionType: string;
  priceProgression: string;
  openingPrice: number;
  precision: number;
  currencyUnit: string;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip?: () => void;
}

export function AuctionStep3Policies({
  form,
  onChange,
  auctionType,
  priceProgression,
  openingPrice,
  precision,
  currencyUnit,
  fieldErrors,
  generalError,
  saving,
  onSubmit,
  onBack,
  onSkip,
}: AuctionStep3PoliciesProps) {
  const [groups, setGroups] = useState<PolicyGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);

  useEffect(() => {
    if (!auctionType) return;
    auctionsApi
      .getPolicyGroups(auctionType)
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoadingGroups(false));
  }, [auctionType]);

  const getGroupOptions = (groupName: string): SelectOption[] => {
    const group = groups.find((g) => g.name === groupName);
    if (!group) return [];
    return group.types.flatMap((t) =>
      Object.entries(t).map(([value, label]) => ({ value, label })),
    );
  };

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
      />

      {/* Preconditions */}
      {(hasGroup('PRECONDITION') || getGroupOptions('PRECONDITION').length > 0) && (
        <PolicyPreconditionsSection
          preconditions={form.preconditions}
          onChange={(v) => onChange({ preconditions: v })}
          options={getGroupOptions('PRECONDITION')}
          fieldErrors={fieldErrors}
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
        />
      )}

      {/* Winner Determination + Winner Price Determination */}
      {(hasGroup('WINNER_DETERMINATION') || hasGroup('WINNER_PRICE_DETERMINATION')) && (
        <PolicyWinnerSection
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
              'Save & Finish'
            )}
          </Button>
        )}
      </div>
    </form>
  );
}
