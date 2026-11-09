import React, { useEffect, useState } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';
import { Link } from 'react-router-dom';
import './style.css';

type Overview = { subscribers: any[]; total: number; subscribed: number; page: number; templates: any[]; locations: any[]; runs: any[]; sender: string; connected: boolean; unsubscribeReady: boolean };
type Preview = { id: string; count: number; subject: string; html: string; text: string };
export default function Page() {
  const { get, post } = useFetchClient();
  const [data, setData] = useState<Overview | null>(null);
  const [templateId, setTemplateId] = useState('');
  const [locations, setLocations] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  async function refresh() {
    const result = await get(`/insiders/overview?page=${page}&search=${encodeURIComponent(search)}`);
    setData(result.data);
  }
  useEffect(() => { refresh().catch(() => setNotice('Could not load Insiders. Refresh the page to retry.')); }, [page]);
  async function action(work: () => Promise<void>) {
    setBusy(true); setNotice('');
    try { await work(); } catch (error: any) { setNotice(error?.response?.data?.error?.message || 'Could not complete this action. Please try again.'); }
    finally { setBusy(false); }
  }
  function clearPreview() { setPreview(null); setConfirmed(false); }
  if (!data) return <main className="km-insiders"><h1>Kitchen Master Insiders</h1><p role="status">{notice || 'Loading…'}</p></main>;
  return <main className="km-insiders">
    <header><div><p className="eyebrow">KITCHEN MASTER</p><h1>Insiders</h1><p>Manage subscribers and send restaurant updates from Strapi.</p></div><strong>{data.subscribed} subscribed</strong></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    <section className="panel connection"><div><h2>{data.connected ? 'Sending account enabled' : 'Connect your sending account'}</h2><p>{data.sender}</p><p>{data.connected ? 'Delivery and retry details are available in the MagicMail outbox.' : 'In MagicMail, edit the prepared Google Workspace account, connect it, then enable it. Website signups can already be saved.'}</p></div><Link to="/plugins/magic-mail">Open MagicMail →</Link></section>
    <section className="panel"><h2>Send an update</h2><p>Edit the email in <Link to="/plugins/magic-mail">MagicMail’s template editor</Link>, then choose its marketing template here.</p>
      <label htmlFor="km-template">Email template</label><select id="km-template" value={templateId} onChange={e => { setTemplateId(e.target.value); clearPreview(); }}><option value="">Choose a marketing template</option>{data.templates.map(t => <option key={t.templateReferenceId} value={t.templateReferenceId}>{t.name} — {t.subject}</option>)}</select>
      <fieldset><legend>Restaurants</legend><p>Leave all unchecked to include every subscribed restaurant.</p><div className="restaurants">{data.locations.map(l => <label key={l.slug}><input type="checkbox" checked={locations.includes(l.slug)} onChange={e => { setLocations(e.target.checked ? [...locations, l.slug] : locations.filter(x => x !== l.slug)); clearPreview(); }} />{l.name}</label>)}</div></fieldset>
      <button disabled={busy || !templateId} onClick={() => action(async () => { const result = await post('/insiders/prepare', { templateId: Number(templateId), locations }); setPreview(result.data); setConfirmed(false); })}>Preview email and audience</button>
      {preview && <div className="preview"><h3>{preview.subject}</h3><p>{preview.count} subscribed recipient{preview.count === 1 ? '' : 's'} · {locations.length ? locations.join(', ') : 'All restaurants'}</p>
        <iframe title="Email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={`<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: ${window.location.origin}; style-src 'unsafe-inline'">${preview.html}`} />
        <button disabled={busy || !data.connected} onClick={() => action(async () => { await post('/insiders/test', { id: preview.id }); setNotice('Test queued to savannah@andrewandsavannahconsulting.com. Check MagicMail’s outbox for delivery.'); })}>Send test to Savannah</button>
        <label className="confirmation"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I’ve reviewed this email and its {preview.count} recipients.</label>
        <button disabled={busy || !confirmed || !preview.count || !data.connected || !data.unsubscribeReady} onClick={() => action(async () => { const result = await post('/insiders/send', { id: preview.id }); setNotice(`${result.data.queued} emails queued. ${result.data.skipped} unsubscribed recipients skipped. Delivery status is in MagicMail.`); clearPreview(); await refresh(); })}>Queue campaign to {preview.count} recipients</button>
      </div>}
    </section>
    <section className="panel"><h2>Subscribers</h2><form className="search" onSubmit={e => { e.preventDefault(); action(refresh); }}><label htmlFor="km-search">Find email</label><input id="km-search" type="search" value={search} onChange={e => setSearch(e.target.value)} /><button disabled={busy}>Search</button></form>
      <div className="table-wrap"><table><thead><tr><th>Email</th><th>Restaurant</th><th>Status</th><th>Joined</th><th>Action</th></tr></thead><tbody>{data.subscribers.map(s => <tr key={s.documentId}><td>{s.email}</td><td>{s.preferredLocation}</td><td>{s.status}</td><td>{new Date(s.consentAt).toLocaleDateString()}</td><td>{s.status === 'subscribed' && <button disabled={busy} onClick={() => action(async () => { await post(`/insiders/subscriber/${s.documentId}/unsubscribe`, {}); await refresh(); setNotice('Subscriber opted out. Pending emails were cancelled.'); })}>Unsubscribe</button>}</td></tr>)}</tbody></table></div>
      {!data.total && <p>No subscribers yet. Website Insiders signups will appear here.</p>}
      <div className="pagination"><button disabled={busy || page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} · {data.total} total</span><button disabled={busy || page * 50 >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
    </section>
    <section className="panel"><h2>Recent campaigns</h2>{!data.runs.length ? <p>No campaigns prepared yet.</p> : data.runs.map(r => <div className="run" key={r.documentId}><span>{r.name} · {r.status} · {r.queued} queued{r.skipped ? ` · ${r.skipped} skipped` : ''}</span>{(r.status === 'partial' || (r.status === 'queueing' && r.leaseUntil && new Date(r.leaseUntil).getTime() < Date.now())) && <button disabled={busy || !data.connected} onClick={() => action(async () => { await post('/insiders/send', { id: r.documentId }); await refresh(); setNotice('Campaign queue resumed.'); })}>Resume queue</button>}</div>)}</section>
  </main>;
}
