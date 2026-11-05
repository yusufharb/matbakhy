# NEXUS Marketplace Core — Project Handover & Implementation Status

---

## 1. Project Overview & Current Scope
**NEXUS Marketplace Core** is an enterprise-grade, white-label, multi-supplier marketplace engine.
- **Core Engine Backend**: Go 1.23 modular monolith, PostgreSQL 16, Redis/Valkey, NATS JetStream, MinIO. Handled by Core Developer (Stage E completed: atomic stock reservation, cryptographic double-entry ledger, integer-basis commissions, secure RBAC).
- **Customer Frontends (Completed & Operational)**:
  1. **B2B Merchant Dashboard**: Corporate procurement, onboarding KYC, team RBAC, receiving warehouse docks, wholesale volume tier pricing, multi-supplier suborders, Account 2010 corporate wallet.
  2. **B2C Customer Ecommerce Storefront**: High-conversion retail shopping, category search, product pages, consumer cart, authenticated checkout, customer address book, Account 2050 consumer wallet.

---

## 2. Git & Handover Safety Status
- **Current Branch**: `feature/safe-handover-core`
- **Main Branch Isolation**: `main` is strictly protected (never committed, merged, or pushed directly).
- **Remote**: `origin` (`https://github.com/yusufharb/Marketplace-Core-.git`)
- **Automated Verification**:
  - Backend Test Suite: 100% PASS (`go test -p=1 ./...`)
  - Frontend Formatting: 100% PASS (`oxfmt --check`)
  - Frontend Build: 100% PASS (`vite build`)

---

## 3. Approved Architecture & Core Decisions
1. **Shared Identity**: Single `iam.users` record per individual; context-bound JWTs via `POST /auth/switch-context` allow toggling between B2B and B2C.
2. **Sub-Ledger Wallets**: Chart of Accounts control accounts (2010 for Merchants, 2050 for Customers) mapped to independent `ledger.accounts` rows per entity. Zero commingling of funds.
3. **Safe Order Ownership**: `commerce.orders` supports `order_type IN ('b2b', 'b2c')`. B2B enforces `merchant_id NOT NULL`; B2C enforces `merchant_id IS NULL AND user_id NOT NULL`. Supplier suborders partitioned identically under the hood.
4. **Physical Logistics Separation**:
   - Supplier Stock Hubs: Internal fulfillment nodes in `inventory.warehouses` (protected/hidden from buyers).
   - Merchant Receiving Warehouses: Commercial delivery docks in `commerce.merchant_receiving_warehouses` (single destination per B2B order in MVP).
   - Customer Addresses: Residential/office address book in `commerce.customer_addresses`.
5. **Unified Catalog & Single Stock Pool**: Products exist once; supplier offers define wholesale tiers and retail prices; stock draws from the exact same `inventory.warehouse_stock` pool.
6. **B2C Authenticated Checkout**: Authenticated checkout is the default for MVP; guest checkout is deferred.
7. **Cairo Font & RTL/LTR**: Cairo typography, dynamic `dir="rtl"` / `dir="ltr"`, and CSS logical properties.

---

## 4. Frontend Screen Implementation Progress

| Screen ID | Portal | Route | Status | Mock / Live Backend |
|---|---|---|:---:|---|
| **B2B-01** | B2B | `/b2b/login` / `/b2b/register` | **Completed** | Hybrid (Live Auth + Context Mock) |
| **B2B-02** | B2B | `/b2b/onboarding` | **Completed** | KYC Stepper (CR/VAT verification) |
| **B2B-03** | B2B | `/b2b/dashboard` | **Completed** | Spend MTD, Active Orders, Wallet KPIs |
| **B2B-04** | B2B | `/b2b/procurement/catalog` | **Completed** | Live `/products` + Volume Tier Matrix |
| **B2B-05** | B2B | `/b2b/procurement/product/:sku` | **Completed** | Live `/products/{id}` + Tier Calc |
| **B2B-06** | B2B | `/b2b/procurement/cart` | **Completed** | Multi-Supplier Cart + Tier Savings |
| **B2B-07** | B2B | `/b2b/procurement/checkout` | **Completed** | Dock Picker, PO Ref, Wallet 2010 |
| **B2B-08** | B2B | `/b2b/orders` | **Completed** | Live Parent Orders & Suborders Breakdown |
| **B2B-09** | B2B | `/b2b/warehouses` | **Completed** | Receiving Docks CRUD & Forklift Specs |
| **B2B-10** | B2B | `/b2b/team` | **Completed** | 5-Tier RBAC & Secure Invite Modal |
| **B2B-11** | B2B | `/b2b/finance/wallet` | **Completed** | Account 2010 Balance, Top-up, Audit |
| **B2B-12** | B2B | `/b2b/settings/profile` | **Completed** | Corporate Legal, CR/VAT, Billing |
| **B2C-01** | B2C | `/` | **Completed** | Retail Storefront, Deals, Banners |
| **B2C-02** | B2C | `/search` / `/category/:slug` | **Completed** | Autocomplete Search & Category Filters |
| **B2C-03** | B2C | `/product/:slug` | **Completed** | Single-Unit Retail PDP (`moq = 1`) |
| **B2C-04** | B2C | `/cart` | **Completed** | Consumer Shopping Cart & Stepper |
| **B2C-05** | B2C | `/checkout` | **Completed** | 2-Step Authenticated Checkout |
| **B2C-06** | B2C | `/checkout/success/:id` | **Completed** | Order Confirmation & Tracking ETA |
| **B2C-07** | B2C | `/account/orders` | **Completed** | Live Delivery Milestones Timeline |
| **B2C-08** | B2C | `/account/addresses` | **Completed** | Personal Address Book CRUD |
| **B2C-09** | B2C | `/account/wallet` | **Completed** | Consumer Wallet (2050) & Quick Top-ups |
| **B2C-10** | B2C | `/account/profile` | **Completed** | Consumer Profile & Locale Settings |

---

## 5. Core Developer Dependencies (DEP-01 to DEP-10)
Refer to the complete technical contract in `docs/core-developer-handover.md` or the planning artifacts:
- **DEP-01**: `POST /auth/switch-context` & `GET /auth/me/contexts` (P0)
- **DEP-02**: `POST /auth/register-customer` (P0)
- **DEP-03**: B2C Order Ownership `order_type IN ('b2b', 'b2c')` (P0)
- **DEP-04**: Sub-Ledger Accounts for 2010 (Merchant) and 2050 (Customer) (P0)
- **DEP-05**: Shared Stock Allocation across B2B & B2C Offers (P0)
- **DEP-06**: Merchant Receiving Warehouses API & Schema (P1)
- **DEP-07**: Customer Address Book API & Schema (P1)
- **DEP-08**: Corporate KYC Submission & Admin Review API (P1)
- **DEP-09**: Team Invitations & RBAC Membership API (P1)
- **DEP-10**: Wallet Top-Up Endpoint & Idempotent Webhook Handler (P1)

---

## 6. Changelog & Commit History
- **Stage E**: Handover documentation, Docker dev startup, CI workflows (`50b13e9`, `bf2c18d`, `5cabb90`).
- **Stage F (Complete)**: Full B2B Merchant Dashboard & B2C Customer Website Implementation with Cairo font, bilingual RTL/LTR layout, Context Switcher, and complete 22-screen backlog (`1e4dfae`). 100% green tests & production build.
