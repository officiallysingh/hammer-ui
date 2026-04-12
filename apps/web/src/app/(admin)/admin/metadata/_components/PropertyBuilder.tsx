'use client';

import { Plus } from 'lucide-react';
import { Button } from '@repo/ui';
import type { PropertyDef } from '@repo/api';
import { PropertyRow } from './PropertyRow';
import { emptyProperty } from './types';
import type { KV } from './types';

export type { KV };

interface PropertyBuilderProps {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
  propertyTypes?: KV[]; // kept for API compat, not used (PROPERTY_TYPES is internal)
  metaTypes: KV[];
}

export function PropertyBuilder({ properties, onChange, metaTypes }: PropertyBuilderProps) {
  const update = (i: number, patch: Partial<PropertyDef>) =>
    onChange(properties.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const remove = (i: number) => onChange(properties.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const arr = [...properties];
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
    onChange(arr);
  };

  return (
    <div className="space-y-2">
      {properties.map((prop, i) => (
        <PropertyRow
          key={i}
          prop={prop}
          index={i}
          total={properties.length}
          depth={0}
          metaTypes={metaTypes}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...properties, emptyProperty(metaTypes)])}
      >
        <Plus className="h-4 w-4 mr-1" />
        Add property
      </Button>
    </div>
  );
}
