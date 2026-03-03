# CampusBarter — Security Documentation
## OWASP Top 10 Coverage

This document maps each OWASP Top 10 risk to how CampusBarter addresses it.

---

### A01 — Broken Access Control
**Risk:** Users accessing data they shouldn't.
**How we address it:**
- RBAC middleware (`requireRole`) enforces Student / Moderator / Admin roles on every route
- `closeListing()` and `deleteListing()` in `db.ts` include `WHERE userId = @userId` — a user can only modify their own data
- Email stripped from other users' profiles in `GET /api/users/:id`
- Azure AD token required on every `/api/*` route

---

### A02 — Cryptographic Failures
**Risk:** Sensitive data exposed in transit or at rest.
**How we address it:**
- **HTTPS only** enforced on Azure App Service (TLS 1.2+ minimum)
- Azure SQL Database encrypts data at rest by default (Transparent Data Encryption)
- No secrets in code or `.env` files — all stored in **Azure Key Vault**
- `minimalTlsVersion: "1.2"` set on SQL Server ARM template

---

### A03 — Injection (SQL Injection)
**Risk:** Malicious SQL code injected via user input.
**How we address it:**
- **100% parameterized queries** in `backend/src/db.ts` — no string concatenation ever
- Every user input uses `sql.NVarChar()`, `sql.Int()` typed parameters via `mssql` library
- Input length validation at route level before hitting the database

```typescript
// Example from db.ts — safe parameterized query
await db.request()
    .input('title', sql.NVarChar(200), data.title.trim())
    .query('INSERT INTO Listings (title) VALUES (@title)');
```

---

### A04 — Insecure Design
**Risk:** No security built into the architecture.
**How we address it:**
- Security-first design: Key Vault, Managed Identity, No public DB access
- Audit log records every action for accountability
- SAIT email domain check built into auth middleware (only @sait.ca / @edu.sait.ca)

---

### A05 — Security Misconfiguration
**Risk:** Default settings leaving the system open.
**How we address it:**
- Azure SQL firewall blocks all public internet access
- Blob Storage containers set to **Private** (no anonymous access)
- Helmet.js sets 11 secure HTTP response headers automatically
- CORS restricted to known app origins only

---

### A06 — Vulnerable and Outdated Components
**Risk:** Known vulnerabilities in dependencies.
**How we address it:**
- **Dependabot** automatically scans npm/GitHub Actions weekly
- CI/CD pipeline runs `npm audit --audit-level=critical` on every push
- Alerts visible in GitHub Security tab

---

### A07 — Identification and Authentication Failures
**Risk:** Weak login, broken session management.
**How we address it:**
- Authentication delegated entirely to **Azure AD (Microsoft Entra ID)** — no home-grown auth
- JWT tokens verified using Azure AD public keys (JWKS endpoint)
- SAIT institutional email required — no personal emails
- Token expiry handled by Azure AD (1-hour access tokens)

---

### A08 — Software and Data Integrity Failures
**Risk:** Unverified code or updates.
**How we address it:**
- All code changes go through the **CI/CD pipeline** (Security Scan → Lint → TypeScript Build)
- Branch protection on `main` requires passing checks before merge
- Dependabot PRs reviewed before merging

---

### A09 — Security Logging and Monitoring Failures
**Risk:** Attacks go undetected because nothing is logged.
**How we address it:**
- **AuditLog table** records every API request (userId, action, IP, timestamp)
- **Application Insights** (`campusbarter-insights`) monitors errors and performance
- Azure Monitor alerts configured for error spikes and failed logins
- Logs retained for 30 days

---

### A10 — Server-Side Request Forgery (SSRF)
**Risk:** Server makes requests to internal services on attacker's behalf.
**How we address it:**
- No user-controlled URLs are fetched server-side
- Azure SQL connection is outbound-only to a fixed connection string from Key Vault
- App Service outbound traffic restricted by Azure networking

---

## Rate Limiting Configuration
```
Window:  15 minutes
Max:     100 requests per IP
Action:  429 Too Many Requests returned
```

## Security Contacts
- Report vulnerabilities via GitHub Security tab → "Report a vulnerability"
- PIPEDA Privacy Officer: available in `app/privacy.tsx`
