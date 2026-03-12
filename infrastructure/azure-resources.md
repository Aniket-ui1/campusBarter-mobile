# CampusBarter — Azure Infrastructure Documentation

## Two-Tenant Architecture

CampusBarter uses **two Azure AD tenants** — this is normal and expected for Entra External ID (CIAM):

| Tenant | What it holds | Why |
|---|---|---|
| **Default tenant** (your Azure subscription) | App Service, SQL Server, SQL Database, Key Vault, Blob Storage, Application Insights | Infrastructure lives in your subscription |
| **CampusBarter CIAM tenant** (`25cf3e13-f550-42d6-b0a9-366ae872b929`) | App Registration, Users, Authentication flows | Entra External ID creates a separate tenant for customer identity |

**How they connect:** The CIAM tenant issues JWT tokens when users log in. The App Service (in your default tenant) validates those tokens using the CIAM tenant's JWKS keys. No cross-tenant admin access is needed — just the tenant ID and client ID.

| CIAM Setting | Value |
|---|---|
| **Tenant ID** | `25cf3e13-f550-42d6-b0a9-366ae872b929` |
| **Client ID** | `c25cd73c-5917-4e99-9906-49c6e77124e1` |
| **CIAM domain** | `campusbarter.ciamlogin.com` |
| **Token issuer** | `https://25cf3e13-f550-42d6-b0a9-366ae872b929.ciamlogin.com/25cf3e13-f550-42d6-b0a9-366ae872b929/v2.0` |
| **JWKS keys** | `https://25cf3e13-f550-42d6-b0a9-366ae872b929.ciamlogin.com/25cf3e13-f550-42d6-b0a9-366ae872b929/discovery/v2.0/keys` |

---

## Resource Group
| Property | Value |
|---|---|
| **Name** | `campusbarter-rg` |
| **Region** | Canada Central (Calgary-closest) |
| **Purpose** | Single container for all CampusBarter Azure resources (in Default tenant) |

---

## Resources (Default Tenant)

### 1. Azure SQL Database
| Property | Value |
|---|---|
| **Server name** | `campusbarter-sql-server` |
| **Database name** | `campusbarter-db` |
| **Pricing tier** | Basic (5 DTU) — free for student accounts |
| **Authentication** | Azure AD + SQL Admin |
| **Firewall** | Allow only App Service IP — block all public access |
| **Backup** | Geo-redundant, 7-day retention |

**Tables:** Users, Listings, Chats, ChatParticipants, Messages, Notifications, AuditLog, Reviews  
**Schema file:** `infrastructure/schema.sql`

---

### 2. Azure Blob Storage
| Property | Value |
|---|---|
| **Account name** | `campusbarterstg` |
| **Container** | `avatars` (profile photos), `listing-images` |
| **Access level** | Blob (public read for images, private for everything else) |
| **Redundancy** | LRS (Locally Redundant Storage) |

---

### 3. Azure Key Vault
| Property | Value |
|---|---|
| **Name** | `campusbarter-kv` |
| **Purpose** | Stores all secrets — no secrets in code or `.env` files |
| **Access** | App Service reads via Managed Identity (no passwords needed) |

**Secrets stored:**
- `AzureSqlConnectionString` — database connection string
- `AzureStorageConnectionString` — blob storage key
- `AzureAdClientSecret` — Microsoft Entra ID app secret
- `JwtSigningKey` — for signing API tokens

---

### 4. Azure App Service
| Property | Value |
|---|---|
| **Name** | `campusbarter-api` |
| **Runtime** | Node.js 20 |
| **Plan** | Free (F1) — suitable for student project |
| **Purpose** | Hosts the REST API backend |
| **Managed Identity** | Enabled (for Key Vault access) |
| **HTTPS only** | Enforced |

---

### 5. Azure Monitor + Application Insights
| Property | Value |
|---|---|
| **Workspace** | `campusbarter-logs` |
| **Retention** | 30 days |
| **Alerts** | Failed logins > 5/min, Error rate > 5%, CPU > 80% |

---

## Security Configuration

### Firewall Rules (Azure SQL)
```
DENY  ALL public internet traffic
ALLOW App Service outbound IP only
ALLOW Azure Portal (for admin query editor)
```

### RBAC Roles
| Role | Permissions |
|---|---|
| `Student` | CRUD own listings, send/receive messages |
| `Moderator` | Flag/remove any listing, view reports |
| `Admin` | Full access, manage users, view audit logs |

---

## Setup Order
1. Create Resource Group `campusbarter-rg`
2. Create Azure SQL Server + Database
3. Run `infrastructure/schema.sql` in Query Editor
4. Create Blob Storage account
5. Create Key Vault + add secrets
6. Create App Service + enable Managed Identity
7. Link App Service to Key Vault
8. Enable Application Insights
9. Configure firewall rules
10. Deploy backend API
