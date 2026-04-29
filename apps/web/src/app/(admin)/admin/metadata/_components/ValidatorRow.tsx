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

/** Safely extract a string key from whatever shape the server returned. */
function resolveType(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (typeof obj['type'] === 'string') return obj['type'];
    const firstKey = Object.keys(obj)[0];
    if (firstKey) return firstKey;
  }
  return '';
}

const EXTRA_FIELD_TYPES = new Set(['MAX', 'MIN', 'SIZE', 'REGEX_PATTERN']);

function hasExtraFields(typeKey: string): boolean {
  return EXTRA_FIELD_TYPES.has(typeKey);
}

export function ValidatorRow({
  validator,
  validatorOptions,
  onChange,
  onRemove,
}: ValidatorRowProps) {
  const typeKey = resolveType(validator.type);

  const handleTypeChange = (newType: string) => {
    // Clear all extra fields when switching validator type
    onChange({ type: newType, max: undefined, min: undefined, regex: undefined });
  };

  return (
    <div className="space-y-1.5">
      {/* Type + message + delete */}
      <div className="flex items-center gap-2">
        <select
          value={typeKey}
          onChange={(e) => handleTypeChange(e.target.value)}
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

      {/* Extra fields per validator type */}
      {hasExtraFields(typeKey) && (
        <div className="ml-2 pl-2 border-l-2 border-border flex flex-wrap gap-2">
          {(typeKey === 'MIN' || typeKey === 'SIZE') && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-7">Min</span>
              <Input
                type="number"
                value={validator.min ?? ''}
                placeholder="0"
                onChange={(e) =>
                  onChange({ min: e.target.value === '' ? undefined : Number(e.target.value) })
                }
                className="h-7 text-xs w-28"
              />
            </div>
          )}
          {(typeKey === 'MAX' || typeKey === 'SIZE') && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground w-7">Max</span>
              <Input
                type="number"
                value={validator.max ?? ''}
                placeholder="∞"
                onChange={(e) =>
                  onChange({ max: e.target.value === '' ? undefined : Number(e.target.value) })
                }
                className="h-7 text-xs w-28"
              />
            </div>
          )}
          {typeKey === 'REGEX_PATTERN' && (
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-xs text-muted-foreground w-12 shrink-0">Pattern</span>
              <Input
                value={validator.regex ?? ''}
                placeholder="^[a-z]+$"
                onChange={(e) => onChange({ regex: e.target.value })}
                className="h-7 text-xs font-mono flex-1"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
