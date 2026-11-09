'use strict';
const { createHmac, timingSafeEqual, createHash } = require('node:crypto');
const cleanEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const validEmail = (value) => value.length <= 254 && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value);
function sameSecret(actual, expected) {
  if (!expected || typeof actual !== 'string') return false;
  const a = Buffer.from(actual); const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
function tokenFor(id, secret) {
  if (!secret) throw new Error('INSIDERS_UNSUBSCRIBE_SECRET is not configured.');
  return `${id}.${createHmac('sha256', secret).update(id).digest('base64url')}`;
}
function tokenId(token, secret) {
  if (typeof token !== 'string' || token.length > 200 || !secret) return null;
  const [id, signature, extra] = token.split('.');
  if (!id || !signature || extra || !/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return sameSecret(token, tokenFor(id, secret)) ? id : null;
}
const hash = (value) => createHash('sha256').update(value).digest('hex');
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function withFooter(rendered, url, address) {
  return {
    subject: rendered.subject,
    html: `${rendered.html || rendered.bodyHtml || ''}<hr><p style="font-size:12px;color:#666">Kitchen Master · ${escape(address)}<br>You received this because you joined Kitchen Master Insiders. <a href="${escape(url)}">Unsubscribe</a></p>`,
    text: `${rendered.text || rendered.bodyText || ''}\n\nKitchen Master · ${address}\nYou received this because you joined Kitchen Master Insiders. Unsubscribe: ${url}`,
  };
}
module.exports = { cleanEmail, validEmail, sameSecret, tokenFor, tokenId, hash, escape, withFooter };
