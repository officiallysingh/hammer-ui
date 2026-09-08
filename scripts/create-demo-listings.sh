#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${OXNEER_BASE_URL:-http://localhost:8090}"
API="$BASE_URL/api/v1"
QUANTITY="${QUANTITY:-20}"
SUBCATEGORY_ID="${SUBCATEGORY_ID:-}"

info()  { printf "\033[1;34m[INFO]\033[0m  %s\n" "$*"; }
ok()    { printf "\033[1;32m[OK]\033[0m    %s\n" "$*"; }
warn()  { printf "\033[1;33m[WARN]\033[0m  %s\n" "$*"; }
fail()  { printf "\033[1;31m[FAIL]\033[0m  %s\n" "$*"; exit 1; }

extract_id() {
  echo "$1" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | grep -o '[0-9a-f-]\{8,\}'
}

main() {
  echo ""
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║           Oxneer Demo Listing Generator                    ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""

  info "Checking server at $BASE_URL …"
  local status
  status=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/swagger-ui/index.html" 2>/dev/null || true)
  if [ "$status" = "200" ] || [ "$status" = "302" ]; then
    ok "Server is reachable"
  else
    fail "Server not reachable at $BASE_URL (HTTP $status). Is it running?"
  fi

  # Ensure subcategory
  if [ -z "$SUBCATEGORY_ID" ]; then
    info "Finding sub-category …"
    local cats_resp cat_id subs_resp
    cats_resp=$(curl -sf "$API/master/categories" 2>/dev/null || echo "[]")
    cat_id=$(echo "$cats_resp" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"//;s/[^0-9a-f-]//g')
    if [ -z "$cat_id" ]; then
      local cat_resp
      cat_resp=$(curl -sf -X POST "$API/master/categories" \
        -H 'Content-Type: application/json' \
        -d '{"name":"Electronics","icon":"fa-solid fa-microchip"}')
      cat_id=$(extract_id "$cat_resp")
      ok "Created category $cat_id"
    else
      ok "Using category $cat_id"
    fi
    subs_resp=$(curl -sf "$API/master/categories/$cat_id/sub-categories" 2>/dev/null || echo "[]")
    SUBCATEGORY_ID=$(echo "$subs_resp" | grep -o '"id"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"id"[[:space:]]*:[[:space:]]*"//;s/"//;s/[^0-9a-f-]//g')
    if [ -z "$SUBCATEGORY_ID" ]; then
      local sub_resp
      sub_resp=$(curl -sf -X POST "$API/master/categories/$cat_id/sub-categories" \
        -H 'Content-Type: application/json' \
        -d '{"name":"Smartphones","icon":"fa-solid fa-mobile-screen"}')
      SUBCATEGORY_ID=$(extract_id "$sub_resp")
      ok "Created sub-category $SUBCATEGORY_ID"
    else
      ok "Using sub-category $SUBCATEGORY_ID"
    fi
  else
    ok "Using provided sub-category $SUBCATEGORY_ID"
  fi
  echo ""

  # Try creating a listing
  info "Creating listing with quantity $QUANTITY …"
  local resp http_code body
  resp=$(curl -s -w "\n%{http_code}" -X POST "$API/listings" \
    -H 'Content-Type: application/json' \
    -d '{"name":"Demo Product","description":"Generic product for demo auctions","tags":["demo"],"subCategory":"'"$SUBCATEGORY_ID"'","quantity":'"$QUANTITY"'}')
  http_code=$(echo "$resp" | tail -1)
  body=$(echo "$resp" | sed '$d')

  if [ "$http_code" -ge 200 ] 2>/dev/null && [ "$http_code" -lt 300 ] 2>/dev/null; then
    local lid
    lid=$(extract_id "$body")
    if [ -n "$lid" ]; then
      ok "Created listing $lid"
      echo ""
      echo "Use with create-demo-auctions.sh:"
      echo "  LISTING_ID=$lid bash scripts/create-demo-auctions.sh"
      echo ""
      return
    fi
  fi

  warn "Listing creation failed (HTTP $http_code)"

  # Check what went wrong
  local error_detail
  error_detail=$(echo "$body" | grep -o '"detail"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"detail"[[:space:]]*:[[:space:]]*"//;s/"$//')
  if [ -n "$error_detail" ]; then
    warn "Error: $error_detail"
  fi

  local error_property
  error_property=$(echo "$body" | grep -o '"propertyPath"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*"propertyPath"[[:space:]]*:[[:space:]]*"//;s/"$//')
  if [ -n "$error_property" ]; then
    warn "Failed field: $error_property"
  fi

  echo ""
  info "Workaround: Create listing via admin UI"
  echo "  1. Go to $BASE_URL/swagger-ui/index.html"
  echo "  2. Use POST /api/v1/listings with body:"
  echo '  {"name":"Demo Product","description":"Demo auctions","tags":["demo"],"subCategory":"'"$SUBCATEGORY_ID"'","quantity":'"$QUANTITY"'}'
  echo "  3. Or use the frontend at http://localhost:3000/admin/listings/new"
  echo ""
}

main "$@"
