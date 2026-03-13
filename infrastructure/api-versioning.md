# API Versioning Policy

## Current Version: v1

All API endpoints are versioned under `/api/v1/`.

### Base URLs
- **Production**: `https://campusbarter-api-f3b4ascaemgthae3.canadacentral-01.azurewebsites.net/api/v1/`
- **Health Check**: `GET /health` (unversioned — used by Azure Monitor)

### Versioning Rules

1. **New versions** are introduced when there are breaking changes to:
   - Request/response body shape
   - Authentication method
   - Endpoint removal

2. **Non-breaking changes** (additive fields, new endpoints) do NOT require a new version.

3. **Sunset policy**: Deprecated versions are supported for **6 months** after the successor launches.

### Deprecation Headers

Old `/api/*` endpoints return these headers:

| Header | Value | Meaning |
|--------|-------|---------|
| `Deprecation` | `true` | This version is deprecated |
| `Sunset` | `2026-09-01` | Stop supporting after this date |
| `Link` | `</api/v1>; rel="successor-version"` | Where to migrate to |

### Current Endpoints (v1)

| Method | Path | Auth Required |
|--------|------|:---:|
| `GET` | `/health` | ❌ |
| `GET` | `/api/v1/listings` | ✅ |
| `POST` | `/api/v1/listings` | ✅ |
| `PATCH` | `/api/v1/listings/:id/close` | ✅ |
| `DELETE` | `/api/v1/listings/:id` | ✅ |
| `GET` | `/api/v1/chats` | ✅ |
| `POST` | `/api/v1/chats` | ✅ |
| `GET` | `/api/v1/chats/:id/messages` | ✅ |
| `POST` | `/api/v1/chats/:id/messages` | ✅ |
| `GET` | `/api/v1/users/me` | ✅ |
| `PATCH` | `/api/v1/users/me` | ✅ |
| `GET` | `/api/v1/reviews/:userId` | ✅ |
| `POST` | `/api/v1/reviews` | ✅ |
| `GET` | `/api/v1/notifications` | ✅ |
| `PUT` | `/api/v1/notifications/:id/read` | ✅ |
| `PUT` | `/api/v1/notifications/read-all` | ✅ |
| `GET` | `/api/v1/credits/balance` | ✅ |
| `POST` | `/api/v1/credits/transfer` | ✅ |
| `POST` | `/api/v1/upload` | ✅ |
| `POST` | `/api/v1/tokens/push` | ✅ |
| `GET` | `/api/v1/admin/audit-log` | ✅ (Admin) |
