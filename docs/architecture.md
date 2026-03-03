# CampusBarter — System Architecture Overview
**Version:** 1.0 | **Last Updated:** March 2025

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    SAIT Students                        │
│            (React Native / Expo mobile app)             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS (TLS 1.2+)
                       ▼
┌─────────────────────────────────────────────────────────┐
│           Microsoft Entra ID (Azure AD)                 │
│     SAIT email verification (@sait.ca only)             │
│         JWT token issued on successful login            │
└──────────────────────┬──────────────────────────────────┘
                       │ Bearer Token
                       ▼
┌─────────────────────────────────────────────────────────┐
│          Azure App Service — campusbarter-api           │
│              Node.js 22 / Express REST API              │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Rate Limiter│  │ Helmet (CORS)│  │ JWT Verify    │  │
│  │ 100req/15m  │  │ Secure HDRs  │  │ RBAC Enforce  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              Routes                              │   │
│  │  /api/listings  /api/users  /api/chats  /health  │   │
│  └───────────────────────┬──────────────────────────┘   │
│                          │ Managed Identity              │
│                          ▼                              │
│  ┌───────────────────────────────┐                      │
│  │   Azure Key Vault             │                      │
│  │   campusbarter-kv             │                      │
│  │   • AzureSqlConnectionString  │                      │
│  │   • AzureAdTenantId           │                      │
│  │   • AzureAdClientId           │                      │
│  │   • AzureStorageConnStr       │                      │
│  └───────────────────────────────┘                      │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
┌─────────────────────┐   ┌─────────────────────┐
│  Azure SQL Database  │   │  Azure Blob Storage  │
│  campusbarter-db     │   │  campusbarterstg     │
│  Canada Central      │   │  avatars/            │
│  TDE Encrypted       │   │  listing-images/     │
│  Firewall: AZ only   │   │  Private access only │
│                      │   └─────────────────────┘
│  Tables:             │
│  • Users             │
│  • Listings          │
│  • Chats             │
│  • Messages          │
│  • Notifications     │
│  • AuditLog          │
│  • Reviews           │
└─────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────┐
│           Azure Application Insights                    │
│           campusbarter-insights                         │
│   • Real-time error monitoring                          │
│   • Request/response logging                            │
│   • Performance metrics                                 │
│   • Alerts: error rate, CPU, failed logins              │
└─────────────────────────────────────────────────────────┘
```

---

## Resource Group Summary

**Resource Group:** `campusbarter-rg` | **Region:** Canada Central

| Resource | Name | Type | Purpose |
|---|---|---|---|
| App Service | `campusbarter-api` | Node 22 | REST API host |
| SQL Server | `campusbarter-sql-server` | Azure SQL | Database server |
| SQL Database | `campusbarter-db` | Basic (5 DTU) | App data storage |
| Key Vault | `campusbarter-kv` | Standard | Secrets management |
| Storage | `campusbarterstg` | LRS | Image/file storage |
| App Insights | `campusbarter-insights` | Monitor | Observability |

---

## Security Controls Summary

| Control | Implementation |
|---|---|
| Authentication | Azure AD JWT tokens (RS256) |
| Authorization | RBAC (Student / Moderator / Admin) |
| Transport Security | HTTPS only, TLS 1.2 minimum |
| Secrets Management | Azure Key Vault + Managed Identity |
| SQL Injection Prevention | Parameterized queries (mssql library) |
| Rate Limiting | 100 req / 15 min per IP |
| Secure Headers | Helmet.js (11 headers) |
| Audit Logging | AuditLog table — every API action |
| Vulnerability Scanning | GitHub Dependabot + npm audit |
| Firewall | SQL: Azure services only; Storage: Private |
| Compliance | PIPEDA, OWASP Top 10 |
