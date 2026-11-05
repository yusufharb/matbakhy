# NEXUS Marketplace Core — Project Handover & Implementation Status

---

## 1. Project Overview & Current Scope
**NEXUS Marketplace Core** is an enterprise-grade, white-label, multi-supplier marketplace engine.
- **Core Engine Backend**: Go 1.23 modular monolith, PostgreSQL 16, Redis/Valkey, NATS JetStream, MinIO. Features atomic stock reservation, cryptographic double-entry ledger, integer-basis commissions, secure RBAC, dual-channel B2B/B2C fulfillment, and sub-ledger wallet liabilities.
- **Customer Frontends (Completed & Operational)**:
  1. **B2B Merchant Dashboard**: Corporate procurement, onboarding KYC, team RBAC, receiving warehouse docks, wholesale volume tier pricing, multi-supplier suborders, Account 2010 corporate wallet.
  2. **B2C Customer Ecommerce Storefront**: High-conversion retail shopping, category search, product pages, consumer cart, authenticated checkout, customer address book, Account 2050 consumer wallet.

---

## 2. Git & Handover Safety Status
- **Current Branch**: `feature/safe-handover-core`
- **Main Branch Isolation**: `main` is strictly protected (never committed, merged, or pushed directly).
- **Remote**: `origin` (`https://github.com/yusufharb/Marketplace-Core-.git`)
- **Automated Verification**:
  - Backend Test Suite: 100% PASS (`go test -v -count=1 -p=1 ./...`)
  - Frontend Formatting: 100% PASS (`npm run lint` / `oxfmt --check`)
  - Frontend Build: 100% PASS (`npm run build` / `vite build`)

---

## 3. Approved Architecture & Core Decisions
1. **Shared Identity**: Single `iam.users` record per individual; context-bound JWTs via `POST /auth/switch-context` allow seamless toggling between B2B and B2C.
2. **Sub-Ledger Wallets**: Chart of Accounts control accounts:
   - **Account 2010**: Merchant Wallet Liability (`owner_type = 'merchant'`, `owner_id = organization_id`).
   - **Account 2050**: Customer Wallet Liability (`owner_type = 'customer'`, `owner_id = user_id`).
   - **Account 1010**: Gateway Clearing Asset Account (`owner_type = 'platform'`).
   - **Top-up**: DR 1010 (clearing asset increases), CR 2010/2050 (wallet liability increases).
   - **Wallet Checkout**: DR 2010/2050 (liability decreases), CR 2020 (supplier escrow increases), CR 4010/4020 (platform revenue increases).
   - Both operate with strict double-entry guarantees (`sum(debit) == sum(credit)` enforced by database triggers and cryptographic SHA-256 hash chains).
3. **Safe Order Ownership**: `commerce.orders` supports `order_type IN ('b2b', 'b2c')`. B2B enforces `merchant_id NOT NULL`; B2C enforces `merchant_id IS NULL AND user_id NOT NULL` via `chk_orders_ownership` constraint. Supplier suborders partitioned identically under the hood.
4. **Physical Logistics Separation**:
   - Supplier Stock Hubs: Internal fulfillment nodes in `inventory.warehouses` (protected/hidden from buyers).
   - Merchant Receiving Warehouses: Commercial delivery docks in `commerce.merchant_receiving_warehouses` with dock type, forklift availability, and receiving hours.
   - Customer Addresses: Residential/office address book in `commerce.customer_addresses`.
5. **Unified Catalog & Single Stock Pool**: Products exist once; supplier offers define wholesale tiers and retail prices (`catalog.supplier_offers.retail_price`, `b2b_enabled`, `b2c_enabled`); stock draws from the exact same `inventory.warehouse_stock` pool.
6. **B2C Authenticated Checkout**: Authenticated checkout is the default for MVP; guest checkout is deferred.
7. **Cairo Font & RTL/LTR**: Cairo typography, dynamic `dir="rtl"` / `dir="ltr"`, and CSS logical properties.

---

## 4. Frontend Screen Implementation Progress

| Screen ID | Portal | Route | Status | Mock / Live Backend |
|---|---|---|:---:|---|
| **B2B-01** | B2B | `/b2b/login` / `/b2b/register` | **Completed** | Live Auth + Context Switcher |
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

## 5. Core Developer Dependencies (DEP-01 to DEP-10) — 100% Implemented & Tested

All 10 Core Developer Dependencies are fully implemented in PostgreSQL and Go backend:

| Dependency | Scope | HTTP Endpoints & DB Artefacts | Status & Tests |
|---|---|---|:---:|
| **DEP-01** | Context Switching | `GET /auth/me/contexts`, `POST /auth/switch-context` | **Done & Verified** (`TestRegisterCustomerAndContextSwitching`) |
| **DEP-02** | Customer Registration | `POST /auth/register-customer` | **Done & Verified** (`TestRegisterCustomerAndContextSwitching`) |
| **DEP-03** | Safe Order Ownership | `order_type IN ('b2b', 'b2c')`, `chk_orders_ownership` constraint | **Done & Verified** (`TestB2CCheckoutRetailPricingAndMOQ1`, `TestCrossChannelOrderIsolation`) |
| **DEP-04** | Sub-Ledger Account 2050 | `ledger.accounts` owner_type check includes `'customer'`; Account 2050 debit on B2C checkout | **Done & Verified** (`TestB2CWalletCheckoutDebitsAccount2050`) |
| **DEP-05** | Shared Stock & Dual Channel Offers | `catalog.supplier_offers` (`b2b_enabled`, `b2c_enabled`, `retail_price`); B2C sets `moq = 1` | **Done & Verified** (`TestB2CCheckoutRetailPricingAndMOQ1`) |
| **DEP-06** | Merchant Receiving Warehouses | `GET /merchant/warehouses`, `POST /merchant/warehouses`, `DELETE /merchant/warehouses/{id}` | **Done & Verified** (`TestMerchantReceivingWarehousesCRUD`) |
| **DEP-07** | Customer Address Book | `GET /customer/addresses`, `POST /customer/addresses`, `DELETE /customer/addresses/{id}` | **Done & Verified** (`TestCustomerAddressesCRUD`) |
| **DEP-08** | Corporate KYC Workflow | `POST /merchant/kyc/documents`, `GET /merchant/kyc/documents`, `POST /admin/kyc/documents/{id}/review` | **Done & Verified** (`TestKYCDocumentWorkflow`) |
| **DEP-09** | Team Invitations & RBAC | `GET /merchant/team`, `POST /merchant/team/invitations` | **Done & Verified** (`TestTeamInvitationAndMembers`) |
| **DEP-10** | Double-Entry Wallet Top-Up | `POST /customer/wallet/topup`, `POST /merchant/wallet/topup` (DR 1010, CR 2010/2050) | **Done & Verified** (`TestTopUpMerchantWalletAccount2010`, `TestTopUpCustomerWalletAccount2050`) |
| **DEP-11** | Real Payments & Webhooks | `POST /api/v1/payments/webhook`, `GET /api/v1/payments/{order_id}` | **Done & Verified** (`TestPaymentWebhookSettlementAndAccounting`, `TestPaymentFailureWebhookReleasesReservedStock`) |
| **DEP-12** | Cloud Object Storage | `POST /api/v1/storage/upload-url` (S3 / Cloudflare R2 / MinIO presigned URLs) | **Done & Verified** (`TestStorageUploadValidation`) |
| **DEP-13** | Tax Invoicing & Outbox Worker | `GET /api/v1/invoices/order/{order_id}`, Background Outbox Daemon | **Done & Verified** (`TestInvoiceGenerationAndTLV`, `TestOutboxWorkerProcessesConfirmedOrder`) |
| **DEP-14** | MRO Client Business Vertical | `mro_industrial_seed.sql` (Wholesale tiers, retail prosumer, receiving docks) | **Done & Verified** (`TestMROIndustrialWholesaleB2BOrderWithDockAndTier`) |

---

## 6. Changelog & Commit History
- **Stage E**: Handover documentation, Docker dev startup, CI workflows (`50b13e9`, `bf2c18d`, `5cabb90`).
- **Stage F (Complete)**: Full B2B Merchant Dashboard & B2C Customer Website Implementation with Cairo font, bilingual RTL/LTR layout, Context Switcher, and complete 22-screen backlog (`1a7fa51`). 100% green tests & production build.
- **Stage F.1 (CI & Test Resilience)**: Added `-p=1` to CI backend test runner to prevent concurrent package database contention and ensured self-contained offer MOQ and stock pre-conditions across all order test cases.
- **Track 1 (Migration 000013 & DEP-01 to DEP-10 Backend Implementation)**:
  - Applied Database Migration 000013 (`backend/db/migrations/000013_b2b_b2c_enhancements.up.sql`):
    - Added `order_type` and nullable `merchant_id` with `chk_orders_ownership` constraint on `commerce.orders`.
    - Added `b2b_enabled`, `b2c_enabled`, and `retail_price` on `catalog.supplier_offers`.
    - Added `customer` to `ledger.accounts` owner type check constraint.
    - Created `commerce.merchant_receiving_warehouses` for commercial delivery docks.
    - Created `commerce.customer_addresses` for retail address books.
    - Created `iam.kyc_documents` for corporate compliance documents.
    - Created `iam.team_invitations` with 48-hour secure tokens.
  - Implemented Go backend domains, repositories, and HTTP handlers across `auth`, `order`, and `wallet` modules.
  - Wired all 10 dependency routes into `backend/cmd/api/main.go`.
- **Track 2 (Production Readiness Hardening & MRO Client Business Verticalization)**:
  - Applied Database Migration 000014 (`backend/db/migrations/000014_invoicing_and_payments.up.sql`):
    - Added `client_secret` and `checkout_url` to `commerce.payments`.
    - Created `commerce.invoices` table for formal B2B Tax Invoices & B2C Simplified Tax Invoices.
  - **DEP-11 (Payment Gateway & Webhook Settlement Engine)**: Pluggable `PaymentGateway` interface with Stripe, Moyasar, and Mock implementations. Cryptographic HMAC SHA-256 signature verification. Atomic 2-phase settlement: confirms order, updates payment to `captured`, and posts balanced double-entry ledger entry (DR 1010, CR 2020, CR 4010, CR 4020). Automatic stock reservation release on payment failure.
  - **DEP-12 (Cloud Object Storage)**: S3-compatible presigned upload URL generator supporting Cloudflare R2, AWS S3, and MinIO. Enforces strict MIME whitelisting (JPG, PNG, WebP, PDF) and file size quotas (10MB images, 25MB PDFs). Private bucket partitioning for corporate KYC compliance documents.
  - **DEP-13 (B2B Tax Invoicing & Transactional Outbox Worker)**: ZATCA Phase 2 / regional VAT compliant Base64 TLV QR code encoder. Autonomous background worker continuously polling `platform.outbox_events` with `SELECT FOR UPDATE SKIP LOCKED` for asynchronous invoice generation.
  - **DEP-14 (MRO Industrial Supplies Client Business Verticalization)**: Seeded production-ready industrial catalog (`backend/db/seeds/mro_industrial_seed.sql`): 5 categories, 4 global certified brands (Bosch, Schneider, 3M, Makita), 3 verified suppliers with double-entry accounts, dual-channel pricing (wholesale volume tiers + retail prosumer pricing), physical stock in 3 regional logistics hubs, and commercial flatbed receiving docks with forklift specs.
  - **Production DevOps & Security Hardening**: Multi-stage minimal non-root Dockerfile for backend (`alpine:3.20`, `appuser`), production React SPA Nginx Dockerfile with gzip and security headers, `deploy/production-compose.yml` with isolated internal networks and healthchecks, `.env.production.example`, and production CORS origin whitelisting (`CORS_ALLOWED_ORIGINS`).
  - **Verification**: 40/40 tests passing (100% green) across all 8 Go modules (`auth`, `commission`, `invoice`, `order`, `payment`, `storage`, `wallet`, `worker`), clean `oxfmt` formatting, and Vite production bundle built in 1.4s.

