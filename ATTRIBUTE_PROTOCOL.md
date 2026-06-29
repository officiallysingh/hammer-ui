# Attribute Protocol — Component Properties Guide

Attributes are `Map<String, String>` stored on `COMPLEX_PROPERTY`, `COMPOSITE_PROPERTY`, and `LIST_PROPERTY`.
`SIMPLE_PROPERTY` does **not** have an attributes field.

Keys follow the format `namespace:key`. The frontend reads them to choose:

- **Which UI widget to render** (text input, slider, toggle, badge, etc.)
- **How to style/format it** for both the **form** (admin input) and the **listing view** (public display)

---

## Architecture: Two surfaces

Every property is rendered on **two separate surfaces**, each with its own attribute namespace:

| Surface  | Where                            | Namespace | Renders                               |
| -------- | -------------------------------- | --------- | ------------------------------------- |
| **Form** | `Step3Catalog.tsx → ScalarField` | `form:*`  | Input widgets for admin to enter data |
| **List** | `view/page.tsx → PropValue`      | `list:*`  | Display of stored values to end users |

Namespaces `html:*`, `ui:*`, `style:*` apply to **both** surfaces.

```
  attributes: Record<string, string>
           |
    resolveAttrs(props, 'form')
           ↓
      PropertyFieldGroup / ScalarField
      (form inputs — admin UI)
           |
    resolveAttrs(props, 'list')
           ↓
        PropValue
      (listing display — public page)
```

The two surfaces are **independent** — configuring `form:size` has zero effect on the listing view, and `list:display = badge` doesn't change the form widget.

---

## Blocks

A **block** is a named cluster of `list:*` keys that are only relevant together.
There are two activation modes:

| Activation          | Condition                           | Example                                                    |
| ------------------- | ----------------------------------- | ---------------------------------------------------------- |
| **Value-triggered** | A sibling attribute equals a value  | `list:display = badge` → activates `list:badge.*`          |
| **Type-triggered**  | The property's `type` field matches | `type = COMPOSITE_PROPERTY` → activates `list:composite.*` |

Blocks are a **pure frontend concept**. Storage is still flat `key → string`.
The editor shows/hides block sub-keys automatically based on activation conditions.

---

## Property type decision

| Situation                             | Use                  |
| ------------------------------------- | -------------------- |
| Leaf field, no rendering hints needed | `SIMPLE_PROPERTY`    |
| Leaf field **with** any attribute     | `COMPLEX_PROPERTY`   |
| Group of named child fields           | `COMPOSITE_PROPERTY` |
| Repeating list of items               | `LIST_PROPERTY`      |

---

## Namespaces

| Namespace | Surface | Purpose                                                              |
| --------- | ------- | -------------------------------------------------------------------- |
| `html`    | both    | Passed directly to the HTML element (placeholder, min, max, …)       |
| `ui`      | both    | Controls widget type (component, display mode, multiline)            |
| `style`   | both    | Data-driven visual options (selectable values, colors, …)            |
| `form`    | form    | Controls how the **input** renders in a form (size, variant, layout) |
| `list`    | list    | Controls how the stored **value** renders in listing/detail views    |

---

## `ui:component` — Widget override (both surfaces)

| Value          | Applies to metaType      | Renders                                                                     |
| -------------- | ------------------------ | --------------------------------------------------------------------------- |
| `checkbox`     | BOOLEAN                  | Single checkbox — checked = true                                            |
| `toggle`       | BOOLEAN                  | Animated pill switch                                                        |
| `slider`       | any numeric              | Range slider; uses `html:min` / `html:max` / `html:step`                    |
| `stepper`      | INT types                | `−` · number input · `+` button                                             |
| `rating`       | INTEGER                  | 5-star clickable rating (click same star to clear)                          |
| `textarea`     | STRING                   | Resizable textarea; use `ui:rows` for height                                |
| `tag-input`    | STRING                   | Chip input — Enter/comma adds, Backspace removes; stored as comma-separated |
| `option-pills` | STRING + `style:options` | Horizontal pill buttons; one selectable                                     |

---

## `ui:display` — Display mode hint (both surfaces)

This is a **legacy** key. Prefer `list:display` (see below) for new properties.

| Value          | Renders the stored value as                       |
| -------------- | ------------------------------------------------- |
| `text`         | Plain text (default)                              |
| `badge`        | Coloured badge chip                               |
| `color-swatch` | Circular swatch — used with `style:color-options` |
| `image-grid`   | Grid of thumbnails                                |
| `icon`         | Icon name resolved to a Lucide icon               |

---

## `html:*` — HTML element attributes (both surfaces)

| Key                | Type   | Effect                                                   |
| ------------------ | ------ | -------------------------------------------------------- |
| `html:placeholder` | text   | Placeholder text inside input / picker                   |
| `html:min`         | number | Min value (numeric inputs, year picker, sliders)         |
| `html:max`         | number | Max value                                                |
| `html:step`        | number | Step increment for numeric inputs and sliders            |
| `html:pattern`     | text   | Native HTML `pattern` regex on text inputs               |
| `html:accept`      | select | File input MIME filter (`image/*`, `application/pdf`, …) |
| `html:type`        | select | Override input type: `email`, `tel`, `url`, `password`   |

---

## `style:*` — Data-driven style (both surfaces)

| Key                   | Format                                     | Effect                                            |
| --------------------- | ------------------------------------------ | ------------------------------------------------- |
| `style:options`       | `Label:value,Label:value` or `value,value` | Drives `<select>` (default) or `option-pills`     |
| `style:color-options` | `black,red,#1A2B3C`                        | Clickable swatches; stored value = selected color |

---

## `ui:multiline` / `ui:rows` (both surfaces)

| Key            | Value            | Effect                                                           |
| -------------- | ---------------- | ---------------------------------------------------------------- |
| `ui:multiline` | `true` / `false` | Renders STRING as `<textarea>` (same as `ui:component=textarea`) |
| `ui:rows`      | number           | Row height of the textarea (default 3)                           |

---

## `form:*` — Form input rendering (form surface only)

Controls how the input widget looks in the **admin form**. Independent of widget type (`ui:component`) and HTML attributes (`html:*`).

### Layout & sizing

| Key                   | Type   | Options                                                  | Effect                           |
| --------------------- | ------ | -------------------------------------------------------- | -------------------------------- |
| `form:size`           | select | `sm` · `md` · `lg` · `xl`                                | Input size (padding + font-size) |
| `form:variant`        | select | `default` · `outline` · `ghost` · `filled` · `underline` | Input container visual style     |
| `form:width`          | select | `full` · `auto` · `fixed`                                | How wide the input stretches     |
| `form:layout`         | select | `vertical` · `horizontal` · `inline`                     | Label + input arrangement        |
| `form:label.position` | select | `top` · `left` · `hidden`                                | Where the label appears          |
| `form:helper-text`    | text   | any string                                               | Small hint below the field       |

### Layout visual reference

```
vertical (default)        horizontal              inline
┌────────────┐           Label: ┌────────┐      Label: ┌──────┐
│ Label      │                  │ input  │             │input │
├────────────┤                  └────────┘             └──────┘
│ ┌────────┐ │
│ │ input  │ │
│ └────────┘ │
──── or ──────
│ Label      │
├────────────┤
│ ┌────────┐ │
│ │ input  │ │   ← form:label.position = left
│ └────────┘ │
└────────────┘
```

### Helper text

```
┌──────────┐
│ input    │
└──────────┘
↑ small hint text ↑    ← form:helper-text
```

---

## `list:*` — Listing / detail view rendering (list surface only)

Controls how the stored value appears on the **public listing page** (card, table, detail view).

### Common display properties

| Key             | Type   | Options                                                                                          | Effect                                  |
| --------------- | ------ | ------------------------------------------------------------------------------------------------ | --------------------------------------- |
| `list:display`  | select | `text` · `badge` · `pill` · `color-swatch` · `image` · `icon` · `price` · `rating` · `truncated` | Primary render mode                     |
| `list:prefix`   | text   | any string (e.g. `₹`, `#`, `+`)                                                                  | Static text prepended to value          |
| `list:suffix`   | text   | any string (e.g. `%`, `kg`, `hrs`, `mAh`)                                                        | Static text appended to value           |
| `list:truncate` | number | max character count                                                                              | Truncates long text with `…`            |
| `list:format`   | select | `raw` · `date` · `datetime` · `currency` · `percentage`                                          | Formats raw stored value before display |

### Value-triggered blocks

These blocks activate when `list:display` matches their trigger value.

#### `list:badge` block — activates when `list:display = badge` or `list:display = pill`

| Key                  | Type   | Options                                      | Effect                 |
| -------------------- | ------ | -------------------------------------------- | ---------------------- |
| `list:badge.color`   | select | `primary` · `success` · `warning` · `danger` | Badge colour semantics |
| `list:badge.size`    | select | `sm` · `md` · `lg`                           | Badge size             |
| `list:badge.variant` | select | `solid` · `outline` · `soft`                 | Badge fill style       |

Colour rendering:

- `success` → emerald green background (e.g. "In Stock")
- `warning` → amber/amber (e.g. "Pending")
- `danger` → red/red (e.g. "Out of Stock")
- `primary` → theme primary colour

#### `list:image` block — activates when `list:display = image`

| Key                | Type   | Options                            | Effect               |
| ------------------ | ------ | ---------------------------------- | -------------------- |
| `list:image.size`  | select | `xs` · `sm` · `md` · `lg` · `full` | Image rendered size  |
| `list:image.shape` | select | `square` · `rounded` · `circle`    | Corner radius / crop |
| `list:image.fit`   | select | `cover` · `contain` · `fill`       | CSS object-fit       |

#### `list:price` block — activates when `list:display = price`

| Key                   | Type   | Options                                  | Effect                                     |
| --------------------- | ------ | ---------------------------------------- | ------------------------------------------ |
| `list:price.currency` | select | `USD` · `GBP` · `EUR` · `INR` · `custom` | Currency symbol                            |
| `list:price.format`   | select | `symbol` · `code` · `name`               | Currency display (`$`, `USD`, "US Dollar") |
| `list:price.size`     | select | `sm` · `md` · `lg`                       | Price text size                            |

---

### Type-triggered blocks

These blocks activate when the property `type` field matches — no need for `list:display`.

#### `list:composite` block — activates when `type = COMPOSITE_PROPERTY`

Controls how a composite (group of child fields) renders in the listing view.

| Key                          | Type   | Options                                                        | Effect                                    |
| ---------------------------- | ------ | -------------------------------------------------------------- | ----------------------------------------- |
| `list:composite.layout`      | select | `table` · `inline` · `card` · `grid` · `definition` · `hidden` | Layout mode for child fields              |
| `list:composite.columns`     | number | any number (default 2)                                         | Number of columns for `grid` layout       |
| `list:composite.gap`         | select | `tight` · `normal` · `loose`                                   | Spacing between items                     |
| `list:composite.label-width` | text   | any Tailwind width class (e.g. `w-32`)                         | Fixed label width for `definition` layout |

##### Composite layout reference

```
table (default)          inline                  card
┌────────────────────┐   Label1: value1          ┌─────────┐ ┌─────────┐
│ Label1    value1   │   · Label2: value2         │ Label1  │ │ Label2  │
│ Label2    value2   │   · Label3: value3         │ value1  │ │ value2  │
│ Label3    value3   │                           └─────────┘ └─────────┘
└────────────────────┘

grid (2 cols)            definition              hidden
┌────────────┬────────┐  Label1   value1          (renders nothing)
│ Label1     │ Label2 │  Label2   value2
│ value1     │ value2 │  Label3   value3
├────────────┼────────┤
│ Label3     │ Label4 │
│ value3     │ value4 │
└────────────┴────────┘
```

#### `list:list` block — activates when `type = LIST_PROPERTY` or `type = SET_PROPERTY`

Controls how a list of items renders.

| Key                    | Type   | Options                                    | Effect                   |
| ---------------------- | ------ | ------------------------------------------ | ------------------------ |
| `list:list.layout`     | select | `cards` · `table` · `inline` · `compact`   | List item arrangement    |
| `list:list.item-style` | select | `flat` · `card` · `bordered` · `separated` | Item border / background |

---

## Creating component properties — step by step

### Step 1: Choose the right property type

Think about the data shape first:

```
Leaf value?                          → COMPLEX_PROPERTY (or SIMPLE if no attrs)
Group of related leaf values?        → COMPOSITE_PROPERTY
Repeating list of items?             → LIST_PROPERTY
```

### Step 2: Choose the metaType

| Data          | metaType                  |
| ------------- | ------------------------- |
| Text (short)  | `STRING`                  |
| Text (long)   | `STRING` + `ui:multiline` |
| Whole number  | `INTEGER`                 |
| Decimal       | `FLOAT`                   |
| True/false    | `BOOLEAN`                 |
| Date          | `LOCAL_DATE`              |
| Date + time   | `LOCAL_DATE_TIME`         |
| Email / phone | `STRING` + `html:type`    |
| File          | `FILE`                    |

### Step 3: Configure the form input

Select an input widget and style it:

```
metaType: STRING
html:placeholder  →  Enter product name…
form:size         →  lg
form:variant      →  outline
form:layout       →  vertical
```

```
metaType: INTEGER
ui:component     →  slider
html:min         →  0
html:max         →  100000
html:step        →  1000
form:size        →  sm
form:label.position →  left
```

### Step 4: Configure the listing display

Choose how the stored value looks in public views:

```
metaType: STRING
list:display    →  badge
list:badge.color   →  success
list:badge.variant →  soft
list:prefix     →  #
```

```
metaType: INTEGER
list:display        →  price
list:price.currency →  INR
list:price.size     →  lg
list:suffix         →  (incl. GST)
```

### Step 5: Use composites for spec sections

Group related fields into a composite and choose a layout:

```
"type": "COMPOSITE_PROPERTY",
"name": "display_specs",
"label": "Display",
"attributes": {
  "list:composite.layout": "card",
  "list:section.header-icon": "monitor"
},
"value": [
  { "name": "screen_size", "label": "Screen Size", ... },
  { "name": "resolution", "label": "Resolution", ... }
]
```

### Step 6: Use lists for repeating features

```
"type": "LIST_PROPERTY",
"name": "highlights",
"label": "Key Highlights",
"attributes": {
  "list:list.layout": "inline",
  "list:prefix": "✓ "
},
"value": [
  { "name": "highlight", "label": "Highlight", ... }
]
```

---

## Adding new blocks (the 3-step pattern)

Adding a new block requires changes in exactly **3 places**:

### Step 1: `attribute-protocol.ts` — define the keys + block

```ts
// Add key entries
{ key: 'list:accordion.default-open', surface: 'list', group: 'list',
  label: 'Default open', valueType: 'select',
  options: ['true', 'false', 'first'],
  block: 'accordion', appliesTo: ['COMPOSITE_PROPERTY'] },

// Add block definition
{ name: 'accordion', surface: 'list',
  label: 'Accordion section',
  triggerPropType: 'COMPOSITE_PROPERTY',
  keys: ['list:accordion.default-open'] }
```

No editor wiring needed — the `AttributeEditor` dropdown picks up new keys automatically from `ATTRIBUTE_PROTOCOL`.

### Step 2: `view/page.tsx` → `PropValue` — add the renderer

```tsx
// In the COMPOSITE rendering section
if (compositeLayout === 'accordion') {
  const defaultOpen = listAttrs['list:accordion.default-open'];
  // ... render collapsible accordion panels
}
```

### Step 3: Verify

- Block sub-keys auto-appear in the editor when the trigger condition is met
- Legacy properties without these attributes render identically (missing keys fall through to defaults)
- The `resolveAttrs` filter ensures the keys are only returned for the correct surface + property type

### Trigger modes

| Mode                       | Use for                                     | Example                                 |
| -------------------------- | ------------------------------------------- | --------------------------------------- |
| `trigger: { key, equals }` | Blocks activated by a value choice          | `list:display = badge` → badge block    |
| `triggerPropType`          | Blocks that always apply to a property type | `COMPOSITE_PROPERTY` → composite layout |

---

## Examples

### Basic text with placeholder

```
metaType: STRING
html:placeholder  →  e.g. SKU-001-BLK
```

### Compact form input (horizontal label)

```
metaType: STRING
html:placeholder    →  e.g. SKU-001-BLK
form:size           →  sm
form:variant        →  outline
form:label.position →  left
```

### Coloured status badge

```
metaType:       STRING
style:options   →  Active:active,Inactive:inactive,Pending:pending
ui:component    →  option-pills
list:display    →  badge
list:badge.color   →  success (active), warning (pending), danger (inactive)
list:badge.variant →  soft
```

### Price with currency symbol

```
metaType:           INTEGER
ui:component        →  slider
html:min            →  0
html:max            →  100000
html:step           →  500
list:display        →  price
list:price.currency →  INR
list:price.size     →  md
```

### Percentage field with suffix

```
metaType:      FLOAT
html:min       →  0
html:max       →  100
html:step      →  0.5
list:display   →  text
list:suffix    →  %
list:format    →  percentage
```

### Product specs composite (table)

```
COMPOSITE "Camera"
  attributes:
    list:composite.layout →  table

  ─ screen_size   →  FLOAT   list:suffix →  inches
  ─ resolution    →  STRING
  ─ camera_type   →  STRING  option-pills
```

### Feature cards (card layout)

```
COMPOSITE "Display"
  attributes:
    list:composite.layout →  card

  ─ screen_size   →  FLOAT   list:suffix →  "
  ─ resolution    →  STRING
  ─ refresh_rate  →  INTEGER  list:suffix →  Hz
  ─ protection    →  STRING
```

### Dimensions inline

```
COMPOSITE "Dimensions"
  attributes:
    list:composite.layout →  inline

  ─ height   →  FLOAT  list:suffix →  mm
  ─ width    →  FLOAT  list:suffix →  mm
  ─ weight   →  FLOAT  list:suffix →  g
```

### Spec sheet (definition layout)

```
COMPOSITE "Battery"
  attributes:
    list:composite.layout →  definition
    list:composite.label-width →  w-36

  ─ capacity       →  INTEGER  list:suffix →  mAh
  ─ charging       →  STRING
  ─ battery_life   →  STRING
```

### Product image thumbnail

```
metaType:       FILE
html:accept     →  image/*
list:display    →  image
list:image.size →  md
list:image.shape →  rounded
list:image.fit  →  cover
```

---

## Block trigger rules reference

When `list:display` changes, only the matching block's sub-keys are active in both the editor and the renderer.

| `list:display`                                            | Active block   | Render behaviour                                                 |
| --------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| `badge`                                                   | `list:badge.*` | Badge chip with colour/size/variant                              |
| `pill`                                                    | `list:badge.*` | Same as badge but pill-style                                     |
| `image`                                                   | `list:image.*` | Image tag with size/shape/fit                                    |
| `price`                                                   | `list:price.*` | Formatted price with currency                                    |
| `text` / `truncated` / `icon` / `rating` / `color-swatch` | no block       | Use `list:prefix`, `list:suffix`, `list:truncate`, `list:format` |

| Property type                    | Active block       | Effect                                                       |
| -------------------------------- | ------------------ | ------------------------------------------------------------ |
| `COMPOSITE_PROPERTY`             | `list:composite.*` | Renders children as table/inline/card/grid/definition/hidden |
| `LIST_PROPERTY` / `SET_PROPERTY` | `list:list.*`      | Renders items as cards/table/inline                          |

---

## Full managed type example: Mobile Phone

This showcases: **composites with 5 layout modes · price block · image block · badge list · option pills · form sizing · tag-input · color swatches · list display modes**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Mobile Phone",
    "description": "Product spec page with composites, price block, image gallery, and spec sections",
    "type": "LISTING_PROPERTIES",
    "tags": ["mobile", "electronics", "phone"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "product_title",
        "label": "Product Title",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Apple iPhone 16 Pro Max 256 GB"
        },
        "validators": [{ "type": "NOT_NULL" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "selling_price",
        "label": "Selling Price",
        "metaType": "INTEGER",
        "attributes": {
          "html:min": "0",
          "html:placeholder": "139900",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol",
          "list:price.size": "lg",
          "list:prefix": "₹",
          "form:size": "lg"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "rating",
        "label": "Rating",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "rating",
          "list:display": "rating"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "main_image",
        "label": "Main Image",
        "metaType": "FILE",
        "attributes": {
          "html:accept": "image/*",
          "list:display": "image",
          "list:image.size": "lg",
          "list:image.shape": "rounded",
          "list:image.fit": "cover"
        }
      },
      {
        "type": "LIST_PROPERTY",
        "name": "highlights",
        "label": "Key Highlights",
        "metaType": "STRING",
        "attributes": {
          "list:list.layout": "inline",
          "list:list.item-style": "separated",
          "list:prefix": "✓"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "highlight",
            "label": "Highlight",
            "metaType": "STRING",
            "attributes": { "html:placeholder": "e.g. A18 Pro Chip" }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "display_specs",
        "label": "Display",
        "metaType": "STRING",
        "attributes": {
          "list:composite.layout": "card"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "screen_size",
            "label": "Screen Size",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "3.0",
              "html:max": "10.0",
              "html:step": "0.1",
              "html:placeholder": "6.9",
              "list:suffix": " inches",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "resolution",
            "label": "Resolution",
            "metaType": "STRING",
            "attributes": {
              "html:placeholder": "2868 × 1320 pixels",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "display_type",
            "label": "Type",
            "metaType": "STRING",
            "attributes": {
              "style:options": "Super Retina XDR OLED,Liquid Retina HD,LTPO AMOLED",
              "ui:component": "option-pills",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "refresh_rate",
            "label": "Refresh Rate",
            "metaType": "INTEGER",
            "attributes": {
              "style:options": "60Hz,90Hz,120Hz,144Hz",
              "ui:component": "option-pills",
              "list:suffix": " Hz",
              "form:size": "sm"
            }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "camera_specs",
        "label": "Camera",
        "metaType": "STRING",
        "attributes": {
          "list:composite.layout": "grid",
          "list:composite.columns": "2"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "rear_camera",
            "label": "Rear Camera",
            "metaType": "STRING",
            "attributes": { "html:placeholder": "48MP + 12MP + 12MP" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "front_camera",
            "label": "Front Camera",
            "metaType": "STRING",
            "attributes": { "html:placeholder": "12MP TrueDepth" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "video_recording",
            "label": "Video",
            "metaType": "STRING",
            "attributes": { "html:placeholder": "4K @ 24/30/60fps" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "features",
            "label": "Camera Features",
            "metaType": "STRING",
            "attributes": {
              "ui:component": "tag-input",
              "html:placeholder": "Night mode,Portrait,Cinematic…"
            }
          }
        ]
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "battery",
        "label": "Battery",
        "metaType": "STRING",
        "attributes": {
          "list:composite.layout": "definition",
          "list:composite.label-width": "w-36"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "capacity",
            "label": "Capacity",
            "metaType": "INTEGER",
            "attributes": {
              "list:suffix": " mAh",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "charging",
            "label": "Charging",
            "metaType": "STRING",
            "attributes": {
              "html:placeholder": "27W wired, 25W MagSafe",
              "form:size": "sm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "battery_life",
            "label": "Battery Life",
            "metaType": "STRING",
            "attributes": {
              "html:placeholder": "Up to 33 hours video playback",
              "form:size": "sm"
            }
          }
        ]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "description",
        "label": "Description",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "6",
          "form:size": "lg",
          "html:placeholder": "Write a detailed description…"
        }
      }
    ]
  }' | jq '.'
```

---

---

## Curl cookbook

> **Prerequisites**
>
> - Server running at `http://localhost:8090`
> - Log in once and export a token:
>   ```bash
>   TOKEN=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
>     -H "Content-Type: application/json" \
>     -d '{"username":"admin","password":"admin"}' | jq -r '.token')
>   ```
> - `jq` must be installed

---

### Components — CRUD

#### Create a "Dimensions" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Dimensions",
    "description": "Physical dimensions — length, width, height in cm",
    "tags": ["physical", "measurements"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "length",
        "label": "Length",
        "metaType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "width",
        "label": "Width",
        "metaType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "height",
        "label": "Height",
        "metaType": "FLOAT",
        "attributes": { "html:min": "0", "html:max": "500", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal" }
      }
    ]
  }' | jq '.'
```

#### Create a "Status Badge" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Status Badge",
    "description": "Selectable status field displayed as a coloured badge in listings",
    "tags": ["status", "badge"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "status",
        "label": "Status",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Active:active,Inactive:inactive,Pending:pending,Archived:archived",
          "ui:component": "option-pills",
          "list:display": "badge",
          "list:badge.color": "success",
          "list:badge.variant": "soft",
          "list:badge.size": "sm"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Status is required" }]
      }
    ]
  }' | jq '.'
```

#### Create a "Price Range" component

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Price Range",
    "description": "Min / max price sliders with INR display",
    "tags": ["price", "range"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "min_price",
        "label": "Min Price",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "500000",
          "html:step": "1000",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "max_price",
        "label": "Max Price",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "500000",
          "html:step": "1000",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol"
        }
      }
    ]
  }' | jq '.'
```

#### List components (with optional phrase search)

```bash
# All components
curl -s "http://localhost:8090/api/v1/meta-data/components" \
  -H "Authorization: Bearer $TOKEN" | jq '.content[] | {id, name}'

# Search by phrase
curl -s "http://localhost:8090/api/v1/meta-data/components?phrases=price" \
  -H "Authorization: Bearer $TOKEN" | jq '.content[] | {id, name}'
```

#### Get a component by ID

```bash
COMP_ID="<component-id>"
curl -s "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

#### Update a component (PATCH)

```bash
curl -s -X PATCH "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{ "description": "Updated description" }' | jq '.'
```

#### Delete a component

```bash
curl -s -X DELETE "http://localhost:8090/api/v1/meta-data/components/$COMP_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Managed Types — with `form:*` and `list:*` attributes

#### Managed Type — Electronics Listing

Showcases: **status badge · price slider · image upload · tag input · composite dimensions · `form:*` sizing · `list:*` display**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Electronics Listing",
    "description": "Catalog type for electronics — showcases form/list attribute styling",
    "type": "LISTING_PROPERTIES",
    "tags": ["electronics", "showcase"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "brand",
        "label": "Brand",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Samsung, Apple",
          "form:size": "md",
          "form:variant": "filled",
          "form:width": "full"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Brand is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "status",
        "label": "Status",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Active:active,Inactive:inactive,Pending:pending",
          "ui:component": "option-pills",
          "list:display": "badge",
          "list:badge.color": "success",
          "list:badge.variant": "soft",
          "list:badge.size": "sm"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "price",
        "label": "Price",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "200000",
          "html:step": "500",
          "list:display": "price",
          "list:price.currency": "INR",
          "list:price.format": "symbol",
          "list:price.size": "md"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "color",
        "label": "Color",
        "metaType": "STRING",
        "attributes": {
          "style:color-options": "black,white,silver,gold,blue,red",
          "list:display": "color-swatch"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "product_image",
        "label": "Product Image",
        "metaType": "FILE",
        "attributes": {
          "html:accept": "image/*",
          "list:display": "image",
          "list:image.size": "sm",
          "list:image.shape": "rounded",
          "list:image.fit": "cover"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "in_stock",
        "label": "In Stock",
        "metaType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle",
          "form:layout": "inline"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "keywords",
        "label": "Keywords",
        "metaType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "Add keywords…",
          "form:helper-text": "Used for search indexing"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "description",
        "label": "Description",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "4",
          "html:placeholder": "Describe the product…",
          "list:display": "truncated",
          "list:truncate": "120"
        }
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "dimensions",
        "label": "Dimensions",
        "metaType": "STRING",
        "attributes": {
          "list:composite.layout": "inline"
        },
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "length",
            "label": "Length",
            "metaType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "200", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " cm" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "width",
            "label": "Width",
            "metaType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "200", "html:step": "0.1", "html:placeholder": "cm", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " cm" }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "weight",
            "label": "Weight",
            "metaType": "FLOAT",
            "attributes": { "html:min": "0", "html:max": "50", "html:step": "0.01", "html:placeholder": "kg", "form:size": "sm", "form:layout": "horizontal", "list:suffix": " kg" }
          }
        ]
      }
    ]
  }' | jq '.'
```

---

### Listings — create and populate

```bash
# Capture managed type ID from create response above
ELECTRONICS_TYPE_ID="<id-from-electronics-response>"
SUB_CATEGORY_ID="<your-subcategory-id>"

# Create the listing
LISTING_ID=$(curl -s -X POST http://localhost:8090/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Samsung Galaxy S24 Ultra",
    "description": "Latest Samsung flagship with S-Pen",
    "subCategory": "'"$SUB_CATEGORY_ID"'",
    "tags": ["samsung", "smartphone", "flagship"]
  }' | jq -r '.id')

echo "Created listing: $LISTING_ID"

# Patch with catalog data
curl -s -X PATCH "http://localhost:8090/api/v1/listings/$LISTING_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "embedded": {
      "typeId": "'"$ELECTRONICS_TYPE_ID"'",
      "pathWiseState": {
        "brand": "Samsung",
        "status": "active",
        "price": "124999",
        "color": "black",
        "in_stock": "true",
        "keywords": "samsung,s24,ultra,spen,flagship",
        "description": "The Samsung Galaxy S24 Ultra features a 6.8-inch Dynamic AMOLED display, Snapdragon 8 Gen 3, and built-in S-Pen.",
        "dimensions": {
          "length": "16.27",
          "width": "7.9",
          "weight": "0.232"
        }
      }
    }
  }' | jq '.'
```

---

## Source files

| File                                      | Purpose                                                                    |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `attribute-protocol.ts`                   | All key definitions, block definitions, `resolveAttrs()`, `ATTR_GROUPS`    |
| `AttributeEditor.tsx`                     | Dropdown editor; auto-picks up new keys from protocol                      |
| `PropertyRow.tsx`                         | Filters visible attributes by `showWhen`/`appliesTo`                       |
| `Step3Catalog.tsx` → `ScalarField`        | Consumes `form:*` + `html:*` + `ui:*` + `style:*` for form input rendering |
| `Step3Catalog.tsx` → `PropertyFieldGroup` | Wraps label + input with `form:layout` / `form:label.position`             |
| `view/page.tsx` → `PropValue`             | Consumes `list:*` keys + blocks for listing/detail display                 |

### Adding new protocol keys

1. Open `attribute-protocol.ts` and add an entry to `ATTRIBUTE_PROTOCOL` with the correct `surface` (`, `form`, or `list`).
2. If the key belongs to a block, add the block definition to `ATTR_BLOCKS` and set `block`, `showWhen`, or `appliesTo` on the key entry.
3. If the key needs new rendering logic, add it inside `ScalarField` (form) or `PropValue` (list).
4. The `AttributeEditor` dropdown picks up new keys automatically — no extra wiring needed.
