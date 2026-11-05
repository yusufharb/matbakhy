# NEXUS Marketplace Core — Enhancement & Architectural Audit

**Document Version:** 1.0.0  
**Date:** November 5, 2026  
**Auditor:** Senior Staff Software Architect & Lead Systems Engineer  
**Classification:** Engineering Audit & Master Remediation Plan  
**Target Platform:** NEXUS Marketplace Core (Go 1.23+ Modular Monolith, React 19 + TypeScript, PostgreSQL 16)  

---

## 1. Executive Summary

This audit provides an evidence-based, code-verified technical inspection of **NEXUS Marketplace Core**. The platform is intended to serve as a **master white-label engine** capable of being forked or consumed across diverse client marketplace verticals (B2B wholesale, B2C multi-vendor, grocery/dark stores, and service marketplaces) with minimal code drift and safe upstream upgrade paths.

### Key Audit Verdict
The repository has established a solid baseline schema (PostgreSQL 16) and a functional end-to-end prototype:
- **Database:** Comprehensive multi-schema architecture (`iam`, `catalog`, `commerce`, `ledger`, `platform`, `inventory`, `fulfillment`) with 9 migrations.
- **Backend:** Go 1.23 modular monolith with basic domain routing, transaction-wrapped checkout, and double-entry ledger triggers.
- **Frontend:** High-fidelity React 19 UI with full Arabic RTL support (Cairo font) and English LTR, covering Super Admin, Supplier Portal, and Merchant Storefront.

However, the codebase currently suffers from **critical architectural, financial, and security vulnerabilities** that prevent it from being safe for production or multi-client white-label distribution. Most notably:
1. **Broken Auth & Authorization Bypass (P0):** Zero endpoints enforce authentication or role-based access control; hardcoded JWT secrets and demo password backdoors exist in production paths.
2. **Financial Ledger Inaccuracies (P0):** Wallet payments incorrectly debit external gateway clearing instead of merchant wallet liability; hardcoded currencies ('USD') exist in SQL queries; server-generated pseudo-idempotency defeats client retry safety; payout requests do not check or hold available balances.
3. **Ghost Infrastructure (P0):** NATS JetStream, Valkey/Redis, and MinIO are claimed in documentation and Docker Compose, but zero Go code imports or utilizes them. Outbox and audit log tables exist in SQL, but zero events are written or processed.
4. **Stock Overselling Vulnerability (P1):** Stock reservation uses blind database increments without checking `on_hand - reserved`, lacks pessimistic row locking, and discards SQL execution errors.
5. **Ledger Trigger Contention & Missing Cryptographic Chain (P1):** The deferred ledger trigger fires `FOR EACH ROW`, running repeated `O(N)` queries per transaction; the claimed SHA-256 cryptographic hash chain on journal entries does not exist in the database schema.
6. **Forking Drift & Monolithic Structure (P2):** Forking currently clones the entire repository via full file copying and appends SQL to seed files, guaranteeing merge conflicts on upstream updates; frontend code is packed into a single 4,012-line `App.tsx` file in a directory containing spaces (`Marketplace Admin Dashboard`).

---

## 2. Verified Inventory: What Actually Exists

The following assets have been inspected and verified directly in the repository code:

### 2.1 Database Migrations & Schemas
Located in `backend/db/migrations/`:
- **`000001_iam_schema.up.sql`**: Tables for `iam.users`, `iam.organizations`, `iam.org_memberships`, `iam.roles`, `iam.permissions`, `iam.role_permissions`.
- **`000002_catalog_schema.up.sql`**: Tables for `catalog.categories`, `catalog.brands`, `catalog.products`, `catalog.supplier_offers`.
- **`000003_commerce_schema.up.sql`**: Tables for `commerce.orders`, `commerce.suborders`, `commerce.order_items`, `commerce.payments`.
- **`000004_ledger_schema.up.sql`**: Tables for `ledger.accounts`, `ledger.journal_entries`, `ledger.lines`, `ledger.payout_requests`.
- **`000005_platform_schema.up.sql`**: Tables for `platform.commission_rules`, `platform.configurations`, `platform.outbox_events`, `platform.audit_logs`.
- **`000006_inventory_schema.up.sql`**: Tables for `inventory.warehouses`, `inventory.warehouse_stock`, `inventory.stock_movements`.
- **`000007_fulfillment_schema.up.sql`**: Tables for `fulfillment.shipments`, `fulfillment.tracking_events`, `commerce.disputes`, `commerce.dispute_evidence`, `commerce.returns`.
- **`000008_auth_cart_cms_schema.up.sql`**: Tables for `iam.refresh_tokens`, `iam.otp_verifications`, `commerce.cart_items`, `platform.cms_sections`.
- **`000009_ledger_trigger.up.sql`**: Function `ledger.fn_check_journal_entry_balance()` and deferred constraint trigger `trg_enforce_ledger_balance` on `ledger.lines`.

### 2.2 Go Backend Modules
Located in `backend/internal/modules/`:
- **`auth`**: Login, registration, JWT generation, password hashing (`bcrypt`), and supplier approval status updates.
- **`catalog`**: Product listing, product detail, offer listing by product and supplier, offer upsert.
- **`commission`**: Rule listing, hierarchical commission calculation (supplier custom agreement -> category override -> global platform default).
- **`config`**: Feature flags retrieval, CMS section retrieval and update, audit log retrieval.
- **`inventory`**: Warehouse listing, stock balance listing, stock adjustment (`inventory.stock_movements`).
- **`offer`**: Domain models and repository stubs for multi-supplier pricing.
- **`order`**: Multi-supplier checkout with MOQ and tier pricing, parent order + suborder splitting, payment recording, and double-entry ledger lines posting.
- **`wallet`**: Ledger accounts retrieval, journal entries retrieval with in-memory balance validation, manual journal entry posting, supplier wallet summary calculation, payout requests.
- **`common`**: Database connection pool setup (`pgxpool.Pool`).

### 2.3 Automated Tests
Located in `backend/internal/modules/`:
- `commission/commission_test.go`: `TestCommissionPrecedenceResolution` (PASS)
- `order/checkout_test.go`: `TestCheckoutMOQValidation`, `TestSuccessfulCheckoutAndSplitting` (PASS against PostgreSQL 16)
- `wallet/wallet_test.go`: `TestJournalEntryValidation`, `TestDatabaseLedgerTriggerEnforcement` (PASS against PostgreSQL 16)

### 2.4 Frontend Portals
Located in `Marketplace Admin Dashboard/`:
- **Super Admin Portal**: Metrics overview, supplier moderation & KYC approval, global catalog management, commission rules engine, platform configuration/feature flags, CMS editor, financial ledger viewer, audit logs.
- **Supplier Portal**: Revenue overview, inventory & stock management, multi-warehouse view, catalog offers & price tiers, suborder fulfillment workflow, wallet balances & payout requests.
- **Merchant Storefront**: B2B wholesale / B2C storefront, search & category filtering, product detail with multi-supplier offer comparison, tiered pricing selector, MOQ validation, cart management, checkout modal with balance/card selection.
- **Shared Infrastructure**: Cairo font integration, full RTL/LTR bidirectional support, light/dark theme tokens, portal switcher widget.

---

## 3. What is Mocked, Stubbed, or Broken

### 3.1 Authentication & Authorization Bypass (P0)
- **Location:** `backend/cmd/api/main.go:149`, `backend/internal/modules/auth/jwt.go:78-101`, `backend/internal/modules/auth/handler.go:29-33, 139-163`
- **Issue:**
  1. `auth.AuthMiddleware` only parses the `Authorization` header if present; if missing or invalid, it simply calls `next.ServeHTTP(w, r)`. No route-level protection (`RequireAuth`, `RequireRole`, `RequirePermission`) is applied to any route in `main.go`.
  2. Anyone can call administrative and supplier mutation endpoints without a token:
     - `POST /api/v1/admin/suppliers/{id}/approve`
     - `POST /api/v1/admin/suppliers/{id}/reject`
     - `POST /api/v1/inventory/adjust`
     - `POST /api/v1/ledger/entries`
     - `POST /api/v1/supplier/payouts`
  3. Hardcoded JWT secret key in `jwt.go:15`:
     ```go
     var jwtSecret = []byte("nexus-marketplace-jwt-secret-key-2026-production")
     ```
  4. Hardcoded password backdoor in `auth/handler.go:30`:
     ```go
     if !CheckPasswordHash(req.Password, user.PasswordHash) && req.Password != "password" && req.Password != "admin123" {
     ```
     Any account can be breached if the attacker enters `"password"` or `"admin123"`.
  5. Multi-tenant data leakage: `ListSupplierSuborders` and `GetSupplierWallet` fall back to arbitrary query parameters (`?supplier_id=...`) or hardcoded UUIDs without checking if the calling token has access to that organization.

### 3.2 Financial & Accounting Integrity Flaws (P0)
- **Location:** `backend/internal/modules/order/repository.go:208-360`, `backend/internal/modules/wallet/repository.go:250-266`
- **Issue:**
  1. **Incorrect Liability Debit on Wallet Checkout:** In `order/repository.go:316-328`, the checkout process always debits **Account 1010 (Gateway Clearing - Asset)** for the entire order grand total, regardless of whether `payment_method` is `"card"` or `"wallet"`. When a merchant pays via wallet, **Account 2010 (Merchant Wallet Deposit - Liability)** should be debited. The current code leaves the merchant wallet balance unchanged while posting fictitious asset claims to external clearing!
  2. **Pseudo-Idempotency Key:** In `order/repository.go:294, 311`, the idempotency keys are generated on the server:
     ```go
     "idem-" + orderNumber
     ```
     Because `orderNumber` includes a timestamp (`time.Now().Unix()%10000`), every network retry by the client generates a *different* key, bypassing the database unique constraint and creating duplicate orders, duplicate payments, and duplicate ledger entries.
  3. **Hardcoded Currency:** In `order/repository.go:211, 222, 293, 310` and `wallet/repository.go:255`, `'USD'` is hardcoded as an immutable SQL string. The client cannot configure SAR, EGP, AED, or EUR without modifying core Go code.
  4. **Unchecked Payout Creation:** In `wallet/repository.go:250-266`, `CreatePayoutRequest` inserts a row into `ledger.payout_requests` without:
     - Verifying if the supplier's Account 2030 (Available Payable) has sufficient funds.
     - Creating a hold or debiting Account 2030 into a pending payout escrow account. A supplier with a $0 balance can spam payout requests for millions.
  5. **Floating-Point Arithmetic for Commission:** In `commission/calculator.go:8` and `order/repository.go:197`:
     ```go
     g.CommissionAmt = int64(float64(g.Subtotal) * g.CommissionRate)
     ```
     Using IEEE-754 `float64` for take rates introduces rounding discrepancies. Commission rates should be calculated using fixed basis points (e.g., `(subtotal * rate_bps) / 10000`) or database `NUMERIC`.

### 3.3 Stock Overselling & Concurrency Vulnerability (P1)
- **Location:** `backend/internal/modules/order/repository.go:157-161`
- **Issue:**
  ```go
  // Reserve stock in warehouse
  _, _ = tx.Exec(ctx, `
      UPDATE inventory.warehouse_stock
      SET reserved = reserved + $1, updated_at = NOW()
      WHERE offer_id = $2
  `, item.Quantity, offID)
  ```
  1. The execution error is explicitly discarded with `_, _ = tx.Exec(...)`.
  2. The SQL statement does not check `WHERE (on_hand - reserved) >= $1`.
  3. No row lock (`SELECT ... FOR UPDATE`) is acquired on the stock row. Under concurrent load, multiple checkouts will oversell inventory, driving available stock into negative numbers without failing the transaction.

### 3.4 Ledger Trigger Performance & Missing Cryptographic Chain (P1)
- **Location:** `backend/db/migrations/000009_ledger_trigger.up.sql:32-38`, `000004_ledger_schema.up.sql:25-37`
- **Issue:**
  1. The constraint trigger `trg_enforce_ledger_balance` is defined `FOR EACH ROW`. When a transaction inserts 6 ledger lines (debit clearing, credit 3 suppliers, credit platform, credit shipping), the trigger fires 6 separate times, each time re-aggregating `SELECT SUM(...) FROM ledger.lines WHERE journal_entry_id = ...`. This causes severe database lock contention and serialization bottlenecks during peak checkout.
  2. The README and UI claim an "Immutable Security & Operational Audit Log with SHA-256 hash chains (0x8f24…)". In reality:
     - `ledger.journal_entries` has no `prev_hash` or `hash` columns.
     - There is no trigger or backend hashing function computing cryptographic hashes for ledger entries or audit logs.

### 3.5 Ghost Infrastructure Claims (P0)
- **Location:** `backend/go.mod`, `deploy/docker-compose.yml`, `README.md`
- **Issue:**
  1. **Redis / Valkey:** Claimed for distributed caching, session management, and rate limiting. `backend/go.mod` has **zero** Redis dependencies (`go-redis` is absent). No Go code connects to Valkey.
  2. **NATS JetStream:** Claimed as the asynchronous event bus. `backend/go.mod` has **zero** NATS dependencies (`nats.go` is absent). No Go code connects to NATS.
  3. **MinIO / S3:** Claimed for document/KYC storage and dispute evidence. No S3 SDK (`aws-sdk-go-v2` or `minio-go`) exists in `go.mod`.
  4. **Outbox Pattern:** `platform.outbox_events` is defined in migration 000005, but `ProcessCheckout` and `ApproveSupplier` do not insert any outbox events. There is no outbox worker process or relay.

### 3.6 Missing Domain Modules (P1)
- **Location:** `backend/internal/modules/`
- **Issue:** The database migration `000007_fulfillment_schema.up.sql` created schemas for:
  - `fulfillment.shipments`
  - `fulfillment.tracking_events`
  - `commerce.disputes`
  - `commerce.dispute_evidence`
  - `commerce.returns`
  However, **zero Go handlers, repositories, or HTTP routes exist** for any of these entities. A supplier cannot create a shipment or tracking update; a buyer cannot file a dispute or return; an admin cannot adjudicate claims.

### 3.7 Monolithic Frontend Architecture & SEO Defect (P2)
- **Location:** `Marketplace Admin Dashboard/src/App.tsx`, `Marketplace Admin Dashboard/src/services/api.ts`
- **Issue:**
  1. The entire multi-portal application is crammed into a single 4,012-line `App.tsx` file.
  2. All three portals (Super Admin, Supplier, Merchant Storefront) are bundled together as a single Client-Side Rendered (CSR) Vite SPA. The merchant storefront requires Server-Side Rendering (SSR) or pre-rendering for SEO, social sharing, and search indexing.
  3. The directory name contains spaces (`"Marketplace Admin Dashboard"`), breaking typical POSIX CLI scripts, Docker paths, and CI/CD actions unless escaped.
  4. The frontend API client (`api.ts`) sends requests without attaching `Authorization: Bearer <token>` headers, relying on the backend's lack of authentication to function.

### 3.8 Flawed Forking Strategy (P2)
- **Location:** `scripts/create-fork.mjs`, `FORKING_GUIDE.md`
- **Issue:**
  1. `create-fork.mjs` performs a full directory copy of the entire codebase (`fs.cpSync(coreRoot, resolvedOutput)`). Any client deploying this fork is immediately decoupled from the core, making future security patches and core enhancements an upstream git merge nightmare.
  2. It modifies seed data by directly appending SQL text to `backend/db/seeds/seed_data.sql`, rather than utilizing a clean configuration overlay (`client.config.yaml`) and dedicated client migrations (`db/migrations/client/`).
  3. There is no input validation, no smoke test execution after forking, and no automated CI check preventing client forks from modifying protected core files.

---

## 4. Prioritized Risk Backlog (P0 / P1 / P2)

| Risk ID | Severity | Category | Description | Affected Locations | Remediation Phase |
|---|---|---|---|---|---|
| **R-01** | **P0** | **Security** | Zero authentication or RBAC enforced on mutating API routes (supplier approval, stock adjustments, ledger postings). | `backend/cmd/api/main.go`, `internal/modules/auth/` | Phase 9 |
| **R-02** | **P0** | **Security** | Hardcoded JWT signing secret in source code; hardcoded `"password"` / `"admin123"` authentication backdoors. | `internal/modules/auth/jwt.go:15`, `internal/modules/auth/handler.go:30` | Phase 9 |
| **R-03** | **P0** | **Financial** | Checkout with `"wallet"` payment method debits external clearing (1010) instead of merchant wallet liability (2010), creating balance distortion. | `internal/modules/order/repository.go:316-330` | Phase 4 |
| **R-04** | **P0** | **Financial** | Server-generated pseudo-idempotency key defeats client retry safety; network retries cause duplicate orders, payments, and ledger entries. | `internal/modules/order/repository.go:294, 311` | Phase 4 |
| **R-05** | **P0** | **Financial** | Hardcoded `'USD'` across all SQL checkout queries, preventing multi-currency operations (SAR, EGP, AED, EUR). | `internal/modules/order/repository.go:211, 222, 293, 310` | Phase 4 |
| **R-06** | **P0** | **Financial** | Payout requests do not verify supplier balance or hold funds in escrow; allows fraudulent withdrawals beyond account limits. | `internal/modules/wallet/repository.go:250-266` | Phase 4 |
| **R-07** | **P0** | **Architecture** | "Ghost" infrastructure claims: Zero Go code or imports for Redis, NATS JetStream, or MinIO; zero events written to outbox table. | `backend/go.mod`, `deploy/docker-compose.yml`, `modules/order` | Phase 6, 11 |
| **R-08** | **P1** | **Concurrency** | Stock reservation in checkout lacks row locking (`FOR UPDATE`), does not check available stock, and ignores SQL errors, allowing overselling. | `internal/modules/order/repository.go:157-161` | Phase 4, 6 |
| **R-09** | **P1** | **Performance** | `trg_enforce_ledger_balance` trigger fires `FOR EACH ROW`, running repeated `O(N)` queries per transaction, causing database lock contention. | `backend/db/migrations/000009_ledger_trigger.up.sql` | Phase 4 |
| **R-10** | **P1** | **Security / Compliance** | Cryptographic hash chain on `ledger.journal_entries` and `platform.audit_logs` does not exist in the database schema despite claims. | `backend/db/migrations/000004_ledger_schema.up.sql` | Phase 4, 9 |
| **R-11** | **P1** | **Domain Completeness** | Missing Go backend handlers and APIs for shipments, shipment tracking, disputes, returns, and refunds. | `backend/internal/modules/`, `backend/cmd/api/main.go` | Phase 5 |
| **R-12** | **P2** | **Architecture** | Forking copies entire repository instead of using a `client.config.yaml` overlay and separate `db/migrations/client/` versioning. | `scripts/create-fork.mjs` | Phase 1, 2 |
| **R-13** | **P2** | **Frontend** | 4,012-line `App.tsx` monolith; single CSR bundle combines Admin, Supplier, and Storefront; spaces in directory name (`"Marketplace Admin Dashboard"`). | `Marketplace Admin Dashboard/src/App.tsx` | Phase 8 |
| **R-14** | **P2** | **Developer Experience** | Missing OpenAPI 3.0 specification, missing Go lint configuration, missing client SDK generation. | `backend/`, `docs/` | Phase 7, 10 |

---

## 5. Detailed 20-Module Feature Status Matrix

| Module | Schema / Migrations | Backend API | Frontend Portal | Conformance Tests | Maturity Status |
|---|---|---|---|---|---|
| **1. Auth & IAM** | Implemented (`000001`, `000008`) | Partial (No RBAC, backdoors) | Implemented (Modal & Profile) | Missing | ⚠️ 40% (Security Risk) |
| **2. Organizations & KYC** | Implemented (`000001`) | Partial (No KYC doc uploads) | Implemented (Admin moderation) | Missing | ⚠️ 50% |
| **3. RBAC & Permissions** | Implemented (`000001`) | Not Implemented (No checks) | Mocked in UI | Missing | ❌ 20% |
| **4. Product Catalog** | Implemented (`000002`) | Implemented (`catalog` module) | Implemented (Admin & Storefront) | Missing | 🟢 80% |
| **5. Multi-Supplier Offers**| Implemented (`000002`) | Implemented (`offer`, `catalog`) | Implemented (Offer cards & tabs)| Missing | 🟢 85% |
| **6. Multi-Warehouse Stock** | Implemented (`000006`) | Partial (Adjustments open) | Implemented (Supplier view) | Missing | ⚠️ 60% |
| **7. Search & Discovery** | Implemented (Postgres SQL) | Basic SQL (`ILIKE`) | Implemented (Search input) | Missing | ⚠️ 45% (No Meili) |
| **8. Cart & MOQ Validation**| Implemented (`000008`) | Implemented in checkout | Implemented (Storefront drawer) | Passing (`checkout_test.go`)| 🟢 90% |
| **9. Multi-Supplier Checkout**| Implemented (`000003`) | Implemented (Suborder splits) | Implemented (Checkout modal) | Passing (`checkout_test.go`)| ⚠️ 70% (Currency/Oversell) |
| **10. Payment Processing** | Implemented (`000003`) | Mock / Stored in DB | Implemented in UI | Missing | ⚠️ 50% (No Gateway abstraction)|
| **11. Double-Entry Ledger** | Implemented (`000004`, `000009`)| Implemented (Trigger enforced)| Implemented (Audit table) | Passing (`wallet_test.go`) | ⚠️ 75% (Wallet bug & contention)|
| **12. Commission Engine** | Implemented (`000005`) | Implemented (Priority resolver)| Implemented (Admin rules table) | Passing (`commission_test.go`)| 🟢 85% (Float64 precision) |
| **13. Wallet & Payouts** | Implemented (`000004`) | Partial (No balance lock) | Implemented (Supplier wallet) | Missing | ⚠️ 55% |
| **14. Shipping & Fulfillment**| Implemented (`000007`) | Not Implemented | Mocked in Supplier Portal | Missing | ❌ 25% |
| **15. Disputes & Refunds** | Implemented (`000007`) | Not Implemented | Mocked in Admin Portal | Missing | ❌ 25% |
| **16. Promotions & Coupons** | Missing | Not Implemented | Not Implemented | Missing | ❌ 0% |
| **17. Notifications Engine** | Schema stub (`000008`) | Not Implemented | Mock toasts in UI | Missing | ❌ 20% |
| **18. CMS & Content** | Implemented (`000008`) | Implemented (`config` module) | Implemented (Admin banner editor) | Missing | 🟢 75% |
| **19. Reviews & Ratings** | Schema stub (`000002`) | Not Implemented | Mock display in Storefront | Missing | ❌ 20% |
| **20. Platform Config & Outbox**| Implemented (`000005`) | Config OK, Outbox Missing | Implemented (Admin toggles) | Missing | ⚠️ 50% |

---

## 6. Financial Precision & Integrity Audit

A strict financial rule of NEXUS Core is: **Keep all money as integer minor units (or NUMERIC) with an explicit currency. Never use floats for money.**

### Findings:
1. **Database Schema:** Compliant. All tables (`commerce.orders`, `commerce.suborders`, `commerce.order_items`, `commerce.payments`, `ledger.lines`, `ledger.payout_requests`) declare monetary amounts as `BIGINT` (minor units, e.g. cents/halalas) or `NUMERIC(15,2)`.
2. **Go Domain Models:** Mostly compliant. `SubtotalCents`, `ShippingCents`, `GrandTotalCents`, `Amount` are typed as `int64`.
3. **Violations Detected:**
   - **`internal/modules/commission/calculator.go:8`**: `RatePercent` is declared as `float64`.
   - **`internal/modules/order/repository.go:197`**: Commission amount is computed using floating-point multiplication:
     ```go
     g.CommissionAmt = int64(float64(g.Subtotal) * g.CommissionRate)
     ```
     *Fix:* Convert commission calculation to basis points integer arithmetic (`int64(g.Subtotal * rateBps / 10000)`) or PostgreSQL exact `NUMERIC` math.
   - **Hardcoded Currency:** Multiple database queries explicitly insert `'USD'`, ignoring the marketplace base currency configuration.

---

## 7. Tenancy & Fork Strategy Evaluation

### Current State:
- The repository currently blends two incompatible concepts:
  - Documentation describes a multi-tenant marketplace platform.
  - Scripts execute a full-clone fork per client (`scripts/create-fork.mjs`).
- If a client forks the repo today by copying files, any upstream core fixes (e.g., fixing the auth bypass or ledger wallet bug) cannot be cleanly merged because client customizations are mingled with core engine code.

### Required Architecture (Phase 1 & 2):
1. **Core vs. Client Overlay Architecture:**
   - **Core Engine:** Consumable Go module (`github.com/marketplace/core`) and shared npm packages (`@nexus/ui`, `@nexus/api-client`).
   - **Client Overlay:** Stored exclusively in a dedicated client layer:
     - `client.config.yaml` (branding, currency, locale, feature flags, tax rules, commission defaults).
     - `theme/` (client Tailwind tokens, CSS variables, logo assets).
     - `i18n/` (custom string overrides).
     - `db/migrations/client/` (client-specific tables and schema additions, tracked with a separate migration version table `client_schema_migrations`).
2. **Database Extension Points:**
   - Add `custom JSONB DEFAULT '{}'` columns to key core tables (`catalog.products`, `catalog.supplier_offers`, `commerce.orders`, `iam.organizations`, `iam.users`). This allows clients to attach custom vertical-specific metadata without modifying core table structures.
3. **Protected Core Enforcement:**
   - Provide `.github/CODEOWNERS` and a GitHub Actions workflow that fails any PR modifying core files (`backend/internal/core/`, `packages/ui/`) within a client deployment.
4. **Automated Smoke Testing for Forks:**
   - Rewrite `create-fork` to generate `client.config.yaml`, run database schema migration checks, and perform an end-to-end smoke test validating that the client overlay runs cleanly against the core engine.

---

## 8. Master Remediation Roadmap (Phases 1 through 12)

The 12-phase execution roadmap directly maps to the risks identified in this audit:

- **Phase 1: Core vs. Client Architecture (Fork Strategy)**
  - Implement client overlay pattern (`client.config.yaml`, client migrations, `custom JSONB` columns).
  - Write ADR on Tenancy Model (`docs/adr/0001-tenancy-model.md`).
  - Re-engineer `create-fork` scripts with input validation and smoke test.
- **Phase 2: Config Over Code (Dynamic White-Labeling)**
  - Centralize runtime configuration into a unified typed Go config and frontend context.
- **Phase 3: Database & Migration Hardening**
  - Implement bidirectional `.down.sql` migrations.
  - Separate client migrations table.
- **Phase 4: Financial Integrity & Ledger Hardening**
  - Fix wallet payment liability debit (Account 2010).
  - Enforce client-provided `Idempotency-Key` headers.
  - Optimize deferred trigger `trg_enforce_ledger_balance` to eliminate row-level contention.
  - Implement cryptographic hash chaining (`prev_hash` + `hash`) on journal entries.
  - Add balance hold verification to payout requests.
  - Eliminate all floating-point math in commission calculations.
- **Phase 5: Missing Domain Modules**
  - Implement Go handlers and repositories for Shipments, Tracking, Disputes, Returns, and Refunds.
- **Phase 6: Data Consistency & Event Bus**
  - Integrate NATS JetStream and implement the transactional outbox worker.
  - Implement pessimistic row locking (`FOR UPDATE`) and available stock validation on checkouts.
- **Phase 7: API Quality & OpenAPI 3.0**
  - Generate comprehensive OpenAPI 3.0 specification; standardize error responses (RFC 7807).
- **Phase 8: Frontend Monorepo & Architecture**
  - Decompose 4,012-line `App.tsx` into modular components and portal packages.
  - Standardize API client with automatic JWT token attachment and error interception.
- **Phase 9: Security & Compliance**
  - Enforce RBAC middleware across all mutating endpoints.
  - Remove hardcoded secrets and password backdoors; implement secure environment secret loading.
- **Phase 10: Testing & Conformance Suite**
  - Implement end-to-end integration tests for multi-supplier checkout, ledger balance, and dispute workflows.
- **Phase 11: DevOps & Observability**
  - Containerize Go API and frontend; wire up Prometheus metrics and structured JSON logging.
- **Phase 12: Documentation & Developer Portal**
  - Finalize operator manual, architecture decision records, and API references.
