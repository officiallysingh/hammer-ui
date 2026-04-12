'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Input, Label } from '@repo/ui';
import { metadataApi } from '@repo/api';
import type { PropertyDef, MetaType, PropertyType } from '@repo/api';
import type { KV } from './PropertyBuilder';

export interface PropertyItemProps {
  prop: PropertyDef;
  index: number;
  total: number;
  propertyTypes: KV[];
  metaTypes: KV[];
  onUpdate: (patch: Partial<PropertyDef>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function PropertyItem({
  prop,
  index,
  total,
  propertyTypes,
  metaTypes,
  onUpdate,
  onRemove,
  onMove,
}: PropertyItemProps) {
  const [open, setOpen] = useState(true);
  const [validators, setValidators] = useState<KV[]>([]);
  const [loadingValidators, setLoadingValidators] = useState(false);

  const fetchValidators = useCallback(async (mt: string) => {
    if (!mt) return;
    setLoadingValidators(true);
    try {
      const result = await metadataApi.getValidatorsForMetaType(mt as MetaType);
      setValidators(result);
    } catch {
      setValidators([]);
    } finally {
      setLoadingValidators(false);
    }
  }, []);

  // Fetch validators on mount if metaType is already set (covers edit scenario)
  useEffect(() => {
    if (prop.metaType) fetchValidators(prop.metaType);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMetaTypeChange = (mt: string) => {
    onUpdate({ metaType: mt as MetaType, validators: [] });
    fetchValidators(mt);
  };

  const addValidator = () =>
    onUpdate({
      validators: [...(prop.validators ?? []), { type: validators[0]?.key ?? '', message: '' }],
    });

  const updateValidator = (vi: number, patch: Partial<{ type: string; message: string }>) =>
    onUpdate({
      validators: (prop.validators ?? []).map((v, i) => (i === vi ? { ...v, ...patch } : v)),
    });

  const removeValidator = (vi: number) =>
    onUpdate({ validators: (prop.validators ?? []).filter((_, i) => i !== vi) });

  const displayName = prop.label || prop.name || `Property ${index + 1}`;

  return (
    <div className="rounded-lg border border-border bg-muted/20 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{displayName}</span>
        {!open && prop.metaType && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">{prop.metaType}</span>
        )}
        <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={index === 0}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-destructive hover:text-destructive/80 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={prop.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="ram"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={prop.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="RAM"
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Property type</Label>
              <select
                value={prop.type}
                onChange={(e) => onUpdate({ type: e.target.value as PropertyType })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {propertyTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Meta type</Label>
              <select
                value={prop.metaType}
                onChange={(e) => handleMetaTypeChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {metaTypes.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.value}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(prop.validators ?? []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Validators</Label>
              {(prop.validators ?? []).map((v, vi) => (
                <div key={vi} className="flex items-center gap-2">
                  <select
                    value={v.type}
                    onChange={(e) => updateValidator(vi, { type: e.target.value })}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring w-44"
                  >
                    {validators.map((vt) => (
                      <option key={vt.key} value={vt.key}>
                        {vt.value}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={v.message ?? ''}
                    placeholder="Custom message (optional)"
                    onChange={(e) => updateValidator(vi, { message: e.target.value })}
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeValidator(vi)}
                    className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={addValidator}
            disabled={loadingValidators || validators.length === 0}
            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            {loadingValidators ? 'Loading validators...' : 'Add validator'}
          </button>
        </div>
      )}
    </div>
  );
}
