const test = require('node:test');
const assert = require('node:assert/strict');
const plugin = require('../src/plugins/insiders/server');
const { tokenFor, tokenId, sameSecret, withFooter } = require('../src/plugins/insiders/server/helpers');

test('unsubscribe signatures reject tampering, other secrets and malformed input', () => {
  const token = tokenFor('subscriber123', 'test-only-secret');
  assert.equal(tokenId(token, 'test-only-secret'), 'subscriber123');
  assert.equal(tokenId(token.replace('subscriber123', 'subscriber999'), 'test-only-secret'), null);
  assert.equal(tokenId(token, 'other-secret'), null);
  assert.equal(tokenId(token + '.extra', 'test-only-secret'), null);
  assert.equal(tokenId(token, ''), null);
  assert.equal(sameSecret(undefined, 'secret'), false);
  assert.equal(sameSecret('', ''), false);
});

test('every newsletter receives an escaped unsubscribe footer and plain text alternative', () => {
  const email = withFooter({ subject: 'News', html: '<h1>News</h1>', text: 'News' }, 'https://example.com/?a=1&b=2', 'One & Two');
  assert.match(email.html, /a=1&amp;b=2/);
  assert.match(email.html, /One &amp; Two/);
  assert.match(email.text, /Unsubscribe: https:\/\/example.com/);
});

test('all website routes require the integration policy and all admin routes require manage permission', () => {
  for (const route of plugin.routes['content-api'].routes) assert.deepEqual(route.config.policies, ['plugin::insiders.website']);
  for (const route of plugin.routes.admin.routes) {
    assert.ok(route.config.policies.includes('admin::isAuthenticatedAdmin'));
    assert.deepEqual(route.config.policies[1].config.actions, ['plugin::insiders.manage']);
  }
});

function harness({ existing, account = null } = {}) {
  let created = 0; let sent = 0;
  const strapi = {
    db: { query(uid) { return { findOne: async () => uid.includes('subscriber') ? existing : account }; } },
    documents(uid) { return { findFirst: async () => ({ slug: 'suwanee', name: 'Suwanee' }), create: async () => { created++; return { documentId: 'new123' }; }, findMany: async () => uid.includes('location') ? [{ contactEmail: 'owner@example.com' }] : [] }; },
    plugin() { return { service() { return { send: async () => { sent++; } }; } }; }, log: { warn() {} },
  };
  const ctx = { request: { body: { email: 'person@example.com', preferredLocation: 'suwanee' } }, badRequest(message) { this.status = 400; this.body = message; } };
  return { controller: plugin.controllers.main({ strapi }), ctx, counts: () => ({ created, sent }) };
}

test('a signup never reactivates an unsubscribed address or sends it a welcome', async () => {
  const h = harness({ existing: { status: 'unsubscribed' } });
  await h.controller.subscribe(h.ctx);
  assert.deepEqual(h.counts(), { created: 0, sent: 0 });
  assert.deepEqual(h.ctx.body, { ok: true, created: false });
});

test('signup is saved while the email account is disconnected', async () => {
  const h = harness(); await h.controller.subscribe(h.ctx);
  assert.deepEqual(h.counts(), { created: 1, sent: 0 });
  assert.deepEqual(h.ctx.body, { ok: true, created: true });
});

test('the website bridge refuses an arbitrary email recipient', async () => {
  const h = harness(); h.ctx.request.body = { to: 'attacker@example.com', subject: 'hello', html: 'hello', text: 'hello' };
  await h.controller.email(h.ctx);
  assert.equal(h.ctx.status, 400); assert.equal(h.counts().sent, 0);
});

test('forms fail before queueing when no sending account is active', async () => {
  const h = harness(); h.ctx.request.body = { to: 'owner@example.com', subject: 'hello', html: 'hello', text: 'hello' };
  await h.controller.email(h.ctx);
  assert.equal(h.ctx.status, 503); assert.equal(h.counts().sent, 0);
});

test('campaign retries use the same per-recipient key and skip new opt-outs', async () => {
  const sent = []; const updates = [];
  const run = { id: 1, documentId: 'campaign123', audience: ['active123', 'optedout123'], rendered: { subject: 'News', html: '<p>News</p>', text: 'News' } };
  const strapi = {
    db: { query(uid) { return {
      findOne: async ({ where }) => uid.includes('campaign') ? run : uid.includes('email-account') ? { fromEmail: 'owner@example.com' } : where.documentId === 'active123' ? { email: 'person@example.com', documentId: 'active123', status: 'subscribed' } : null,
      updateMany: async () => ({ count: 1 }), update: async ({ data }) => { updates.push(data); },
    }; } },
    plugin() { return { service() { return { send: async (message, options) => { sent.push({ message, options }); return { queued: true }; } }; } }; },
  };
  const oldUrl = process.env.FRONTEND_URL; const oldSecret = process.env.INSIDERS_UNSUBSCRIBE_SECRET;
  process.env.FRONTEND_URL = 'https://example.com'; process.env.INSIDERS_UNSUBSCRIBE_SECRET = 'test-only-secret';
  try {
    const controller = plugin.controllers.main({ strapi });
    for (let attempt = 0; attempt < 2; attempt++) {
      const ctx = { request: { body: { id: run.documentId } } };
      await controller.send(ctx);
      assert.deepEqual(ctx.body, { ok: true, queued: 1, skipped: 1 });
    }
    assert.equal(sent.length, 2);
    assert.equal(sent[0].options.idempotencyKey, sent[1].options.idempotencyKey);
    assert.equal(sent[0].message.to, 'person@example.com');
    assert.match(sent[0].message.unsubscribeUrl, /^https:\/\/example.com\/api\/insiders\/unsubscribe\?token=/);
    assert.equal(sent[0].options.queue, true);
    assert.equal(updates.at(-1).status, 'queued');
  } finally {
    if (oldUrl === undefined) delete process.env.FRONTEND_URL; else process.env.FRONTEND_URL = oldUrl;
    if (oldSecret === undefined) delete process.env.INSIDERS_UNSUBSCRIBE_SECRET; else process.env.INSIDERS_UNSUBSCRIBE_SECRET = oldSecret;
  }
});

test('production sender transfer runs once and preserves an active account', async () => {
  const previous = process.env.KITCHEN_MASTER_MAIL_ACCOUNT_TRANSFER;
  process.env.KITCHEN_MASTER_MAIL_ACCOUNT_TRANSFER = JSON.stringify({ fromEmail: 'savannah@andrewandsavannahconsulting.com', config: { encrypted: 'v1:test-only' } });
  try {
    for (const active of [false, true]) {
      const flags = new Map([['initial-email-setup-v1', true]]);
      const updates = [];
      const strapi = {
        store: () => ({ get: async ({ key }) => flags.get(key), set: async ({ key, value }) => flags.set(key, value) }),
        db: { query: uid => ({ findMany: async () => [{ id: 1 }], findOne: async () => uid.includes('email-account') ? { id: 1, isActive: active } : { id: 2 }, update: async value => updates.push(value) }) },
        plugin: () => ({ service: () => ({}) }),
      };
      await plugin.bootstrap({ strapi });
      await plugin.bootstrap({ strapi });
      assert.equal(updates.length, active ? 0 : 1);
      if (!active) assert.deepEqual(updates[0].data, { config: { encrypted: 'v1:test-only' }, isActive: true });
    }
  } finally {
    if (previous === undefined) delete process.env.KITCHEN_MASTER_MAIL_ACCOUNT_TRANSFER;
    else process.env.KITCHEN_MASTER_MAIL_ACCOUNT_TRANSFER = previous;
  }
});
