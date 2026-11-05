# Contributing to NEXUS Marketplace Core

Thank you for contributing to **NEXUS Marketplace Core**. This repository is the master white-label engine for our multi-vendor marketplace platform deployments. Because this codebase serves as upstream core for multiple business forks, strict architectural and engineering discipline is required.

---

## 1. Core Engineering Rules & Invariants

All developers working on this repository MUST uphold the following invariants:

### 1.1 Never Break Main / Feature Branching
- **Never push directly to `main`**. All work must be conducted on feature or bugfix branches (`feature/<description>`, `fix/<description>`).
- Submit changes via Pull Requests using the standard [PR Template](.github/PULL_REQUEST_TEMPLATE.md).

### 1.2 Test-Driven Development (TDD)
- **Write a failing test FIRST**. For every bug fix or feature, write a regression test that fails before implementing the solution.
- Never weaken, disable, or delete existing tests to make a build pass.

### 1.3 Strict Financial Invariants
- **NEVER use floats for money**. All monetary amounts MUST be integer minor units (`int64` in Go, `BIGINT` in SQL, e.g. cents/halalas) with an explicit ISO 4217 currency code (`USD`, `SAR`, etc.).
- **Double-Entry Ledger Integrity**: Every financial transaction must be recorded in `ledger.journal_entries` and `ledger.lines` such that:
  $$\sum \text{Debits} = \sum \text{Credits}$$
  Database constraint triggers will abort any unbalanced transaction at commit time.
- **Cryptographic Hash Chain**: Every journal entry header is cryptographically linked to the previous entry using SHA-256 (`sequence_id` order). Transactions MUST acquire `pg_advisory_xact_lock(742910)` before reading the chain tip.
- **Idempotency**: All money-moving endpoints (`/checkout`, `/supplier/payouts`, `/ledger/entries`) MUST require the `Idempotency-Key` header with SHA-256 payload conflict detection.

### 1.4 Security & Multi-Vendor Tenancy
- **Object-Level Authorization**: Always derive organization identity (`org_id`) from the verified JWT claims. Never trust client-supplied query parameters (e.g. `?supplier_id=...`).
- **No Hardcoded Secrets**: Secrets must be loaded via environment variables and checked at startup with fail-fast validation (JWT secrets $\ge 32$ characters).

---

## 2. Local Development Setup

### Prerequisites
- **Go**: 1.22+
- **PostgreSQL**: 16
- **Node.js**: 20+ (npm 10+)
- **Git**: 2.40+

### Step-by-Step Setup
1. **Clone the repository**:
   ```bash
   git clone <repo-url> marketplace-core
   cd marketplace-core
   ```

2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

3. **Start PostgreSQL & Apply Migrations**:
   ```bash
   createdb -U postgres marketplace_core
   for f in backend/db/migrations/*.up.sql; do psql -U postgres -d marketplace_core -f "$f"; done
   psql -U postgres -d marketplace_core -f backend/db/seeds/system_seed.sql
   psql -U postgres -d marketplace_core -f backend/db/seeds/demo_seed.sql
   ```

4. **Run Backend Tests**:
   ```bash
   cd backend
   go test -v -race -count=1 ./...
   ```

5. **Start Development Servers**:
   - Backend API:
     ```bash
     cd backend
     go run ./cmd/api
     ```
   - Frontend SPA (Port 5173):
     ```bash
     cd frontend
     npm install
     npm run dev
     ```

---

## 3. Database Migrations

- Migrations live in `backend/db/migrations/` using numerical prefixes (`000001_...`).
- **Every `.up.sql` file MUST have a corresponding `.down.sql` rollback migration**.
- Schema names are strictly organized:
  - `iam`: Users, organizations, roles, permissions, auth sessions.
  - `catalog`: Categories, brands, products, product variants, supplier offers.
  - `commerce`: Orders, suborders, order items, payments, cart sessions.
  - `ledger`: Accounts, journal entries, ledger lines, payout requests.
  - `inventory`: Warehouses, warehouse stock, stock reservations.
  - `platform`: Configurations, commission rules, CMS sections, audit logs.

---

## 4. Frontend Conventions

- Frontend is located in `frontend/` (React 19 + TypeScript + Vite).
- Typography strictly uses Google Font **Cairo** for seamless Arabic (RTL) and English (LTR) bidirectional rendering.
- Linting and formatting are enforced via **oxfmt**:
  ```bash
  cd frontend
  npm run lint    # Check formatting
  npm run format  # Format codebase
  npm run build   # Verify production bundle
  ```

---

## 5. Submitting Pull Requests

1. Create a branch: `git checkout -b feature/your-feature-name`
2. Run backend tests: `cd backend && go test -v -race -count=1 ./...`
3. Run frontend verification: `cd frontend && npm run lint && npm run build`
4. Run live API verification scripts:
   ```bash
   node scripts/test-stage-a.mjs
   node scripts/test-stage-a1.mjs
   node scripts/test-stage-b.mjs
   node scripts/test-stage-c.mjs
   ```
5. Commit with descriptive semantic messages (`feat: ...`, `fix: ...`, `docs: ...`).
6. Push and open a Pull Request using the PR template.
