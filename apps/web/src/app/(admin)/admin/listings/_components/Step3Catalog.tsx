'use client';

import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button, Label } from '@repo/ui';
import { ManagedTypeVM, ManagedTypeListItem, PropertyDef } from '@repo/api';
import ErrorAlert from '@/components/common/admin/ErrorAlert';

interface Step3Props {
  typeListItems: ManagedTypeListItem[];
  managedTypeId: string;
  selectedManagedType: ManagedTypeVM | null;
  loadingType: boolean;
  fieldValues: Record<string, unknown>;
  onTypeChange: (id: string) => void;
  onFieldChange: (name: string, value: unknown) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;
  onCancel: () => void;
  saving: boolean;
  error: string | null;
}

export function Step3Catalog({
  typeListItems,
  managedTypeId,
  selectedManagedType,
  loadingType,
  fieldValues,
  onTypeChange,
  onFieldChange,
  onSubmit,
  onBack,
  onCancel,
  saving,
  error,
}: Step3Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Catalog type</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select the type definition and fill in its fields
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="mtype">Type definition</Label>
          <select
            id="mtype"
            value={managedTypeId}
            onChange={(e) => onTypeChange(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select type...</option>
            {typeListItems.map((m) => (
              <option key={m.key} value={m.key}>
                {m.value}
              </option>
            ))}
          </select>
        </div>

        {loadingType && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Loading type fields...
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length > 0 && (
          <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
            {selectedManagedType.description && (
              <p className="text-xs text-muted-foreground">{selectedManagedType.description}</p>
            )}
            {selectedManagedType.properties?.map((prop: PropertyDef) => (
              <PropertyFieldGroup
                key={prop.name}
                prop={prop}
                value={fieldValues[prop.name]}
                onChange={(value) => onFieldChange(prop.name, value)}
              />
            ))}
          </div>
        )}

        {selectedManagedType && (selectedManagedType.properties ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">This type has no properties defined.</p>
        )}
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack} disabled={saving}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save listing'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ─── PropertyFieldGroup ───────────────────────────────────────────────────────
// Renders a label + the appropriate input for any PropertyDef, including
// COMPOSITE_PROPERTY (nested object) and LIST_PROPERTY (array of objects).

interface FieldGroupProps {
  prop: PropertyDef;
  value: unknown;
  onChange: (value: unknown) => void;
  depth?: number;
}

function PropertyFieldGroup({ prop, value, onChange, depth = 0 }: FieldGroupProps) {
  const indent = depth > 0 ? 'ml-4 pl-3 border-l border-border' : '';

  // ── COMPOSITE_PROPERTY: render child properties as a nested object ──────────
  if (prop.type === 'COMPOSITE_PROPERTY') {
    const children = prop.value ?? [];
    const obj =
      typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

    if (children.length === 0) {
      return (
        <div className={`space-y-1.5 ${indent}`}>
          <Label className="text-sm font-medium">{prop.label}</Label>
          <p className="text-xs text-muted-foreground">No child properties defined.</p>
        </div>
      );
    }

    return (
      <div className={`space-y-3 ${indent}`}>
        <Label className="text-sm font-medium">{prop.label}</Label>
        <div className="rounded-md border border-border bg-background/50 p-3 space-y-3">
          {children.map((child: PropertyDef) => (
            <PropertyFieldGroup
              key={child.name}
              prop={child}
              value={obj[child.name]}
              onChange={(v) => onChange({ ...obj, [child.name]: v })}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    );
  }

  // ── LIST_PROPERTY: render an array of items, each item is a nested object ──
  if (prop.type === 'LIST_PROPERTY' || prop.type === 'SET_PROPERTY') {
    const children = prop.value ?? [];
    const items = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];

    const addItem = () => {
      const empty: Record<string, unknown> = {};
      children.forEach((c: PropertyDef) => {
        empty[c.name] = '';
      });
      onChange([...items, empty]);
    };

    const removeItem = (idx: number) => onChange(items.filter((_, i) => i !== idx));

    const updateItem = (idx: number, key: string, v: unknown) => {
      onChange(items.map((item, i) => (i === idx ? { ...item, [key]: v } : item)));
    };

    return (
      <div className={`space-y-2 ${indent}`}>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">{prop.label}</Label>
          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" />
            Add item
          </button>
        </div>

        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No items yet. Click &quot;Add item&quot; to start.
          </p>
        )}

        {items.map((item, idx) => (
          <div
            key={idx}
            className="rounded-md border border-border bg-background/50 p-3 space-y-3 relative"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-destructive hover:text-destructive/80 transition-colors"
                aria-label="Remove item"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {children.length > 0 ? (
              children.map((child: PropertyDef) => (
                <PropertyFieldGroup
                  key={child.name}
                  prop={child}
                  value={item[child.name]}
                  onChange={(v) => updateItem(idx, child.name, v)}
                  depth={depth + 1}
                />
              ))
            ) : (
              // No child schema — treat each item as a scalar
              <ScalarField
                prop={prop}
                value={typeof item === 'string' ? item : ''}
                onChange={(v) => onChange(items.map((it, i) => (i === idx ? v : it)))}
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ── SIMPLE / COMPLEX / default: scalar field ────────────────────────────────
  return (
    <div className={`space-y-1.5 ${indent}`}>
      <div className="flex items-center gap-2">
        <Label htmlFor={`prop-${prop.name}`}>{prop.label}</Label>
        <span className="text-xs text-muted-foreground font-mono">{prop.metaType}</span>
      </div>
      <ScalarField
        prop={prop}
        value={typeof value === 'string' ? value : value != null ? String(value) : ''}
        onChange={onChange}
      />
    </div>
  );
}

// ─── ScalarField ──────────────────────────────────────────────────────────────
// Renders the appropriate HTML input for a scalar metaType.

function ScalarField({
  prop,
  value,
  onChange,
}: {
  prop: PropertyDef;
  value: string;
  onChange: (value: unknown) => void;
}) {
  const baseClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring';

  switch (prop.metaType) {
    case 'LOCAL_DATE':
    case 'YEAR_MONTH':
    case 'LOCAL_DATE_TIME':
    case 'ZONED_DATE_TIME':
    case 'INSTANT':
      return (
        <input
          id={`prop-${prop.name}`}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      );
    case 'LOCAL_TIME':
      return (
        <input
          id={`prop-${prop.name}`}
          type="time"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        />
      );
    case 'BOOLEAN':
      return (
        <select
          id={`prop-${prop.name}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={baseClass}
        >
          <option value="">Select...</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case 'COORDINATES': {
      const [lat, lng] = value.split(',').map((s) => s.trim());
      return (
        <div className="flex gap-2">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            value={lat || ''}
            onChange={(e) => onChange(`${e.target.value},${lng || ''}`)}
            className={`${baseClass} flex-1`}
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            value={lng || ''}
            onChange={(e) => onChange(`${lat || ''},${e.target.value}`)}
            className={`${baseClass} flex-1`}
          />
        </div>
      );
    }
    case 'FILE':
      return (
        <input
          id={`prop-${prop.name}`}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            onChange(file ? file.name : '');
          }}
          className={baseClass}
        />
      );
    case 'INTEGER':
    case 'LONG':
    case 'BIG_INTEGER':
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step="1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${prop.label.toLowerCase()}...`}
          className={baseClass}
        />
      );
    case 'FLOAT':
    case 'DOUBLE':
    case 'BIG_DECIMAL':
      return (
        <input
          id={`prop-${prop.name}`}
          type="number"
          step="any"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${prop.label.toLowerCase()}...`}
          className={baseClass}
        />
      );
    default:
      return (
        <textarea
          id={`prop-${prop.name}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${prop.label.toLowerCase()}...`}
          rows={2}
          className={`${baseClass} resize-y`}
        />
      );
  }
}
