'use client';

import { Plus, Trash2 } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { SelectField, SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS } from './PolicyShared';

interface Props {
  tieBreakingType: string;
  tieBreakingName: string;
  tieBreakingDescription: string;
  onFieldChange: (field: string, value: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
}

export function PolicyTieBreakingSection({
  tieBreakingType,
  tieBreakingName,
  tieBreakingDescription,
  onFieldChange,
  onAdd,
  onRemove,
  options,
  fieldErrors,
}: Props) {
  const added = tieBreakingType !== '';

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Tie Breaking</h3>
        {!added ? (
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

      {!added ? (
        <p className="text-sm text-muted-foreground">No tie-breaking policy defined.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Name</Label>
              <Input
                value={tieBreakingName ?? ''}
                onChange={(e) => onFieldChange('tieBreakingName', e.target.value)}
                placeholder="Policy name"
                className="text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={tieBreakingDescription ?? ''}
                onChange={(e) => onFieldChange('tieBreakingDescription', e.target.value)}
                placeholder="Brief description"
                className="text-sm"
              />
            </div>
          </div>

          <SelectField
            id="tieBreakingType"
            label="Type"
            required
            value={tieBreakingType}
            options={options}
            onChange={(v) => {
              const defaults = POLICY_DEFAULTS[v];
              onFieldChange('tieBreakingType', v);
              if (!tieBreakingName) onFieldChange('tieBreakingName', defaults?.name ?? '');
              if (!tieBreakingDescription)
                onFieldChange('tieBreakingDescription', defaults?.description ?? '');
            }}
            error={fieldErrors['tieBreakingType']}
            placeholder="Select type..."
          />
        </div>
      )}
    </div>
  );
}
