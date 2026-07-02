#!/usr/bin/env bash
set -euo pipefail

# ── Prerequisites ────────────────────────────────────────────────────────────
# Server running at http://localhost:8090
# jq installed (sudo apt install jq)
#
# Usage:
#   chmod +x scripts/create-components.sh
#   ./scripts/create-components.sh

BASE_URL="${BASE_URL:-http://localhost:8090}"
COOKIE_JAR="/tmp/hammer-cookies.txt"
rm -f "$COOKIE_JAR"

echo "→ Logging in as superadmin…"
HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/login" \
  -H 'Accept: application/json, text/plain, */*' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -H 'Origin: http://localhost:3000' \
  -H 'Referer: http://localhost:3000/' \
  --data-raw 'username=superadmin&password=Valentine%401' \
  -c "$COOKIE_JAR")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "✗ Login failed (HTTP $HTTP_CODE). Check server and credentials." >&2
  exit 1
fi
echo "✓ Logged in (JSESSIONID saved)"

# ── Helper ───────────────────────────────────────────────────────────────────
create_component() {
  local name="$1" desc="$2" json="$3"
  echo ""
  echo "──────────────────────────────────────────────"
  echo "→ Creating component: $name"
  echo "  $desc"
  local result
  result=$(curl -s -X POST "$BASE_URL/api/v1/meta-data/components" \
    -H "Content-Type: application/json" \
    -b "$COOKIE_JAR" \
    -d "$json")
  if echo "$result" | jq -e '.successes' > /dev/null 2>&1; then
    echo "✓ Created"
  else
    echo "✗ Failed:"
    echo "$result" | jq '.'
  fi
}

# ═════════════════════════════════════════════════════════════════════════════
# Component 1  —  Address Block
# Metatypes:  STRING (×4)
# Attributes: placeholder, html:type, textarea, options
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Address Block" \
  "Reusable address: street, city, state, zip — uses textarea, dropdown, text input" \
  '{
    "name": "Address Block",
    "description": "Reusable address fields for shipping, billing, or pickup",
    "tags": ["address", "shipping", "common"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "street",
        "label": "Street Address",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "2",
          "html:placeholder": "House / flat no., street, area"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Street address is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "city",
        "label": "City",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Mumbai"
        },
        "validators": [{ "type": "NOT_NULL", "message": "City is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "state",
        "label": "State",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Andhra Pradesh,Arunachal Pradesh,Assam,Bihar,Chhattisgarh,Goa,Gujarat,Haryana,Himachal Pradesh,Jharkhand,Karnataka,Kerala,Madhya Pradesh,Maharashtra,Manipur,Meghalaya,Mizoram,Nagaland,Odisha,Punjab,Rajasthan,Sikkim,Tamil Nadu,Telangana,Tripura,Uttar Pradesh,Uttarakhand,West Bengal",
          "html:placeholder": "Select state"
        },
        "validators": [{ "type": "NOT_NULL", "message": "State is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "zip",
        "label": "PIN Code",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "6-digit PIN",
          "html:pattern": "[0-9]{6}"
        },
        "validators": [
          { "type": "NOT_NULL", "message": "PIN is required" },
          { "type": "REGEX_PATTERN", "regex": "^[0-9]{6}$", "message": "Must be a valid 6-digit PIN" }
        ]
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 2  —  Contact Info
# Metatypes:  STRING, STRING (email), STRING (tel)
# Attributes: html:type, html:placeholder, html:pattern, tag-input
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Contact Info" \
  "Email, phone, social handles — email/tel input types, tag input for social" \
  '{
    "name": "Contact Info",
    "description": "Reusable contact details block with email, phone, and social links",
    "tags": ["contact", "common"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "email",
        "label": "Email",
        "metaType": "STRING",
        "attributes": {
          "html:type": "email",
          "html:placeholder": "you@example.com"
        },
        "validators": [
          { "type": "NOT_NULL", "message": "Email is required" },
          { "type": "REGEX_PATTERN", "regex": "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$", "message": "Invalid email format" }
        ]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "phone",
        "label": "Phone Number",
        "metaType": "STRING",
        "attributes": {
          "html:type": "tel",
          "html:placeholder": "+91 98765 43210",
          "html:pattern": "[0-9+\\-\\s]{7,15}"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Phone is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "social_links",
        "label": "Social Links",
        "metaType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "Add profile URLs…"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 3  —  Product Dimensions
# Metatypes:  FLOAT (×3)  —  COMPOSITE_PROPERTY
# Attributes: html:min, html:max, html:step, html:placeholder
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Product Dimensions" \
  "Length × width × height composite — uses FLOAT with min/max/step" \
  '{
    "name": "Product Dimensions",
    "description": "Physical dimensions: length, width, height in cm",
    "tags": ["dimensions", "physical", "measure"],
    "properties": [
      {
        "type": "COMPOSITE_PROPERTY",
        "name": "dimensions",
        "label": "Dimensions cm",
        "metaType": "LIST",
        "attributes": {},
        "value": [
          {
            "type": "COMPLEX_PROPERTY",
            "name": "length",
            "label": "Length",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "200",
              "html:step": "0.1",
              "html:placeholder": "cm"
            },
            "validators": [{ "type": "NOT_NULL", "message": "Length is required" }]
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "width",
            "label": "Width",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "200",
              "html:step": "0.1",
              "html:placeholder": "cm"
            },
            "validators": [{ "type": "NOT_NULL", "message": "Width is required" }]
          },
          {
            "type": "COMPLEX_PROPERTY",
            "name": "height",
            "label": "Height",
            "metaType": "FLOAT",
            "attributes": {
              "html:min": "0",
              "html:max": "200",
              "html:step": "0.1",
              "html:placeholder": "cm"
            }
          }
        ]
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 4  —  Pricing & Stock
# Metatypes:  INTEGER (price), INTEGER (stock), BOOLEAN (in stock), INTEGER (rating)
# Attributes: slider, stepper, toggle, rating, style:options
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Pricing & Stock" \
  "Price (slider), stock (stepper), in-stock flag (toggle), condition (pill selector), rating" \
  '{
    "name": "Pricing & Stock",
    "description": "Pricing, inventory, condition, and rating fields",
    "tags": ["pricing", "inventory", "ecommerce"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "price",
        "label": "Price",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "100000",
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
          "html:min": "0",
          "html:max": "99999"
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
        "name": "condition",
        "label": "Condition",
        "metaType": "STRING",
        "attributes": {
          "style:options": "New:new,Like New:like_new,Good:good,Fair:fair,Poor:poor",
          "ui:component": "option-pills"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "rating",
        "label": "Rating",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "rating"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 5  —  Date Range
# Metatypes:  LOCAL_DATE (start), LOCAL_DATE (end), INTEGER (duration)
# Attributes: html:placeholder, html:min, html:max
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Date Range" \
  "Start/end date pickers + duration — LOCAL_DATE + INTEGER meta types" \
  '{
    "name": "Date Range",
    "description": "Date range block with start, end, and duration fields",
    "tags": ["date", "duration", "time"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "start_date",
        "label": "Start Date",
        "metaType": "LOCAL_DATE",
        "attributes": {
          "html:placeholder": "Select start date"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Start date is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "end_date",
        "label": "End Date",
        "metaType": "LOCAL_DATE",
        "attributes": {
          "html:placeholder": "Select end date"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "duration_days",
        "label": "Duration days",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "stepper",
          "html:min": "1",
          "html:max": "365"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 6  —  Color & Variant Selection
# Metatypes:  STRING (color swatches), STRING (size pills), FILE (image)
# Attributes: style:color-options, style:options, ui:component, html:accept
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Color & Variant" \
  "Color swatch picker + size option pills + variant image upload" \
  '{
    "name": "Color & Variant",
    "description": "Color swatch selector, size/option pills, and variant image upload",
    "tags": ["variant", "color", "ecommerce", "visual"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "color",
        "label": "Color",
        "metaType": "STRING",
        "attributes": {
          "style:color-options": "Black:black,White:white,Red:red,Navy:navy,Gold:gold,Silver:silver,#C0A060:tan"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Color is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "size",
        "label": "Size",
        "metaType": "STRING",
        "attributes": {
          "style:options": "XS,S,M,L,XL,XXL,3XL",
          "ui:component": "option-pills"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "variant_image",
        "label": "Variant Image",
        "metaType": "FILE",
        "attributes": {
          "html:accept": "image/*"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 7  —  Text Content Block
# Metatypes:  STRING (title), STRING (body — multiline), STRING (tags), STRING (url)
# Attributes: textarea, tag-input, html:type=url, placeholder
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Text Content" \
  "Title, body (textarea), tags (tag input), and link — rich text content block" \
  '{
    "name": "Text Content",
    "description": "Rich text content with title, multiline body, tags, and reference URL",
    "tags": ["content", "text", "common"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "title",
        "label": "Title",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "Enter a descriptive title"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Title is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "body",
        "label": "Body",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "6",
          "html:placeholder": "Write your content here…"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Body is required" }]
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
        "name": "reference_url",
        "label": "Reference URL",
        "metaType": "STRING",
        "attributes": {
          "html:type": "url",
          "html:placeholder": "https://example.com"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 8  —  Auction Settings
# Metatypes:  LOCAL_DATE_TIME (start), LOCAL_DATE_TIME (end), LONG (reserve),
#             BOOLEAN (auto-extend), INTEGER (increment)
# Attributes: datetime pickers, stepper, toggle
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Auction Settings" \
  "Auction-specific: start/end time, reserve price, auto-extend, bid increment" \
  '{
    "name": "Auction Settings",
    "description": "Auction configuration: scheduled times, reserve, auto-extend, bid increment",
    "tags": ["auction", "bidding", "time"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "auction_start",
        "label": "Auction Start",
        "metaType": "LOCAL_DATE_TIME",
        "attributes": {
          "html:placeholder": "Select auction start time"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Start time is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "auction_end",
        "label": "Auction End",
        "metaType": "LOCAL_DATE_TIME",
        "attributes": {
          "html:placeholder": "Select auction end time"
        },
        "validators": [{ "type": "NOT_NULL", "message": "End time is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "reserve_price",
        "label": "Reserve Price",
        "metaType": "LONG",
        "attributes": {
          "html:placeholder": "Minimum selling price",
          "html:min": "0"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "auto_extend",
        "label": "Auto Extend",
        "metaType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "bid_increment",
        "label": "Bid Increment",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "stepper",
          "html:min": "100",
          "html:step": "100",
          "html:placeholder": "Minimum bid step"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 9  —  Location Picker
# Metatypes:  COORDINATES (lat/lng), STRING (place name), STRING (notes)
# Attributes: placeholder, html:pattern, multiline
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Location Picker" \
  "Geographic location: COORDINATES meta type, place name, and notes" \
  '{
    "name": "Location Picker",
    "description": "GPS coordinates, place name, and location notes",
    "tags": ["location", "geo", "map"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "coordinates",
        "label": "Coordinates",
        "metaType": "COORDINATES",
        "attributes": {
          "html:placeholder": "e.g. 19.0760, 72.8777"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "place_name",
        "label": "Place Name",
        "metaType": "STRING",
        "attributes": {
          "html:placeholder": "e.g. Gateway of India"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "location_notes",
        "label": "Location Notes",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "3",
          "html:placeholder": "Additional details about the location…"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 10  —  Warranty & Policy
# Metatypes:  STRING (warranty period — pills), STRING (policy — textarea),
#             BOOLEAN (returnable), STRING (return window — pills)
# Attributes: option-pills, textarea, toggle, style:options
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Warranty & Policy" \
  "Warranty period, return policy, returnable flag — uses pills, toggle, textarea" \
  '{
    "name": "Warranty & Policy",
    "description": "Warranty period, return policy, and return eligibility settings",
    "tags": ["warranty", "policy", "ecommerce"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "warranty_period",
        "label": "Warranty Period",
        "metaType": "STRING",
        "attributes": {
          "style:options": "No Warranty:no_warranty,3 Months:3m,6 Months:6m,1 Year:1y,2 Years:2y,Lifetime:lifetime",
          "ui:component": "option-pills"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Warranty period is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "returnable",
        "label": "Returnable",
        "metaType": "BOOLEAN",
        "attributes": {
          "ui:component": "toggle"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "return_window",
        "label": "Return Window",
        "metaType": "STRING",
        "attributes": {
          "style:options": "7 Days:7d,15 Days:15d,30 Days:30d,60 Days:60d,90 Days:90d",
          "ui:component": "option-pills"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "policy_details",
        "label": "Policy Details",
        "metaType": "STRING",
        "attributes": {
          "ui:multiline": "true",
          "ui:rows": "4",
          "html:placeholder": "Describe warranty terms, coverage, and exclusions…"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 11  —  Vehicle Specs (advanced metatypes)
# Metatypes:  YEAR, YEAR_MONTH, INTEGER (mileage), STRING (fuel — pills),
#             STRING (transmission — pills), DOUBLE (engine)
# Attributes: html:min/max for year, option-pills, stepper
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Vehicle Specs" \
  "Vehicle specifications: YEAR, YEAR_MONTH, INTEGER, DOUBLE, pills for fuel/transmission" \
  '{
    "name": "Vehicle Specs",
    "description": "Vehicle specifications: make year, registration, mileage, fuel type, transmission, engine",
    "tags": ["vehicle", "automotive", "specs"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "manufacture_year",
        "label": "Manufacture Year",
        "metaType": "YEAR",
        "attributes": {
          "html:min": "1990",
          "html:max": "2026",
          "html:placeholder": "Year of manufacture"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Manufacture year is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "registration",
        "label": "First Registration",
        "metaType": "YEAR_MONTH",
        "attributes": {
          "html:placeholder": "e.g. 2024-06"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "mileage",
        "label": "Mileage km",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "stepper",
          "html:min": "0",
          "html:max": "999999",
          "html:step": "1000",
          "html:placeholder": "km driven"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "fuel_type",
        "label": "Fuel Type",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Petrol, Diesel, CNG, LPG, Electric, Hybrid",
          "ui:component": "option-pills"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Fuel type is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "transmission",
        "label": "Transmission",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Manual, Automatic, CVT, DCT",
          "ui:component": "option-pills"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "engine_cc",
        "label": "Engine cc",
        "metaType": "DOUBLE",
        "attributes": {
          "html:min": "0",
          "html:max": "10000",
          "html:step": "0.1",
          "html:placeholder": "cc"
        }
      }
    ]
  }'

# ═════════════════════════════════════════════════════════════════════════════
# Component 12  —  Job Posting Details
# Metatypes:  STRING (job type — pills), INTEGER (salary), STRING (skills — tag),
#             BOOLEAN (remote), LOCAL_DATE (deadline), STRING (description — textarea)
# Attributes: option-pills, slider, tag-input, toggle, date picker, textarea
# ═════════════════════════════════════════════════════════════════════════════

create_component \
  "Job Posting Details" \
  "Job listing fields: employment type (pills), salary (slider), skills (tags), remote flag, deadline, description" \
  '{
    "name": "Job Posting Details",
    "description": "Reusable job posting fields for employment listings",
    "tags": ["job", "employment", "hiring"],
    "properties": [
      {
        "type": "COMPLEX_PROPERTY",
        "name": "employment_type",
        "label": "Employment Type",
        "metaType": "STRING",
        "attributes": {
          "style:options": "Full-time:full_time,Part-time:part_time,Contract:contract,Freelance:freelance,Internship:internship",
          "ui:component": "option-pills"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Employment type is required" }]
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "salary_min",
        "label": "Min Salary",
        "metaType": "INTEGER",
        "attributes": {
          "ui:component": "slider",
          "html:min": "0",
          "html:max": "5000000",
          "html:step": "50000",
          "html:placeholder": "Annual CTC"
        }
      },
      {
        "type": "COMPLEX_PROPERTY",
        "name": "salary_max",
        "label": "Max Salary",
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
        "name": "required_skills",
        "label": "Required Skills",
        "metaType": "STRING",
        "attributes": {
          "ui:component": "tag-input",
          "html:placeholder": "e.g. React, TypeScript, Go…"
        },
        "validators": [{ "type": "NOT_NULL", "message": "At least one skill is required" }]
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
        "name": "application_deadline",
        "label": "Application Deadline",
        "metaType": "LOCAL_DATE",
        "attributes": {
          "html:placeholder": "Select deadline"
        },
        "validators": [{ "type": "NOT_NULL", "message": "Deadline is required" }]
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
        },
        "validators": [{ "type": "NOT_NULL", "message": "Description is required" }]
      }
    ]
  }'

echo ""
echo "══════════════════════════════════════════════"
echo "  Done! Created all components."
echo "  View them at: http://localhost:3000/admin/metadata/components"
echo "══════════════════════════════════════════════"
