'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  auctionsApi,
  listingsApi,
  blobsApi,
  AuctionCreationRQ,
  AuctionUnitType,
  ListingSummaryVM,
  PolicyGroup,
  PolicyItemRQ,
} from '@repo/api';
import { ArrowLeft, ArrowRight, Eye, Loader2, Package, Plus, Trash2 } from 'lucide-react';
import { ListingSearchField } from '../_components/ListingSearchField';
import { TagsCategorySection } from '../_components/TagsCategorySection';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';

interface SelectOption {
  value: string;
  label: string;
}

// ── Price progression ─────────────────────────────────────────────────────────

const PRICE_PROGRESSION_OPTIONS: Record<string, SelectOption[]> = {
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

function deriveAuctionType(priceProgression: string, unitType: string): string {
  const isAtomic = unitType === 'SINGLE_UNIT' || unitType === 'BUNDLE';
  if (priceProgression === 'STEP_BASED' && isAtomic) {
    return 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION';
  }
  return '';
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
        const clickable = !!onStepClick && done;
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
                } ${clickable ? 'cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-emerald-400/40' : ''}`}
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
  priceProgression: string;
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
  priceProgression: '',
  dimension: '',
  participantVisibility: '',
  offerVisibility: '',
  currencyUnit: 'INR',
  precision: '2',
  roundingMode: '',
};

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({
  form,
  onChange,
  fieldErrors,
  formats,
  accessibilityTypes,
  directionTypes,
  dimensionTypes,
  participantVisibilityTypes,
  offerVisibilityTypes,
  roundingModes,
  loadingOptions,
  onSubmit,
  onCancel,
}: {
  form: Step1State;
  onChange: (updates: Partial<Step1State>) => void;
  fieldErrors: Record<string, string>;
  formats: SelectOption[];
  accessibilityTypes: SelectOption[];
  directionTypes: SelectOption[];
  dimensionTypes: SelectOption[];
  participantVisibilityTypes: SelectOption[];
  offerVisibilityTypes: SelectOption[];
  roundingModes: SelectOption[];
  loadingOptions: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
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
            onChange={(v) => onChange({ direction: v, priceProgression: '' })}
            error={fieldErrors.direction}
            placeholder="Select direction..."
            loading={loadingOptions}
          />
          <SelectField
            id="priceProgression"
            label="Price Progression *"
            value={form.priceProgression}
            options={PRICE_PROGRESSION_OPTIONS[form.direction] ?? []}
            onChange={(v) => onChange({ priceProgression: v })}
            error={fieldErrors.priceProgression}
            placeholder={form.direction ? 'Select price progression...' : 'Select direction first'}
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
            options={participantVisibilityTypes}
            onChange={(v) => onChange({ participantVisibility: v })}
            error={fieldErrors.participantVisibility}
            placeholder="Select participant visibility..."
            loading={loadingOptions}
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
            options={roundingModes}
            onChange={(v) => onChange({ roundingMode: v })}
            error={fieldErrors.roundingMode}
            placeholder="Select rounding mode..."
            loading={loadingOptions}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="gap-2">
          Next
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </form>
  );
}

// ── Step 2 state ──────────────────────────────────────────────────────────────

interface Step2State {
  unitType: AuctionUnitType | '';
  openingPrice: string;
  // SINGLE_UNIT
  item: string;
  itemName: string;
  itemSummary: ListingSummaryVM | null;
  // BUNDLE / MULTI_UNIT / LOT
  items: string[];
  itemNames: string[];
  itemSummaries: ListingSummaryVM[];
  categories: string[];
  subCategories: string[];
  tags: string[];
}

const initialStep2: Step2State = {
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
};

// ── ListingCard ───────────────────────────────────────────────────────────────

function ListingCard({ summary, onClear }: { summary: ListingSummaryVM; onClear?: () => void }) {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
      {summary.thumbnailId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={blobsApi.getDownloadUrl(summary.thumbnailId)}
          alt=""
          className="w-14 h-14 rounded-lg object-cover border border-border shrink-0"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
          <Package className="h-6 w-6 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground text-sm truncate">{summary.name}</p>
        {summary.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{summary.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">
          Available:{' '}
          <span className="font-medium text-foreground">{summary.availableQuantity ?? '—'}</span>
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a
          href={`/admin/listings/${summary.id}/view`}
          target="_blank"
          rel="noreferrer"
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          title="View listing"
        >
          <Eye className="h-4 w-4" />
        </a>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function Step2({
  form,
  onChange,
  fieldErrors,
  generalError,
  saving,
  unitTypes,
  loadingUnitTypes,
  precision,
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
  precision: number;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onSkip: () => void;
}) {
  // Pre-populate categories/subcategories/tags when SINGLE_UNIT item is selected
  useEffect(() => {
    if (!form.item) return;
    listingsApi
      .getListingById(form.item)
      .then((listing) => {
        const subCat = listing.subCategory;
        const subCatId =
          typeof subCat === 'object' && subCat
            ? subCat.id
            : typeof subCat === 'string'
              ? subCat
              : '';
        onChange({
          categories: listing.category?.id ? [listing.category.id] : [],
          subCategories: subCatId ? [subCatId] : [],
          tags: listing.tags ?? [],
        });
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.item]);

  const removeItem = (idx: number) =>
    onChange({
      items: form.items.filter((_, i) => i !== idx),
      itemNames: form.itemNames.filter((_, i) => i !== idx),
      itemSummaries: form.itemSummaries.filter((_, i) => i !== idx),
    });

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
        </div>
      )}

      {/* Unit Configuration */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <SectionHeading>Auction Unit</SectionHeading>

        {/* Unit type + Opening price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">
              Unit Type <span className="text-destructive">*</span>
            </Label>
            <select
              value={form.unitType}
              onChange={(e) =>
                onChange({
                  unitType: e.target.value as AuctionUnitType,
                  item: '',
                  itemName: '',
                  items: [],
                  itemNames: [],
                })
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
            <FieldError message={fieldErrors.unitType} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="openingPrice" className="text-sm font-medium">
              Opening Price <span className="text-destructive">*</span>
            </Label>
            <Input
              id="openingPrice"
              type="number"
              min={0}
              step={precision > 0 ? (1 / Math.pow(10, precision)).toFixed(precision) : '1'}
              value={form.openingPrice}
              onChange={(e) => onChange({ openingPrice: e.target.value })}
              placeholder={precision > 0 ? `0.${'0'.repeat(precision)}` : '0'}
            />
            <FieldError message={fieldErrors.openingPrice} />
          </div>
        </div>

        {/* Listing search — shown once type is selected */}
        {form.unitType && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {form.unitType === 'SINGLE_UNIT' ? 'Listing' : 'Listings'}{' '}
              <span className="text-destructive">*</span>
            </Label>

            {form.unitType === 'SINGLE_UNIT' ? (
              <>
                {form.itemSummary && (
                  <ListingCard
                    summary={form.itemSummary}
                    onClear={() =>
                      onChange({
                        item: '',
                        itemName: '',
                        itemSummary: null,
                        categories: [],
                        subCategories: [],
                        tags: [],
                      })
                    }
                  />
                )}
                {!form.item && (
                  <ListingSearchField
                    value=""
                    displayName=""
                    onSelect={(id, name, summary) =>
                      onChange({ item: id, itemName: name, itemSummary: summary })
                    }
                  />
                )}
              </>
            ) : (
              <>
                {form.itemSummaries.length > 0 && (
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
                        {form.items.map((id, i) => {
                          const s = form.itemSummaries[i];
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
                                  {s?.name || form.itemNames[i] || id}
                                </p>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                  {id.slice(-8)}
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
                                    href={`/admin/listings/${id}/view`}
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
                  onSelect={(id, name, summary) => {
                    if (!form.items.includes(id)) {
                      onChange({
                        items: [...form.items, id],
                        itemNames: [...form.itemNames, name],
                        itemSummaries: [...form.itemSummaries, summary],
                      });
                    }
                  }}
                />
              </>
            )}
            <FieldError message={fieldErrors.item} />
          </div>
        )}
      </div>

      <TagsCategorySection
        value={{ categories: form.categories, subCategories: form.subCategories, tags: form.tags }}
        onChange={(patch) => onChange(patch)}
      />

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

// ── Step 3 ────────────────────────────────────────────────────────────────────

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
  onSkip,
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
  onSkip: () => void;
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
                  label="Basis *"
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

  // Step 1
  const [step1, setStep1] = useState<Step1State>(initialStep1);
  const [step1Errors, setStep1Errors] = useState<Record<string, string>>({});

  // Step 2
  const [step2, setStep2] = useState<Step2State>(initialStep2);
  const [step2Errors, setStep2Errors] = useState<Record<string, string>>({});
  const [step2GeneralError, setStep2GeneralError] = useState<string | null>(null);
  const [savingStep2, setSavingStep2] = useState(false);

  // Step 3
  const [createdAuctionId, setCreatedAuctionId] = useState<string | null>(null);
  const [createdAuctionType, setCreatedAuctionType] = useState('');
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
  }, []);

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

  // ── Step 1 submit ──────────────────────────────────────────────────────────

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

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateStep1();
    if (Object.keys(errs).length) {
      setStep1Errors(errs);
      return;
    }
    setStep1Errors({});
    setStep(2);
  };

  // ── Step 2 submit ──────────────────────────────────────────────────────────

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
      const auctionType = deriveAuctionType(step1.priceProgression, step2.unitType);
      if (!auctionType) {
        setStep2GeneralError(
          'This price progression and unit type combination is not yet supported.',
        );
        setSavingStep2(false);
        return;
      }
      let auctionId = createdAuctionId;
      if (!auctionId) {
        const payload: AuctionCreationRQ = {
          type: auctionType,
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
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: {
            type: step2.unitType as AuctionUnitType,
            openingPrice: parseFloat(step2.openingPrice),
            ...(isSingle ? { item: step2.item } : { items: step2.items }),
          },
        };
        auctionId = await auctionsApi.createAuction(payload);
        setCreatedAuctionId(auctionId);
        setCreatedAuctionType(auctionType);
      } else {
        await auctionsApi.setAuctionUnits(auctionId, {
          tags: step2.tags.length ? step2.tags : undefined,
          subCategories: step2.subCategories.length ? step2.subCategories : undefined,
          unit: {
            type: step2.unitType as AuctionUnitType,
            openingPrice: parseFloat(step2.openingPrice),
            ...(isSingle ? { item: step2.item } : { items: step2.items }),
          },
        });
      }
      setStep(3);
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setStep2Errors(parsed.fieldErrors);
      else setStep2GeneralError(parsed.general ?? 'Failed to create auction.');
    } finally {
      setSavingStep2(false);
    }
  };

  // ── Step 3 submit ──────────────────────────────────────────────────────────

  const validateStep3 = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (step3.participationType === 'EMD_POLICY') {
      if (!step3.emdBasis) errs.emdBasis = 'Please add a participant fee.';
      if (
        step3.emdBasis &&
        (!step3.emdValue || isNaN(parseFloat(step3.emdValue)) || parseFloat(step3.emdValue) <= 0)
      )
        errs.emdValue = 'A positive EMD value is required.';
    }
    step3.preconditions.forEach((pc, i) => {
      if (!pc.type) {
        errs[`precondition_type_${i}`] = 'Please select a precondition type.';
      } else if (
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
      if (!pc.type) continue;
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
    if (!createdAuctionId) {
      setStep3GeneralError('Auction ID is missing. Please go back and try again.');
      return;
    }
    setSavingStep3(true);
    try {
      const policies = buildPolicies();
      if (policies.length > 0) {
        await auctionsApi.setAuctionPolicyGroups(createdAuctionId, { policies });
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

      <StepIndicator current={step} onStepClick={(s) => s < step && setStep(s)} />

      {step === 1 && (
        <Step1
          form={step1}
          onChange={(u) => setStep1((prev) => ({ ...prev, ...u }))}
          fieldErrors={step1Errors}
          formats={formats}
          accessibilityTypes={accessibilityTypes}
          directionTypes={directionTypes}
          dimensionTypes={dimensionTypes}
          participantVisibilityTypes={participantVisibilityTypes}
          offerVisibilityTypes={offerVisibilityTypes}
          roundingModes={roundingModes}
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
          precision={parseInt(step1.precision, 10) || 0}
          onSubmit={handleStep2Submit}
          onBack={() => setStep(1)}
          onSkip={handleSkip}
        />
      )}

      {step === 3 && (
        <Step3
          form={step3}
          onChange={(u) => setStep3((prev) => ({ ...prev, ...u }))}
          auctionType={createdAuctionType}
          priceProgression={step1.priceProgression}
          openingPrice={parseFloat(step2.openingPrice) || 0}
          precision={parseInt(step1.precision, 10) || 0}
          currencyUnit={step1.currencyUnit || 'INR'}
          fieldErrors={step3Errors}
          generalError={step3GeneralError}
          saving={savingStep3}
          onSubmit={handleStep3Submit}
          onBack={() => setStep(2)}
          onSkip={handleSkip}
        />
      )}
    </div>
  );
}
