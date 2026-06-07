'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { auctionsApi, PolicyGroup } from '@repo/api';
import { Button, Input, Label } from '@repo/ui';
import { FieldError, SectionHeading, SelectField, SelectOption } from './AuctionShared';

export interface PreconditionItem {
  type: string;
  minimumCount: string;
}

export interface Step3State {
  participationType: string;
  emdBasis: 'FIXED_AMOUNT' | 'PERCENTAGE' | '';
  emdValue: string;
  preconditions: PreconditionItem[];
  priceChangePolicyType: string;
  auctionExtensionType: string;
  winnerDeterminationType: string;
  clearingType: string;
  tieBreakingType: string;
}

export const initialStep3: Step3State = {
  participationType: '',
  emdBasis: '',
  emdValue: '',
  preconditions: [],
  priceChangePolicyType: '',
  auctionExtensionType: '',
  winnerDeterminationType: '',
  clearingType: '',
  tieBreakingType: '',
};

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

  const priceChangeGroup =
    priceProgression === 'CLOCK_BASED' ? 'CLOCK_BASED_PRICE_CHANGE' : 'OFFER_BASED_PRICE_CHANGE';

  const emdCalculated =
    form.emdBasis === 'PERCENTAGE' && form.emdValue
      ? (openingPrice * parseFloat(form.emdValue)) / 100
      : null;

  const preconditionOptions = getGroupOptions('PRECONDITION');
  const usedTypes = form.preconditions.filter((p) => p.type).map((p) => p.type);
  const unusedPreconditionOptions = preconditionOptions.filter((o) => !usedTypes.includes(o.value));

  const addPrecondition = () => {
    onChange({ preconditions: [...form.preconditions, { type: '', minimumCount: '' }] });
  };

  const updatePrecondition = (i: number, patch: Partial<PreconditionItem>) =>
    onChange({
      preconditions: form.preconditions.map((p, idx) => (idx === i ? { ...p, ...patch } : p)),
    });

  const removePrecondition = (i: number) =>
    onChange({ preconditions: form.preconditions.filter((_, idx) => idx !== i) });

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
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionHeading>Participation Eligibility</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="participationType"
            label="Type"
            value={form.participationType}
            options={[
              { value: '', label: 'Any one can participate' },
              ...getGroupOptions('PARTICIPATION_ELIGIBILITY'),
            ]}
            onChange={(v) =>
              onChange({
                participationType: v,
                emdBasis: v === 'EMD_POLICY' ? 'FIXED_AMOUNT' : '',
                emdValue: '',
              })
            }
            error={fieldErrors.participationType}
          />
        </div>

        {/* Participant Fees */}
        <div className="border-t border-border/50 pt-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Participant Fees</span>
            {!form.emdBasis && (
              <button
                type="button"
                onClick={() => {
                  if (form.participationType === 'EMD_POLICY') {
                    onChange({ emdBasis: 'FIXED_AMOUNT' });
                  }
                }}
                disabled={!form.participationType}
                className={`flex items-center gap-1 text-xs transition-colors ${
                  form.participationType
                    ? 'text-primary hover:underline'
                    : 'text-muted-foreground opacity-40 cursor-not-allowed'
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            )}
          </div>

          {form.participationType === 'EMD_POLICY' && form.emdBasis ? (
            <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">
                  Earnest Money Deposit (EMD)
                </span>
                <button
                  type="button"
                  onClick={() => onChange({ emdBasis: '', emdValue: '' })}
                  className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <SelectField
                  id="emdBasis"
                  label="Basis"
                  required
                  value={form.emdBasis}
                  options={[
                    { value: 'FIXED_AMOUNT', label: 'Fixed Amount' },
                    { value: 'PERCENTAGE', label: 'Percentage of Opening Price' },
                  ]}
                  onChange={(v) =>
                    onChange({ emdBasis: v as 'FIXED_AMOUNT' | 'PERCENTAGE', emdValue: '' })
                  }
                  error={fieldErrors.emdBasis}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="emdValue" className="text-sm font-medium">
                    {form.emdBasis === 'PERCENTAGE' ? 'Percentage' : 'Amount'}{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <Input
                      id="emdValue"
                      type="number"
                      min={0}
                      max={form.emdBasis === 'PERCENTAGE' ? 100 : undefined}
                      step="0.01"
                      value={form.emdValue}
                      onChange={(e) => onChange({ emdValue: e.target.value })}
                      placeholder="0.00"
                      className={form.emdBasis === 'PERCENTAGE' ? 'pr-8' : ''}
                    />
                    {form.emdBasis === 'PERCENTAGE' && (
                      <span className="absolute right-3 text-sm text-muted-foreground">%</span>
                    )}
                  </div>
                  {form.emdBasis === 'PERCENTAGE' && emdCalculated !== null && (
                    <p className="text-xs text-muted-foreground">
                      ≈ {currencyUnit} {emdCalculated.toFixed(precision)}
                    </p>
                  )}
                  <FieldError message={fieldErrors.emdValue} />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">
                {form.participationType === 'EMD_POLICY'
                  ? 'Click + to configure participation fee'
                  : 'No participation fees'}
              </p>
              {fieldErrors.emdBasis && <FieldError message={fieldErrors.emdBasis} />}
            </div>
          )}
        </div>
      </div>

      {/* Preconditions */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Preconditions</h3>
          {unusedPreconditionOptions.length > 0 && (
            <button
              type="button"
              onClick={addPrecondition}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          )}
        </div>

        {form.preconditions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No preconditions</p>
        ) : (
          <div className="space-y-3">
            {form.preconditions.map((pc, i) => {
              const otherUsedTypes = form.preconditions
                .filter((_, idx) => idx !== i)
                .filter((p) => p.type)
                .map((p) => p.type);
              const availableTypes = preconditionOptions.filter(
                (o) => !otherUsedTypes.includes(o.value),
              );
              return (
                <div
                  key={i}
                  className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs font-medium">Type</Label>
                      <select
                        value={pc.type}
                        onChange={(e) =>
                          updatePrecondition(i, { type: e.target.value, minimumCount: '' })
                        }
                        className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">No preconditions</option>
                        {availableTypes.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      {fieldErrors[`precondition_type_${i}`] && (
                        <FieldError message={fieldErrors[`precondition_type_${i}`]} />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removePrecondition(i)}
                      className="p-1 mt-5 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' && (
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Minimum Participants <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        value={pc.minimumCount}
                        onChange={(e) => updatePrecondition(i, { minimumCount: e.target.value })}
                        placeholder="e.g. 5"
                        className="h-8 text-sm max-w-[160px]"
                      />
                      <FieldError message={fieldErrors[`precondition_${i}`]} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Progression Policy */}
      {hasGroup(priceChangeGroup) && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <SectionHeading>Price Progression Policy</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="priceChangePolicyType"
              label="Policy Type"
              required
              value={form.priceChangePolicyType}
              options={getGroupOptions(priceChangeGroup)}
              onChange={(v) => onChange({ priceChangePolicyType: v })}
              error={fieldErrors.priceChangePolicyType}
              placeholder="Select policy type..."
            />
          </div>
        </div>
      )}

      {/* Auction Extension */}
      {hasGroup('AUCTION_EXTENSION') && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <SectionHeading>Auction Extension</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="auctionExtensionType"
              label="Extension Policy"
              value={form.auctionExtensionType}
              options={[
                { value: '', label: 'No extension' },
                ...getGroupOptions('AUCTION_EXTENSION'),
              ]}
              onChange={(v) => onChange({ auctionExtensionType: v })}
              error={fieldErrors.auctionExtensionType}
            />
          </div>
        </div>
      )}

      {/* Winner Determination */}
      {hasGroup('WINNER_DETERMINATION') && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <SectionHeading>Winner Determination</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="winnerDeterminationType"
              label="Policy Type"
              required
              value={form.winnerDeterminationType}
              options={getGroupOptions('WINNER_DETERMINATION')}
              onChange={(v) => onChange({ winnerDeterminationType: v })}
              error={fieldErrors.winnerDeterminationType}
              placeholder="Select policy type..."
            />
          </div>
        </div>
      )}

      {/* Clearing */}
      {hasGroup('CLEARING') && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <SectionHeading>Winner Payment</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="clearingType"
              label="Clearing Policy"
              required
              value={form.clearingType}
              options={getGroupOptions('CLEARING')}
              onChange={(v) => onChange({ clearingType: v })}
              error={fieldErrors.clearingType}
              placeholder="Select policy type..."
            />
          </div>
        </div>
      )}

      {/* Tie Breaking */}
      {hasGroup('TIE_BREAKING') && (
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <SectionHeading>Tie Breaking</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SelectField
              id="tieBreakingType"
              label="Tie Breaking Policy"
              value={form.tieBreakingType}
              options={[
                { value: '', label: 'No tie breaking' },
                ...getGroupOptions('TIE_BREAKING'),
              ]}
              onChange={(v) => onChange({ tieBreakingType: v })}
              error={fieldErrors.tieBreakingType}
            />
          </div>
        </div>
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
