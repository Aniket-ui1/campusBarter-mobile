# Secrets Rotation Policy

## Overview
All secrets used by CampusBarter are stored in **Azure Key Vault** (`campusbarter-kv`).
This document defines when and how each secret is rotated.

---

## Secret Inventory

| Secret Name | Type | Stored In | Rotation Interval |
|------------|------|-----------|-------------------|
| `SQL-CONNECTION-STRING` | Database credential | Key Vault | 90 days |
| `JWT-SECRET` | Token signing key | Key Vault | 90 days |
| `BLOB-STORAGE-KEY` | Storage access key | Key Vault | 90 days |
| `AZURE-AD-CLIENT-SECRET` | Entra ID credential | Key Vault | 180 days |
| `AZURE_WEBAPP_PUBLISH_PROFILE` | Deployment auth | GitHub Secrets | On revoke |

---

## Rotation Procedures

### SQL Connection String
1. Go to **Azure Portal → SQL Server → Reset Password**
2. Update the connection string in **Key Vault → SQL-CONNECTION-STRING → New Version**
3. Restart the App Service to pick up the new secret
4. Verify `/health` endpoint returns 200

### JWT Secret
1. Generate a new random 256-bit key: `openssl rand -base64 32`
2. Update in **Key Vault → JWT-SECRET → New Version**
3. Restart App Service
4. Note: Existing tokens signed with the old key will become invalid — users will need to re-login

### Blob Storage Key
1. Go to **Azure Portal → Storage Account → Access Keys → Rotate Key**
2. Azure Key Vault auto-rotates if configured (see below)
3. Restart App Service

### Azure AD Client Secret
1. Go to **Azure Portal → App Registrations → campusbarter → Certificates & Secrets**
2. Create a new Client Secret with 180-day expiry
3. Delete the old one
4. Update in Key Vault
5. Restart App Service

---

## Azure Key Vault Auto-Rotation Setup

### Steps to enable 90-day auto-rotation:
1. Azure Portal → Key Vault → `campusbarter-kv`
2. Select a secret → **Rotation Policy**
3. Set:
   - Rotation type: **Automatically, at set intervals**
   - Rotation interval: **90 days**
   - Notification: **30 days before expiry** (sends email alert)
4. Click **Save**

### Alert Configuration
- Key Vault fires `SecretNearExpiry` events 30 days before expiry
- Configure an **Event Grid subscription → Email/Logic App** for alerts
- Alerts go to: infrastructure team email distribution list

---

## Rotation Checklist

When rotating any secret:
- [ ] Create new secret version in Key Vault
- [ ] Do NOT delete old version immediately (allow graceful transition)
- [ ] Restart Azure App Service (`az webapp restart`)
- [ ] Verify health endpoint: `GET /health` → 200
- [ ] Verify API works: `GET /api/v1/listings` → 200
- [ ] Remove old secret version after 24 hours
- [ ] Document rotation date in this file (below)

---

## Rotation Log

| Date | Secret | Rotated By | Notes |
|------|--------|------------|-------|
| 2026-03-08 | Initial | AI Agent | Initial secret creation |

---

## Emergency Rotation

If a secret is compromised:
1. **Immediately** create a new version in Key Vault
2. **Immediately** restart App Service
3. **Immediately** delete the compromised version
4. Review audit logs in Azure Monitor for unauthorized access
5. Document the incident in the Incident Response Log
