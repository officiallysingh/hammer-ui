'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { FieldError, SelectField, SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS, PolicyInfoButton, SELECT_CLS } from './PolicyShared';

interface Props {
  extensionEnabled: boolean;
  extensionType: string;
  extensionName: string;
  extensionDescription: string;
  extensionReference: string;
  extensionDurationMinutes: string;
  extensionLimit: string;
  onAdd: () => void;
  onRemove: () => void;
  onFieldChange: (field: string, value: string) => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
  groupDescription?: string;
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
  onAdd,
  onRemove,
  onFieldChange,
  options,
  fieldErrors,
  groupDescription,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Extension</h3>
          {groupDescription && <PolicyInfoButton description={groupDescription} />}
        </div>
        {!extensionEnabled ? (
          <button
            type="button"
            onClick={onAdd}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        ) : (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {!extensionEnabled ? (
        <p className="text-sm text-muted-foreground">No extension policy defined.</p>
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
