import assert from 'node:assert/strict';
import test from 'node:test';
import config from '../config/admin.ts';
const env = (key, fallback) => ({FRONTEND_URL:'http://localhost:3000',PREVIEW_SECRET:'test-only'}[key] ?? fallback);
env.bool = (_, fallback) => fallback;
const handler = config({env}).preview.config.handler;
async function destination(type, entry, status='draft') {
  global.strapi = {documents:()=>({findOne:async()=>entry})};
  const url = new URL(await handler(`api::${type}.${type}`, {documentId:'test-document',status}));
  assert.equal(url.pathname,'/api/preview');
  assert.equal(url.searchParams.get('secret'),'test-only');
  return new URL(url.searchParams.get('path'),url.origin);
}
test('preview opens the edited page slug and selected restaurant', async () => {
  const url = await destination('site-page',{slug:'private-dining-texas',pageType:'private-dining',locations:[{slug:'southlake'}]});
  assert.equal(url.pathname,'/pages/private-dining-texas');
  assert.equal(url.searchParams.get('location'),'southlake');
});
test('menu preview selects the item category and menu section', async () => {
  const url=await destination('menu-item',{locations:[{slug:'frisco'}],category:{name:'Cocktails',menuType:'drink'}});
  assert.equal(url.hash,'#drinks');
  assert.equal(url.searchParams.get('category'),'Cocktails');
});
test('home, careers, and specials preview their actual pages', async () => {
  assert.equal((await destination('site-page',{pageType:'home'})).pathname,'/');
  assert.equal((await destination('site-page',{pageType:'careers',restaurantScope:'frisco'})).pathname,'/careers/frisco');
  assert.equal((await destination('happening',{happeningType:'special'})).pathname,'/pages/specials');
});
