import type { Core } from '@strapi/strapi';

// Add this at the very top of config/server.ts
process.env.apiUrl = "http://localhost:1337";
process.env.apiToken = "bypass_string";
process.env.API_URL = "http://localhost:1337";
process.env.API_TOKEN = "bypass_string";

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: env.array('APP_KEYS')!,
  },
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;
