'use client';

import { Button } from '@repo/ui';
import { Plus } from 'lucide-react';
import type { PropertyDef, MetaType, PropertyType } from '@repo/api';
import { PropertyItem } from './PropertyItem';

export interface KV {
  key: string;
  value: string;
}

interface PropertyBuilderProps {
  properties: PropertyDef[];
  onChange: (props: PropertyDef[]) => void;
  propertyTypes: KV[];
  metaTypes: KV[];
}

export function PropertyBuilder({
  properties,
  onChange,
  propertyTypes,
  metaTypes,
}: PropertyBuilderProps) {
  const defaultMetaType = metaTypes[0]?.key ?? 'STRING';
  const defaultPropType = propertyTypes[0]?.key ?? 'SIMPLE_PROPERTY';

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

  const addProperty = () =>
    onChange([
      ...properties,
      {
        type: defaultPropType as PropertyType,
        name: '',
        label: '',
        metaType: defaultMetaType as MetaType,
        validators: [],
      },
    ]);

  return (
    <div className="space-y-2">
      {properties.map((prop, i) => (
        <PropertyItem
          key={i}
          prop={prop}
          index={i}
          total={properties.length}
          propertyTypes={propertyTypes}
          metaTypes={metaTypes}
          onUpdate={(patch) => update(i, patch)}
          onRemove={() => remove(i)}
          onMove={(dir) => move(i, dir)}
        />
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addProperty}>
        <Plus className="h-4 w-4 mr-1" />
        Add property
      </Button>
    </div>
  );
}
