# Security Headers Configuration

## Current Headers

CampusBarter API sets these security headers via **Helmet.js** and custom middleware:

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'; frame-ancestors 'none'; object-src 'none'` | Prevents XSS, clickjacking |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevents MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevents clickjacking (legacy) |
| `X-XSS-Protection` | `0` | Disabled (CSP handles this better) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limits referrer leakage |
| `X-Permitted-Cross-Domain-Policies` | `none` | Blocks Flash/PDF cross-domain |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disables browser features |
| `Cross-Origin-Opener-Policy` | `same-origin` | Prevents cross-origin window access |
| `Cross-Origin-Resource-Policy` | `same-origin` | Prevents cross-origin resource loading |

## CSP Directives Breakdown

```
default-src 'self'                          → Only load from same origin
script-src 'self'                           → No inline scripts, no CDN
style-src 'self' 'unsafe-inline'            → Allow inline styles (React Native Web)
img-src 'self' data: campusbarterstg.blob   → Images from our blob storage only
connect-src 'self'                          → API calls same origin only
font-src 'self'                             → Fonts from same origin
object-src 'none'                           → No Flash/Java plugins
frame-ancestors 'none'                      → Cannot be iframed (anti-clickjacking)
form-action 'self'                          → Forms submit same origin only
upgrade-insecure-requests                   → Forces HTTP → HTTPS
```

## How to Audit

Run this command or visit [securityheaders.com](https://securityheaders.com):

```bash
curl -I https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net/health
```

Expected rating: **A+**

## Certificate Pinning (Mobile App)

The mobile app pins the Azure AD JWKS public key endpoint:
- **JWKS URL**: `https://login.microsoftonline.com/{tenantId}/discovery/v2.0/keys`
- **Pinning method**: The `auth.ts` middleware fetches the signing key from JWKS on every request
- **Why not static pin**: Azure rotates signing keys periodically. Using JWKS ensures automatic key rotation.
- **MITM prevention**: The TLS certificate of `login.microsoftonline.com` is validated by the OS trust store

## OWASP Top 10 Coverage

| # | Risk | Mitigation |
|---|------|------------|
| A01 | Broken Access Control | RBAC middleware (`requireRole`), JWT validation |
| A02 | Cryptographic Failures | Azure Key Vault for secrets, HTTPS-only |
| A03 | Injection | Parameterized SQL queries (mssql lib) |
| A04 | Insecure Design | Input validation (express-validator) |
| A05 | Security Misconfiguration | Helmet CSP, strict CORS, rate limiting |
| A06 | Vulnerable Components | Dependabot alerts, npm audit in CI |
| A07 | Auth Failures | Azure AD JWT, token expiry, no password storage |
| A08 | Software Integrity | CI/CD pipeline, branch protection |
| A09 | Logging Failures | Audit logging middleware, Application Insights |
| A10 | SSRF | No user-controlled URLs, blob storage SDK only |
