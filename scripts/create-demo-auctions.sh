#!/usr/bin/env bash
set -euo pipefail

# ─── Configuration ────────────────────────────────────────────────────────────
BASE_URL="${OXNEER_BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
NUM_AUCTIONS="${NUM_AUCTIONS:-10}"

# Optional pre-existing IDs (set these to skip creation)
CATEGORY_ID="${CATEGORY_ID:-}"
SUBCATEGORY_ID="${SUBCATEGORY_ID:-}"
MANAGED_TYPE_ID="${MANAGED_TYPE_ID:-}"

# ─── Helpers ──────────────────────────────────────────────────────────────────
info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  local body="$1"
  local id
  id=$(echo "$body" | jq -r '.id // empty')
  [ -n "$id" ] && echo "$id" || fail "Could not extract id from: $body"
}

check_health() {
  info "Checking server at $BASE_URL …"
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/swagger-ui/index.html" 2>/dev/null || true)
  if [ "$status" = "200" ] || [ "$status" = "302" ]; then
    ok "Server is reachable"
  else
    fail "Server not reachable at $BASE_URL (HTTP $status). Is it running?"
  fi
}

# ─── 1. Prerequisites: Category, SubCategory, Listing, ManagedType ────────────
ensure_category() {
  if [ -n "$CATEGORY_ID" ]; then
    ok "Using existing category $CATEGORY_ID"
    return
  fi
  info "Fetching existing categories …"
  local cats
  cats=$(curl -sf "$API/master/categories" 2>/dev/null || echo "[]")
  CATEGORY_ID=$(echo "$cats" | jq -r '.[0].id // empty')
  if [ -n "$CATEGORY_ID" ]; then
    ok "Using existing category $CATEGORY_ID"
  else
    info "Creating category 'Electronics' …"
    local resp
    resp=$(curl -sf -X POST "$API/master/categories" \
      -H 'Content-Type: application/json' \
      -d '{"name":"Electronics","icon":"fa-solid fa-microchip"}')
    CATEGORY_ID=$(extract_id "$resp")
    ok "Created category $CATEGORY_ID"
  fi
}

ensure_subcategory() {
  if [ -n "$SUBCATEGORY_ID" ]; then
    ok "Using existing sub-category $SUBCATEGORY_ID"
    return
  fi
  info "Fetching sub-categories for category $CATEGORY_ID …"
  local subs
  subs=$(curl -sf "$API/master/categories/$CATEGORY_ID/sub-categories" 2>/dev/null || echo "[]")
  SUBCATEGORY_ID=$(echo "$subs" | jq -r '.[0].id // empty')
  if [ -n "$SUBCATEGORY_ID" ]; then
    ok "Using existing sub-category $SUBCATEGORY_ID"
  else
    info "Creating sub-category 'Smartphones' …"
    local resp
    resp=$(curl -sf -X POST "$API/master/categories/$CATEGORY_ID/sub-categories" \
      -H 'Content-Type: application/json' \
      -d '{"name":"Smartphones","icon":"fa-solid fa-mobile-screen"}')
    SUBCATEGORY_ID=$(extract_id "$resp")
    ok "Created sub-category $SUBCATEGORY_ID"
  fi
}

ensure_listing() {
  if [ -n "${LISTING_ID:-}" ]; then
    ok "Using existing listing $LISTING_ID"
    return
  fi
  info "Fetching existing listings …"
  local lists
  lists=$(curl -sf "$API/listings" 2>/dev/null || echo '{"content":[]}')
  LISTING_ID=$(echo "$lists" | jq -r '.content[0].id // empty')
  if [ -n "$LISTING_ID" ]; then
    ok "Using existing listing $LISTING_ID"
  else
    info "Creating listing 'Demo Product' …"
    local resp
    resp=$(curl -sf -X POST "$API/listings" \
      -H 'Content-Type: application/json' \
      -d '{"name":"Demo Product","description":"Generic product for demo auctions","tags":["demo"],"subCategory":"'"$SUBCATEGORY_ID"'","quantity":1}')
    LISTING_ID=$(extract_id "$resp")
    ok "Created listing $LISTING_ID"
  fi
}

ensure_managed_type() {
  if [ -n "$MANAGED_TYPE_ID" ]; then
    ok "Using existing managed type $MANAGED_TYPE_ID"
    return
  fi
  info "Fetching existing managed types …"
  local mts
  mts=$(curl -sf "$API/meta-data/managed-types" 2>/dev/null || echo '{"content":[]}')
  MANAGED_TYPE_ID=$(echo "$mts" | jq -r '.content[0].id // empty')
  if [ -n "$MANAGED_TYPE_ID" ]; then
    ok "Using existing managed type $MANAGED_TYPE_ID"
  else
    info "Creating managed type 'Product Details Form' …"
    local payload
    payload='{
      "name":"Product Details Form",
      "description":"Custom form for additional product information collected from participants",
      "type":"CUSTOM_FORM",
      "properties":[
        {"type":"SIMPLE_PROPERTY","name":"brandName","label":"Brand Name","dataType":"STRING","validators":[{"type":"NOT_BLANK"}]},
        {"type":"SIMPLE_PROPERTY","name":"modelNumber","label":"Model Number","dataType":"STRING","validators":[{"type":"NOT_BLANK"}]},
        {"type":"SIMPLE_PROPERTY","name":"yearOfManufacture","label":"Year of Manufacture","dataType":"INTEGER"},
        {"type":"SIMPLE_PROPERTY","name":"condition","label":"Product Condition","dataType":"STRING"},
        {"type":"SIMPLE_PROPERTY","name":"warrantyMonths","label":"Warranty (Months)","dataType":"INTEGER","validators":[{"type":"POSITIVE_OR_ZERO"}]}
      ]
    }'
    local resp
    resp=$(curl -sf -X POST "$API/meta-data/managed-types" \
      -H 'Content-Type: application/json' \
      -d "$payload")
    MANAGED_TYPE_ID=$(extract_id "$resp")
    ok "Created managed type $MANAGED_TYPE_ID"
  fi
}

# ─── 2. Auction creation data ────────────────────────────────────────────────
AUCTION_TITLES=(
  "Samsung Galaxy S24 Ultra 256GB"
  "Apple iPhone 15 Pro Max 512GB"
  "Google Pixel 8 Pro 128GB"
  "OnePlus 12 256GB"
  "Xiaomi 14 Ultra 512GB"
  "Sony Xperia 1 V 256GB"
  "Nothing Phone 2 256GB"
  "Motorola Edge 50 Pro 256GB"
  "ASUS ROG Phone 8 Pro 512GB"
  "Realme GT 5 Pro 256GB"
)

AUCTION_DESCRIPTIONS=(
  "Flagship Samsung smartphone with S-Pen and 200MP camera"
  "Latest Apple flagship with titanium design and A17 Pro chip"
  "Google's AI-powered flagship with Tensor G3 processor"
  "Flagship killer with Snapdragon 8 Gen 3 and 100W charging"
  "Leica-powered camera flagship with Snapdragon 8 Gen 3"
  "Professional-grade camera phone with 4K OLED display"
  "Unique transparent design with Glyph Interface"
  "Premium mid-range with pOLED display and 125W charging"
  "Gaming powerhouse with shoulder triggers and RGB lighting"
  "Premium flagship with Snapdragon 8 Gen 3 and fast charging"
)

AUCTION_TAGS=(
  "samsung,mobile,flagship"
  "apple,iphone,premium"
  "google,pixel,ai"
  "oneplus,speed,flagship"
  "xiaomi,camera,premium"
  "sony,camera,professional"
  "nothing,design,unique"
  "motorola,premium,mid-range"
  "asus,gaming,performance"
  "realme,speed,value"
)

OPENING_PRICES=(
  89999
  159999
  74999
  64999
  89999
  99999
  49999
  44999
  94999
  54999
)

# ─── 3. Create a single auction with all configurations ──────────────────────
create_auction() {
  local idx=$1
  local i=$((idx - 1))
  local title="${AUCTION_TITLES[$i]}"
  local description="${AUCTION_DESCRIPTIONS[$i]}"
  local tags_str="${AUCTION_TAGS[$i]}"
  local opening_price="${OPENING_PRICES[$i]}"
  local ref_id="DEMO-$(printf '%04d' $idx)"

  info "[$idx/$NUM_AUCTIONS] Creating auction: $title"

  # ── 3a. Create auction ──────────────────────────────────────────────────
  local tags_json
  tags_json=$(echo "$tags_str" | jq -R 'split(",")')

  local auction_payload
  auction_payload=$(cat <<EOF
{
  "type": "OFFER_BASE_STEP_PRICED_ATOMIC_UNIT_AUCTION",
  "format": "SIMPLE",
  "protocol": {
    "accessibility": "PUBLIC",
    "direction": "FORWARD",
    "dimension": "ONE_DIMENSIONAL",
    "participantVisibility": "ALIAS",
    "offerVisibility": "RANK"
  },
  "title": "$title",
  "description": "$description",
  "referenceId": "$ref_id",
  "monetaryOptions": {
    "currencyUnit": "INR",
    "precision": 2,
    "roundingMode": "HALF_UP"
  },
  "tags": $tags_json,
  "subCategories": ["$SUBCATEGORY_ID"],
  "unit": {
    "type": "SINGLE_UNIT",
    "item": {
      "id": "$LISTING_ID",
      "name": "$title",
      "description": "$description",
      "quantity": 1
    },
    "openingPrice": $opening_price
  }
}
EOF
  )

  local resp
  resp=$(curl -sf -X POST "$API/auctions" \
    -H 'Content-Type: application/json' \
    -d "$auction_payload")
  local auction_id
  auction_id=$(extract_id "$resp")
  ok "  Created auction $auction_id"

  # ── 3b. Set policies ────────────────────────────────────────────────────
  local policies_payload
  policies_payload=$(cat <<EOF
[
  {
    "type": "MINIMUM_PARTICIPANTS_REQUIREMENT_POLICY",
    "name": "Minimum Participants",
    "description": "At least 3 participants required to start auction",
    "order": 0,
    "count": 3,
    "preStartValidationDuration": "PT30M"
  },
  {
    "type": "EXTENSION_POLICY",
    "name": "Auction Extension",
    "description": "Extend auction by 5 minutes if bids placed in last 2 minutes, max 3 extensions",
    "order": 1,
    "reference": "FROM_AUCTION_END_TIME",
    "duration": "PT5M",
    "limit": 3
  },
  {
    "type": "STEP_BASED_OFFER_PRICE_POLICY",
    "name": "Step Based Price",
    "description": "Minimum bid increment decreases in steps every 10 minutes",
    "order": 2,
    "windowDuration": "PT10M",
    "steps": [100, 75, 50, 25, 10],
    "value": 100
  },
  {
    "type": "KTH_PRICE_WINNER_DETERMINATION_POLICY",
    "name": "Highest Bidder Wins",
    "description": "The highest bidder determines the winner",
    "order": 3,
    "kth": 1
  },
  {
    "type": "KTH_WINNER_PRICE_DETERMINATION_POLICY",
    "name": "Winner Pays Own Bid",
    "description": "Winner pays their own bid amount",
    "order": 4,
    "kth": 1
  }
]
EOF
  )
  curl -sf -X POST "$API/auctions/$auction_id/policies" \
    -H 'Content-Type: application/json' \
    -d "$policies_payload" > /dev/null
  ok "  Policies set"

  # ── 3c. Set workflow ────────────────────────────────────────────────────
  local workflow_payload
  workflow_payload=$(cat <<EOF
[
  {
    "type": "TNC_FORM_STEP",
    "name": "Terms & Conditions",
    "description": "Accept terms and conditions to participate",
    "order": 0,
    "tncText": "By participating in this auction, you agree to abide by all rules and regulations. The auctioneer reserves the right to cancel or modify the auction at any time. All bids are binding and cannot be withdrawn once placed."
  },
  {
    "type": "FORM_STEP",
    "name": "Product Details",
    "description": "Provide additional product information",
    "order": 1,
    "phase": "PRE_AUCTION",
    "typeId": "$MANAGED_TYPE_ID"
  },
  {
    "type": "BANK_DETAIL_FORM_STEP",
    "name": "Bank Details",
    "description": "Provide bank details for refund purposes",
    "order": 2
  },
  {
    "type": "PAYMENT_STEP",
    "name": "Security Deposit",
    "description": "Pay security deposit to participate in auction",
    "order": 3,
    "phase": "PRE_AUCTION",
    "mode": "ONLINE",
    "offset": "PT1H",
    "heads": [
      {
        "name": "Security Deposit",
        "description": "Refundable security deposit required to participate",
        "value": 5000,
        "basis": "AMOUNT_BASED",
        "refundable": true
      },
      {
        "name": "Platform Fee",
        "description": "Non-refundable platform convenience fee",
        "value": 2.5,
        "basis": "PERCENTAGE_BASED",
        "refundable": false
      }
    ]
  }
]
EOF
  )
  curl -sf -X POST "$API/auctions/$auction_id/workflow" \
    -H 'Content-Type: application/json' \
    -d "$workflow_payload" > /dev/null
  ok "  Workflow set"

  # ── 3d. Schedule and publish ────────────────────────────────────────────
  local start_time end_time
  start_time=$(date -u -v+${idx}d -v+10H -v+0M -v+0S +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -d "+${idx} days 10:00:00" +"%Y-%m-%dT%H:%M:%SZ")
  end_time=$(date -u -v+${idx}d -v+12H -v+0M -v+0S +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null \
    || date -u -d "+${idx} days 12:00:00" +"%Y-%m-%dT%H:%M:%SZ")

  local schedule_payload
  schedule_payload=$(cat <<EOF
{
  "startTime": "$start_time",
  "endTime": "$end_time",
  "publish": true
}
EOF
  )
  curl -sf -X PUT "$API/auctions/$auction_id/schedule" \
    -H 'Content-Type: application/json' \
    -d "$schedule_payload" > /dev/null
  ok "  Scheduled: $start_time → $end_time (published)"

  echo "$auction_id"
}

# ─── Main ─────────────────────────────────────────────────────────────────────
main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║        Oxneer Demo Auction Generator ($NUM_AUCTIONS auctions)              ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  check_health

  info "Setting up prerequisites …"
  ensure_category
  ensure_subcategory
  ensure_listing
  ensure_managed_type
  echo ""

  info "Creating $NUM_AUCTIONS auctions with policies, workflow & schedule …"
  echo ""

  created_ids=()
  for i in $(seq 1 "$NUM_AUCTIONS"); do
    id=$(create_auction "$i")
    created_ids+=("$id")
    echo ""
  done

  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║                      Summary                               ║"
  echo "╠══════════════════════════════════════════════════════════════╣"
  printf "║  Category:    %-46s ║\n" "$CATEGORY_ID"
  printf "║  SubCategory: %-46s ║\n" "$SUBCATEGORY_ID"
  printf "║  Listing:     %-46s ║\n" "${LISTING_ID:-N/A}"
  printf "║  ManagedType: %-46s ║\n" "$MANAGED_TYPE_ID"
  echo "╠══════════════════════════════════════════════════════════════╣"
  echo "║  Auction IDs:                                              ║"
  for j in "${!created_ids[@]}"; do
    printf "║    %2d. %-51s ║\n" "$((j+1))" "${created_ids[$j]}"
  done
  echo "╠══════════════════════════════════════════════════════════════╣"
  printf "║  Public listing: %-45s ║\n" "$BASE_URL/api/v1/auctions/public"
  printf "║  Admin listing:  %-45s ║\n" "$BASE_URL/api/v1/auctions"
  printf "║  Swagger UI:     %-45s ║\n" "$BASE_URL/swagger-ui/index.html"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
}

main "$@"
