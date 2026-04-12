'use client';

import { Trash2 } from 'lucide-react';
import { Input } from '@repo/ui';
import type { ValidatorDef } from '@repo/api';
import type { KV } from './types';

interface ValidatorRowProps {
  validator: ValidatorDef;
  validatorOptions: KV[];
  onChange: (patch: Partial<ValidatorDef>) => void;
  onRemove: () => void;
}

export function ValidatorRow({
  validator,
  validatorOptions,
  onChange,
  onRemove,
}: ValidatorRowProps) {
  return (
    <div className="flex items-center gap-2">
      <select
        value={validator.type}
        onChange={(e) => onChange({ type: e.target.value })}
        className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-40 shrink-0"
      >
        {validatorOptions.map((v) => (
          <option key={v.key} value={v.key}>
            {v.value}
          </option>
        ))}
      </select>
      <Input
        value={validator.message ?? ''}
        placeholder="Custom message (optional)"
        onChange={(e) => onChange({ message: e.target.value })}
        className="h-7 text-xs flex-1"
      />
      <button
        type="button"
        onClick={onRemove}
        className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
