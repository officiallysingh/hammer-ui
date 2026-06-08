'use client';

import { Input, Label } from '@repo/ui';
import { SelectField, SelectOption } from './AuctionShared';
import { POLICY_DEFAULTS } from './PolicyShared';

interface Props {
  tieBreakingType: string;
  tieBreakingName: string;
  tieBreakingDescription: string;
  onFieldChange: (field: string, value: string) => void;
  options: SelectOption[];
  fieldErrors: Record<string, string>;
}

export function PolicyTieBreakingSection({
  tieBreakingType,
  tieBreakingName,
  tieBreakingDescription,
  onFieldChange,
  options,
  fieldErrors,
}: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div className="border-b border-border pb-2 mb-4">
        <h3 className="text-sm font-semibold text-foreground">Tie Breaking</h3>
        <p className="mt-1 text-xs text-muted-foreground">Optional — leave type empty to skip.</p>
      </div>

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
        placeholder="None (no tie-breaking)"
      />
    </div>
  );
}
