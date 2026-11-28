// Shared by the live API (Vercel) and the local server: change summaries, the sealed history chain, analytics summaries.
const crypto = require('node:crypto');

/* ---------- What changed in a publish, in plain words ---------- */
const str = v => (v == null ? '' : typeof v === 'string' ? v : JSON.stringify(v));
const short = v => { const s = str(v).replace(/\s+/g, ' ').trim(); return s.length > 90 ? s.slice(0, 87) + '…' : s || '(empty)'; };
const file = src => String(src || '').split('/').pop();

function diffData(before, after) {
  if (!before) return ['First publish (no earlier version to compare)'];
  const out = [];
  // Settings
  const sKeys = new Set([...Object.keys(before.settings || {}), ...Object.keys(after.settings || {})]);
  for (const k of sKeys) if (str(before.settings?.[k]) !== str(after.settings?.[k])) out.push(`Settings · ${k}: "${short(before.settings?.[k])}" → "${short(after.settings?.[k])}"`);
  // Photos
  const bp = new Map((before.photos || []).map(p => [p.id, p])), ap = new Map((after.photos || []).map(p => [p.id, p]));
  const added = [...ap.keys()].filter(id => !bp.has(id)), removed = [...bp.keys()].filter(id => !ap.has(id));
  if (added.length) out.push(`Photos · added ${added.length}: ${added.slice(0, 8).map(id => file(ap.get(id).src)).join(', ')}${added.length > 8 ? '…' : ''}`);
  if (removed.length) out.push(`Photos · deleted ${removed.length}: ${removed.slice(0, 8).map(id => file(bp.get(id).src)).join(', ')}${removed.length > 8 ? '…' : ''}`);
  for (const [id, a] of ap) {
    const b = bp.get(id); if (!b) continue;
    if (a.src !== b.src) out.push(`Photo ${file(b.original || b.src)} · ${a.src === a.original ? 'restored to original' : 'edited/cropped'}`);
    if (str(a.alt) !== str(b.alt)) out.push(`Photo ${file(a.src)} · description "${short(b.alt)}" → "${short(a.alt)}"`);
    if ((a.wall !== false) !== (b.wall !== false)) out.push(`Photo ${file(a.src)} · ${a.wall !== false ? 'added to' : 'removed from'} moving wall`);
  }
  // Photo spots
  const slotKeys = new Set([...Object.keys(before.slots || {}), ...Object.keys(after.slots || {})]);
  for (const k of slotKeys) if (str(before.slots?.[k]) !== str(after.slots?.[k])) out.push(`Photo spot "${k}" · photos changed`);
  // Partners and blog posts
  const listDiff = (label, nameOf, fields, b = [], a = []) => {
    const bm = new Map(b.map(x => [x.id, x])), am = new Map(a.map(x => [x.id, x]));
    for (const [id, x] of am) if (!bm.has(id)) out.push(`${label} · added "${short(nameOf(x))}"`);
    for (const [id, x] of bm) if (!am.has(id)) out.push(`${label} · deleted "${short(nameOf(x))}"`);
    for (const [id, x] of am) {
      const y = bm.get(id); if (!y) continue;
      for (const f of fields) if (str(x[f]) !== str(y[f])) out.push(`${label} "${short(nameOf(x))}" · ${f}: ${f === 'body' ? 'text edited' : `"${short(y[f])}" → "${short(x[f])}"`}`);
    }
    const order = l => l.map(x => x.id).filter(id => am.has(id) && bm.has(id)).join();
    if (order(b) !== order(a)) out.push(`${label}s · order changed`);
  };
  listDiff('Partner', x => x.name, ['name', 'url', 'description', 'logo', 'featured'], before.partners, after.partners);
  listDiff('Team member', x => x.name, ['name', 'role', 'photo'], before.team, after.team);
  listDiff('Blog post', x => x.title, ['title', 'tag', 'date', 'summary', 'body', 'photo', 'gallery'], before.posts, after.posts);
  return out.length ? out.slice(0, 150) : ['No visible changes'];
}

/* ---------- Sealed history: each entry carries a fingerprint of itself and the one before ---------- */
const fingerprint = e => crypto.createHash('sha256').update(JSON.stringify(e)).digest('hex');
function sealEntry(entry, prevHash) {
  const e = {t: new Date().toISOString(), ...entry, prev: prevHash || 'genesis'};
  return {...e, hash: fingerprint(e)};
}
// list is newest first. Marks each entry ok/false: its own fingerprint matches and it links to the next-older entry.
function verifyChain(list) {
  return list.map((e, i) => {
    const {hash, ...rest} = e;
    const selfOk = fingerprint(rest) === hash;
    const older = list[i + 1];
    return {...e, ok: selfOk && (!older || e.prev === older.hash)};
  });
}

/* ---------- Analytics summary ---------- */
const add = (into, obj) => { for (const [k, v] of Object.entries(obj || {})) into[k] = (into[k] || 0) + Number(v); };
const top = (obj, n = 12) => Object.entries(obj).sort((a, b) => b[1] - a[1]).slice(0, n);
// days: [{date, pv:{path:n}, visitors:n, clk:{}, ref:{}, dev:{}, ctry:{}}] oldest → newest
function summarize(days, uniqueVisitors, events) {
  const pv = {}, clk = {}, ref = {}, dev = {}, ctry = {};
  for (const d of days) { add(pv, d.pv); add(clk, d.clk); add(ref, d.ref); add(dev, d.dev); add(ctry, d.ctry); }
  const pageviews = Object.values(pv).reduce((a, b) => a + b, 0);
  const clicks = Object.values(clk).reduce((a, b) => a + b, 0);
  return {
    totals: {visitors: uniqueVisitors, pageviews, clicks, pagesPerVisitor: uniqueVisitors ? +(pageviews / uniqueVisitors).toFixed(1) : 0},
    daily: days.map(d => ({date: d.date, visitors: d.visitors, pageviews: Object.values(d.pv || {}).reduce((a, b) => a + Number(b), 0)})),
    pages: top(pv), clicks: top(clk, 15), referrers: top(ref), devices: top(dev), countries: top(ctry), events
  };
}
const dayList = n => Array.from({length: n}, (_, i) => new Date(Date.now() - (n - 1 - i) * 864e5).toISOString().slice(0, 10));

/* ---------- Cleaning analytics input from the public site ---------- */
const clean = (v, n) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').slice(0, n);
function cleanEvent(body) {
  const type = body.type === 'click' ? 'click' : body.type === 'pageview' ? 'pageview' : null;
  if (!type) return null;
  const path = clean(body.path, 120).startsWith('/') ? clean(body.path, 120) : '/';
  return {type, path, vid: clean(body.vid, 40) || 'anon', ref: clean(body.ref, 80), dev: ['Phone', 'Tablet', 'Desktop'].includes(body.dev) ? body.dev : '',
    label: clean(body.label, 60), href: clean(body.href, 160)};
}

module.exports = {diffData, sealEntry, verifyChain, summarize, dayList, cleanEvent};
