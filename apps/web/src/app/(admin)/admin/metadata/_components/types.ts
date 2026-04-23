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

/** Extract a plain string type key from whatever the server/state gives us. */
function extractValidatorType(raw: unknown): string {
  if (typeof raw === 'string') return raw.trim();
  // Server may return {NOT_NULL: "Not Null"} or {type: "NOT_NULL"} shaped objects
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    // Shape: { type: "NOT_NULL" }
    if (typeof obj['type'] === 'string') return obj['type'].trim();
    // Shape: { NOT_NULL: "Not Null" } — take the first key
    const firstKey = Object.keys(obj)[0];
    if (firstKey) return firstKey.trim();
  }
  return '';
}

/** Strip validators with no type and omit empty arrays recursively. */
function sanitizeProperty(prop: PropertyDef): PropertyDef {
  const isContainer = HAS_CHILDREN.includes(prop.type);
  const validators = (prop.validators ?? [])
    .map((v) => ({
      type: extractValidatorType(v.type),
      ...(v.message && String(v.message).trim() ? { message: String(v.message).trim() } : {}),
    }))
    .filter((v) => v.type.length > 0);
  return {
    ...prop,
    ...(isContainer ? { metaType: undefined as unknown as MetaType } : {}),
    validators: validators.length > 0 ? validators : undefined,
    value: prop.value ? prop.value.map(sanitizeProperty) : undefined,
    subProperties: prop.subProperties ? sanitizeProperty(prop.subProperties) : undefined,
  };
}
