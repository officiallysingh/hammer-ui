'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionCreationRQ, AuctionUnitCreationRQ, AuctionUnitType } from '@repo/api';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';

interface SelectOption {
  value: string;
  label: string;
}

const AUCTION_TYPE = 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION';

const PARTICIPANT_VISIBILITY_TYPES: SelectOption[] = [
  { value: 'ALIAS', label: 'Alias - Participants shown by alias' },
  { value: 'REAL', label: 'Real - Real names visible' },
  { value: 'HIDDEN', label: 'Hidden - Participant identities hidden' },
];

const ROUNDING_MODES: SelectOption[] = [
  { value: 'HALF_UP', label: 'Half Up' },
  { value: 'HALF_DOWN', label: 'Half Down' },
  { value: 'HALF_EVEN', label: "Half Even (Banker's Rounding)" },
  { value: 'UP', label: 'Up' },
  { value: 'DOWN', label: 'Down' },
  { value: 'CEILING', label: 'Ceiling' },
  { value: 'FLOOR', label: 'Floor' },
];

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

function StepIndicator({ current }: { current: number }) {
  const steps = ['Details', 'Schedule & Config'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => {
        const s = i + 1;
        const done = s < current;
        const active = s === current;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex items-center justify-center h-9 w-9 rounded-full text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : done
                      ? 'bg-emerald-500 text-white'
                      : 'bg-muted text-muted-foreground'
                }`}
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

// ── Step 1 state ──────────────────────────────────────────────────────────────

interface Step1State {
  format: string;
  title: string;
  description: string;
  referenceId: string;
  accessibility: string;
  direction: string;
  dimension: string;
  participantVisibility: string;
  offerVisibility: string;
  currencyUnit: string;
  precision: string;
  roundingMode: string;
}

const initialStep1: Step1State = {
  format: '',
  title: '',
  description: '',
  referenceId: '',
  accessibility: '',
  direction: '',
  dimension: '',
  participantVisibility: 'ALIAS',
  offerVisibility: '',
  currencyUnit: 'INR',
  precision: '2',
  roundingMode: 'HALF_UP',
};

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({
  form,
  onChange,
  fieldErrors,
  generalError,
  saving,
  formats,
  accessibilityTypes,
  directionTypes,
  dimensionTypes,
  offerVisibilityTypes,
  loadingOptions,
  onSubmit,
  onCancel,
}: {
  form: Step1State;
  onChange: (updates: Partial<Step1State>) => void;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  formats: SelectOption[];
  accessibilityTypes: SelectOption[];
  directionTypes: SelectOption[];
  dimensionTypes: SelectOption[];
  offerVisibilityTypes: SelectOption[];
  loadingOptions: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
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
              value={form.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g. Samsung TV"
            />
            <FieldError message={fieldErrors.title} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="referenceId" className="text-sm font-medium">
              Reference ID
            </Label>
            <Input
              id="referenceId"
              value={form.referenceId}
              onChange={(e) => onChange({ referenceId: e.target.value })}
              placeholder="e.g. AXN_0001"
              className="font-mono"
            />
            <FieldError message={fieldErrors.referenceId} />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                onChange({ description: e.target.value })
              }
              placeholder="Describe the auction item..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <FieldError message={fieldErrors.description} />
          </div>
        </div>
      </div>

      {/* Auction Configuration */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionHeading>Auction Configuration</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="format"
            label="Format *"
            value={form.format}
            options={formats}
            onChange={(v) => onChange({ format: v })}
            error={fieldErrors.format}
            placeholder="Select format..."
            loading={loadingOptions}
          />
        </div>
      </div>

      {/* Protocol */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionHeading>Protocol</SectionHeading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField
            id="accessibility"
            label="Accessibility *"
            value={form.accessibility}
            options={accessibilityTypes}
            onChange={(v) => onChange({ accessibility: v })}
            error={fieldErrors.accessibility}
            placeholder="Select accessibility..."
            loading={loadingOptions}
          />
          <SelectField
            id="direction"
            label="Direction *"
            value={form.direction}
            options={directionTypes}
            onChange={(v) => onChange({ direction: v })}
            error={fieldErrors.direction}
            placeholder="Select direction..."
            loading={loadingOptions}
          />
          <SelectField
            id="dimension"
            label="Dimension *"
            value={form.dimension}
            options={dimensionTypes}
            onChange={(v) => onChange({ dimension: v })}
            error={fieldErrors.dimension}
            placeholder="Select dimension..."
            loading={loadingOptions}
          />
          <SelectField
            id="participantVisibility"
            label="Participant Visibility *"
            value={form.participantVisibility}
            options={PARTICIPANT_VISIBILITY_TYPES}
            onChange={(v) => onChange({ participantVisibility: v })}
            error={fieldErrors.participantVisibility}
            placeholder="Select participant visibility..."
          />
          <SelectField
            id="offerVisibility"
            label="Offer Visibility *"
            value={form.offerVisibility}
            options={offerVisibilityTypes}
            onChange={(v) => onChange({ offerVisibility: v })}
            error={fieldErrors.offerVisibility}
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
              value={form.currencyUnit}
              onChange={(e) => onChange({ currencyUnit: e.target.value.toUpperCase() })}
              placeholder="e.g. INR, USD"
              maxLength={10}
              className="font-mono uppercase"
            />
            <FieldError message={fieldErrors.currencyUnit} />
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
              value={form.precision}
              onChange={(e) => onChange({ precision: e.target.value })}
              placeholder="e.g. 3"
            />
            <FieldError message={fieldErrors.precision} />
          </div>

          <SelectField
            id="roundingMode"
            label="Rounding Mode *"
            value={form.roundingMode}
            options={ROUNDING_MODES}
            onChange={(v) => onChange({ roundingMode: v })}
            error={fieldErrors.roundingMode}
            placeholder="Select rounding mode..."
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ── Step 2 state ──────────────────────────────────────────────────────────────

interface UnitRow {
  type: AuctionUnitType | '';
  items: string[];
  quantity: string;
}

interface Step2State {
  units: UnitRow[];
}

const initialStep2: Step2State = {
  units: [{ type: '' as AuctionUnitType | '', items: [''], quantity: '1' }],
};

// ── Step 2 ────────────────────────────────────────────────────────────────────

function Step2({
  form,
  onChange,
  fieldErrors,
  generalError,
  saving,
  unitTypes,
  loadingUnitTypes,
  onSubmit,
  onBack,
  onSkip,
}: {
  form: Step2State;
  onChange: (updates: Partial<Step2State>) => void;
  fieldErrors: Record<string, string>;
  generalError: string | null;
  saving: boolean;
  unitTypes: SelectOption[];
  loadingUnitTypes: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  const addUnit = () =>
    onChange({
      units: [...form.units, { type: '' as AuctionUnitType | '', items: [''], quantity: '1' }],
    });

  const removeUnit = (idx: number) => onChange({ units: form.units.filter((_, i) => i !== idx) });

  const patchUnit = (idx: number, patch: Partial<UnitRow>) =>
    onChange({ units: form.units.map((u, i) => (i === idx ? { ...u, ...patch } : u)) });

  const setUnitType = (idx: number, type: AuctionUnitType | '') =>
    onChange({
      units: form.units.map((u, i) =>
        i === idx
          ? { ...u, type, items: type === 'SINGLE_UNIT' ? [u.items[0] ?? ''] : u.items }
          : u,
      ),
    });

  const addItem = (unitIdx: number) =>
    onChange({
      units: form.units.map((u, i) => (i === unitIdx ? { ...u, items: [...u.items, ''] } : u)),
    });

  const removeItem = (unitIdx: number, itemIdx: number) =>
    onChange({
      units: form.units.map((u, i) =>
        i === unitIdx ? { ...u, items: u.items.filter((_, ii) => ii !== itemIdx) } : u,
      ),
    });

  const patchItem = (unitIdx: number, itemIdx: number, value: string) =>
    onChange({
      units: form.units.map((u, i) =>
        i === unitIdx ? { ...u, items: u.items.map((it, ii) => (ii === itemIdx ? value : it)) } : u,
      ),
    });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
        </div>
      )}

      {/* Auction Units */}
      <div className="rounded-xl border border-border bg-card p-6">
        <SectionHeading>Auction Units</SectionHeading>
        <p className="text-xs text-muted-foreground mb-4">
          Add the item(s) to be auctioned. Choose <strong>Item</strong> for a single listing or{' '}
          <strong>Bundle</strong> to group multiple listings together.
        </p>

        <div className="space-y-4">
          {form.units.map((unit, idx) => (
            <div key={idx} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              {/* Unit header row: type toggle + quantity + remove */}
              <div className="flex items-center gap-3">
                {/* Unit type */}
                <div className="flex-1">
                  <select
                    value={unit.type}
                    onChange={(e) => setUnitType(idx, e.target.value as AuctionUnitType)}
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
                  <FieldError message={fieldErrors[`unit_type_${idx}`]} />
                </div>

                {/* Quantity */}
                <div className="flex items-center gap-2 shrink-0">
                  <Label className="text-xs text-muted-foreground whitespace-nowrap">Qty</Label>
                  <Input
                    type="number"
                    min={1}
                    value={unit.quantity}
                    onChange={(e) => patchUnit(idx, { quantity: e.target.value })}
                    placeholder="1"
                    className="w-20"
                  />
                </div>
                <FieldError message={fieldErrors[`unit_quantity_${idx}`]} />

                {/* Remove unit */}
                <button
                  type="button"
                  onClick={() => removeUnit(idx)}
                  disabled={form.units.length === 1}
                  className="ml-auto p-1.5 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Listing ID inputs */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">
                  {unit.type === 'SINGLE_UNIT' ? 'Listing ID' : 'Listing IDs'}
                </Label>

                {unit.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex items-center gap-2">
                    <Input
                      value={item}
                      onChange={(e) => patchItem(idx, itemIdx, e.target.value)}
                      placeholder="e.g. 65f014c3e9dc326dd15edef7"
                      className="font-mono text-sm"
                    />
                    {unit.type !== 'SINGLE_UNIT' && (
                      <button
                        type="button"
                        onClick={() => removeItem(idx, itemIdx)}
                        disabled={unit.items.length === 1}
                        className="shrink-0 p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                <FieldError message={fieldErrors[`unit_items_${idx}`]} />

                {unit.type !== 'SINGLE_UNIT' && unit.type !== '' && (
                  <button
                    type="button"
                    onClick={() => addItem(idx)}
                    className="flex items-center gap-1 text-xs text-primary hover:opacity-80 transition-opacity mt-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add listing
                  </button>
                )}
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={addUnit} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Add unit
          </Button>
        </div>
        <FieldError message={fieldErrors.units} />
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex gap-3">
          <Button type="button" variant="ghost" onClick={onSkip} disabled={saving}>
            Skip
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
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NewAuctionPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [auctionId, setAuctionId] = useState<string | null>(null);

  // Step 1
  const [step1, setStep1] = useState<Step1State>(initialStep1);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});
  const [step1GeneralError, setStep1GeneralError] = useState<string | null>(null);
  const [savingStep1, setSavingStep1] = useState(false);

  // Step 2
  const [step2, setStep2] = useState<Step2State>(initialStep2);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Model options
  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [directionTypes, setDirectionTypes] = useState<SelectOption[]>([]);
  const [dimensionTypes, setDimensionTypes] = useState<SelectOption[]>([]);
  const [offerVisibilityTypes, setOfferVisibilityTypes] = useState<SelectOption[]>([]);
  const [unitTypes, setUnitTypes] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      auctionsApi.getFormats(),
      auctionsApi.getAccessibilityTypes(),
      auctionsApi.getDirectionTypes(),
      auctionsApi.getDimensionTypes(),
      auctionsApi.getOfferVisibilityTypes(),
    ]).then(([fmts, access, dirs, dims, offerVis]) => {
      if (fmts.status === 'fulfilled') setFormats(fmts.value);
      if (access.status === 'fulfilled') setAccessibilityTypes(access.value);
      if (dirs.status === 'fulfilled') setDirectionTypes(dirs.value);
      if (dims.status === 'fulfilled') setDimensionTypes(dims.value);
      if (offerVis.status === 'fulfilled') setOfferVisibilityTypes(offerVis.value);
      setLoadingOptions(false);
    });

    auctionsApi
      .getUnitTypes()
      .then((types) => setUnitTypes(types))
      .finally(() => setLoadingUnitTypes(false));
  }, []);

  // ── Step 1 submit ──────────────────────────────────────────────────────────

  const validateStep1 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!step1.title.trim()) errs.title = 'Title is required.';
    if (!step1.format) errs.format = 'Format is required.';
    if (!step1.accessibility) errs.accessibility = 'Accessibility is required.';
    if (!step1.direction) errs.direction = 'Direction is required.';
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
    setSavingStep1(true);
    try {
      const payload: AuctionCreationRQ = {
        type: AUCTION_TYPE,
        format: step1.format,
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
      const id = await auctionsApi.createAuction(payload);
      setAuctionId(id);
      setStep(2);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep1Errors(parsed.fieldErrors);
      else setStep1GeneralError(parsed.general ?? 'Failed to create auction.');
    } finally {
      setSavingStep1(false);
    }
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────

  const validateStep2 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    step2.units.forEach((u, i) => {
      if (!u.type) errs[`unit_type_${i}`] = 'Unit type is required.';
      const qty = parseInt(u.quantity, 10);
      if (isNaN(qty) || qty < 1) errs[`unit_quantity_${i}`] = 'Quantity must be ≥ 1.';
      if (u.items.every((it) => !it.trim()))
        errs[`unit_items_${i}`] = 'At least one listing ID is required.';
    });
    return errs;
  };

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionId) return;
    setStep2GeneralError(null);
    const errs = validateStep2();
    if (Object.keys(errs).length) {
      setStep2Errors(errs);
      return;
    }
    setStep2Errors({});
    setSavingStep2(true);
    try {
      const filledUnits = step2.units.filter((u) => u.type && u.items.some((it) => it.trim()));

      if (filledUnits.length) {
        await auctionsApi.setAuctionUnits(auctionId, {
          units: filledUnits.map((u) => ({
            type: u.type as AuctionUnitType,
            items: u.items.map((it) => it.trim()).filter(Boolean),
            quantity: parseInt(u.quantity, 10),
          })),
        });
      }

      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction configuration.');
    } finally {
      setSavingStep2(false);
    }
  };

  const handleSkip = () => router.push('/admin/auctions');

  return (
    <div className="space-y-6">
      <PageHeader
        title="New auction"
        description="Create a new auction"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <StepIndicator current={step} />

      {step === 1 && (
        <Step1
          form={step1}
          onChange={(u) => setStep1((prev) => ({ ...prev, ...u }))}
          fieldErrors={step1Errors}
          generalError={step1GeneralError}
          saving={savingStep1}
          formats={formats}
          accessibilityTypes={accessibilityTypes}
          directionTypes={directionTypes}
          dimensionTypes={dimensionTypes}
          offerVisibilityTypes={offerVisibilityTypes}
          loadingOptions={loadingOptions}
          onSubmit={handleStep1Submit}
          onCancel={() => router.push('/admin/auctions')}
        />
      )}

      {step === 2 && (
        <Step2
          form={step2}
          onChange={(u) => setStep2((prev) => ({ ...prev, ...u }))}
          fieldErrors={step2Errors}
          generalError={step2GeneralError}
          saving={savingStep2}
          unitTypes={unitTypes}
          loadingUnitTypes={loadingUnitTypes}
          onSubmit={handleStep2Submit}
          onBack={() => setStep(1)}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
