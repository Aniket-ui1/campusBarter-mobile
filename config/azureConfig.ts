// config/azureConfig.ts
const azureConfig = {
  clientId: "0afbd5b7-5abf-48a1-bea2-1b7abb8fd91d",
  tenantId: "b458f7e5-1224-40a2-b3aa-7db22dc0dde4",

  scopes: ["openid", "profile", "email", "offline_access"],

  get discoveryUrl(): string {
    return `https://login.microsoftonline.com/${this.tenantId}/v2.0`;
  },
};

export default azureConfig;
