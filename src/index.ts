import type { Core } from '@strapi/strapi';
import { DRINK_CATEGORIES, HAPPY_HOUR_CATEGORIES, MENU_CATEGORIES } from './seed/menuData';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const TEST_CONTACT_EMAIL = 'switham.gca@gmail.com';
const LEGACY_CONTACT_EMAIL = 'Management@kitchenmasterga.com';
const DEFAULT_HIRING_ROLES = [
  'Front of house', 'Server', 'Bartender', 'Host', 'Kitchen', 'Sushi chef', 'Management', 'Other',
];
const ALLERGENS = [
  { name: 'Milk', slug: 'milk', shortLabel: 'M', sortOrder: 1 },
  { name: 'Eggs', slug: 'eggs', shortLabel: 'E', sortOrder: 2 },
  { name: 'Fish', slug: 'fish', shortLabel: 'F', sortOrder: 3 },
  { name: 'Shellfish', slug: 'shellfish', shortLabel: 'SH', sortOrder: 4 },
  { name: 'Tree nuts', slug: 'tree-nuts', shortLabel: 'TN', sortOrder: 5 },
  { name: 'Peanuts', slug: 'peanuts', shortLabel: 'P', sortOrder: 6 },
  { name: 'Wheat', slug: 'wheat', shortLabel: 'W', sortOrder: 7 },
  { name: 'Soy', slug: 'soy', shortLabel: 'S', sortOrder: 8 },
  { name: 'Sesame', slug: 'sesame', shortLabel: 'SE', sortOrder: 9 },
] as const;
const SEEDED_ITEM_ALLERGENS: Record<string, string[]> = {
  'Sea Salt Edamame': ['soy'],
  'Hot & Sour Soup': ['eggs', 'soy'],
  'Egg Drop Soup': ['eggs'],
  'Kung Pao Chicken': ['peanuts'],
  'Scallion Pancake': ['wheat'],
  'Yuzu Parmesan Truffle Fries': ['milk'],
  'Crab Rangoon': ['milk', 'fish', 'wheat'],
  'Boom Boom Shrimp': ['shellfish'],
  'Crab Croquette': ['shellfish'],
  'Crab & Pork': ['shellfish'],
  'Shrimp Shumai': ['shellfish'],
  'Ube Cream Matcha': ['milk'],
  'Salmon Avocado': ['fish', 'sesame'],
  'Ahi Poke': ['fish', 'soy'],
};
const OWNER_LIST_LAYOUTS: Record<string, string[]> = {
  'api::allergen.allergen': ['name', 'shortLabel', 'sortOrder'],
  'api::menu-item.menu-item': ['name', 'category', 'locations', 'allergens'],
  'api::menu-category.menu-category': ['name', 'menuType', 'locations', 'sortOrder'],
  'api::happening.happening': ['title', 'happeningType', 'locations', 'enabled'],
  'api::campaign.campaign': ['name', 'locations', 'enabled', 'startsAt'],
  'api::homepage-section.homepage-section': ['name', 'sectionKey', 'location', 'sortOrder'],
  'api::site-page.site-page': ['title', 'pageType', 'location', 'sortOrder'],
};
const SEED_MEDIA_FILES: Record<string, string> = {
  'hero.png': 'hero_d0cafda107.png',
  'soup-dumplings.png': 'soup_dumplings_835fe4bef2.png',
  'lamb-chop.png': 'lamb_chop_14e3c3c255.png',
  'szechuan-wonton.png': 'szechuan_wonton_27b34f1558.png',
  'spread.jpg': 'spread_5dd17df619.jpg',
  'private-room.png': 'private_room_f2c790f7b8.png',
  'dining.png': 'dining_34d0d5c0f1.png',
  'salmon-carpaccio-special.png': 'salmon_carpaccio_special_9117f022.png',
  'branzino-special.png': 'branzino_special_f6e9559d.png',
  'halloween-dumpling-night.jpg': 'halloween_dumpling_night_b5179ad2.jpg',
};

const locations = [
  {
    name: 'Suwanee', slug: 'suwanee', state: 'Georgia',
    address: '3131 Lawrenceville-Suwanee Rd, Ste B5', city: 'Suwanee, GA 30024',
    phone: '470-589-1112', latitude: 34.0236, longitude: -84.0519,
    locationStatus: 'open', hours: 'Tue–Fri 4:30–10 · Sat 11–10 · Sun 12–9:30',
    orderUrl: 'https://order.toasttab.com/online/kitchen-master-bistro-2-3131-lawrenceville-suwanee-rd-b5',
    instagramUrl: 'https://www.instagram.com/kitchenmaster.ga/',
    googleReviewsUrl: 'https://www.google.com/maps/search/?api=1&query=Kitchen%20Master%20Suwanee',
    googleRating: 4.5, googleReviewCount: '444 Google reviews',
    reviews: [
      { quote: 'Shaun provided the best service and the food was amazing.', author: 'Recent Suwanee guest', rating: 5 },
      { quote: 'This was my first time at Kitchen Master and it won’t be my last!', author: 'Recent Suwanee guest', rating: 5 },
    ],
    contactEmail: TEST_CONTACT_EMAIL, privateDiningEmail: TEST_CONTACT_EMAIL,
    hiringEmail: TEST_CONTACT_EMAIL, hiringRoles: DEFAULT_HIRING_ROLES,
    reservationUrl: 'https://resy.com/cities/suwanee-ga/venues/kitchen-master-suwanee', sortOrder: 1,
  },
  {
    name: 'Frisco', slug: 'frisco', state: 'Texas', address: '9285 Preston Rd',
    city: 'Frisco, TX 75033', phone: '469-362-8001', latitude: 33.1548354,
    longitude: -96.8039115, locationStatus: 'open',
    hours: 'Mon–Thu 11–2:30, 4:30–9 · Fri–Sat until 9:30',
    instagramUrl: 'https://www.instagram.com/kitchenmaster.tx/',
    googleReviewsUrl: 'https://www.google.com/maps/search/?api=1&query=Kitchen%20Master%20Frisco',
    googleRating: 4.3, googleReviewCount: '1,000+ Google reviews',
    reviews: [
      { quote: 'Everything we ordered was delicious — the xiaolongbao were juicy and flavorful.', author: 'Xiaoyu S. · Google', rating: 5 },
      { quote: 'The shrimp were crispy outside, juicy inside, and full of flavor.', author: 'Thi Kim D. · Google', rating: 5 },
    ],
    contactEmail: TEST_CONTACT_EMAIL, privateDiningEmail: TEST_CONTACT_EMAIL,
    hiringEmail: TEST_CONTACT_EMAIL, hiringRoles: DEFAULT_HIRING_ROLES,
    reservationUrl: 'https://www.kitchenmasterbistro.com/reservations-frisco',
    orderUrl: 'https://order.toasttab.com/online/kitchen-master-bistro-9285-preston-rd', sortOrder: 2,
  },
  {
    name: 'Southlake', slug: 'southlake', state: 'Texas', address: '3311 E State Hwy 114',
    city: 'Southlake, TX 76092', phone: '214-724-5600', latitude: 32.9369978,
    longitude: -97.1029086, locationStatus: 'open', hours: 'Tue–Thu 11–9 · Fri–Sat 11–10',
    instagramUrl: 'https://www.instagram.com/kitchenmaster.tx/',
    contactEmail: TEST_CONTACT_EMAIL, privateDiningEmail: TEST_CONTACT_EMAIL,
    hiringEmail: TEST_CONTACT_EMAIL, hiringRoles: DEFAULT_HIRING_ROLES,
    reservationUrl: 'tel:+12147245600',
    orderUrl: 'https://order.toasttab.com/online/kitchen-master-bistro-southlake-3311-w-state-hwy-114', sortOrder: 3,
  },
  {
    name: 'Midtown Atlanta', slug: 'midtown', state: 'Georgia', address: 'Address to be announced',
    city: 'Atlanta, GA', phone: 'Coming soon', latitude: 33.7838, longitude: -84.3831,
    instagramUrl: 'https://www.instagram.com/kitchenmaster.ga/',
    contactEmail: TEST_CONTACT_EMAIL, privateDiningEmail: TEST_CONTACT_EMAIL,
    hiringEmail: TEST_CONTACT_EMAIL, hiringRoles: DEFAULT_HIRING_ROLES,
    locationStatus: 'coming-soon', hours: 'Opening details coming soon', orderUrl: '', sortOrder: 4,
  },
];

type SeedPage = {
  title: string;
  slug: string;
  pageType: 'home' | 'private-dining' | 'contact' | 'careers' | 'franchise' | 'happenings' | 'specials';
  heroEyebrow?: string;
  heroTitle: string;
  heroAccent: string;
  heroDescription: string;
  sections?: Array<{ eyebrow: string; heading: string; body: string }>;
  formConfig?: Record<string, unknown>;
  sortOrder: number;
};

const sitePages: SeedPage[] = [
  { title: 'Home', slug: 'home', pageType: 'home', heroTitle: 'Tradition,', heroAccent: 'mastered.', heroDescription: 'Soup dumplings, fresh sushi, and bold modern plates—crafted daily at Kitchen Master.', sortOrder: 1 },
  { title: 'Happenings', slug: 'happenings', pageType: 'happenings', heroEyebrow: 'Specials · Events', heroTitle: 'What’s happening', heroAccent: 'at Kitchen Master.', heroDescription: 'Seasonal specials, happy hour notes, and gatherings worth putting on your calendar.', sortOrder: 2 },
  { title: 'Specials', slug: 'specials', pageType: 'specials', heroEyebrow: 'Happenings · Specials', heroTitle: 'From the kitchen', heroAccent: 'right now.', heroDescription: 'Limited dishes and seasonal ideas from your selected Kitchen Master.', sortOrder: 3 },
  { title: 'Private Dining', slug: 'private-dining', pageType: 'private-dining', heroEyebrow: 'Private dining', heroTitle: 'Your occasion.', heroAccent: 'Our craft.', heroDescription: 'From milestone dinners to company gatherings, our team will help shape a generous, memorable experience around your guests.', sections: [
    { eyebrow:'Made for gathering',heading:'A table that feels like yours.',body:'Tell us what you are celebrating, how many guests you expect, and the atmosphere you have in mind. Our restaurant team will follow up about availability, room options, menus, and minimums.' },
    { eyebrow:'Thoughtfully hosted',heading:'Dinner, with every detail considered.',body:'Private dining options vary by restaurant. We can help with family-style menus, business dinners, birthdays, receptions, and other group occasions.' },
  ], formConfig: { formEyebrow:'Event inquiry', formTitle:'Plan with {{location}}.', formDescription:'Required fields help us route your message to the right team.', submitLabel:'Request event details', eventTypeOptions:['Birthday','Wedding or rehearsal dinner','Corporate event','Family gathering','Reception','Other'] }, sortOrder: 3 },
  { title: 'Contact', slug: 'contact', pageType: 'contact', heroEyebrow: 'Contact us', heroTitle: 'We’re here to', heroAccent: 'help.', heroDescription: 'Questions about a visit, feedback for our team, or help with an order? Send a note directly to your Kitchen Master location.', sections: [], formConfig: { formEyebrow:'Send a note', formTitle:'Contact {{location}}.', formDescription:'Required fields help us route your message to the right team.', submitLabel:'Send message', subjectOptions:['General question','Order support','Feedback about a visit','Press or partnership','Other'] }, sortOrder: 4 },
  { title: 'Careers', slug: 'careers', pageType: 'careers', heroTitle: 'Master your', heroAccent: 'craft.', heroDescription: 'Build your hospitality career with Kitchen Master.', sections: [{ eyebrow:'Work with us',heading:'Hospitality starts with people.',body:'We look for thoughtful teammates who care about craft, move with purpose, and make every guest feel welcome.' }], formConfig: { formEyebrow:'Join the team', formTitle:'Apply to {{location}}.', formDescription:'Choose your restaurant and tell us where you shine.', submitLabel:'Submit application' }, sortOrder: 5 },
  { title: 'Franchise Opportunities', slug: 'franchise', pageType: 'franchise', heroEyebrow: 'Franchise opportunities', heroTitle: 'Grow with', heroAccent: 'Kitchen Master.', heroDescription: 'We are exploring thoughtful growth with experienced operators who value hospitality, consistency, and craft.', sections: [
    { eyebrow:'The right partnership',heading:'Built for hands-on operators.',body:'We are interested in partners who understand their market, care deeply about guest experience, and are ready to protect the standards behind every Kitchen Master meal.' },
    { eyebrow:'Start the conversation',heading:'Tell us where you want to grow.',body:'Share your target market, operating background, and investment readiness. Submitting an inquiry does not guarantee territory availability or approval; our team will follow up when there may be a fit.' },
  ], formConfig: { formEyebrow:'Franchise inquiry', formTitle:'Introduce yourself.', formDescription:'Required fields help us route your message to the right team.', submitLabel:'Submit franchise inquiry', experienceOptions:['Restaurant owner or operator','Multi-unit operator','Hospitality management','Business ownership outside hospitality','New to ownership'], investmentRangeOptions:['Under $500,000','$500,000–$1 million','$1–$2 million','$2 million+'] }, sortOrder: 6 },
];

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    async function cmsImage(fileName: string) {
      const existing = await strapi.db.query('plugin::upload.file').findOne({ where: { name: fileName } });
      if (existing) return existing.id;
      const bundledName = SEED_MEDIA_FILES[fileName];
      const bundledPath = bundledName ? resolve(process.cwd(), 'public', 'uploads', bundledName) : '';
      const workspacePath = resolve(process.cwd(), '..', 'public', 'images', fileName);
      const path = bundledPath && existsSync(bundledPath) ? bundledPath : workspacePath;
      if (!existsSync(path)) return null;
      const type = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') ? 'image/jpeg' : 'image/png';
      const uploaded = await strapi.plugin('upload').service('upload').upload({
        data: {}, files: { filepath: path, originalFilename: fileName, mimetype: type, size: statSync(path).size },
      });
      return uploaded[0]?.id;
    }

    // Keep restaurant scope visible without requiring each owner to customize their own list views.
    try {
      const contentTypeService = strapi.plugin('content-manager').service('content-types');
      for (const [uid, list] of Object.entries(OWNER_LIST_LAYOUTS)) {
        const contentType = contentTypeService.findContentType(uid);
        if (!contentType) continue;
        const configuration = await contentTypeService.findConfiguration(contentType);
        await contentTypeService.updateConfiguration(contentType, {
          ...configuration,
          layouts: { ...configuration.layouts, list },
        });
      }
    } catch (error) {
      strapi.log.warn(`Could not apply owner-friendly Content Manager lists: ${String(error)}`);
    }

    const existingLocations = await strapi.documents('api::location.location').findMany({ limit: 1 });

    if (existingLocations.length === 0) {
      for (const location of locations) {
        await strapi.documents('api::location.location').create({
          data: location as any,
          status: 'published',
        });
      }
    }

    const allergenDocumentIds = new Map<string, string>();
    for (const allergen of ALLERGENS) {
      let existing = await strapi.documents('api::allergen.allergen' as any).findFirst({
        filters: { slug: allergen.slug },
      }) as any;
      if (!existing) {
        existing = await strapi.documents('api::allergen.allergen' as any).create({
          data: allergen as any,
          status: 'published',
        });
      }
      allergenDocumentIds.set(allergen.slug, existing.documentId);
    }
    const allergensFor = (itemName: string) => (SEEDED_ITEM_ALLERGENS[itemName] ?? [])
      .map((slug) => allergenDocumentIds.get(slug))
      .filter(Boolean) as string[];

    for (const location of locations) {
      const existing = await strapi.documents('api::location.location').findFirst({ filters: { slug: location.slug } });
      const emailUpdates = existing ? {
        ...(!existing.contactEmail || existing.contactEmail === LEGACY_CONTACT_EMAIL ? { contactEmail: TEST_CONTACT_EMAIL } : {}),
        ...(!existing.privateDiningEmail || existing.privateDiningEmail === LEGACY_CONTACT_EMAIL ? { privateDiningEmail: TEST_CONTACT_EMAIL } : {}),
        ...(!existing.hiringEmail || existing.hiringEmail === LEGACY_CONTACT_EMAIL ? { hiringEmail: TEST_CONTACT_EMAIL } : {}),
      } : {};
      if (existing && Object.keys(emailUpdates).length > 0) {
        await strapi.documents('api::location.location').update({
          documentId: existing.documentId,
          data: emailUpdates,
          status: 'published',
        });
      }
      if (existing && !existing.heroTitle) {
        await strapi.documents('api::location.location').update({
          documentId: existing.documentId,
          data: {
            contactEmail: TEST_CONTACT_EMAIL,
            heroEyebrow: 'Taiwanese craft · Japanese precision',
            heroTitle: 'Tradition,', heroAccent: 'mastered.',
            heroDescription: `Soup dumplings, fresh sushi, and bold modern plates—crafted daily in ${location.name}.`,
            seoTitle: `Kitchen Master ${location.name} | Taiwanese & Japanese Dining`,
            seoDescription: `Explore menus, hours, reservations, and directions for Kitchen Master in ${location.city}.`,
            seoKeywords: [
              'Kitchen Master',
              `${location.name} restaurant`,
              'soup dumplings',
              'sushi',
              'Taiwanese food',
              'Japanese food',
            ],
          },
          status: 'published',
        });
      }
      if (existing && location.slug === 'suwanee' && existing.reservationUrl !== location.reservationUrl) {
        await strapi.documents('api::location.location').update({ documentId: existing.documentId, data: { reservationUrl: location.reservationUrl }, status: 'published' });
      }
      if (existing && !existing.reservationUrl && location.reservationUrl) {
        await strapi.documents('api::location.location').update({ documentId: existing.documentId, data: { reservationUrl: location.reservationUrl }, status: 'published' });
      }
      if (existing && !existing.instagramUrl) {
        await strapi.documents('api::location.location').update({
          documentId: existing.documentId,
          data: {
            instagramUrl: location.instagramUrl,
            googleReviewsUrl: 'googleReviewsUrl' in location ? location.googleReviewsUrl : undefined,
            googleRating: 'googleRating' in location ? location.googleRating : undefined,
            googleReviewCount: 'googleReviewCount' in location ? location.googleReviewCount : undefined,
            reviews: 'reviews' in location ? location.reviews : [],
          },
          status: 'published',
        });
      }
      if (existing && (!existing.hiringEmail || !Array.isArray(existing.hiringRoles) || existing.hiringRoles.length === 0)) {
        await strapi.documents('api::location.location').update({
          documentId: existing.documentId,
          data: {
            ...(!existing.hiringEmail ? { hiringEmail: TEST_CONTACT_EMAIL } : {}),
            ...(!Array.isArray(existing.hiringRoles) || existing.hiringRoles.length === 0
              ? { hiringRoles: DEFAULT_HIRING_ROLES }
              : {}),
          },
          status: 'published',
        });
      }
      if (existing && (!existing.contactEmail || !existing.privateDiningEmail)) {
        await strapi.documents('api::location.location').update({
          documentId: existing.documentId,
          data: {
            ...(!existing.contactEmail ? { contactEmail: TEST_CONTACT_EMAIL } : {}),
            ...(!existing.privateDiningEmail ? { privateDiningEmail: TEST_CONTACT_EMAIL } : {}),
          },
          status: 'published',
        });
      }
    }

    const existingSettings = await strapi.documents('api::site-setting.site-setting').findFirst();
    if (!existingSettings) {
      await strapi.documents('api::site-setting.site-setting').create({
        data: {
          heroEyebrow: 'Taiwanese craft · Japanese precision',
          heroTitle: 'Tradition,',
          heroAccent: 'mastered.',
          heroDescription: 'Soup dumplings, fresh sushi, and bold modern plates—crafted daily in {{location}}.',
          contactEmail: TEST_CONTACT_EMAIL,
          franchiseEmail: TEST_CONTACT_EMAIL,
          instagramUrl: 'https://www.instagram.com/kitchenmaster.ga/',
          facebookUrl: 'https://www.facebook.com/kitchenmasterga/',
          defaultReservationUrl: 'https://resy.com/cities/suwanee-ga/venues/kitchen-master-suwanee?date=2026-08-11&seats=2',
        },
        status: 'published',
      });
    }
    if (existingSettings && (
      !existingSettings.contactEmail ||
      existingSettings.contactEmail === LEGACY_CONTACT_EMAIL ||
      !existingSettings.franchiseEmail ||
      existingSettings.franchiseEmail === LEGACY_CONTACT_EMAIL
    )) {
      await strapi.documents('api::site-setting.site-setting').update({
        documentId: existingSettings.documentId,
        data: {
          ...(!existingSettings.contactEmail || existingSettings.contactEmail === LEGACY_CONTACT_EMAIL ? { contactEmail: TEST_CONTACT_EMAIL } : {}),
          ...(!existingSettings.franchiseEmail || existingSettings.franchiseEmail === LEGACY_CONTACT_EMAIL ? { franchiseEmail: TEST_CONTACT_EMAIL } : {}),
        },
        status: 'published',
      });
    }

    const existingCampaigns = await strapi.documents('api::campaign.campaign').findMany({ limit: 1 });
    if (existingCampaigns.length === 0) {
      const suwanee = await strapi.documents('api::location.location').findFirst({ filters: { slug: 'suwanee' } });
      await strapi.documents('api::campaign.campaign').create({
        data: {
          name: '2026 Best of Gwinnett Voting', campaignType: 'external-cta', enabled: true,
          startsAt: '2026-09-01T00:00:00.000Z', endsAt: '2026-12-31T23:59:59.000Z', priority: 100,
          locations: suwanee ? [suwanee.documentId] : [], eyebrow: 'Best of Gwinnett · 2026',
          title: 'Love Kitchen Master?', accent: 'Cast your vote.',
          body: 'Help your Suwanee Kitchen Master earn Best of Gwinnett. Find us under Chinese Restaurants in Food & Drink.',
          buttonLabel: 'Vote for Kitchen Master', buttonUrl: 'https://www.guidetogwinnett.com/best-of/vote/food-drink',
          finePrint: 'Voting takes place on the official Best of Gwinnett website.',
          dismissalKey: 'best-of-gwinnett-2026', delayMs: 1200,
        },
        status: 'published',
      });
      await strapi.documents('api::campaign.campaign').create({
        data: {
          name: 'Kitchen Master Insiders', campaignType: 'insiders', enabled: true, priority: 10,
          eyebrow: 'Kitchen Master Insiders', title: 'Your table has', accent: 'its advantages.',
          body: 'Join for restaurant news, special events, and rewards—with your selected restaurant as your preferred Kitchen Master.',
          buttonLabel: 'Join the Insiders', dismissalKey: 'kitchen-master-insiders', delayMs: 1200,
        },
        status: 'published',
      });
    }

    const storyPage = await strapi.documents('api::site-page.site-page').findFirst({ filters: { slug: 'our-story' } });
    if (storyPage?.publishedAt) {
      await strapi.documents('api::site-page.site-page').unpublish({ documentId: storyPage.documentId });
    }

    const existingPages = await strapi.documents('api::site-page.site-page').findMany({ limit: 1 });
    if (existingPages.length === 0) {
      for (const page of sitePages) {
        await strapi.documents('api::site-page.site-page').create({
          data: {
            ...page,
            sections: 'sections' in page ? page.sections : [],
            formConfig: (page.formConfig ?? {}) as any,
            seoTitle: `${page.title} | Kitchen Master`,
            seoDescription: page.heroDescription,
          },
          status: 'published',
        });
      }
    }

    for (const page of sitePages) {
      const existing = await strapi.documents('api::site-page.site-page').findFirst({ filters: { slug: page.slug } });
      if (!existing) {
        await strapi.documents('api::site-page.site-page').create({
          data: {
            ...page,
            sections: 'sections' in page ? page.sections : [],
            formConfig: (page.formConfig ?? {}) as any,
            seoTitle: `${page.title} | Kitchen Master`,
            seoDescription: page.heroDescription,
          },
          status: 'published',
        });
      }
    }

    for (const page of sitePages.filter((entry) => ['private-dining', 'contact', 'franchise', 'careers'].includes(entry.slug))) {
      const existing = await strapi.documents('api::site-page.site-page').findFirst({ filters: { slug: page.slug } });
      const hasFormConfig = existing?.formConfig && typeof existing.formConfig === 'object' && !Array.isArray(existing.formConfig) && Object.keys(existing.formConfig).length > 0;
      const needsSeedSections = Boolean(page.sections?.length) && (!Array.isArray(existing?.sections) || existing.sections.length === 0);
      if (existing && (needsSeedSections || !hasFormConfig)) {
        await strapi.documents('api::site-page.site-page').update({
          documentId: existing.documentId,
          data: {
            heroEyebrow: page.heroEyebrow,
            heroTitle: page.heroTitle,
            heroAccent: page.heroAccent,
            heroDescription: page.heroDescription,
            sections: 'sections' in page ? page.sections : [],
            formConfig: (page.formConfig ?? {}) as any,
          },
          status: 'published',
        });
      }
    }

    const contactPage = await strapi.documents('api::site-page.site-page').findFirst({ filters: { slug: 'contact' } });
    const contactHasLegacyBlurb = Array.isArray(contactPage?.sections) && contactPage.sections.some((section: any) =>
      section?.heading === 'Let’s start a conversation.'
    );
    if (contactPage && contactHasLegacyBlurb) {
      const seed = sitePages.find((page) => page.slug === 'contact')!;
      await strapi.documents('api::site-page.site-page').update({
        documentId: contactPage.documentId,
        data: { sections: [], heroDescription: seed.heroDescription, formConfig: seed.formConfig as any },
        status: 'published',
      });
    }

    const storySection = await strapi.documents('api::homepage-section.homepage-section').findFirst({ filters: { sectionKey: 'story' } });
    if (storySection?.publishedAt) {
      await strapi.documents('api::homepage-section.homepage-section').unpublish({ documentId: storySection.documentId });
    }

    const existingHomepageSections = await strapi.documents('api::homepage-section.homepage-section').findMany({ limit: 1 });
    if (existingHomepageSections.length === 0) {
      const [heroImage, card1, card2, card3, featureImage, privateDiningImage] = await Promise.all([
        cmsImage('hero.png'), cmsImage('soup-dumplings.png'), cmsImage('lamb-chop.png'),
        cmsImage('szechuan-wonton.png'), cmsImage('spread.jpg'), cmsImage('private-room.png'),
      ]);
      const featuredImages = [card1, card2, card3].filter(Boolean);
      const sections = [
        { name:'Location Gateway',sectionKey:'location-gateway',eyebrow:'Welcome to Kitchen Master',title:'Choose your',accent:'location.',body:'Menus, reservations, hours, and restaurant details are tailored to your selected Kitchen Master.',...(heroImage ? { image: heroImage } : {}),sortOrder:1 },
        { name:'Reservations',sectionKey:'reservations',eyebrow:'Reservations',title:'Your table in',accent:'{{location}}.',body:'Choose a date and party size here, then view live times and complete your reservation securely with our reservation partner.',sortOrder:2 },
        { name:'Featured Menu',sectionKey:'featured-menu',eyebrow:'What we’re known for',title:'Made with patience.',accent:'Remembered by flavor.',items:[{eyebrow:'The signature',title:'Soup Dumplings'},{eyebrow:'From the wok',title:'Modern Plates'},{eyebrow:'Made to share',title:'Small Plates'}],...(featuredImages.length ? { images: featuredImages } : {}),sortOrder:3 },
        { name:'Food Menu',sectionKey:'food-menu',title:'The full menu.',body:'Handcrafted daily. Menu availability and pricing may change. Please tell your server about any allergies before ordering.',items:['V · Vegetarian','Raw · May be served raw or undercooked','Parties of six or more are subject to 20% gratuity'],sortOrder:4 },
        { name:'Drinks',sectionKey:'drinks',eyebrow:'From the bar',title:'Pour something',accent:'memorable.',body:'House cocktails inspired by Asian flavors, a considered wine and sake list, and thoughtful zero-proof drinks.',items:['Must be 21+ with valid identification','Selections and vintages may change','Please enjoy responsibly'],sortOrder:5 },
        { name:'Dining Feature',sectionKey:'dining-feature',eyebrow:'Dinner, done differently',title:'A table worth',accent:'gathering around.',body:'From a quick dinner to a long celebration, every meal is made to be shared.',...(featureImage ? { image: featureImage } : {}),sortOrder:6 },
        { name:'Private Dining',sectionKey:'private-dining',eyebrow:'Private dining',title:'Your occasion.',accent:'Our craft.',body:'Host an intimate dinner or a full celebration in a space designed for memorable meals. Our team will help shape the room and menu around your event.',...(privateDiningImage ? { image: privateDiningImage } : {}),caption:'Private rooms · Custom menus · Personal service',linkLabel:'Plan your event',linkUrl:'/pages/private-dining',sortOrder:7 },
        { name:'Social Proof',sectionKey:'social-proof',eyebrow:'From our guests',title:'Loved locally.',accent:'Shared often.',body:'See what guests are saying about Kitchen Master {{location}}, then follow along for new dishes and behind-the-scenes moments.',sortOrder:8 },
        { name:'Locations',sectionKey:'locations',eyebrow:'Our restaurants',title:'Find your',accent:'Kitchen Master.',body:'Explore every Kitchen Master location and choose the restaurant you’d like to visit.',sortOrder:9 },
        { name:'Connect Links',sectionKey:'connect',eyebrow:'More from Kitchen Master',title:'Come be part',accent:'of the story.',items:[{eyebrow:'Questions & feedback',title:'Contact us',url:'/pages/contact'},{eyebrow:'Join our team',title:'Careers',url:'/careers/{{location}}'},{eyebrow:'Grow with us',title:'Franchise opportunities',url:'/pages/franchise'},{eyebrow:'Gather together',title:'Private dining',url:'/pages/private-dining'}],sortOrder:10 },
        { name:'Footer',sectionKey:'footer',title:'Tradition meets innovation.',caption:'© 2026 Kitchen Master',sortOrder:11 },
      ];
      for (const section of sections) await strapi.documents('api::homepage-section.homepage-section').create({ data: section as any, status:'published' });
    }

    const supplementalHomepageSections = [
      { name:'Reservations',sectionKey:'reservations',eyebrow:'Reservations',title:'Your table in',accent:'{{location}}.',body:'Choose a date and party size here, then view live times and complete your reservation securely with our reservation partner.',sortOrder:2 },
      { name:'Happy Hour',sectionKey:'happy-hour',eyebrow:'A little earlier',title:'Happy hour.',accent:'Well spent.',body:'Monday–Friday · 3–5 PM. A short list of favorite bites and pours for {{location}}.',items:['Dine-in only','Happy hour menu and hours are set by location','Must be 21+ for alcoholic beverages'],sortOrder:6 },
      { name:'Social Proof',sectionKey:'social-proof',eyebrow:'From our guests',title:'Loved locally.',accent:'Shared often.',body:'See what guests are saying about Kitchen Master {{location}}, then follow along for new dishes and behind-the-scenes moments.',sortOrder:8 },
      { name:'Locations',sectionKey:'locations',eyebrow:'Our restaurants',title:'Find your',accent:'Kitchen Master.',body:'Explore every Kitchen Master location and choose the restaurant you’d like to visit.',sortOrder:9 },
    ];
    for (const section of supplementalHomepageSections) {
      const existing = await strapi.documents('api::homepage-section.homepage-section').findFirst({ filters: { sectionKey: section.sectionKey as any } });
      if (!existing) await strapi.documents('api::homepage-section.homepage-section').create({ data: section as any, status:'published' });
    }
    const globalHappyHour = await strapi.documents('api::homepage-section.homepage-section').findFirst({ filters: { sectionKey: 'happy-hour', location: { id: { $null: true } } } as any });
    if (globalHappyHour?.body === 'Selected bites and pours at participating Kitchen Master restaurants. Times and availability vary by location.') {
      await strapi.documents('api::homepage-section.homepage-section').update({
        documentId: globalHappyHour.documentId,
        data: {
          body:'Monday–Friday · 3–5 PM. A short list of favorite bites and pours for {{location}}.',
          items:['Dine-in only','Happy hour menu and hours are set by location','Must be 21+ for alcoholic beverages'],
        },
        status:'published',
      });
    }
    for (const locationSlug of ['suwanee', 'frisco', 'southlake']) {
      const location = await strapi.documents('api::location.location').findFirst({ filters: { slug: locationSlug } });
      if (!location) continue;
      const existing = await strapi.documents('api::homepage-section.homepage-section').findFirst({
        filters: { sectionKey: 'happy-hour', location: { slug: locationSlug } } as any,
      });
      if (!existing) {
        await strapi.documents('api::homepage-section.homepage-section').create({
          data: {
            name:`Happy Hour · ${location.name}`,
            sectionKey:'happy-hour',
            location:location.documentId,
            eyebrow:'A little earlier',
            title:'Happy hour.',
            accent:'Well spent.',
            body:'Monday–Friday · 3–5 PM. A short list of favorite bites and pours for {{location}}.',
            items:['Dine-in only','Happy hour menu and hours are set by location','Must be 21+ for alcoholic beverages'],
            sortOrder:6,
          } as any,
          status:'published',
        });
      }
    }
    const connectSection = await strapi.documents('api::homepage-section.homepage-section').findFirst({ filters: { sectionKey: 'connect' } });
    if (connectSection && (!Array.isArray(connectSection.items) || connectSection.items.length === 0)) {
      await strapi.documents('api::homepage-section.homepage-section').update({
        documentId: connectSection.documentId,
        data: { items:[
          {eyebrow:'Questions & feedback',title:'Contact us',url:'/pages/contact'},
          {eyebrow:'Join our team',title:'Careers',url:'/careers/{{location}}'},
          {eyebrow:'Grow with us',title:'Franchise opportunities',url:'/pages/franchise'},
          {eyebrow:'Gather together',title:'Private dining',url:'/pages/private-dining'},
        ] },
        status:'published',
      });
    }

    const mediaEntries = await Promise.all(Object.keys(SEED_MEDIA_FILES).map(async (fileName) => [fileName, await cmsImage(fileName)] as const));
    const media = Object.fromEntries(mediaEntries) as Record<string, number | null>;
    const defaultHero = media['hero.png'];
    const diningImage = media['dining.png'];

    if (defaultHero) {
      for (const locationSeed of locations) {
        const location = await strapi.documents('api::location.location').findFirst({
          filters: { slug: locationSeed.slug },
          populate: ['heroImage', 'gallery'],
        });
        if (!location) continue;
        const updates: Record<string, unknown> = {};
        if (!location.heroImage) updates.heroImage = defaultHero;
        if (!Array.isArray(location.gallery) || location.gallery.length === 0) {
          updates.gallery = [diningImage, media['spread.jpg'], media['private-room.png']].filter(Boolean);
        }
        if (Object.keys(updates).length > 0) {
          await strapi.documents('api::location.location').update({
            documentId: location.documentId,
            data: updates as any,
            status: 'published',
          });
        }
      }

      for (const pageSeed of sitePages) {
        const page = await strapi.documents('api::site-page.site-page').findFirst({
          filters: { slug: pageSeed.slug },
          populate: ['heroImage'],
        });
        if (page && !page.heroImage) {
          await strapi.documents('api::site-page.site-page').update({
            documentId: page.documentId,
            data: { heroImage: pageSeed.slug === 'home' ? defaultHero : (diningImage ?? defaultHero) },
            status: 'published',
          });
        }
      }
    }

    const sectionMedia: Record<string, { image?: number | null; images?: Array<number | null> }> = {
      'location-gateway': { image: defaultHero },
      'story': { image: diningImage },
      'featured-menu': { images: [media['soup-dumplings.png'], media['lamb-chop.png'], media['szechuan-wonton.png']] },
      'dining-feature': { image: media['spread.jpg'] },
      'private-dining': { image: media['private-room.png'] },
    };
    for (const [sectionKey, desired] of Object.entries(sectionMedia)) {
      const sections = await strapi.documents('api::homepage-section.homepage-section').findMany({
        filters: { sectionKey: sectionKey as any },
        populate: ['image', 'images'],
        limit: 100,
      });
      for (const section of sections) {
        const updates: Record<string, unknown> = {};
        if (desired.image && !section.image) updates.image = desired.image;
        const desiredImages = desired.images?.filter(Boolean) as number[] | undefined;
        if (desiredImages?.length && (!Array.isArray(section.images) || section.images.length === 0)) updates.images = desiredImages;
        if (Object.keys(updates).length > 0) {
          await strapi.documents('api::homepage-section.homepage-section').update({
            documentId: section.documentId,
            data: updates as any,
            status: 'published',
          });
        }
      }
    }

    const existingCategories = await strapi.documents('api::menu-category.menu-category').findMany({ limit: 1 });
    if (existingCategories.length === 0) {
      const menus = [
        ...MENU_CATEGORIES.map((category) => ({ ...category, menuType: 'food' as const })),
        ...DRINK_CATEGORIES.map((category) => ({ ...category, menuType: 'drink' as const })),
      ];

      for (const [categoryIndex, menu] of menus.entries()) {
        const category = await strapi.documents('api::menu-category.menu-category').create({
          data: {
            name: menu.name,
            slug: `${menu.menuType}-${menu.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`,
            menuType: menu.menuType,
            note: menu.note,
            sortOrder: categoryIndex + 1,
          },
          status: 'published',
        });

        for (const [itemIndex, item] of menu.items.entries()) {
          await strapi.documents('api::menu-item.menu-item').create({
            data: {
              name: item.name,
              price: item.price,
              description: item.description,
              tags: item.tags ?? [],
              sortOrder: itemIndex + 1,
              category: category.documentId,
              allergens: allergensFor(item.name),
            },
            status: 'published',
          });
        }
      }
    }

    const happyHourLocations = (await Promise.all(['suwanee', 'frisco', 'southlake'].map((slug) =>
      strapi.documents('api::location.location').findFirst({ filters: { slug } })
    ))).filter(Boolean) as Array<{ documentId: string; slug: string; name: string }>;
    for (const [categoryIndex, menu] of HAPPY_HOUR_CATEGORIES.entries()) {
      const categorySlug = menu.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      for (const [locationIndex, location] of happyHourLocations.entries()) {
        const slug = location.slug === 'suwanee' ? `happy-hour-${categorySlug}` : `happy-hour-${categorySlug}-${location.slug}`;
        const existing = await strapi.documents('api::menu-category.menu-category').findFirst({
          filters: { slug },
          populate: ['locations'],
        });
        if (existing) {
          if (!Array.isArray(existing.locations) || existing.locations.length === 0) {
            await strapi.documents('api::menu-category.menu-category').update({
              documentId: existing.documentId,
              data: { locations: [location.documentId] } as any,
              status: 'published',
            });
          }
          continue;
        }
        const category = await strapi.documents('api::menu-category.menu-category').create({
          data: {
            name: menu.name,
            slug,
            menuType: 'happy-hour',
            note: menu.note,
            locations: [location.documentId],
            sortOrder: 100 + (locationIndex * 10) + categoryIndex,
          } as any,
          status: 'published',
        });
        for (const [itemIndex, item] of menu.items.entries()) {
          await strapi.documents('api::menu-item.menu-item').create({
            data: {
              name:item.name,
              price:item.price,
              description:item.description,
              tags:item.tags ?? [],
              sortOrder:itemIndex + 1,
              category:category.documentId,
              locations:[location.documentId],
              allergens:allergensFor(item.name),
            } as any,
            status: 'published',
          });
        }
      }
    }

    // Backfill existing seeded items without overwriting allergen/location choices an editor has made.
    const categoriesForBackfill = await strapi.documents('api::menu-category.menu-category').findMany({
      limit: 500,
      populate: {
        locations: true,
        items: { populate: { allergens: true, locations: true } },
      },
    } as any) as any[];
    for (const category of categoriesForBackfill) {
      const categoryLocationIds = Array.isArray(category.locations)
        ? category.locations.map((location: any) => location.documentId).filter(Boolean)
        : [];
      for (const item of Array.isArray(category.items) ? category.items : []) {
        const updates: Record<string, unknown> = {};
        const seededAllergens = allergensFor(item.name);
        if (seededAllergens.length > 0 && (!Array.isArray(item.allergens) || item.allergens.length === 0)) {
          updates.allergens = seededAllergens;
        }
        if (categoryLocationIds.length > 0 && (!Array.isArray(item.locations) || item.locations.length === 0)) {
          updates.locations = categoryLocationIds;
        }
        if (Object.keys(updates).length > 0) {
          await strapi.documents('api::menu-item.menu-item').update({
            documentId: item.documentId,
            data: updates as any,
            status: 'published',
          });
        }
      }
    }

    const existingHappenings = await strapi.documents('api::happening.happening').findMany({ limit: 1 });
    if (existingHappenings.length === 0) {
      await strapi.documents('api::happening.happening').create({
        data: {
          title: 'Sample announcement — edit or replace', slug: 'sample-announcement', happeningType: 'event', enabled: false,
          featured: false, eyebrow: 'Happenings', summary: 'Add a concise special or event summary here.', details: 'This disabled sample shows the fields available for the Happenings page and announcement bar.',
          buttonLabel: 'See what’s happening', buttonUrl: '/pages/happenings', showInBanner: true, dismissalKey: 'sample-announcement-v1', priority: 0, sortOrder: 1,
        },
        status: 'published',
      });
    }
    const suwanee = await strapi.documents('api::location.location').findFirst({ filters: { slug: 'suwanee' } });
    const suwaneeSpecials = [
      {
        title:'Roasted Konbu and Black Sesame Salmon Carpaccio',
        slug:'roasted-konbu-black-sesame-salmon-carpaccio',
        eyebrow:'Suwanee weekly special',
        summary:'Thinly sliced fresh salmon paired with roasted konbu, black sesame, and delicate garnishes.',
        details:'Clean umami and subtle nuttiness make this a light but satisfying starter for the table.',
        imageFile:'salmon-carpaccio-special.png',
        sortOrder:10,
      },
      {
        title:'Whole Grilled Yuzu-Ponzu Branzino with Lemongrass Oil',
        slug:'whole-grilled-yuzu-ponzu-branzino',
        eyebrow:'Suwanee weekly special',
        summary:'Whole branzino grilled to bring out its natural sweetness, then finished with yuzu-ponzu glaze.',
        details:'Fragrant lemongrass oil adds a bright citrus lift to this balanced, centerpiece-worthy main.',
        imageFile:'branzino-special.png',
        sortOrder:20,
      },
    ];
    if (suwanee) {
      for (const special of suwaneeSpecials) {
        const { imageFile, ...specialData } = special;
        const image = await cmsImage(imageFile);
        const existing = await strapi.documents('api::happening.happening').findFirst({ filters: { slug: special.slug }, populate: ['image'] });
        if (!existing) {
          await strapi.documents('api::happening.happening').create({
            data: {
              ...specialData,
              happeningType:'special',
              enabled:true,
              featured:true,
              schedule:'Available now',
              locations:[suwanee.documentId],
              ...(image ? { image } : {}),
              showInBanner:false,
              priority:50,
            } as any,
            status:'published',
          });
        } else {
          const legacyCopy = existing.summary === 'Fresh salmon, thinly sliced and finished with roasted konbu and black sesame.'
            || existing.summary === 'Whole grilled branzino glazed with yuzu-ponzu and finished with fragrant lemongrass oil.';
          if (existing.image && existing.buttonUrl !== 'https://www.kitchenmasterga.com/weekly-specials-suwanee-ga' && !legacyCopy) continue;
          await strapi.documents('api::happening.happening').update({
            documentId: existing.documentId,
            data: {
              ...(!existing.image && image ? { image } : {}),
              ...(existing.buttonUrl === 'https://www.kitchenmasterga.com/weekly-specials-suwanee-ga' ? { buttonLabel:null, buttonUrl:null } : {}),
              ...(legacyCopy ? { summary:specialData.summary, details:specialData.details } : {}),
            } as any,
            status:'published',
          });
        }
      }

      const halloweenSlug = 'sample-halloween-dumpling-night-2026';
      const halloweenImage = await cmsImage('halloween-dumpling-night.jpg');
      const halloween = await strapi.documents('api::happening.happening').findFirst({
        filters: { slug: halloweenSlug },
        populate: ['image'],
      });
      if (!halloween) {
        await strapi.documents('api::happening.happening').create({
          data: {
            title:'Halloween Dumpling Night (Demo)',
            slug:halloweenSlug,
            happeningType:'event',
            enabled:true,
            featured:true,
            eyebrow:'Sample event · Suwanee',
            summary:'Costumes welcome, with seasonal bites, cocktails, and a few spooky surprises.',
            details:'This sample event demonstrates how an upcoming happening appears in the calendar and dismissible announcement banner. Edit or replace it in Strapi when event details are confirmed.',
            startsAt:'2026-10-31T21:00:00.000Z',
            endsAt:'2026-11-01T02:00:00.000Z',
            schedule:'October 31 · 5–10 PM',
            locations:[suwanee.documentId],
            ...(halloweenImage ? { image:halloweenImage } : {}),
            buttonLabel:'View event',
            showInBanner:true,
            dismissalKey:'halloween-suwanee-2026',
            priority:80,
            sortOrder:1,
          } as any,
          status:'published',
        });
      } else if (halloween.buttonUrl === '/pages/happenings' || (!halloween.image && halloweenImage)) {
        await strapi.documents('api::happening.happening').update({
          documentId:halloween.documentId,
          data:{
            ...(halloween.buttonUrl === '/pages/happenings' ? { buttonUrl:null } : {}),
            ...(!halloween.image && halloweenImage ? { image:halloweenImage } : {}),
          } as any,
          status:'published',
        });
      }
    }
  },
};
