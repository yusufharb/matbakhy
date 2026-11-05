# ADR 0001: Tenancy Model Architecture — Single-Tenant Deployment per Client Marketplace

## Status
**Accepted** (2026-11-05)

## Context
NEXUS Marketplace Core is designed as an enterprise white-label marketplace operating system. Different client companies and business verticals (e.g. B2B wholesale building materials, retail consumer electronics, hyperlocal FMCG grocery, industrial spare parts) will operate marketplaces powered by this engine.

When designing the core architecture, we evaluated two architectural paradigms:
1. **Option A: Multi-Tenant Mega-App (Shared Database & Codebase)**: A single running cluster where every database table contains a `tenant_id` column, and multiple distinct client marketplace operators share the same infrastructure and application instances.
2. **Option B: Single-Tenant per Client Marketplace (Multi-Vendor Inside)**: A forkable master core engine where each client marketplace is deployed as an independent, isolated stack (dedicated PostgreSQL database, dedicated API instances, and dedicated frontends). Inside each deployment, multi-vendor operations are natively supported (Platform Admin, $N$ Suppliers, $M$ Merchants).

## Decision
We have decided on **Option B: Single-Tenant per Client Marketplace (Multi-Vendor Inside)**.

Each customer marketplace operates its own isolated deployment and database instance. Upstream engine improvements, security patches, and performance optimizations are distributed from the central `marketplace-core` repository via versioned releases and Git upstream merges.

## Rationale & Benefits

1. **Strict Data & Regulatory Isolation**:
   - Marketplace operators handle sensitive commercial terms, negotiated wholesale supplier pricing, banking information, and double-entry financial ledgers.
   - Regional compliance standards (such as Saudi Arabia ZATCA e-invoicing Phase 2, UAE FTA, EU GDPR, and localized banking secrecy regulations) mandate data sovereignty and strict physical boundary isolation that are hazardous in shared multi-tenant databases.

2. **Elimination of Cross-Tenant Data Leaks**:
   - In shared multi-tenant systems, a single developer oversight or query missing `WHERE tenant_id = ?` can cause catastrophic enterprise security breaches. Single-tenancy guarantees that client data can never be leaked to competitors.

3. **Custom Business Extensibility Without Drift**:
   - Different verticals require custom pricing logic, specialized checkout flows, custom ERP integrations (SAP, Oracle, Odoo), and specialized custom fields.
   - Dedicated instances allow clients to apply client migrations (`db/migrations/client/`), custom plugin hooks, and vertical configurations (`client.config.yaml`) without polluting or breaking the shared master schema.

4. **Independent Scalability & Noisy-Neighbor Prevention**:
   - High-volume seasonal flash sales or heavy warehouse batch updates in one marketplace will never degrade the latency, throughput, or connection pool of another client.
   - Compute and database sizing can be tailored specifically to each marketplace's throughput requirements.

5. **Upstream Upgrade Path**:
   - The master repository (`marketplace-core`) serves as the upstream core.
   - Downstream client forks track `upstream/main`. Core database migrations (`000001` through `000012`+) remain identical, while client-specific extensions live in isolated overlays, ensuring smooth, conflict-free upgrades.

## Consequences & Mitigations
- **Operational Overhead**: Deploying multiple isolated stacks requires automated infrastructure orchestration.
  - *Mitigation*: Automated Docker Compose and containerized orchestration workflows provide one-command initialization for new client forks.
- **Migration Synchronization**: Upstream database schema changes must be applied across multiple client databases.
  - *Mitigation*: Versioned, reversible migration files with strict `.up.sql` and `.down.sql` parity make automated migration execution reliable across environments.
