'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auctionsApi, AuctionCreationRQ } from '@repo/api';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import PageHeader from '@/components/common/admin/PageHeader';
import { parseApiError } from '@/lib/api-errors';

interface SelectOption {
  value: string;
  label: string;
}

const AUCTION_TYPES: SelectOption[] = [
  {
    value: 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION',
    label: 'Offer Base Step Priced Atomic Unit Auction',
  },
];

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

interface FormState {
  type: string;
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

const initialForm: FormState = {
  type: 'OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION',
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
  precision: '3',
  roundingMode: 'HALF_UP',
};

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

export default function NewAuctionPage() {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formats, setFormats] = useState<SelectOption[]>([]);
  const [accessibilityTypes, setAccessibilityTypes] = useState<SelectOption[]>([]);
  const [directionTypes, setDirectionTypes] = useState<SelectOption[]>([]);
  const [dimensionTypes, setDimensionTypes] = useState<SelectOption[]>([]);
  const [offerVisibilityTypes, setOfferVisibilityTypes] = useState<SelectOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

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
  }, []);

  const patch = (updates: Partial<FormState>) => setForm((prev) => ({ ...prev, ...updates }));

  const validate = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (!form.type) errs.type = 'Auction type is required.';
    if (!form.format) errs.format = 'Format is required.';
    if (!form.accessibility) errs.accessibility = 'Accessibility is required.';
    if (!form.direction) errs.direction = 'Direction is required.';
    if (!form.dimension) errs.dimension = 'Dimension is required.';
    if (!form.participantVisibility)
      errs.participantVisibility = 'Participant visibility is required.';
    if (!form.offerVisibility) errs.offerVisibility = 'Offer visibility is required.';
    if (!form.currencyUnit.trim()) errs.currencyUnit = 'Currency unit is required.';
    const prec = parseInt(form.precision, 10);
    if (isNaN(prec) || prec < 0) errs.precision = 'Precision must be a non-negative integer.';
    if (!form.roundingMode) errs.roundingMode = 'Rounding mode is required.';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    setSaving(true);
    try {
      const payload: AuctionCreationRQ = {
        type: form.type,
        format: form.format,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        referenceId: form.referenceId.trim() || undefined,
        protocol: {
          accessibility: form.accessibility,
          direction: form.direction,
          dimension: form.dimension,
          participantVisibility: form.participantVisibility,
          offerVisibility: form.offerVisibility,
        },
        monetaryOptions: {
          currencyUnit: form.currencyUnit.trim().toUpperCase(),
          precision: parseInt(form.precision, 10),
          roundingMode: form.roundingMode,
        },
      };
      await auctionsApi.createAuction(payload);
      router.push('/admin/auctions');
    } catch (err) {
      const parsed = parseApiError(err);
      if (Object.keys(parsed.fieldErrors).length) setFieldErrors(parsed.fieldErrors);
      else setGeneralError(parsed.general ?? 'Failed to create auction.');
    } finally {
      setSaving(false);
    }
  };

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

      {generalError && (
        <div className="py-2 px-3 bg-destructive/10 text-destructive text-sm rounded-md">
          {generalError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                onChange={(e) => patch({ title: e.target.value })}
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
                onChange={(e) => patch({ referenceId: e.target.value })}
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
                  patch({ description: e.target.value })
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
              id="type"
              label="Auction Type *"
              value={form.type}
              options={AUCTION_TYPES}
              onChange={(v) => patch({ type: v })}
              error={fieldErrors.type}
              placeholder="Select auction type..."
            />
            <SelectField
              id="format"
              label="Format *"
              value={form.format}
              options={formats}
              onChange={(v) => patch({ format: v })}
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
              onChange={(v) => patch({ accessibility: v })}
              error={fieldErrors.accessibility}
              placeholder="Select accessibility..."
              loading={loadingOptions}
            />
            <SelectField
              id="direction"
              label="Direction *"
              value={form.direction}
              options={directionTypes}
              onChange={(v) => patch({ direction: v })}
              error={fieldErrors.direction}
              placeholder="Select direction..."
              loading={loadingOptions}
            />
            <SelectField
              id="dimension"
              label="Dimension *"
              value={form.dimension}
              options={dimensionTypes}
              onChange={(v) => patch({ dimension: v })}
              error={fieldErrors.dimension}
              placeholder="Select dimension..."
              loading={loadingOptions}
            />
            <SelectField
              id="participantVisibility"
              label="Participant Visibility *"
              value={form.participantVisibility}
              options={PARTICIPANT_VISIBILITY_TYPES}
              onChange={(v) => patch({ participantVisibility: v })}
              error={fieldErrors.participantVisibility}
              placeholder="Select participant visibility..."
            />
            <SelectField
              id="offerVisibility"
              label="Offer Visibility *"
              value={form.offerVisibility}
              options={offerVisibilityTypes}
              onChange={(v) => patch({ offerVisibility: v })}
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
                onChange={(e) => patch({ currencyUnit: e.target.value.toUpperCase() })}
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
                max={10}
                value={form.precision}
                onChange={(e) => patch({ precision: e.target.value })}
                placeholder="e.g. 3"
              />
              <FieldError message={fieldErrors.precision} />
            </div>

            <SelectField
              id="roundingMode"
              label="Rounding Mode *"
              value={form.roundingMode}
              options={ROUNDING_MODES}
              onChange={(v) => patch({ roundingMode: v })}
              error={fieldErrors.roundingMode}
              placeholder="Select rounding mode..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/admin/auctions')}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Auction
          </Button>
        </div>
      </form>
    </div>
  );
}
