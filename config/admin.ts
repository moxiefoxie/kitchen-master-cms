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
      async handler(uid, { documentId, status }) {
        const supported = ['location', 'menu-category', 'menu-item', 'site-page', 'site-setting', 'homepage-section', 'happening', 'campaign'];
        const type = uid.split('::')[1]?.split('.')[0];
        if (!supported.includes(type)) return null;
        const populate = type === 'location' || type === 'site-setting' ? []
          : type === 'menu-item' ? ['locations', 'category']
          : ['site-page', 'homepage-section'].includes(type) ? ['location', 'locations'] : ['locations'];
        const entry = await strapi.documents(uid as any).findOne({ documentId, status: status ?? 'draft', populate } as any) as any;
        if (!entry) return null;
        const scope = entry.restaurantScope;
        const location = type === 'location' ? entry.slug : entry.locations?.[0]?.slug || entry.location?.slug
          || (scope && !['all', 'multiple'].includes(scope) ? scope : 'suwanee');
        const target = new URL(frontendUrl);
        target.searchParams.set('location', location);
        if (type === 'site-page' && entry.pageType !== 'home') {
          target.pathname = entry.pageType === 'careers' ? `/careers/${location}` : `/pages/${entry.slug}`;
        }
        if (type === 'menu-category' || type === 'menu-item') {
          const category = type === 'menu-item' ? entry.category : entry;
          target.hash = category?.menuType === 'drink' ? 'drinks' : category?.menuType === 'happy-hour' ? 'happy-hour' : 'full-menu';
          if (category?.name) target.searchParams.set('category', category.name);
        }
        if (type === 'homepage-section') {
          const anchors: Record<string, string> = { 'food-menu': 'full-menu', 'featured-menu': 'menu', 'social-proof': 'reviews', 'connect': 'contact' };
          target.hash = anchors[entry.sectionKey] || entry.sectionKey;
        }
        if (type === 'happening') target.pathname = entry.happeningType === 'special' ? '/pages/specials' : '/pages/happenings';
        const url = new URL('/api/preview', frontendUrl);
        url.searchParams.set('secret', env('PREVIEW_SECRET', ''));
        url.searchParams.set('path', `${target.pathname}${target.search}${target.hash}`);
        url.searchParams.set('status', status ?? 'draft');
        return url.toString();
      },
    },
  },
  });
};

export default config;
