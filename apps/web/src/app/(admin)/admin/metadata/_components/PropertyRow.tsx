'use client';

import { useState, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronUp, Trash2, Plus } from 'lucide-react';
import { Input, Label, Button } from '@repo/ui';
import { metadataApi } from '@repo/api';
import type { PropertyDef, MetaType, PropertyType } from '@repo/api';
import { ValidatorRow } from './ValidatorRow';
import { PROPERTY_TYPES, HAS_CHILDREN, emptyProperty } from './types';
import type { KV } from './types';

interface PropertyRowProps {
  prop: PropertyDef;
  index: number;
  total: number;
  depth: number; // 0 = root, 1 = child, 2 = grandchild (max)
  metaTypes: KV[];
  onUpdate: (patch: Partial<PropertyDef>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}

export function PropertyRow({
  prop,
  index,
  total,
  depth,
  metaTypes,
  onUpdate,
  onRemove,
  onMove,
}: PropertyRowProps) {
  const [open, setOpen] = useState(depth === 0); // root open by default
  const [validatorOptions, setValidatorOptions] = useState<KV[]>([]);
  const [loadingValidators, setLoadingValidators] = useState(false);

  const fetchValidators = useCallback(async (mt: string) => {
    if (!mt) return;
    setLoadingValidators(true);
    try {
      const result = await metadataApi.getValidatorsForMetaType(mt as MetaType);
      setValidatorOptions(result);
    } catch {
      setValidatorOptions([]);
    } finally {
      setLoadingValidators(false);
    }
  }, []);

  // Fetch validators on mount if metaType set
  useEffect(() => {
    if (prop.metaType) fetchValidators(prop.metaType);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMetaTypeChange = (mt: string) => {
    onUpdate({ metaType: mt as MetaType, validators: [] });
    fetchValidators(mt);
  };

  const addValidator = () =>
    onUpdate({
      validators: [
        ...(prop.validators ?? []),
        { type: validatorOptions[0]?.key ?? 'NOT_NULL', message: '' },
      ],
    });

  const updateValidator = (vi: number, patch: Partial<{ type: string; message: string }>) =>
    onUpdate({
      validators: (prop.validators ?? []).map((v, i) => (i === vi ? { ...v, ...patch } : v)),
    });

  const removeValidator = (vi: number) =>
    onUpdate({ validators: (prop.validators ?? []).filter((_, i) => i !== vi) });

  // Child property helpers (value array)
  const children = prop.value ?? [];
  const canHaveChildren = HAS_CHILDREN.includes(prop.type) && depth < 2;

  const addChild = () => onUpdate({ value: [...children, emptyProperty(metaTypes)] });

  const updateChild = (ci: number, patch: Partial<PropertyDef>) =>
    onUpdate({ value: children.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });

  const removeChild = (ci: number) => onUpdate({ value: children.filter((_, i) => i !== ci) });

  const moveChild = (ci: number, dir: -1 | 1) => {
    const arr = [...children];
    const j = ci + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[ci]!;
    arr[ci] = arr[j]!;
    arr[j] = tmp;
    onUpdate({ value: arr });
  };

  const displayName = prop.label || prop.name || `Property ${index + 1}`;
  const depthIndent = depth === 0 ? '' : depth === 1 ? 'ml-4' : 'ml-8';
  const bgClass = depth === 0 ? 'bg-muted/20' : depth === 1 ? 'bg-muted/10' : 'bg-background';

  return (
    <div className={`rounded-lg border border-border overflow-hidden ${depthIndent} ${bgClass}`}>
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-muted/30 transition-colors select-none"
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
        />
        <span className="flex-1 text-sm font-medium text-foreground truncate">{displayName}</span>
        {!open && (
          <span className="text-xs text-muted-foreground font-mono shrink-0">{prop.metaType}</span>
        )}
        {canHaveChildren && children.length > 0 && (
          <span className="text-xs text-primary shrink-0">{children.length} children</span>
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
        <div className="px-3 pb-3 space-y-3 border-t border-border">
          {/* Name + Label */}
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={prop.name}
                onChange={(e) => onUpdate({ name: e.target.value })}
                placeholder="fieldName"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Label</Label>
              <Input
                value={prop.label}
                onChange={(e) => onUpdate({ label: e.target.value })}
                placeholder="Field Label"
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* Type + MetaType */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Property type</Label>
              <select
                value={prop.type}
                onChange={(e) =>
                  onUpdate({ type: e.target.value as PropertyType, value: undefined })
                }
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {(depth >= 2
                  ? PROPERTY_TYPES.filter((t) => !HAS_CHILDREN.includes(t.key as PropertyType))
                  : PROPERTY_TYPES
                ).map((t) => (
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

          {/* Validators */}
          {(prop.validators ?? []).length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Validators</Label>
              {(prop.validators ?? []).map((v, vi) => (
                <ValidatorRow
                  key={vi}
                  validator={v}
                  validatorOptions={validatorOptions}
                  onChange={(patch) => updateValidator(vi, patch)}
                  onRemove={() => removeValidator(vi)}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addValidator}
            disabled={loadingValidators || validatorOptions.length === 0}
            className="text-xs text-primary hover:underline flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="h-3 w-3" />
            {loadingValidators ? 'Loading...' : 'Add validator'}
          </button>

          {/* Attributes — COMPLEX_PROPERTY only */}
          {prop.type === 'COMPLEX_PROPERTY' && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Attributes (key → value)</Label>
                <button
                  type="button"
                  onClick={() => {
                    const attrs = { ...(prop.attributes ?? {}), '': '' };
                    onUpdate({ attributes: attrs });
                  }}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>
              {Object.entries(prop.attributes ?? {}).map(([k, v], ai) => (
                <div key={ai} className="flex items-center gap-2">
                  <Input
                    value={k}
                    placeholder="key"
                    onChange={(e) => {
                      const entries = Object.entries(prop.attributes ?? {});
                      entries[ai] = [e.target.value, v];
                      onUpdate({ attributes: Object.fromEntries(entries) });
                    }}
                    className="h-7 text-xs flex-1"
                  />
                  <span className="text-muted-foreground text-xs">→</span>
                  <Input
                    value={v}
                    placeholder="value"
                    onChange={(e) => {
                      const attrs = { ...(prop.attributes ?? {}), [k]: e.target.value };
                      onUpdate({ attributes: attrs });
                    }}
                    className="h-7 text-xs flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const entries = Object.entries(prop.attributes ?? {}).filter(
                        (_, i) => i !== ai,
                      );
                      onUpdate({ attributes: Object.fromEntries(entries) });
                    }}
                    className="text-destructive hover:text-destructive/80 transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Children (up to depth 2) */}
          {canHaveChildren && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Child properties (value[]) {depth < 1 ? '— level 2' : '— level 3'}
                </Label>
              </div>
              <div className="space-y-2">
                {children.map((child, ci) => (
                  <PropertyRow
                    key={ci}
                    prop={child}
                    index={ci}
                    total={children.length}
                    depth={depth + 1}
                    metaTypes={metaTypes}
                    onUpdate={(patch) => updateChild(ci, patch)}
                    onRemove={() => removeChild(ci)}
                    onMove={(dir) => moveChild(ci, dir)}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addChild}
                className="h-7 text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add child property
              </Button>
            </div>
          )}

          {/* subProperties — single nested definition for COMPOSITE_PROPERTY only, depth < 2 */}
          {prop.type === 'COMPOSITE_PROPERTY' && depth < 2 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  Sub-properties (subProperties)
                </Label>
                {!prop.subProperties && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ subProperties: emptyProperty(metaTypes) })}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                )}
              </div>
              {prop.subProperties && (
                <PropertyRow
                  prop={prop.subProperties}
                  index={0}
                  total={1}
                  depth={depth + 1}
                  metaTypes={metaTypes}
                  onUpdate={(patch) =>
                    onUpdate({ subProperties: { ...prop.subProperties!, ...patch } })
                  }
                  onRemove={() => onUpdate({ subProperties: undefined })}
                  onMove={() => {}}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
