'use client';

import { Input, Label } from '@repo/ui';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS, SELECT_CLS } from './PolicyShared';

interface Props {
  extensionEnabled: boolean;
  extensionType: string;
  extensionName: string;
  extensionDescription: string;
  extensionReference: string;
  extensionDurationMinutes: string;
  extensionLimit: string;
  onToggle: (enabled: boolean) => void;
  onFieldChange: (field: string, value: string) => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
}

const REFERENCE_OPTIONS: SelectOption[] = [
  { value: 'FROM_LATEST_OFFER_TIME', label: 'From Latest Offer Time' },
  { value: 'FROM_CLOSING_TIME', label: 'From Closing Time' },
];

export function PolicyExtensionSection({
  extensionEnabled,
  extensionType,
  extensionName,
  extensionDescription,
  extensionReference,
  extensionDurationMinutes,
  extensionLimit,
  onToggle,
  onFieldChange,
  options,
  fieldErrors,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Extension</h3>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <span className="text-xs text-muted-foreground">
            {extensionEnabled ? 'Enabled' : 'Disabled'}
          </span>
          <div className="relative inline-flex h-5 w-9 items-center">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={extensionEnabled}
              onChange={(e) => onToggle(e.target.checked)}
            />
            <div className="h-5 w-9 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
            <div
              className={`absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                extensionEnabled ? 'translate-x-4' : 'translate-x-1'
              }`}
            />
          </div>
        </label>
      </div>

      {!extensionEnabled ? (
        <p className="text-sm text-muted-foreground">No extension policy.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={extensionName ?? ''}
                onChange={(e) => onFieldChange('extensionName', e.target.value)}
                placeholder="Extension policy name"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={extensionDescription ?? ''}
                onChange={(e) => onFieldChange('extensionDescription', e.target.value)}
                placeholder="Brief description"
                className="text-sm"
              />
            </div>
          </div>

          <SelectField
            id="extensionType"
            label="Type"
            required
            value={extensionType}
            options={options}
            onChange={(v) => {
              const defaults = POLICY_DEFAULTS[v];
              onFieldChange('extensionType', v);
              if (!extensionName) onFieldChange('extensionName', defaults?.name ?? '');
              if (!extensionDescription)
                onFieldChange('extensionDescription', defaults?.description ?? '');
            }}
            error={fieldErrors['extensionType']}
            placeholder="Select type..."
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reference</Label>
              <select
                value={extensionReference}
                onChange={(e) => onFieldChange('extensionReference', e.target.value)}
                className={SELECT_CLS}
              >
                {REFERENCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Duration (minutes) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={1}
                value={extensionDurationMinutes}
                onChange={(e) => onFieldChange('extensionDurationMinutes', e.target.value)}
                placeholder="10"
                className="h-8 text-sm"
              />
              <FieldError message={fieldErrors['extensionDuration']} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Limit <span className="text-muted-foreground text-[10px]">(0 = unlimited)</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={extensionLimit}
                onChange={(e) => onFieldChange('extensionLimit', e.target.value)}
                placeholder="0"
                className="h-8 text-sm"
              />
              <FieldError message={fieldErrors['extensionLimit']} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
