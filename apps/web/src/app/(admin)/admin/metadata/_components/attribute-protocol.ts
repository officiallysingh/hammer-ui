export type AttrValueType = 'text' | 'number' | 'select' | 'tags';

export interface AttrKeyDef {
  key: string;
  label: string;
  description: string;
  valueType: AttrValueType;
  options?: string[];
  group: 'html' | 'ui' | 'style';
}

export const ATTRIBUTE_PROTOCOL: AttrKeyDef[] = [
  // ── html ──────────────────────────────────────────────────────────────────
  {
    key: 'html:placeholder',
    group: 'html',
    label: 'Placeholder',
    description: 'Placeholder text shown inside the input',
    valueType: 'text',
  },
  {
    key: 'html:min',
    group: 'html',
    label: 'Min',
    description: 'Minimum numeric value or string length',
    valueType: 'number',
  },
  {
    key: 'html:max',
    group: 'html',
    label: 'Max',
    description: 'Maximum numeric value or string length',
    valueType: 'number',
  },
  {
    key: 'html:step',
    group: 'html',
    label: 'Step',
    description: 'Numeric step increment',
    valueType: 'number',
  },
  {
    key: 'html:pattern',
    group: 'html',
    label: 'Pattern',
    description: 'Regex validation pattern applied to the input',
    valueType: 'text',
  },
  {
    key: 'html:accept',
    group: 'html',
    label: 'Accept',
    description: 'File input MIME filter, e.g. image/* or application/pdf',
    valueType: 'select',
    options: [
      'image/*',
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/rtf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/x-tika-msoffice',
      'application/x-tika-ooxml',
    ],
  },
  {
    key: 'html:type',
    group: 'html',
    label: 'Input type',
    description: 'Override the HTML input type',
    valueType: 'select',
    options: ['text', 'email', 'tel', 'url', 'password'],
  },

  // ── ui ────────────────────────────────────────────────────────────────────
  {
    key: 'ui:component',
    group: 'ui',
    label: 'Component',
    description: 'Override the default UI widget for this field',
    valueType: 'select',
    options: [
      'checkbox',
      'toggle',
      'slider',
      'stepper',
      'rating',
      'textarea',
      'tag-input',
      'option-pills',
    ],
  },
  {
    key: 'ui:display',
    group: 'ui',
    label: 'Display mode',
    description: 'How the stored value appears in listing/detail views',
    valueType: 'select',
    options: ['text', 'badge', 'color-swatch', 'image-grid', 'icon'],
  },
  {
    key: 'ui:multiline',
    group: 'ui',
    label: 'Multiline',
    description: 'Render a STRING field as a resizable textarea',
    valueType: 'select',
    options: ['true', 'false'],
  },
  {
    key: 'ui:rows',
    group: 'ui',
    label: 'Rows',
    description: 'Row count when ui:multiline or ui:component=textarea',
    valueType: 'number',
  },

  // ── style ─────────────────────────────────────────────────────────────────
  {
    key: 'style:options',
    group: 'style',
    label: 'Options',
    description: 'Comma-separated select options. Format: Label:value or just value',
    valueType: 'tags',
  },
  {
    key: 'style:color-options',
    group: 'style',
    label: 'Color options',
    description: 'Comma-separated color names or hex values shown as clickable swatches',
    valueType: 'tags',
  },
];

export const ATTR_PROTOCOL_MAP: Record<string, AttrKeyDef> = Object.fromEntries(
  ATTRIBUTE_PROTOCOL.map((d) => [d.key, d]),
);

export const ATTR_GROUPS = ['html', 'ui', 'style'] as const;
export type AttrGroup = (typeof ATTR_GROUPS)[number];
