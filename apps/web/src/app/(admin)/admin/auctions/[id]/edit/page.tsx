'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { auctionsApi, AuctionUpdationRQ, AuctionUnitCreationRQ, AuctionUnitType } from '@repo/api';
import { ArrowLeft, ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';

interface SelectOption {
  value: string;
  label: string;
}

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

function StepIndicator({ current }: { current: number }) {
  const steps = ['Details', 'Auction Units'];
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

// ── Step 1 ────────────────────────────────────────────────────────────────────

interface Step1State {
  title: string;
  description: string;
  referenceId: string;
  format: string;
  accessibility: string;
  direction: string;
  dimension: string;
  participantVisibility: string;
  offerVisibility: string;
  currencyUnit: string;
  precision: string;
  roundingMode: string;
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface UnitRow {
  type: AuctionUnitType | '';
  items: string[];
  quantity: string;
}

interface Step2State {
  units: UnitRow[];
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditAuctionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [pageLoading, setPageLoading] = useState(true);
  const [step, setStep] = useState(1);

  // Step 1
  const [step1, setStep1] = useState<Step1State>({
    title: '',
    description: '',
    referenceId: '',
    format: '',
    accessibility: '',
    direction: '',
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

  // Step 2
  const [step2, setStep2] = useState<Step2State>({
    units: [{ type: '' as AuctionUnitType | '', items: [''], quantity: '1' }],
  });
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

    auctionsApi
      .getAuctionById(id)
      .then((auction) => {
        setStep1({
          title: auction.title ?? '',
          description: auction.description ?? '',
          referenceId: auction.referenceId ?? '',
          format: resolveStr(auction.format),
          accessibility: resolveStr(auction.protocol?.accessibility),
          direction: resolveStr(auction.protocol?.direction),
          dimension: resolveStr(auction.protocol?.dimension),
          participantVisibility: resolveStr(auction.protocol?.participantVisibility),
          offerVisibility: resolveStr(auction.protocol?.offerVisibility),
          currencyUnit: resolveStr(auction.monetaryOptions?.currencyUnit),
          precision: String(auction.monetaryOptions?.precision ?? 2),
          roundingMode: resolveStr(auction.monetaryOptions?.roundingMode),
        });

        if (auction.units?.length) {
          setStep2({
            units: auction.units.map((u) => ({
              type: u.type,
              items: u.items?.length ? u.items : [''],
              quantity: String(u.quantity ?? 1),
            })),
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

  const addUnit = () =>
    setStep2((prev) => ({
      units: [...prev.units, { type: '' as AuctionUnitType | '', items: [''], quantity: '1' }],
    }));

  const removeUnit = (idx: number) =>
    setStep2((prev) => ({ units: prev.units.filter((_, i) => i !== idx) }));

  const patchUnit = (idx: number, patch: Partial<UnitRow>) =>
    setStep2((prev) => ({
      units: prev.units.map((u, i) => (i === idx ? { ...u, ...patch } : u)),
    }));

  const setUnitType = (idx: number, type: AuctionUnitType | '') =>
    setStep2((prev) => ({
      units: prev.units.map((u, i) =>
        i === idx
          ? { ...u, type, items: type === 'SINGLE_UNIT' ? [u.items[0] ?? ''] : u.items }
          : u,
      ),
    }));

  const addItem = (unitIdx: number) =>
    setStep2((prev) => ({
      units: prev.units.map((u, i) => (i === unitIdx ? { ...u, items: [...u.items, ''] } : u)),
    }));

  const removeItem = (unitIdx: number, itemIdx: number) =>
    setStep2((prev) => ({
      units: prev.units.map((u, i) =>
        i === unitIdx ? { ...u, items: u.items.filter((_, ii) => ii !== itemIdx) } : u,
      ),
    }));

  const patchItem = (unitIdx: number, itemIdx: number, value: string) =>
    setStep2((prev) => ({
      units: prev.units.map((u, i) =>
        i === unitIdx ? { ...u, items: u.items.map((it, ii) => (ii === itemIdx ? value : it)) } : u,
      ),
    }));

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
        await auctionsApi.setAuctionUnits(id, {
          units: filledUnits.map((u) => ({
            type: u.type as AuctionUnitType,
            items: u.items.map((it) => it.trim()).filter(Boolean),
            quantity: parseInt(u.quantity, 10),
          })),
        } as AuctionUnitCreationRQ);
      }
      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction units.');
    } finally {
      setSavingStep2(false);
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
        title="Edit auction"
        description="Update auction details"
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/auctions')}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        }
      />

      <StepIndicator current={step} />

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

          {/* Auction Configuration */}
          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeading>Auction Configuration</SectionHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                onChange={(v) => patch1({ direction: v })}
                error={step1Errors.direction}
                placeholder="Select direction..."
                loading={loadingOptions}
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
                options={PARTICIPANT_VISIBILITY_TYPES}
                onChange={(v) => patch1({ participantVisibility: v })}
                error={step1Errors.participantVisibility}
                placeholder="Select participant visibility..."
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
                options={ROUNDING_MODES}
                onChange={(v) => patch1({ roundingMode: v })}
                error={step1Errors.roundingMode}
                placeholder="Select rounding mode..."
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

          <div className="rounded-xl border border-border bg-card p-6">
            <SectionHeading>Auction Units</SectionHeading>
            <p className="text-xs text-muted-foreground mb-4">
              Add the item(s) to be auctioned. Choose <strong>Single Unit</strong> for one listing
              or another type to group multiple listings.
            </p>

            <div className="space-y-4">
              {step2.units.map((unit, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-3"
                >
                  {/* Type + Quantity + Remove */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <select
                        value={unit.type}
                        onChange={(e) => setUnitType(idx, e.target.value as AuctionUnitType)}
                        disabled={loadingUnitTypes}
                        className="w-full rounded-md border border-input bg-background px-3 py-[7px] text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      >
                        <option value="">
                          {loadingUnitTypes ? 'Loading...' : 'Select type...'}
                        </option>
                        {unitTypes.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      <FieldError message={step2Errors[`unit_type_${idx}`]} />
                    </div>

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
                    <FieldError message={step2Errors[`unit_quantity_${idx}`]} />

                    <button
                      type="button"
                      onClick={() => removeUnit(idx)}
                      disabled={step2.units.length === 1}
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
                    <FieldError message={step2Errors[`unit_items_${idx}`]} />

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

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addUnit}
                className="gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Add unit
              </Button>
            </div>
          </div>

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
              <Button type="submit" disabled={savingStep2}>
                {savingStep2 ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save & Finish'
                )}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
