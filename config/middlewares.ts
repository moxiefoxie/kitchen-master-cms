import type { Core } from '@strapi/strapi';

const config: Core.Config.Middlewares = [
  'strapi::logger',
  'strapi::errors',
  { name: 'strapi::security', config: { contentSecurityPolicy: { useDefaults: true, directives: { 'script-src': ["'self'", 'https://editor.unlayer.com'], 'frame-src': ["'self'", 'https://editor.unlayer.com', process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' ? 'https://kitchen-master-two.vercel.app' : 'http://localhost:3000')] } } } },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  { name: 'strapi::body', config: { jsonLimit: '16mb' } },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
