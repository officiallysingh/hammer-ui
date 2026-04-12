import type { PropertyType, MetaType } from '@repo/api';

export interface KV {
  key: string;
  value: string;
}

export const PROPERTY_TYPES: KV[] = [
  { key: 'SIMPLE_PROPERTY', value: 'Simple' },
  { key: 'COMPOSITE_PROPERTY', value: 'Composite' },
  { key: 'COMPLEX_PROPERTY', value: 'Complex' },
  { key: 'LIST_PROPERTY', value: 'List' },
  { key: 'SET_PROPERTY', value: 'Set' },
];

export const HAS_CHILDREN: PropertyType[] = ['COMPOSITE_PROPERTY', 'LIST_PROPERTY', 'SET_PROPERTY'];

export function emptyProperty(metaTypes: KV[]): import('@repo/api').PropertyDef {
  return {
    type: 'SIMPLE_PROPERTY',
    name: '',
    label: '',
    metaType: (metaTypes[0]?.key ?? 'STRING') as MetaType,
    validators: [],
  };
}
