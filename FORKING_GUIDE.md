# Marketplace Core — Forking & Deployment Guide
## How to Clone, Customize, and Deploy a New Marketplace in 15 Minutes

This codebase is designed as a **Reusable Marketplace Core Engine**. When you need to create a new marketplace (e.g., *BasketPort*, *B2C Electronics*, *Industrial Wholesale*, *Food & Beverage*), you **fork or clone** this repository and configure it rather than rewriting the core modules.

---

## 1. Quick Start: Clone & Run Locally

### Step 1: Clone the Repository
```bash
git clone <your-repo-url> my-new-marketplace
cd my-new-marketplace
```

### Step 2: Spin Up Infrastructure (Docker)
```bash
docker compose -f deploy/docker-compose.yml up -d
```
This starts:
- **PostgreSQL 16**: Port `5432` (Auto-runs migrations)
- **Valkey (Redis 7)**: Port `6379` (Sessions, rate limits, 15-min cart leases)
- **NATS JetStream**: Port `4222` (Event bus)
- **Meilisearch**: Port `7700` (Arabic-native search engine)
- **MinIO**: Port `9000` / `9001` (S3 object storage for product images)

### Step 3: Start Frontend (All 3 Portals)
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:5173`. You can immediately toggle between:
- **🏛️ Super Admin Dashboard**: Platform governance, supplier KYC, catalog moderation, double-entry financial ledger.
- **🏢 Seller / Supplier Portal**: Vendor operations, multi-warehouse inventory, fulfillment pipeline, earnings ledger.
- **🛍️ Merchant Storefront (Website)**: Buyer discovery, multi-supplier offer comparison, unified cart, wallet checkout.
- **🌐 English / عربي**: Instant RTL bidirectional switch.

---

## 2. How to Customize a Fork

### 2.1 Brand Identity & Name
Open `backend/db/seeds/system_seed.sql` and `frontend/src/components/AdminExtras.tsx`:
- Change `NEXUS MARKETPLACE` to your new platform name (e.g., `BASKETPORT`).
- Update your primary logo and favicon in `public/favicon.svg`.

### 2.2 Commission Policies
The core engine uses **hierarchical commission resolution**:
1. **Supplier Custom Agreement** (Highest priority, overrides all)
2. **Category Override** (e.g., Electronics 7%, Fashion 15%)
3. **Global Default Take Rate** (e.g., 10%)

To change default commission rates, edit `backend/db/seeds/seed_data.sql`:
```sql
UPDATE platform.commission_rules 
SET rate_percent = 12.00 
WHERE scope_type = 'global';
```

### 2.3 Currencies & Localization
The engine natively supports:
- **USD ($)** — US Dollar
- **SAR (ر.س)** — Saudi Riyal
- **EGP (ج.م)** — Egyptian Pound
- **EUR (€)** — Euro

All financial amounts are stored as **integer minor units** (`int64` cents/halalas) to eliminate floating-point rounding errors.

### 2.4 Enable / Disable Feature Flags
You can turn modules on or off dynamically without recompiling:
```sql
-- Disable RFQ if this is a pure retail B2C marketplace
UPDATE platform.configurations SET value = 'false' WHERE key = 'features.rfq';

-- Enable Minimum Order Quantity (MOQ) for wholesale
UPDATE platform.configurations SET value = 'true' WHERE key = 'features.moq';
```

---

## 3. Core Architecture Rules (Do Not Violate)

1. **Shared Catalog Separation**:
   - `catalog.products` = Global product identity (Platform-owned).
   - `catalog.supplier_offers` = Commercial terms & prices (Supplier-owned).
   - **Never** hardcode a supplier ID into the global product table. Multiple suppliers must always be able to offer the same product.

2. **Multi-Supplier Order Grouping**:
   - Every buyer purchase creates **1 Parent Order** and **N Supplier Suborders**.
   - Each supplier can only view, pack, and fulfill their assigned suborder.

3. **Double-Entry Financial Invariant**:
   - The ledger enforces:
     $$\sum \text{Debits} = \sum \text{Credits}$$
   - Never update wallet balances with `UPDATE accounts SET balance = balance + 100`.
   - Balances are computed from immutable, append-only journal entries.

---

## 4. Production Deployment

### Option A: Coolify / Dokploy / VPS ($10–$20/mo)
Deploy using the provided `docker-compose.yml` with automated Let's Encrypt SSL.

### Option B: Cloud Kubernetes / AWS ECS
Build the Go binary and deploy with Helm:
```bash
# Go binary is a single ~25MB static binary with zero dependencies
cd backend && CGO_ENABLED=0 GOOS=linux go build -o marketplace-api ./cmd/api
```
