# Security Advisory: Compromised Legacy JWT Secret & Migration Notice

**Advisory ID:** SEC-2026-001  
**Severity:** CRITICAL (CVSS 9.8)  
**Date:** November 5, 2026  
**Status:** RESOLVED in Stage A (Security Hardening)  

---

## 1. Vulnerability Summary
Previous iterations of NEXUS Marketplace Core included a hardcoded fallback JWT secret embedded directly in source code:
`nexus-marketplace-jwt-secret-key-2026-production` (formerly located in `backend/internal/modules/auth/jwt.go`).

Additionally, the authentication handler previously contained backdoor bypass clauses allowing any existing account to be accessed using the static passwords `"password"` or `"admin123"`.

## 2. Security Impact
1. **Cryptographic Key Compromise:** Any tokens signed with the legacy secret `nexus-marketplace-jwt-secret-key-2026-production` must be treated as **completely compromised**. An attacker possessing this hardcoded key could forge arbitrary JWT claims, including granting themselves `platform_admin` or `super_admin` privileges.
2. **Authentication Bypass:** Any deployment running with the backdoor password check allowed trivial account takeover for all registered user emails.

## 3. Remediation Applied
1. **Hardcoded Secret Removed:** The static secret has been completely purged from Go source code.
2. **Fail-Fast Environment Validation:** The backend now requires `JWT_SECRET` to be provided via environment variables or a secure `.env` file, and validates that the secret is at least 32 characters in length. The server terminates immediately at startup (`log.Fatal`) if `JWT_SECRET` is absent or weak.
3. **Password Backdoor Removed:** Static password checks for `"password"` and `"admin123"` have been permanently deleted. Authentication strictly verifies bcrypt password hashes.
4. **Mandatory Token Revocation:** All legacy tokens signed with the old key are permanently rejected by the updated validation logic.

## 4. Operator Instructions
For all operators and forked environments:
1. Ensure your deployment environment defines a secure, randomly generated `JWT_SECRET` of at least 32 characters (e.g., `openssl rand -base64 32`).
2. Force all existing users to re-authenticate. Any existing tokens signed with the legacy key will immediately receive HTTP `401 Unauthorized`.
