# Attribute Protocol

Attributes are `Map<String, String>` stored on `COMPLEX_PROPERTY`, `COMPOSITE_PROPERTY`, and `LIST_PROPERTY`.
`SIMPLE_PROPERTY` does **not** have an attributes field.

Keys follow the format `namespace:key`. The frontend reads them to choose which UI widget to render and how to configure it.

## Property type decision

| Situation                                                          | Use                  |
| ------------------------------------------------------------------ | -------------------- |
| Leaf field, no rendering hints needed                              | `SIMPLE_PROPERTY`    |
| Leaf field **with** any attribute (placeholder, slider, toggle, …) | `COMPLEX_PROPERTY`   |
| Group of named child fields                                        | `COMPOSITE_PROPERTY` |
| Repeating list of items                                            | `LIST_PROPERTY`      |

---

## Namespaces

| Namespace | Purpose                                                                       |
| --------- | ----------------------------------------------------------------------------- |
| `html`    | Passed directly to the underlying HTML element (placeholder, min, max, …)     |
| `ui`      | Controls which React component renders the field and how it displays in views |
| `style`   | Provides data that drives visual options (selectable values, colors, …)       |

---

## `ui:component` — Widget overrides

| Value          | Applies to metaType      | Renders                                                                                   |
| -------------- | ------------------------ | ----------------------------------------------------------------------------------------- |
| `checkbox`     | BOOLEAN                  | Single checkbox — checked = true                                                          |
| `toggle`       | BOOLEAN                  | Animated pill switch                                                                      |
| `slider`       | any numeric              | Range slider with live value; uses `html:min` / `html:max` / `html:step`                  |
| `stepper`      | INT types                | `−` · number input · `+` button                                                           |
| `rating`       | INTEGER                  | 5-star clickable rating (click same star to clear)                                        |
| `textarea`     | STRING                   | Resizable textarea; use `ui:rows` for height                                              |
| `tag-input`    | STRING                   | Chip input — Enter or comma adds a tag; Backspace removes last; stored as comma-separated |
| `option-pills` | STRING + `style:options` | Horizontal pill buttons; one selectable                                                   |

---

## `ui:display` — Listing/detail view rendering

| Value          | Renders the stored value as                       |
| -------------- | ------------------------------------------------- |
| `text`         | Plain text (default)                              |
| `badge`        | Coloured badge chip                               |
| `color-swatch` | Circular swatch — used with `style:color-options` |
| `image-grid`   | Grid of thumbnails                                |
| `icon`         | Icon name resolved to a Lucide icon               |

---

## `html:*` — HTML element attributes

| Key                | Type   | Effect                                                                      |
| ------------------ | ------ | --------------------------------------------------------------------------- |
| `html:placeholder` | text   | Placeholder shown inside input / picker                                     |
| `html:min`         | number | Min value (numeric inputs, year picker, sliders)                            |
| `html:max`         | number | Max value                                                                   |
| `html:step`        | number | Step increment for numeric inputs and sliders                               |
| `html:pattern`     | text   | Native HTML `pattern` regex on text inputs                                  |
| `html:accept`      | select | File input MIME filter; metadata editor offers predefined MIME type presets |
| `html:type`        | select | Override input type: `email`, `tel`, `url`, `password`                      |

---

## `style:*` — Data-driven style

| Key                   | Format                                     | Effect                                                                        |
| --------------------- | ------------------------------------------ | ----------------------------------------------------------------------------- |
| `style:options`       | `Label:value,Label:value` or `value,value` | Drives `<select>` (default) or `option-pills`                                 |
| `style:color-options` | `black,red,#1A2B3C`                        | Renders as clickable swatches (circle + label); stored value = selected color |

---

## `ui:multiline` / `ui:rows`

| Key            | Value            | Effect                                                             |
| -------------- | ---------------- | ------------------------------------------------------------------ |
| `ui:multiline` | `true` / `false` | Renders STRING as a `<textarea>` (same as `ui:component=textarea`) |
| `ui:rows`      | number           | Row height of the textarea (default 3)                             |

---

## Complete examples

### Plain text with placeholder

```
metaType:  STRING
html:placeholder  →  e.g. SKU-001-BLK
```

### Email input

```
metaType:  STRING
html:type         →  email
html:placeholder  →  seller@example.com
```

### Phone with regex guard

```
metaType:  STRING
html:type     →  tel
html:pattern  →  [0-9]{7,15}
html:placeholder  →  +91 98765 43210
```

### Multiline description

```
metaType:  STRING
ui:multiline  →  true
ui:rows       →  5
html:placeholder  →  Describe the item in detail…
```

### Tag chip input (keywords)

```
metaType:  STRING
ui:component  →  tag-input
html:placeholder  →  Add keywords…
```

### Dropdown select

```
metaType:  STRING
style:options  →  New,Like New,Good,Fair,Poor
```

### Pill selector (sizes)

```
metaType:  STRING
style:options  →  XS,S,M,L,XL,XXL
ui:component   →  option-pills
```

### Pill selector (labelled values)

```
metaType:  STRING
style:options  →  Full-time:full_time,Part-time:part_time,Contract:contract,Freelance:freelance
ui:component   →  option-pills
```

### Color swatch picker

```
metaType:  STRING
style:color-options  →  black,white,red,navy,#C0A060
```

### Boolean toggle

```
metaType:  BOOLEAN
ui:component  →  toggle
```

### Boolean checkbox

```
metaType:  BOOLEAN
ui:component  →  checkbox
```

### Price slider

```
metaType:  INTEGER
ui:component  →  slider
html:min      →  0
html:max      →  100000
html:step     →  500
```

### Quantity stepper

```
metaType:  INTEGER
ui:component  →  stepper
html:min      →  1
```

### Star rating

```
metaType:  INTEGER
ui:component  →  rating
```

### Decimal measurement (step 0.1)

```
metaType:  FLOAT
html:min   →  0
html:max   →  999
html:step  →  0.1
```

### File upload (images only, with preview)

```
metaType:  FILE
html:accept  →  image/*
```

### Date with placeholder

```
metaType:  LOCAL_DATE
html:placeholder  →  Pick an auction date…
```

### Year range

```
metaType:  YEAR
html:min  →  1900
html:max  →  2025
```

---

## Temporal & spatial metaTypes

These metaTypes render specialised widgets and produce structured values in the format the Java backend expects.

| metaType           | Widget                                                                     | Stored format                  | Example                                |
| ------------------ | -------------------------------------------------------------------------- | ------------------------------ | -------------------------------------- |
| `YEAR`             | Year spinner (`html:min` / `html:max`)                                     | number                         | `2026`                                 |
| `MONTH`            | Month dropdown                                                             | `MONTH_NAME`                   | `"JANUARY"`                            |
| `DAY_OF_WEEK`      | Day dropdown                                                               | `DAY_NAME`                     | `"SUNDAY"`                             |
| `YEAR_MONTH`       | `<input type="month">`                                                     | `YYYY-MM`                      | `"2026-05"`                            |
| `LOCAL_DATE`       | Date picker                                                                | `YYYY-MM-DD`                   | `"2026-05-30"`                         |
| `LOCAL_TIME`       | Time picker                                                                | `HH:MM:SS`                     | `"19:02:32"`                           |
| `LOCAL_DATE_TIME`  | Date + time picker                                                         | `YYYY-MM-DDTHH:MM:SS`          | `"2026-05-30T19:04:16"`                |
| `OFFSET_TIME`      | Time input + timezone dropdown                                             | `HH:MM:SS+HH:MM`               | `"19:05:12+05:30"`                     |
| `OFFSET_DATE_TIME` | Date + time inputs + timezone dropdown                                     | `YYYY-MM-DDTHH:MM:SS+HH:MM`    | `"2026-05-30T19:05:42+05:30"`          |
| `DURATION`         | Hours / minutes / seconds dropdowns                                        | ISO 8601 `PTxHxMxS`            | `"PT12H31M10S"`                        |
| `PERIOD`           | Years / months / days inputs                                               | ISO 8601 `PxYxMxD`             | `"P2Y3M5D"`                            |
| `COORDINATES`      | Latitude + longitude number inputs                                         | `{latitude, longitude}` object | `{"latitude":29.53,"longitude":75.02}` |
| `ADDRESS`          | Address form (line1, line2, area, city, state, country, pinCode, landmark) | address object                 | `{...}`                                |

### Timezone dropdown (OFFSET_TIME / OFFSET_DATE_TIME)

The timezone selector shows common timezone abbreviations and their UTC offsets.
The stored offset string (e.g. `+05:30`) is appended directly to the time string.

### Duration example

```
metaType:  DURATION
```

Renders three dropdowns (0–99 hours, 0–59 minutes, 0–59 seconds).
Stored as `PT{H}H{M}M{S}S`.

### Period example

```
metaType:  PERIOD
```

Renders three number inputs (years, months, days).
Stored as `P{Y}Y{M}M{D}D` with zero components omitted (e.g. `P3M5D`).

---

## Curl cookbook

> **Prerequisites**
>
> - Server running at `http://localhost:8090`
> - Log in once to get a JWT, then export it:
>   ```bash
>   TOKEN=$(curl -s -X POST http://localhost:8090/api/v1/auth/login \
>     -H "Content-Type: application/json" \
>     -d '{"username":"admin","password":"admin"}' | jq -r '.token')
>   ```
> - `jq` must be installed (`sudo apt install jq`)
> - Replace `<SUB_CATEGORY_ID>` with a real subcategory ID from your master data

---

### Managed Type 1 — Phone Case Catalog

Showcases: **color swatches · option pills · toggle · slider · stepper · rating · tag input · textarea · file upload · composite (dimensions)**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Phone Case Catalog",
    "description": "Catalog type for phone case product listings — showcases all UI components",
    "type": "LISTING_PROPERTIES",
    "tags": ["showcase", "ecommerce", "phone-case"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "color",
        "label": "Color",
        "metaType": "STRING",
        "attributes": {
          "style:color-options": "black,white,red,navy,gold,silver"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Color is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "size",
        "label": "Size",
        "metaType": "STRING",
        "attributes": {
          "style:options": "XS,S,M,L,XL",
          "ui:component": "option-pills"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Size is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "price",
        "label": "Price",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "10000",
          "html:step": "100"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Price is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "stock_count",
        "label": "Stock Count",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "stepper",
          "html:min": "0"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "quality_rating",
        "label": "Quality Rating",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "rating"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "in_stock",
        "label": "In Stock",
        "metaType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "sku",
        "label": "SKU",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. CASE-BLK-M",
          "html:pattern": "[A-Z]+-[A-Z]+-[A-Z]+"
        },
        "validators": [{ "type": "NOT_NULL", "message": "SKU is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "description",
        "label": "Description",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "4",
          "html:placeholder": "Describe the case material, finish, and compatibility…"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "keywords",
        "label": "Keywords",
        "metaType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "Add keywords…"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "contact_email",
        "label": "Seller Email",
        "metaType": "STRING",
        "attributes": {
          "html:type": "email",
          "html:placeholder": "seller@example.com"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Email is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "product_image",
        "label": "Product Image",
        "metaType": "FILE",
        "attributes": {
          "html:accept": "image/*"
        }
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "dimensions",
        "label": "Dimensions",
        "metaType": "STRING",
        "attributes": {},
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "length",
            "label": "Length",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "30",
              "html:step": "0.1",
              "html:placeholder": "cm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "width",
            "label": "Width",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "20",
              "html:step": "0.1",
              "html:placeholder": "cm"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "thickness",
            "label": "Thickness",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "5",
              "html:step": "0.1",
              "html:placeholder": "cm"
            }
          }
        ]
      }
    ]
  }' | jq '.'
```

---

### Managed Type 2 — Job Listing

Showcases: **option pills (labelled values) · stepper · toggle · date picker · email/tel input type · tag input · composite (salary range with two sliders)**

```bash
curl -s -X POST http://localhost:8090/api/v1/meta-data/managed-types \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Job Listing",
    "description": "Catalog type for job / freelance listings — showcases composite and date fields",
    "type": "LISTING_PROPERTIES",
    "tags": ["showcase", "jobs"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "job_title",
        "label": "Job Title",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Senior React Developer"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Title is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "employment_type",
        "label": "Employment Type",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Full-time:full_time,Part-time:part_time,Contract:contract,Freelance:freelance",
          "ui:component": "option-pills"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Employment type is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "experience_level",
        "label": "Experience Level",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Intern:intern,Junior:junior,Mid:mid,Senior:senior,Lead:lead",
          "ui:component": "option-pills"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "years_experience",
        "label": "Years of Experience",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "stepper",
          "html:min": "0",
          "html:max": "30"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "is_remote",
        "label": "Remote Work",
        "metaType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "start_date",
        "label": "Start Date",
        "metaType": "LOCAL_DATE",
        "attributes": {
          "html:placeholder": "Pick a start date…"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "contact_email",
        "label": "Contact Email",
        "metaType": "STRING",
        "attributes": {
          "html:type": "email",
          "html:placeholder": "hr@company.com"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Contact email is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "contact_phone",
        "label": "Contact Phone",
        "metaType": "STRING",
        "attributes": {
          "html:type": "tel",
          "html:pattern": "[0-9]{7,15}",
          "html:placeholder": "+91 98765 43210"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "required_skills",
        "label": "Required Skills",
        "metaType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "e.g. React, TypeScript, Node.js…"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "job_description",
        "label": "Job Description",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "6",
          "html:placeholder": "Describe responsibilities, requirements, and benefits…"
        }
      },
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "salary_range",
        "label": "Annual Salary Range",
        "metaType": "STRING",
        "attributes": {},
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "min_salary",
            "label": "Minimum",
            "metaType": "INTEGER",
            "attributes": {
              "ui:component": "slider",
              "html:min": "0",
              "html:max": "5000000",
              "html:step": "50000"
            }
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "max_salary",
            "label": "Maximum",
            "metaType": "INTEGER",
            "attributes": {
              "ui:component": "slider",
              "html:min": "0",
              "html:max": "5000000",
              "html:step": "50000"
            }
          }
        ]
      }
    ]
  }' | jq '.'
```

---

### Create listings using the types above

First capture the type IDs from the create responses above, then run:

```bash
# Replace these with actual IDs from the create responses
PHONE_CASE_TYPE_ID="<id-from-phone-case-response>"
JOB_TYPE_ID="<id-from-job-listing-response>"
SUB_CATEGORY_ID="<your-subcategory-id>"

# ── Listing 1: Phone Case ──────────────────────────────────────────────────

LISTING1_ID=$(curl -s -X POST http://localhost:8090/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Premium Leather Phone Case - iPhone 15",
    "description": "Genuine leather case with card slot, available in multiple colours",
    "subCategory": "'"$SUB_CATEGORY_ID"'",
    "tags": ["iphone", "leather", "premium"]
  }' | jq -r '.id')

echo "Created listing: $LISTING1_ID"

# Patch with embedded catalog data
curl -s -X PATCH "http://localhost:8090/api/v1/listings/$LISTING1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "embedded": {
      "typeId": "'"$PHONE_CASE_TYPE_ID"'",
      "pathWiseState": {
        "color": "black",
        "size": "M",
        "price": "1499",
        "stock_count": "25",
        "quality_rating": "4",
        "in_stock": "true",
        "sku": "CASE-BLK-M",
        "description": "Full-grain leather with a soft microfibre lining. Precise cutouts for camera and charging port.",
        "keywords": "leather,premium,wallet,iphone15",
        "contact_email": "seller@phonecases.in",
        "dimensions": {
          "length": "15.1",
          "width": "7.3",
          "thickness": "1.2"
        }
      }
    }
  }' | jq '.'

# ── Listing 2: Job Post ────────────────────────────────────────────────────

LISTING2_ID=$(curl -s -X POST http://localhost:8090/api/v1/listings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Senior React Developer — Remote",
    "description": "We are looking for a Senior React Developer to join our product team",
    "subCategory": "'"$SUB_CATEGORY_ID"'",
    "tags": ["react", "typescript", "remote"]
  }' | jq -r '.id')

echo "Created listing: $LISTING2_ID"

curl -s -X PATCH "http://localhost:8090/api/v1/listings/$LISTING2_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "embedded": {
      "typeId": "'"$JOB_TYPE_ID"'",
      "pathWiseState": {
        "job_title": "Senior React Developer",
        "employment_type": "full_time",
        "experience_level": "senior",
        "years_experience": "5",
        "is_remote": "true",
        "start_date": "2026-07-01",
        "contact_email": "hr@example.com",
        "contact_phone": "+919876543210",
        "required_skills": "React,TypeScript,Node.js,GraphQL",
        "job_description": "You will own the frontend architecture for our SaaS platform. Work closely with design and backend teams to deliver high-quality product experiences.",
        "salary_range": {
          "min_salary": "1800000",
          "max_salary": "3000000"
        }
      }
    }
  }' | jq '.'
```

---

## Adding new protocol keys

1. Open [attribute-protocol.ts](<hammer-ui/apps/web/src/app/(admin)/admin/metadata/_components/attribute-protocol.ts>) and add an entry to `ATTRIBUTE_PROTOCOL`.
2. If the new key needs a new UI widget, add the renderer inside `ScalarField` in [Step3Catalog.tsx](<hammer-ui/apps/web/src/app/(admin)/admin/listings/_components/Step3Catalog.tsx>).
3. The `AttributeEditor` dropdown in [PropertyRow.tsx](<hammer-ui/apps/web/src/app/(admin)/admin/metadata/_components/PropertyRow.tsx>) picks up new keys automatically from the protocol array — no extra wiring needed.
