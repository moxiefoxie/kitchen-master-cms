import type { Core } from '@strapi/strapi';

const DEPLOYED_FRONTEND_URL = 'https://kitchen-master-two.vercel.app';

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  const production = env('NODE_ENV') === 'production';
  const fallbackFrontendUrl = production ? DEPLOYED_FRONTEND_URL : 'http://localhost:3000';
  const configuredFrontendUrl = env('FRONTEND_URL', fallbackFrontendUrl).replace(/\/$/, '');
  const frontendUrl = production && /^https?:\/\/[^/]+\.strapiapp\.com$/i.test(configuredFrontendUrl)
    ? DEPLOYED_FRONTEND_URL
    : configuredFrontendUrl;

  return ({
  auth: {
    secret: env('ADMIN_JWT_SECRET')!,
  },
  apiToken: {
    salt: env('API_TOKEN_SALT')!,
  },
  transfer: {
    token: {
      salt: env('TRANSFER_TOKEN_SALT')!,
    },
  },
  secrets: {
    encryptionKey: env('ENCRYPTION_KEY')!,
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
  preview: {
    enabled: true,
    config: {
      allowedOrigins: [frontendUrl],
      handler(uid, { documentId, status }) {
        const supported = [
          'api::location.location',
          'api::menu-category.menu-category',
          'api::menu-item.menu-item',
          'api::site-page.site-page',
          'api::site-setting.site-setting',
        ];
        if (!supported.includes(uid)) return null;
        const url = new URL(frontendUrl);
        if (uid === 'api::site-page.site-page') url.pathname = `/pages/${documentId}`;
        url.searchParams.set('preview', '1');
        url.searchParams.set('contentType', uid);
        url.searchParams.set('documentId', documentId);
        url.searchParams.set('status', status ?? 'draft');
        return url.toString();
      },
    },
  },
  });
};

export default config;
