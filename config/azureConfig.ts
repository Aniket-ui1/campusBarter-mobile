// config/azureConfig.ts
const azureConfig = {
  clientId: "c25cd73c-5917-4e99-9906-49c6e77124e1",
  tenantId: "25cf3e13-f550-42d6-b0a9-366ae872b929",

  scopes: ["openid", "profile", "email", "offline_access"],

  // Entra External ID uses ciamlogin.com instead of login.microsoftonline.com
  get discoveryUrl(): string {
    return `https://campusbarter.ciamlogin.com/${this.tenantId}/v2.0`;
  },
};

export default azureConfig;
