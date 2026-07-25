'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { auctionsApi, PolicyGroup } from '@repo/api';
import { Button } from '@repo/ui';
import { DismissibleError, SelectOption } from './AuctionShared';
import {
  POLICY_DEFAULTS,
  PAYMENT_POLICY_NAME_DEFAULTS,
  PAYMENT_HEAD_DEFAULT,
} from './PolicyShared';
import { mapSavedPolicies } from './AuctionStep3PolicyMapping';
import { PolicyPaymentSection } from './PolicyPaymentSection';
import { PolicyParticipationSection } from './PolicyParticipationSection';
import { PolicyPreconditionsSection } from './PolicyPreconditionsSection';
import { PolicyPriceProgressionSection } from './PolicyPriceProgressionSection';
import { PolicyExtensionSection } from './PolicyExtensionSection';
import { PolicyWinnerSection } from './PolicyWinnerSection';

// Re-export types so pages can import from a single location
export type {
  PaymentPolicyItem,
  PolicyHeadItem,
  PreconditionItem,
  PriceChangeItem,
  Step3State,
} from './AuctionStep3Types';
export { initialStep3 } from './AuctionStep3Types';

import type { Step3State } from './AuctionStep3Types';

/** For mandatory groups: seed one empty item if the group exists but form is empty */
function seedMandatoryDefaults(current: Step3State, groups: PolicyGroup[]): Partial<Step3State> {
  const patch: Partial<Step3State> = {};
  const hasGroup = (name: string) => groups.some((g) => g.name === name);
  const firstOption = (name: string): string => {
    const g = groups.find((g) => g.name === name);
    if (!g?.types.length) return '';
    return Object.keys(g.types[0]!)[0] ?? '';
  };

  // Participation — auto-enable
  if (hasGroup('PARTICIPATION') && !current.participationEnabled) {
    const defaults = POLICY_DEFAULTS['PARTICIPATION_POLICY'];
    patch.participationEnabled = true;
    patch.participationName = defaults?.name ?? '';
    patch.participationDescription = defaults?.description ?? '';
  }

  // Payment — mandatory
  if (hasGroup('PAYMENT') && current.paymentPolicies.length === 0) {
    const paymentDefaults = PAYMENT_POLICY_NAME_DEFAULTS.AUCTION_START_TIME;
    patch.paymentPolicies = [
      {
        name: paymentDefaults.name,
        description: paymentDefaults.description,
        scheduleReference: 'AUCTION_START_TIME',
        offsetDays: '',
        offsetHours: '0',
        heads: [
          {
            name: PAYMENT_HEAD_DEFAULT.name,
            description: PAYMENT_HEAD_DEFAULT.description,
            type: '',
            basis: '',
            value: '',
            refundable: false,
          },
        ],
      },
    ];
  }

  // Price Progression — mandatory
  if (hasGroup('PRICE_PROGRESSION') && current.priceChangePolicies.length === 0) {
    const firstType = firstOption('PRICE_PROGRESSION');
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.priceChangePolicies = [
      {
        type: firstType,
        name: defaults?.name ?? '',
        description: defaults?.description ?? '',
        windowHours: '0',
        windowMinutes: '0',
        steps: [],
        value: '',
      },
    ];
  }

  // Extension — display one by default
  const extensionGroupName = hasGroup('EXTENSION')
    ? 'EXTENSION'
    : hasGroup('AUCTION_EXTENSION')
      ? 'AUCTION_EXTENSION'
      : '';
  if (extensionGroupName && !current.extensionEnabled) {
    const firstType = firstOption(extensionGroupName);
    const defaults = firstType ? POLICY_DEFAULTS[firstType] : undefined;
    patch.extensionEnabled = true;
    patch.extensionType = firstType;
    patch.extensionName = defaults?.name ?? '';
    patch.extensionDescription = defaults?.description ?? '';
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

  return patch;
}

interface AuctionStep3PoliciesProps {
  auctionId?: string;
  form: Step3State;
  onChange: (updates: Partial<Step3State>) => void;
  auctionType: string;
  direction: string;
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
      <DismissibleError message={generalError} />

      {/* Participation */}
      {hasGroup('PARTICIPATION') && (
        <PolicyParticipationSection
          name={form.participationName}
          description={form.participationDescription}
          onNameChange={(v) => onChange({ participationName: v })}
          onDescriptionChange={(v) => onChange({ participationDescription: v })}
          typeId={form.participationTypeId}
          onTypeIdChange={(v) => onChange({ participationTypeId: v })}
          manualApproval={form.participationManualApproval}
          onManualApprovalToggle={(v) => onChange({ participationManualApproval: v })}
          groupDescription={getGroupDescription('PARTICIPATION')}
        />
      )}

      {/* Payment */}
      {hasGroup('PAYMENT') && (
        <PolicyPaymentSection
          policies={form.paymentPolicies}
          onChange={(v) => onChange({ paymentPolicies: v })}
          openingPrice={openingPrice}
          precision={precision}
          currencyUnit={currencyUnit}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('PAYMENT')}
          title="Pre Payment / Participation Eligibility Policy"
          fixedScheduleReference="AUCTION_START_TIME"
        />
      )}

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
      {hasGroup('PRICE_PROGRESSION') && (
        <PolicyPriceProgressionSection
          priceChangePolicies={form.priceChangePolicies}
          onPoliciesChange={(v) => onChange({ priceChangePolicies: v })}
          options={getGroupOptions('PRICE_PROGRESSION')}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('PRICE_PROGRESSION')}
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

      {/* Post Payment */}
      {hasGroup('PAYMENT') && (
        <PolicyPaymentSection
          policies={form.paymentPolicies}
          onChange={(v) => onChange({ paymentPolicies: v })}
          openingPrice={openingPrice}
          precision={precision}
          currencyUnit={currencyUnit}
          fieldErrors={fieldErrors}
          groupDescription={getGroupDescription('PAYMENT')}
          title="Post Payment / Winning Amount Payment Policy"
          fixedScheduleReference="AUCTION_END_TIME"
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
