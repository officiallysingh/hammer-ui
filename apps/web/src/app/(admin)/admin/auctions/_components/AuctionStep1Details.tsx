'use client';

import { ArrowRight, Loader2 } from 'lucide-react';
import { Button, Input, Label } from '@repo/ui';
import {
  FieldError,
  SectionHeading,
  SelectField,
  PRICE_PROGRESSION_OPTIONS,
  SelectOption,
} from './AuctionShared';

export interface Step1State {
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

export const initialStep1: Step1State = {
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

interface AuctionStep1DetailsProps {
  form: Step1State;
  onChange: (updates: Partial<Step1State>) => void;
  fieldErrors: Record<string, string>;
  generalError?: string | null;
  formats: SelectOption[];
  accessibilityTypes: SelectOption[];
  directionTypes: SelectOption[];
  dimensionTypes: SelectOption[];
  participantVisibilityTypes: SelectOption[];
  offerVisibilityTypes: SelectOption[];
  roundingModes: SelectOption[];
  loadingOptions: boolean;
  saving?: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onSkip?: () => void;
  submitLabel?: string;
}

export function AuctionStep1Details({
  form,
  onChange,
  fieldErrors,
  generalError,
  formats,
  accessibilityTypes,
  directionTypes,
  dimensionTypes,
  participantVisibilityTypes,
  offerVisibilityTypes,
  roundingModes,
  loadingOptions,
  saving,
  onSubmit,
  onCancel,
  onSkip,
  submitLabel = 'Next',
}: AuctionStep1DetailsProps) {
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

          <SelectField
            id="format"
            label="Format"
            required
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
            label="Accessibility"
            required
            value={form.accessibility}
            options={accessibilityTypes}
            onChange={(v) => onChange({ accessibility: v })}
            error={fieldErrors.accessibility}
            placeholder="Select accessibility..."
            loading={loadingOptions}
          />
          <SelectField
            id="direction"
            label="Direction"
            required
            value={form.direction}
            options={directionTypes}
            onChange={(v) => onChange({ direction: v, priceProgression: '' })}
            error={fieldErrors.direction}
            placeholder="Select direction..."
            loading={loadingOptions}
          />
          <SelectField
            id="priceProgression"
            label="Price Progression"
            required
            value={form.priceProgression}
            options={PRICE_PROGRESSION_OPTIONS[form.direction] ?? []}
            onChange={(v) => onChange({ priceProgression: v })}
            error={fieldErrors.priceProgression}
            placeholder={form.direction ? 'Select price progression...' : 'Select direction first'}
          />
          <SelectField
            id="dimension"
            label="Dimension"
            required
            value={form.dimension}
            options={dimensionTypes}
            onChange={(v) => onChange({ dimension: v })}
            error={fieldErrors.dimension}
            placeholder="Select dimension..."
            loading={loadingOptions}
          />
          <SelectField
            id="participantVisibility"
            label="Participant Visibility"
            required
            value={form.participantVisibility}
            options={participantVisibilityTypes}
            onChange={(v) => onChange({ participantVisibility: v })}
            error={fieldErrors.participantVisibility}
            placeholder="Select participant visibility..."
            loading={loadingOptions}
          />
          <SelectField
            id="offerVisibility"
            label="Offer Visibility"
            required
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
              placeholder="e.g. 2"
            />
            <FieldError message={fieldErrors.precision} />
          </div>

          <SelectField
            id="roundingMode"
            label="Rounding Mode"
            required
            value={form.roundingMode}
            options={roundingModes}
            onChange={(v) => onChange({ roundingMode: v })}
            error={fieldErrors.roundingMode}
            placeholder="Select rounding mode..."
            loading={loadingOptions}
          />
        </div>
      </div>

      <div className="flex justify-between gap-3">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
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
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </form>
  );
}
