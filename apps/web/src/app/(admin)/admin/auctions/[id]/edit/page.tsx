'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  auctionsApi,
  listingsApi,
  blobsApi,
  AuctionUpdationRQ,
  AuctionUnitCreationRQ,
  AuctionUnitType,
  ListingSummaryVM,
  PolicyGroup,
  PolicyItemRQ,
} from '@repo/api';
import { ArrowLeft, ArrowRight, Eye, Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { ListingSearchField } from '../../_components/ListingSearchField';
import { TagsCategorySection } from '../../_components/TagsCategorySection';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';

interface SelectOption {
  value: string;
  label: string;
}

const PRICE_PROGRESSION_OPTIONS: Record<string, { value: string; label: string }[]> = {
  FORWARD: [
    { value: 'STEP_BASED', label: 'Step based increment on highest bid' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage increment on highest bid' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range increment on highest bid' },
    { value: 'CLOCK_BASED', label: 'Clock based ascending price' },
  ],
  REVERSE: [
    { value: 'STEP_BASED', label: 'Step based decrement on lowest ask' },
    { value: 'FIXED_PERCENTAGE', label: 'Fixed percentage decrement on lowest ask' },
    { value: 'PERCENTAGE_RANGE', label: 'Percentage range decrement on lowest ask' },
    { value: 'CLOCK_BASED', label: 'Clock based descending price' },
  ],
};

/** Normalises API fields that arrive as either a plain string or { KEY: "Label" } */
function resolveStr(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length > 0) return String(entries[0]![0]);
  }
  return String(value);
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-foreground border-b border-border pb-2 mb-4">
      {children}
    </h3>
  );
}

function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  error,
  placeholder = 'Select...',
  loading,
}: {
  id: string;
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  loading?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
      >
        <option value="">{loading ? 'Loading...' : placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

// ── Step indicator ────────────────────────────────────────────────────────────

function StepIndicator({
  current,
  onStepClick,
}: {
  current: number;
  onStepClick?: (step: number) => void;
}) {
  const steps = ['Details', 'Units', 'Policies'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        // In edit mode all non-current steps are navigable
        const clickable = !!onStepClick && !active;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onStepClick(s) : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') onStepClick(s);
                      }
                    : undefined
                }
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                } ${clickable ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary/40' : ''}`}
              >
                {done ? '✓' : s}
              </div>
              <span
                className={`text-xs font-medium whitespace-nowrap ${active ? 'text-foreground' : 'text-muted-foreground'}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 w-12 mb-4 rounded-full transition-colors ${done ? 'bg-emerald-500' : 'bg-muted'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

interface Step1State {
  title: string;
  description: string;
  referenceId: string;
  format: string;
  accessibility: string;
  direction: string;
  priceProgression: string;
  dimension: string;
  participantVisibility: string;
  offerVisibility: string;
  currencyUnit: string;
  precision: string;
  roundingMode: string;
}

// ── Step 3 state ──────────────────────────────────────────────────────────────

interface PreconditionItem {
  type: string;
  minimumCount: string;
}

interface Step3State {
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

const initialStep3: Step3State = {
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

// ── Step 3 component ──────────────────────────────────────────────────────────

function Step3({
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
}: {
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
}) {
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

  const getGroupOptions = (groupName: string) => {
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
    form.emdBasis === 'PERCENTAGE' && form.emdValue && openingPrice > 0
      ? (openingPrice * parseFloat(form.emdValue)) / 100
      : null;

  const preconditionOptions = getGroupOptions('PRECONDITION');
  const usedTypes = form.preconditions.map((p) => p.type);
  const unusedPreconditionOptions = preconditionOptions.filter((o) => !usedTypes.includes(o.value));

  const addPrecondition = () => {
    const next = unusedPreconditionOptions[0];
    if (!next) return;
    onChange({ preconditions: [...form.preconditions, { type: next.value, minimumCount: '' }] });
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
        <SectionHeading>Participation</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="participationType"
            label="Participation Type"
            value={form.participationType}
            options={[
              { value: '', label: 'Any one can participate' },
              ...getGroupOptions('PARTICIPATION_ELIGIBILITY'),
            ]}
            onChange={(v) => onChange({ participationType: v, emdBasis: '', emdValue: '' })}
            error={fieldErrors.participationType}
          />
        </div>

        {form.participationType === 'EMD_POLICY' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/50">
            <SelectField
              id="emdBasis"
              label="EMD Type *"
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
            {form.emdBasis && (
              <div className="space-y-1.5">
                <Label htmlFor="emdValue" className="text-sm font-medium">
                  {form.emdBasis === 'FIXED_AMOUNT' ? 'Amount' : 'Percentage'}{' '}
                  <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="emdValue"
                    type="number"
                    min={0}
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
            )}
          </div>
        )}
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
            {form.preconditions.map((pc, i) => (
              <div key={i} className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {preconditionOptions.find((o) => o.value === pc.type)?.label ?? pc.type}
                  </span>
                  <button
                    type="button"
                    onClick={() => removePrecondition(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
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
            ))}
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
              label="Policy Type *"
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
              label="Policy Type *"
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
              label="Clearing Policy *"
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
      </div>
    </form>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface Step2State {
  unitType: AuctionUnitType | '';
  openingPrice: string;
  item: string;
  itemName: string;
  itemSummary: ListingSummaryVM | null;
  items: string[];
  itemNames: string[];
  itemSummaries: ListingSummaryVM[];
  categories: string[];
  subCategories: string[];
  tags: string[];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState(1);

  const [originalStep1, setOriginalStep1] = useState<Step1State | null>(null);

  // Step 1
  const [step1, setStep1] = useState<Step1State>({
    title: '',
    description: '',
    referenceId: '',
    format: '',
    accessibility: '',
    direction: '',
    priceProgression: '',
    dimension: '',
    participantVisibility: '',
    offerVisibility: '',
    currencyUnit: '',
    precision: '2',
    roundingMode: '',
  });
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);
  const [savingStep1, setSavingStep1] = useState(false);

  // Auction type (loaded from API)
  const [auctionType, setAuctionType] = useState('');

  // Step 2
  const [step2, setStep2] = useState<Step2State>({
    unitType: '',
    openingPrice: '',
    item: '',
    itemName: '',
    itemSummary: null,
    items: [],
    itemNames: [],
    itemSummaries: [],
    categories: [],
    subCategories: [],
    tags: [],
  });
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3
  const [step3, setStep3] = useState<Step3State>(initialStep3);
  const [step3Errors, setStep3Errors] = useState<Record<string, string>>({});
  const [step3GeneralError, setStep3GeneralError] = useState<string | null>(null);
  const [savingStep3, setSavingStep3] = useState(false);

  // Model options
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [directionTypes, setDirectionTypes] = useState<SelectOption[]>([]);
  const [dimensionTypes, setDimensionTypes] = useState<SelectOption[]>([]);
  const [participantVisibilityTypes, setParticipantVisibilityTypes] = useState<SelectOption[]>([]);
  const [offerVisibilityTypes, setOfferVisibilityTypes] = useState<SelectOption[]>([]);
  const [roundingModes, setRoundingModes] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      auctionsApi.getFormats(),
      auctionsApi.getAccessibilityTypes(),
      auctionsApi.getDirectionTypes(),
      auctionsApi.getDimensionTypes(),
      auctionsApi.getParticipantVisibilityTypes(),
      auctionsApi.getOfferVisibilityTypes(),
      auctionsApi.getRoundingModeTypes(),
    ]).then(([fmts, access, dirs, dims, partVis, offerVis, rounding]) => {
      if (fmts.status === 'fulfilled') setFormats(fmts.value);
      if (access.status === 'fulfilled') setAccessibilityTypes(access.value);
      if (dirs.status === 'fulfilled') setDirectionTypes(dirs.value);
      if (dims.status === 'fulfilled') setDimensionTypes(dims.value);
      if (partVis.status === 'fulfilled') setParticipantVisibilityTypes(partVis.value);
      if (offerVis.status === 'fulfilled') setOfferVisibilityTypes(offerVis.value);
      if (rounding.status === 'fulfilled') setRoundingModes(rounding.value);
      setLoadingOptions(false);
    });

    auctionsApi
      .getUnitTypes()
      .then((types) => setUnitTypes(types))
      .finally(() => setLoadingUnitTypes(false));

    auctionsApi
      .getAuctionById(id)
      .then((auction) => {
        const loaded: Step1State = {
          title: auction.title ?? '',
          description: auction.description ?? '',
          referenceId: auction.referenceId ?? '',
          format: resolveStr(auction.format),
          accessibility: resolveStr(auction.protocol?.accessibility),
          direction: resolveStr(auction.protocol?.direction),
          priceProgression: '',
          dimension: resolveStr(auction.protocol?.dimension),
          participantVisibility: resolveStr(auction.protocol?.participantVisibility),
          offerVisibility: resolveStr(auction.protocol?.offerVisibility),
          currencyUnit: resolveStr(auction.monetaryOptions?.currencyUnit),
          precision: String(auction.monetaryOptions?.precision ?? 2),
          roundingMode: resolveStr(auction.monetaryOptions?.roundingMode),
        };
        setStep1(loaded);
        setOriginalStep1(loaded);
        if (auction.type) setAuctionType(auction.type);

        if (auction.units?.length) {
          const u = auction.units[0]!;
          const isSingle = u.type === 'SINGLE_UNIT';
          setStep2({
            unitType: u.type,
            openingPrice: String(u.openingPrice ?? ''),
            item: isSingle ? (u.item ?? '') : '',
            itemName: '',
            itemSummary: null,
            items: isSingle ? [] : (u.items ?? []),
            itemNames: isSingle ? [] : (u.items?.map(() => '') ?? []),
            itemSummaries: [],
            categories: [],
            subCategories: [],
            tags: [],
          });
        }
      })
      .catch(() => setStep1GeneralError('Failed to load auction.'))
      .finally(() => setPageLoading(false));
  }, [id]);

  const patch1 = (updates: Partial<Step1State>) => setStep1((prev) => ({ ...prev, ...updates }));

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step1.title.trim()) errs.title = 'Title is required.';
    if (!step1.format) errs.format = 'Format is required.';
    if (!step1.accessibility) errs.accessibility = 'Accessibility is required.';
    if (!step1.direction) errs.direction = 'Direction is required.';
    if (!step1.priceProgression) errs.priceProgression = 'Price progression is required.';
    if (!step1.dimension) errs.dimension = 'Dimension is required.';
    if (!step1.participantVisibility)
      errs.participantVisibility = 'Participant visibility is required.';
    if (!step1.offerVisibility) errs.offerVisibility = 'Offer visibility is required.';
    if (!step1.currencyUnit.trim()) errs.currencyUnit = 'Currency unit is required.';
    const prec = parseInt(step1.precision, 10);
    if (isNaN(prec) || prec < 0 || prec > 3) errs.precision = 'Precision must be between 0 and 3.';
    if (!step1.roundingMode) errs.roundingMode = 'Rounding mode is required.';
    return errs;
  };

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep1GeneralError(null);
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});

    const hasChanged =
      !originalStep1 ||
      (Object.keys(step1) as (keyof Step1State)[]).some((k) => step1[k] !== originalStep1[k]);

    if (!hasChanged) {
      setStep(2);
      return;
    }

    setSavingStep1(true);
    try {
      const payload: AuctionUpdationRQ = {
        title: step1.title.trim(),
        description: step1.description.trim() || undefined,
        referenceId: step1.referenceId.trim() || undefined,
        protocol: {
          accessibility: step1.accessibility,
          direction: step1.direction,
          dimension: step1.dimension,
          participantVisibility: step1.participantVisibility,
          offerVisibility: step1.offerVisibility,
        },
        monetaryOptions: {
          currencyUnit: step1.currencyUnit.trim().toUpperCase(),
          precision: parseInt(step1.precision, 10),
          roundingMode: step1.roundingMode,
        },
      };
      await auctionsApi.updateAuction(id, payload);
      setOriginalStep1(step1);
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1GeneralError(parsed.general ?? 'Failed to update auction.');
    } finally {
      setSavingStep1(false);
    }
  };

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  // Pre-populate when SINGLE_UNIT listing is selected
  useEffect(() => {
    if (!step2.item) return;
    listingsApi
      .getListingById(step2.item)
      .then((listing) => {
        const subCat = listing.subCategory;
        const subCatId =
          typeof subCat === 'object' && subCat
            ? subCat.id
            : typeof subCat === 'string'
              ? subCat
              : '';
        setStep2((prev) => ({
          ...prev,
          categories: listing.category?.id ? [listing.category.id] : [],
          subCategories: subCatId ? [subCatId] : [],
          tags: listing.tags ?? [],
        }));
      })
      .catch(() => {});
  }, [step2.item]);

  // Merge categories/subcategories/tags from each newly added multi-unit listing
  useEffect(() => {
    if (!step2.items.length || step2.unitType === 'SINGLE_UNIT') return;
    const last = step2.items[step2.items.length - 1];
    if (!last) return;
    listingsApi
      .getListingById(last)
      .then((listing) => {
        const subCat = listing.subCategory;
        const subCatId =
          typeof subCat === 'object' && subCat
            ? subCat.id
            : typeof subCat === 'string'
              ? subCat
              : '';
        setStep2((prev) => ({
          ...prev,
          categories: listing.category?.id
            ? [...new Set([...prev.categories, listing.category.id])]
            : prev.categories,
          subCategories: subCatId
            ? [...new Set([...prev.subCategories, subCatId])]
            : prev.subCategories,
          tags: [...new Set([...prev.tags, ...(listing.tags ?? [])])],
        }));
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step2.items.length]);

  const removeItem = (idx: number) =>
    setStep2((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
      itemNames: prev.itemNames.filter((_, i) => i !== idx),
      itemSummaries: prev.itemSummaries.filter((_, i) => i !== idx),
    }));

  const validateStep2 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step2.unitType) errs.unitType = 'Unit type is required.';
    if (!step2.openingPrice || isNaN(parseFloat(step2.openingPrice)))
      errs.openingPrice = 'Opening price is required.';
    if (step2.unitType === 'SINGLE_UNIT' && !step2.item) errs.item = 'A listing is required.';
    if (step2.unitType && step2.unitType !== 'SINGLE_UNIT' && step2.items.length === 0)
      errs.item = 'At least one listing is required.';
    return errs;
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2GeneralError(null);
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});
    setSavingStep2(true);
    try {
      const isSingle = step2.unitType === 'SINGLE_UNIT';

      await auctionsApi.setAuctionUnits(id, {
        tags: step2.tags.length ? step2.tags : undefined,
        subCategories: step2.subCategories.length ? step2.subCategories : undefined,
        unit: {
          type: step2.unitType as AuctionUnitType,
          openingPrice: parseFloat(step2.openingPrice),
          ...(isSingle ? { item: step2.item } : { items: step2.items }),
        },
      });

      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction unit.');
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  const validateStep3 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (step3.participationType === 'EMD_POLICY') {
      if (!step3.emdBasis) errs.emdBasis = 'EMD type is required.';
      if (!step3.emdValue || isNaN(parseFloat(step3.emdValue)) || parseFloat(step3.emdValue) <= 0)
        errs.emdValue = 'A positive EMD value is required.';
    }
    step3.preconditions.forEach((pc, i) => {
      if (
        pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY' &&
        (!pc.minimumCount || parseInt(pc.minimumCount, 10) < 1)
      ) {
        errs[`precondition_${i}`] = 'Minimum participants must be at least 1.';
      }
    });
    return errs;
  };

  const buildPolicies = (): PolicyItemRQ[] => {
    const policies: PolicyItemRQ[] = [];
    if (step3.participationType) {
      const p: PolicyItemRQ = { type: step3.participationType };
      if (step3.participationType === 'EMD_POLICY' && step3.emdBasis) {
        p.basis = step3.emdBasis as 'FIXED_AMOUNT' | 'PERCENTAGE';
        p.value = parseFloat(step3.emdValue);
      }
      policies.push(p);
    }
    for (const pc of step3.preconditions) {
      const p: PolicyItemRQ = { type: pc.type };
      if (pc.type === 'MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY')
        p.minimumCount = parseInt(pc.minimumCount, 10);
      policies.push(p);
    }
    if (step3.priceChangePolicyType) policies.push({ type: step3.priceChangePolicyType });
    if (step3.auctionExtensionType) policies.push({ type: step3.auctionExtensionType });
    if (step3.winnerDeterminationType) policies.push({ type: step3.winnerDeterminationType });
    if (step3.clearingType) policies.push({ type: step3.clearingType });
    if (step3.tieBreakingType) policies.push({ type: step3.tieBreakingType });
    return policies;
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3GeneralError(null);
    const errs = validateStep3();
    if (Object.keys(errs).length) {
      setStep3Errors(errs);
      return;
    }
    setStep3Errors({});
    setSavingStep3(true);
    try {
      const policies = buildPolicies();
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicyGroups(id, { policies });
      }
      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep3Errors(parsed.fieldErrors);
      else setStep3GeneralError(parsed.general ?? 'Failed to save policies.');
    } finally {
      setSavingStep3(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading auction...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edit Auction"
        description="Update auction details"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <StepIndicator current={step} onStepClick={setStep} />

      {/* ── Step 1 ── */}
      {step === 1 && (
        <form onSubmit={handleStep1Submit} className="space-y-6">
          {step1GeneralError && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {step1GeneralError}
            </div>
          )}

          {/* Basic Information */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeading>Basic Information</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={step1.title}
                  onChange={(e) => patch1({ title: e.target.value })}
                  placeholder="e.g. Samsung TV"
                />
                <FieldError message={step1Errors.title} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="referenceId" className="text-sm font-medium">
                  Reference ID
                </Label>
                <Input
                  id="referenceId"
                  value={step1.referenceId}
                  onChange={(e) => patch1({ referenceId: e.target.value })}
                  placeholder="e.g. AXN_0001"
                  className="font-mono"
                />
                <FieldError message={step1Errors.referenceId} />
              </div>

              <SelectField
                id="format"
                label="Format *"
                value={step1.format}
                options={formats}
                onChange={(v) => patch1({ format: v })}
                error={step1Errors.format}
                placeholder="Select format..."
                loading={loadingOptions}
              />

              <div className="md:col-span-2 space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={step1.description}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    patch1({ description: e.target.value })
                  }
                  placeholder="Describe the auction item..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
                <FieldError message={step1Errors.description} />
              </div>
            </div>
          </div>

          {/* Protocol */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeading>Protocol</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                id="accessibility"
                label="Accessibility *"
                value={step1.accessibility}
                options={accessibilityTypes}
                onChange={(v) => patch1({ accessibility: v })}
                error={step1Errors.accessibility}
                placeholder="Select accessibility..."
                loading={loadingOptions}
              />
              <SelectField
                id="direction"
                label="Direction *"
                value={step1.direction}
                options={directionTypes}
                onChange={(v) => patch1({ direction: v, priceProgression: '' })}
                error={step1Errors.direction}
                placeholder="Select direction..."
                loading={loadingOptions}
              />
              <SelectField
                id="priceProgression"
                label="Price Progression *"
                value={step1.priceProgression}
                options={PRICE_PROGRESSION_OPTIONS[step1.direction] ?? []}
                onChange={(v) => patch1({ priceProgression: v })}
                error={step1Errors.priceProgression}
                placeholder={
                  step1.direction ? 'Select price progression...' : 'Select direction first'
                }
              />
              <SelectField
                id="dimension"
                label="Dimension *"
                value={step1.dimension}
                options={dimensionTypes}
                onChange={(v) => patch1({ dimension: v })}
                error={step1Errors.dimension}
                placeholder="Select dimension..."
                loading={loadingOptions}
              />
              <SelectField
                id="participantVisibility"
                label="Participant Visibility *"
                value={step1.participantVisibility}
                options={participantVisibilityTypes}
                onChange={(v) => patch1({ participantVisibility: v })}
                error={step1Errors.participantVisibility}
                placeholder="Select participant visibility..."
                loading={loadingOptions}
              />
              <SelectField
                id="offerVisibility"
                label="Offer Visibility *"
                value={step1.offerVisibility}
                options={offerVisibilityTypes}
                onChange={(v) => patch1({ offerVisibility: v })}
                error={step1Errors.offerVisibility}
                placeholder="Select offer visibility..."
                loading={loadingOptions}
              />
            </div>
          </div>

          {/* Monetary Options */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeading>Monetary Options</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="currencyUnit" className="text-sm font-medium">
                  Currency Unit <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currencyUnit"
                  value={step1.currencyUnit}
                  onChange={(e) => patch1({ currencyUnit: e.target.value.toUpperCase() })}
                  placeholder="e.g. INR, USD"
                  maxLength={10}
                  className="font-mono uppercase"
                />
                <FieldError message={step1Errors.currencyUnit} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="precision" className="text-sm font-medium">
                  Precision <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="precision"
                  type="number"
                  min={0}
                  max={3}
                  value={step1.precision}
                  onChange={(e) => patch1({ precision: e.target.value })}
                  placeholder="e.g. 2"
                />
                <FieldError message={step1Errors.precision} />
              </div>

              <SelectField
                id="roundingMode"
                label="Rounding Mode *"
                value={step1.roundingMode}
                options={roundingModes}
                onChange={(v) => patch1({ roundingMode: v })}
                error={step1Errors.roundingMode}
                placeholder="Select rounding mode..."
                loading={loadingOptions}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/auctions')}
              disabled={savingStep1}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={savingStep1} className="gap-2">
              {savingStep1 && <Loader2 className="h-4 w-4 animate-spin" />}
              Save & Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* ── Step 2 ── */}
      {step === 2 && (
        <form onSubmit={handleStep2Submit} className="space-y-6">
          {step2GeneralError && (
            <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
              {step2GeneralError}
            </div>
          )}

          {/* Unit Configuration */}
          <div className="rounded-xl border border-border bg-card p-6 space-y-4">
            <SectionHeading>Auction Unit</SectionHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Unit Type <span className="text-destructive">*</span>
                </Label>
                <select
                  value={step2.unitType}
                  onChange={(e) =>
                    setStep2((prev) => ({
                      ...prev,
                      unitType: e.target.value as AuctionUnitType,
                      item: '',
                      itemName: '',
                      items: [],
                      itemNames: [],
                    }))
                  }
                  disabled={loadingUnitTypes}
                  className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                >
                  <option value="">{loadingUnitTypes ? 'Loading...' : 'Select type...'}</option>
                  {unitTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <FieldError message={step2Errors.unitType} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="openingPrice" className="text-sm font-medium">
                  Opening Price <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="openingPrice"
                  type="number"
                  min={0}
                  step={(() => {
                    const p = parseInt(step1.precision, 10) || 0;
                    return p > 0 ? (1 / Math.pow(10, p)).toFixed(p) : '1';
                  })()}
                  value={step2.openingPrice}
                  onChange={(e) => setStep2((prev) => ({ ...prev, openingPrice: e.target.value }))}
                  placeholder={(() => {
                    const p = parseInt(step1.precision, 10) || 0;
                    return p > 0 ? `0.${'0'.repeat(p)}` : '0';
                  })()}
                />
                <FieldError message={step2Errors.openingPrice} />
              </div>
            </div>

            {step2.unitType && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {step2.unitType === 'SINGLE_UNIT' ? 'Listing' : 'Listings'}{' '}
                  <span className="text-destructive">*</span>
                </Label>

                {step2.unitType === 'SINGLE_UNIT' ? (
                  <>
                    {step2.itemSummary && (
                      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
                        {step2.itemSummary.thumbnailId ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={blobsApi.getDownloadUrl(step2.itemSummary.thumbnailId)}
                            alt=""
                            className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">
                            {step2.itemSummary.name}
                          </p>
                          {step2.itemSummary.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {step2.itemSummary.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Available:{' '}
                            <span className="font-medium text-foreground">
                              {step2.itemSummary.availableQuantity ?? '—'}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <a
                            href={`/admin/listings/${step2.item}/view`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() =>
                              setStep2((prev) => ({
                                ...prev,
                                item: '',
                                itemName: '',
                                itemSummary: null,
                                categories: [],
                                subCategories: [],
                                tags: [],
                              }))
                            }
                            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {!step2.item && (
                      <ListingSearchField
                        value=""
                        displayName=""
                        onSelect={(listId, name, summary) =>
                          setStep2((prev) => ({
                            ...prev,
                            item: listId,
                            itemName: name,
                            itemSummary: summary,
                          }))
                        }
                      />
                    )}
                  </>
                ) : (
                  <>
                    {step2.items.length > 0 && (
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/40">
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground w-10" />
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">
                                Name
                              </th>
                              <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                                Description
                              </th>
                              <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">
                                Qty
                              </th>
                              <th className="px-2 py-2 w-16" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/50">
                            {step2.items.map((itemId, i) => {
                              const s = step2.itemSummaries[i];
                              return (
                                <tr key={i} className="bg-card">
                                  <td className="px-3 py-2">
                                    {s?.thumbnailId ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={blobsApi.getDownloadUrl(s.thumbnailId)}
                                        alt=""
                                        className="w-8 h-8 rounded object-cover border border-border"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-2">
                                    <p className="font-medium text-foreground truncate max-w-[150px]">
                                      {s?.name || step2.itemNames[i] || itemId}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground font-mono">
                                      {itemId.slice(-8)}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2 hidden sm:table-cell">
                                    <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                                      {s?.description ?? '—'}
                                    </p>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <span className="text-xs font-medium">
                                      {s?.availableQuantity ?? '—'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-2">
                                    <div className="flex items-center justify-end gap-1">
                                      <a
                                        href={`/admin/listings/${itemId}/view`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                                      >
                                        <Eye className="h-3.5 w-3.5" />
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => removeItem(i)}
                                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <ListingSearchField
                      addMode
                      onSelect={(listId, name, summary) => {
                        if (!step2.items.includes(listId)) {
                          setStep2((prev) => ({
                            ...prev,
                            items: [...prev.items, listId],
                            itemNames: [...prev.itemNames, name],
                            itemSummaries: [...prev.itemSummaries, summary],
                          }));
                        }
                      }}
                    />
                  </>
                )}
                <FieldError message={step2Errors.item} />
              </div>
            )}
          </div>

          <TagsCategorySection
            value={{
              categories: step2.categories,
              subCategories: step2.subCategories,
              tags: step2.tags,
            }}
            onChange={(patch) => setStep2((prev) => ({ ...prev, ...patch }))}
          />

          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep(1)}
              disabled={savingStep2}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.push('/admin/auctions')}
                disabled={savingStep2}
              >
                Skip
              </Button>
              <Button type="submit" disabled={savingStep2} className="gap-2">
                {savingStep2 ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      {/* ── Step 3 ── */}
      {step === 3 && (
        <Step3
          form={step3}
          onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
          auctionType={auctionType}
          priceProgression={step1.priceProgression}
          openingPrice={parseFloat(step2.openingPrice) || 0}
          precision={parseInt(step1.precision, 10) || 0}
          currencyUnit={step1.currencyUnit || 'INR'}
          fieldErrors={step3Errors}
          generalError={step3GeneralError}
          saving={savingStep3}
          onSubmit={handleStep3Submit}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
