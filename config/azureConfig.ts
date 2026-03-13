// config/azureConfig.ts
//
// Azure Entra External ID (CIAM) configuration.
//
// CampusBarter uses TWO Azure AD tenants (this is normal for CIAM):
//   1. Default tenant   – holds infrastructure (App Service, SQL, Key Vault, etc.)
//   2. CIAM tenant      – holds App Registration, users, and authentication
//
// The values below belong to the CIAM tenant (campusbarter.ciamlogin.com).
// Both "campusbarter.ciamlogin.com" and "{tenantId}.ciamlogin.com" resolve
// to the same OIDC endpoints, but the JWT issuer claim always uses the
// tenant-ID form: https://{tenantId}.ciamlogin.com/{tenantId}/v2.0
//
const azureConfig = {
  clientId: "c25cd73c-5917-4e99-9906-49c6e77124e1",
  tenantId: "25cf3e13-f550-42d6-b0a9-366ae872b929",

  // Friendly CIAM domain (used for discovery / authorize / token endpoints)
  ciamDomain: "campusbarter.ciamlogin.com",

  scopes: ["openid", "profile", "email", "offline_access"],

  // Discovery URL — the friendly name works fine for OIDC discovery
  get discoveryUrl(): string {
    return `https://${this.ciamDomain}/${this.tenantId}/v2.0`;
  },

  // Issuer — the exact string that appears in the "iss" claim of JWT tokens.
  // CIAM always uses the tenant-ID form, NOT the friendly name.
  get issuer(): string {
    return `https://${this.tenantId}.ciamlogin.com/${this.tenantId}/v2.0`;
  },
};

export default azureConfig;
