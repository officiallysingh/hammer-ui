import type { PropertyType, MetaType, PropertyDef } from '@repo/api';

export interface KV {
  key: string;
  value: string;
}

export const PROPERTY_TYPES: KV[] = [
  { key: 'SIMPLE_PROPERTY', value: 'Simple' },
  { key: 'COMPOSITE_PROPERTY', value: 'Composite' },
  { key: 'COMPLEX_PROPERTY', value: 'Complex' },
  { key: 'LIST_PROPERTY', value: 'List' },
];

export const HAS_CHILDREN: PropertyType[] = ['COMPOSITE_PROPERTY', 'LIST_PROPERTY'];

export function emptyProperty(metaTypes: KV[]): PropertyDef {
  return {
    type: 'SIMPLE_PROPERTY',
    name: '',
    label: '',
    metaType: (metaTypes[0]?.key ?? 'STRING') as MetaType,
    validators: [],
  };
}

/** Strip metaType from any property whose type is a container (HAS_CHILDREN), recursively. */
export function sanitizeProperties(properties: PropertyDef[]): PropertyDef[] {
  return properties.map(sanitizeProperty);
}

function sanitizeProperty(prop: PropertyDef): PropertyDef {
  const isContainer = HAS_CHILDREN.includes(prop.type);
  const cleaned: PropertyDef = {
    ...prop,
    ...(isContainer ? { metaType: undefined as unknown as MetaType } : {}),
    value: prop.value ? prop.value.map(sanitizeProperty) : undefined,
    subProperties: prop.subProperties ? sanitizeProperty(prop.subProperties) : undefined,
  };
  return cleaned;
}
