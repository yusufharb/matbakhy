## Summary of Changes
<!-- Provide a concise description of the feature, fix, or enhancement -->

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 🛡️ Security hardening (RBAC, auth, or input validation)
- [ ] 💰 Financial / Ledger enhancement
- [ ] 🏗️ Architecture / Database migration
- [ ] 📝 Documentation update

## Engineering Invariants Checklist
Before submitting this PR, verify the following core platform invariants:
- [ ] **Failing Regression Test First:** A failing test was written demonstrating the issue before the fix was implemented.
- [ ] **No Floats for Money:** All financial calculations use integer minor units (`int64`, `BIGINT`, or `NUMERIC`) with an explicit currency code. Zero floating-point arithmetic.
- [ ] **Double-Entry Balance:** Any ledger movement satisfies $\sum \text{Debits} = \sum \text{Credits}$ within the same transaction and links to the cryptographic hash chain.
- [ ] **Idempotency Keys:** Money-moving endpoints require and enforce the `Idempotency-Key` header with SHA-256 payload verification.
- [ ] **Object-Level Authorization:** Users/merchants/suppliers cannot access, modify, or view entities belonging to other organizations.
- [ ] **No Hardcoded Secrets:** No secrets, test tokens, or credentials are committed to version control.
- [ ] **Reversible Migrations:** Any new `.up.sql` migration is accompanied by a matching `.down.sql` rollback migration.

## Testing & Verification
- [ ] Backend test suite passes: `cd backend && go test -v -race -count=1 ./...`
- [ ] Frontend builds cleanly: `cd frontend && npm run build`
- [ ] Frontend linter passes: `cd frontend && npm run lint`
- [ ] Live verification scripts pass: `node scripts/test-stage-a.mjs`, `b.mjs`, `c.mjs`

## Related Issues / Tickets
<!-- e.g. Fixes #123, Closes #456 -->
