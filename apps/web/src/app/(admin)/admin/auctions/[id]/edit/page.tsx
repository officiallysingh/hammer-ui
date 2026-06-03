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
} from '@repo/api';
import { ArrowLeft, ArrowRight, Eye, Loader2, Package, Trash2 } from 'lucide-react';
import { ListingSearchField } from '../../_components/ListingSearchField';
import { TagsCategorySection } from '../../_components/TagsCategorySection';
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
        const loaded: Step1State = {
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
        };
        setStep1(loaded);
        setOriginalStep1(loaded);

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
      const typeLabel = unitTypes.find((t) => t.value === step2.unitType)?.label ?? step2.unitType;
      const isSingle = step2.unitType === 'SINGLE_UNIT';

      await auctionsApi.setAuctionUnits(id, {
        tags: step2.tags.length ? step2.tags : undefined,
        subCategories: step2.subCategories.length ? step2.subCategories : undefined,
        unit: {
          type: { [step2.unitType]: typeLabel },
          openingPrice: parseFloat(step2.openingPrice),
          ...(isSingle ? { item: step2.item } : { items: step2.items }),
        },
      });

      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to save auction unit.');
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
                  step="any"
                  value={step2.openingPrice}
                  onChange={(e) => setStep2((prev) => ({ ...prev, openingPrice: e.target.value }))}
                  placeholder="0.00"
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
