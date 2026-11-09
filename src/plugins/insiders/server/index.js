'use strict';
const { cleanEmail, validEmail, sameSecret, tokenFor, tokenId, hash, escape, withFooter } = require('./helpers');
const SUB = 'plugin::insiders.subscriber';
const RUN = 'plugin::insiders.campaign';
const ACCOUNT = 'plugin::magic-mail.email-account';
const TEMPLATE = 'plugin::magic-mail.email-template';
const SENDER = 'savannah@andrewandsavannahconsulting.com';
const ADDRESS = '3131 Lawrenceville-Suwanee Rd, Ste B5, Suwanee, GA 30024';
const hidden = { 'content-manager': { visible: false }, 'content-type-builder': { visible: false } };
function schema(singular, plural, displayName, attributes) {
  return { schema: { kind: 'collectionType', collectionName: `km_insiders_${plural}`, info: { singularName: singular, pluralName: plural, displayName }, options: { draftAndPublish: false }, pluginOptions: hidden, attributes } };
}
const contentTypes = {
  subscriber: schema('subscriber', 'subscribers', 'Insiders subscriber', {
    email: { type: 'email', required: true, unique: true },
    preferredLocation: { type: 'string', required: true },
    status: { type: 'enumeration', enum: ['subscribed', 'unsubscribed'], default: 'subscribed', required: true },
    consentAt: { type: 'datetime', required: true },
    consentSource: { type: 'string', required: true },
    unsubscribedAt: { type: 'datetime' },
  }),
  campaign: schema('campaign', 'campaigns', 'Insiders campaign', {
    name: { type: 'string', required: true },
    status: { type: 'enumeration', enum: ['prepared', 'queueing', 'queued', 'partial'], default: 'prepared', required: true },
    locations: { type: 'json' }, audience: { type: 'json', private: true },
    rendered: { type: 'json', private: true },
    queued: { type: 'integer', default: 0 }, skipped: { type: 'integer', default: 0 },
    leaseUntil: { type: 'datetime' },
  }),
};
const adminPolicies = ['admin::isAuthenticatedAdmin', { name: 'admin::hasPermissions', config: { actions: ['plugin::insiders.manage'] } }];
const adminRoute = (method, path, handler) => ({ method, path, handler: `main.${handler}`, config: { policies: adminPolicies } });
const websiteRoute = (path, handler) => ({ method: 'POST', path, handler: `main.${handler}`, config: { auth: false, policies: ['plugin::insiders.website'] } });
module.exports = {
  contentTypes,
  policies: { website(ctx) { return sameSecret(ctx.request.headers['x-website-mail-token'], process.env.WEBSITE_MAIL_TOKEN); } },
  routes: {
    admin: { type: 'admin', routes: [adminRoute('GET', '/overview', 'overview'), adminRoute('POST', '/prepare', 'prepare'), adminRoute('POST', '/test', 'test'), adminRoute('POST', '/send', 'send'), adminRoute('POST', '/subscriber/:id/unsubscribe', 'adminUnsubscribe')] },
    'content-api': { type: 'content-api', routes: [websiteRoute('/website/subscribe', 'subscribe'), websiteRoute('/website/email', 'email'), websiteRoute('/website/unsubscribe', 'unsubscribe')] },
  },
  async register({ strapi }) {
    await strapi.service('admin::permission').actionProvider.registerMany([{ section: 'plugins', displayName: 'Manage Insiders subscribers and campaigns', uid: 'manage', pluginName: 'insiders' }]);
  },
  async bootstrap({ strapi }) {
    // One-time recipient migration updates each draft/published row independently.
    const store = strapi.store({ type: 'plugin', name: 'insiders' });
    if (!await store.get({ key: 'initial-email-setup-v1' })) {
      for (const [uid, fields] of [['api::location.location', ['contactEmail', 'privateDiningEmail', 'hiringEmail']], ['api::site-setting.site-setting', ['contactEmail', 'franchiseEmail']]]) {
        const rows = await strapi.db.query(uid).findMany();
        for (const row of rows) await strapi.db.query(uid).update({ where: { id: row.id }, data: Object.fromEntries(fields.map(field => [field, SENDER])) });
      }
      await store.set({ key: 'initial-email-setup-v1', value: true });
    }
    const accounts = await strapi.db.query(ACCOUNT).findMany({ limit: 1 });
    if (!accounts.length) await strapi.plugin('magic-mail').service('account-manager').createAccount({
      name: 'Kitchen Master — Savannah', provider: 'smtp', description: 'Connect Google Workspace with an app password, or switch to Gmail OAuth. Activate after connecting.',
      fromEmail: SENDER, fromName: 'Kitchen Master', replyTo: SENDER, isActive: false, isPrimary: true,
      dailyLimit: 500, hourlyLimit: 100, config: { host: 'smtp.gmail.com', port: 587, secure: false, user: SENDER, pass: '' },
    });
    const designer = strapi.plugin('magic-mail').service('email-designer');
    for (const template of [
      { templateReferenceId: 1001, name: 'Insiders welcome', subject: 'Welcome to Kitchen Master Insiders', category: 'transactional', bodyHtml: '<h1>Welcome to the table.</h1><p>You’re on the Kitchen Master Insiders list for {{locationName}}. Watch for restaurant news, specials, and upcoming events.</p>', bodyText: 'Welcome to Kitchen Master Insiders for {{locationName}}. Watch for restaurant news, specials, and upcoming events.' },
      { templateReferenceId: 1002, name: 'Insiders restaurant update', subject: 'Something new at Kitchen Master', category: 'marketing', bodyHtml: '<h1>A little news from our kitchen.</h1><p>Replace this demo text with your next special or event in the MagicMail template editor before sending.</p>', bodyText: 'Replace this demo text with your next special or event before sending.' },
    ]) if (!await strapi.db.query(TEMPLATE).findOne({ where: { templateReferenceId: template.templateReferenceId } })) await designer.create(template);
    // Install the approved reusable design on first deployment; preserve owner edits.
    if (!await strapi.db.query(TEMPLATE).findOne({ where: { templateReferenceId: 1003 } })) {
      const templates = require('./templates/insiders-edit.json');
      const results = await designer.importTemplates(templates);
      if (results.some(result => !result.success)) throw new Error('Could not install the Insiders email template.');
    }
  },
  controllers: { main: ({ strapi }) => {
    const router = () => strapi.plugin('magic-mail').service('email-router');
    const designer = () => strapi.plugin('magic-mail').service('email-designer');
    const db = (uid) => strapi.db.query(uid);
    const activeAccount = () => db(ACCOUNT).findOne({ where: { isActive: true }, select: ['id', 'fromEmail'] });
    const siteUrl = () => (process.env.FRONTEND_URL || '').replace(/\/$/, '');
    function unsubscribeUrl(subscriber) {
      if (!/^https?:\/\//.test(siteUrl())) throw new Error('FRONTEND_URL is required for unsubscribe links.');
      return `${siteUrl()}/api/insiders/unsubscribe?token=${encodeURIComponent(tokenFor(subscriber.documentId, process.env.INSIDERS_UNSUBSCRIBE_SECRET))}`;
    }
    async function optOut(subscriber) {
      await db(SUB).update({ where: { id: subscriber.id }, data: { status: 'unsubscribed', unsubscribedAt: new Date().toISOString() } });
      // Cancel pending mail too, so an already queued campaign honors the opt-out.
      await strapi.plugin('magic-mail').service('queue').forgetRecipient(subscriber.email);
    }
    async function newsletter(subscriber, rendered, key) {
      const url = unsubscribeUrl(subscriber);
      return router().send({ to: subscriber.email, ...withFooter(rendered, url, ADDRESS), unsubscribeUrl: url, type: 'marketing', enableTracking: false }, { queue: true, source: 'kitchen-master-insiders', idempotencyKey: key });
    }
    return {
      async overview(ctx) {
        const page = Math.max(1, Math.min(100000, Number(ctx.query.page) || 1));
        const search = String(ctx.query.search || '').slice(0, 254);
        const where = search ? { email: { $containsi: search } } : {};
        const [subscribers, total, subscribed, templates, locations, runs, account] = await Promise.all([
          db(SUB).findMany({ where, orderBy: { createdAt: 'desc' }, offset: (page - 1) * 50, limit: 50 }),
          db(SUB).count({ where }), db(SUB).count({ where: { status: 'subscribed' } }),
          db(TEMPLATE).findMany({ where: { isActive: true, category: 'marketing' }, select: ['templateReferenceId', 'name', 'subject'] }),
          strapi.documents('api::location.location').findMany({ status: 'published', fields: ['name', 'slug'] }),
          db(RUN).findMany({ orderBy: { createdAt: 'desc' }, limit: 20, select: ['documentId', 'name', 'status', 'queued', 'skipped', 'createdAt', 'leaseUntil'] }), activeAccount(),
        ]);
        ctx.body = { subscribers: subscribers.map(({ documentId, email, preferredLocation, status, consentAt }) => ({ documentId, email, preferredLocation, status, consentAt })), total, subscribed, page, templates, locations, runs, sender: account?.fromEmail || SENDER, connected: !!account, unsubscribeReady: !!siteUrl() && !!process.env.INSIDERS_UNSUBSCRIBE_SECRET };
      },
      async subscribe(ctx) {
        const email = cleanEmail(ctx.request.body?.email);
        const preferredLocation = ctx.request.body?.preferredLocation;
        if (!validEmail(email) || typeof preferredLocation !== 'string' || preferredLocation.length > 80) return ctx.badRequest('Invalid signup.');
        const location = await strapi.documents('api::location.location').findFirst({ filters: { slug: preferredLocation }, status: 'published' });
        if (!location) return ctx.badRequest('Please choose a valid restaurant.');
        let subscriber = await db(SUB).findOne({ where: { email } });
        if (subscriber) { ctx.body = { ok: true, created: false }; return; } // Never silently reverse an unsubscribe.
        try {
          subscriber = await strapi.documents(SUB).create({ data: { email, preferredLocation, status: 'subscribed', consentAt: new Date().toISOString(), consentSource: 'website-insiders-signup' } });
        } catch (error) {
          if (await db(SUB).findOne({ where: { email } })) { ctx.body = { ok: true, created: false }; return; }
          throw error;
        }
        if (await activeAccount()) {
          try {
            const rendered = await designer().renderTemplate(1001, { locationName: location.name });
            await newsletter(subscriber, rendered, `welcome:${subscriber.documentId}`);
          } catch { strapi.log.warn('[insiders] Signup saved; welcome could not be queued.'); }
        }
        ctx.body = { ok: true, created: true };
      },
      async email(ctx) {
        const message = ctx.request.body || {};
        // Only the website server is authenticated here, and recipients must still
        // match a currently configured CMS form recipient. This is not an open relay.
        const to = cleanEmail(message.to);
        const [locations, settings] = await Promise.all([strapi.documents('api::location.location').findMany({ status: 'published' }), strapi.documents('api::site-setting.site-setting').findFirst({ status: 'published' })]);
        const allowed = new Set([settings?.contactEmail, settings?.franchiseEmail, ...locations.flatMap(l => [l.contactEmail, l.privateDiningEmail, l.hiringEmail])].map(cleanEmail));
        if (!validEmail(to) || !allowed.has(to)) return ctx.badRequest('Recipient is not configured for a website form.');
        if (typeof message.subject !== 'string' || message.subject.length > 600 || /[\r\n]/.test(message.subject) || typeof message.html !== 'string' || message.html.length > 200000 || typeof message.text !== 'string' || message.text.length > 200000) return ctx.badRequest('Invalid email content.');
        if (message.replyTo && !validEmail(cleanEmail(message.replyTo))) return ctx.badRequest('Invalid reply address.');
        const attachments = message.attachments || [];
        if (!Array.isArray(attachments) || attachments.length > 1 || attachments.some(a => typeof a.filename !== 'string' || a.filename.length > 255 || !/\.(pdf|doc|docx)$/i.test(a.filename) || typeof a.content !== 'string' || a.content.length > 14 * 1024 * 1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(a.content))) return ctx.badRequest('Invalid attachment.');
        if (!await activeAccount()) { ctx.status = 503; ctx.body = { error: 'Connect the sending account in Strapi MagicMail first.' }; return; }
        const result = await router().send({ to, subject: message.subject, html: message.html, text: message.text, replyTo: cleanEmail(message.replyTo) || undefined, attachments: attachments.map(a => ({ filename: a.filename, content: Buffer.from(a.content, 'base64') })), type: 'transactional', enableTracking: false }, { queue: true, source: 'kitchen-master-forms', idempotencyKey: `form:${hash(String(message.idempotencyKey || JSON.stringify(message)))}` });
        ctx.body = { ok: true, queued: true, status: result.status };
      },
      async unsubscribe(ctx) {
        const id = tokenId(ctx.request.body?.token, process.env.INSIDERS_UNSUBSCRIBE_SECRET);
        if (!id) return ctx.badRequest('This unsubscribe link is invalid.');
        const subscriber = await db(SUB).findOne({ where: { documentId: id } });
        if (subscriber) await optOut(subscriber);
        ctx.body = { ok: true };
      },
      async adminUnsubscribe(ctx) {
        const subscriber = await db(SUB).findOne({ where: { documentId: ctx.params.id } });
        if (!subscriber) return ctx.notFound();
        await optOut(subscriber); ctx.body = { ok: true };
      },
      async prepare(ctx) {
        const { templateId, locations = [] } = ctx.request.body || {};
        if (!Array.isArray(locations) || locations.some(x => typeof x !== 'string') || locations.length > 100) return ctx.badRequest('Choose valid restaurants.');
        const template = await db(TEMPLATE).findOne({ where: { templateReferenceId: Number(templateId), isActive: true, category: 'marketing' } });
        if (!template) return ctx.badRequest('Choose an active marketing template.');
        const validLocations = await strapi.documents('api::location.location').findMany({ status: 'published', fields: ['slug'] });
        if (locations.some(x => !validLocations.some(l => l.slug === x))) return ctx.badRequest('Unknown restaurant.');
        const audience = await db(SUB).findMany({ where: { status: 'subscribed', ...(locations.length ? { preferredLocation: { $in: locations } } : {}) }, select: ['documentId'] });
        // Freeze the reviewed content and audience; edits/new signups cannot alter this send.
        const rendered = await designer().renderTemplate(Number(templateId), {});
        const campaign = await strapi.documents(RUN).create({ data: { name: template.name, status: 'prepared', locations, audience: audience.map(s => s.documentId), rendered, queued: 0, skipped: 0 } });
        const preview = withFooter(rendered, '#unsubscribe-preview', ADDRESS);
        ctx.body = { id: campaign.documentId, count: audience.length, subject: preview.subject, html: preview.html, text: preview.text };
      },
      async test(ctx) {
        const run = await db(RUN).findOne({ where: { documentId: ctx.request.body?.id } });
        if (!run) return ctx.notFound();
        if (!await activeAccount()) { ctx.status = 503; ctx.body = { error: { message: 'Connect the Google account in MagicMail first.' } }; return; }
        const rendered = withFooter(run.rendered, `${siteUrl()}/insiders/unsubscribe`, ADDRESS);
        await router().send({ to: SENDER, ...rendered, subject: `[TEST] ${rendered.subject}`, type: 'transactional', enableTracking: false }, { queue: true, source: 'insiders-test', idempotencyKey: `preview:${run.documentId}` });
        ctx.body = { ok: true };
      },
      async send(ctx) {
        const run = await db(RUN).findOne({ where: { documentId: ctx.request.body?.id } });
        if (!run) return ctx.notFound();
        if (!await activeAccount() || !siteUrl() || !process.env.INSIDERS_UNSUBSCRIBE_SECRET) { ctx.status = 503; ctx.body = { error: { message: 'Connect the sender and configure unsubscribe links before sending.' } }; return; }
        const now = new Date();
        if (run.createdAt && now.getTime() - new Date(run.createdAt).getTime() > 24 * 60 * 60 * 1000) return ctx.badRequest('This preview has expired. Prepare a fresh campaign before sending.');
        const claimed = await db(RUN).updateMany({ where: { id: run.id, $or: [{ status: { $in: ['prepared', 'partial'] } }, { status: 'queueing', leaseUntil: { $lt: now.toISOString() } }] }, data: { status: 'queueing', leaseUntil: new Date(now.getTime() + 15 * 60 * 1000).toISOString() } });
        if (!claimed.count) { ctx.status = 409; ctx.body = { error: { message: 'This campaign has already been queued or is being queued.' } }; return; }
        let queued = 0; let skipped = 0;
        try {
          for (const documentId of run.audience) {
            const subscriber = await db(SUB).findOne({ where: { documentId, status: 'subscribed' } });
            if (!subscriber) { skipped++; continue; }
            await newsletter(subscriber, run.rendered, `campaign:${run.documentId}:${documentId}`); queued++;
            if (queued % 50 === 0) await db(RUN).update({ where: { id: run.id }, data: { leaseUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString() } });
          }
          await db(RUN).update({ where: { id: run.id }, data: { status: 'queued', queued, skipped } });
          ctx.body = { ok: true, queued, skipped };
        } catch {
          await db(RUN).update({ where: { id: run.id }, data: { status: 'partial', queued, skipped } });
          ctx.status = 503; ctx.body = { error: { message: 'Queueing stopped. Retry this campaign; already queued recipients will not be duplicated.' } };
        }
      },
    };
  } },
};
