#!/usr/bin/env bash
# ==============================================================================
# Marketplace Core — Automated Fork Generator (Bash / Linux / macOS)
# ==============================================================================
set -e

echo -e "\033[1;36m=================================================================\033[0m"
echo -e "\033[1;33m   NEXUS Marketplace Core — Fork & New Project Initializer       \033[0m"
echo -e "\033[1;36m=================================================================\033[0m"

NAME=${1:-""}
SLUG=${2:-""}
PRESET=${3:-""}
CURRENCY=${4:-""}
LOCALE=${5:-"ar"}
OUTPUT_DIR=${6:-""}

CORE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ -z "$NAME" ]; then
    read -p "1. Enter New Marketplace Name (e.g. BasketPort): " NAME
    [ -z "$NAME" ] && NAME="MyMarketplace"
fi

if [ -z "$SLUG" ]; then
    DEFAULT_SLUG=$(echo "$NAME" | tr '[:upper:]' '[:lower:]' | tr -cd '[:alnum:]')
    read -p "2. Enter Project Slug [$DEFAULT_SLUG]: " SLUG
    [ -z "$SLUG" ] && SLUG="$DEFAULT_SLUG"
fi

if [ -z "$PRESET" ]; then
    echo -e "\nSelect Business Vertical Preset:"
    echo "  1) b2b_wholesale   - B2B Bulk Marketplace (MOQ active, Price Tiers, Escrow, RFQ Quotes)"
    echo "  2) b2c_retail      - B2C Multi-Vendor Retail (MOQ off, Fast Checkout, Reviews, Cards)"
    echo "  3) food_grocery    - Food & Quick Commerce (Dark stores, Immediate routing, Fresh items)"
    echo "  4) services_custom - Services & Freelance (Milestone escrow, Custom proposals)"
    read -p "Choose [1-4] (Default: 1): " CHOICE
    case $CHOICE in
        2) PRESET="b2c_retail" ;;
        3) PRESET="food_grocery" ;;
        4) PRESET="services_custom" ;;
        *) PRESET="b2b_wholesale" ;;
    esac
fi

if [ -z "$CURRENCY" ]; then
    read -p "3. Default Base Currency (SAR / USD / EGP / AED / EUR) [SAR]: " CURRENCY
    [ -z "$CURRENCY" ] && CURRENCY="SAR"
fi

if [ -z "$OUTPUT_DIR" ]; then
    DEFAULT_OUTPUT="$(dirname "$CORE_DIR")/$NAME"
    read -p "4. Target Directory for New Project [$DEFAULT_OUTPUT]: " OUTPUT_DIR
    [ -z "$OUTPUT_DIR" ] && OUTPUT_DIR="$DEFAULT_OUTPUT"
fi

echo -e "\nInitializing Fork for: \033[1;32m$NAME\033[0m ($PRESET) at \033[1;34m$OUTPUT_DIR\033[0m"

mkdir -p "$OUTPUT_DIR"

# Copy core files excluding dev caches
rsync -av --progress "$CORE_DIR/" "$OUTPUT_DIR/" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="bin" \
    --exclude="dist" \
    --exclude="pgdata" \
    --exclude="*.exe" \
    --exclude="*.log" \
    --exclude="test_*.json" \
    --exclude="patch_*.json"

# Write root .env
cat <<EOF > "$OUTPUT_DIR/.env"
PLATFORM_NAME="$NAME"
PLATFORM_SLUG="$SLUG"
BUSINESS_PRESET="$PRESET"
DEFAULT_CURRENCY="$CURRENCY"
DEFAULT_LOCALE="$LOCALE"

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=marketplace_${SLUG}
POSTGRES_PORT=5432

API_PORT=8080
DATABASE_URL=postgres://postgres:postgres@localhost:5432/marketplace_${SLUG}?sslmode=disable

FRONTEND_PORT=5173
VITE_API_URL=http://localhost:8080/api/v1
EOF

# Initialize git
cd "$OUTPUT_DIR"
if [ ! -d ".git" ]; then
    git init
    git branch -M main
    git add .
    git commit -m "feat: initial commit for $NAME ($PRESET) from Marketplace Core"
    git remote add upstream "$CORE_DIR"
fi

echo -e "\033[1;32m✓ Marketplace $NAME successfully initialized at $OUTPUT_DIR\033[0m"
