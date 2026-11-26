// Permanent storage for the live site: Upstash Redis (free), added in Vercel → Storage / Marketplace.
// Uses KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// The admin panel can only ADD history entries; nothing in this code edits or deletes them.
const {sealEntry, verifyChain, summarize, dayList} = require('./_core');

const base = () => process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const storeReady = () => Boolean(base() && token());
const KEEP = 60 * 60 * 24 * 400; // analytics counters kept ~13 months

async function redis(commands) {
  const res = await fetch(base().replace(/\/$/, '') + '/pipeline', {
    method: 'POST', headers: {Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json'}, body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error('Storage error ' + res.status);
  return (await res.json()).map(r => { if (r.error) throw new Error(r.error); return r.result; });
}
const hash = flat => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]); return o; };

// Who is making the request: IP and Vercel's location headers.
function requestInfo(req) {
  const h = req.headers, dec = v => { try { return decodeURIComponent(v || ''); } catch { return v || ''; } };
  return {
    ip: String(h['x-forwarded-for'] || '').split(',')[0].trim() || h['x-real-ip'] || req.socket?.remoteAddress || '',
    city: dec(h['x-vercel-ip-city']), region: h['x-vercel-ip-country-region'] || '', country: h['x-vercel-ip-country'] || '',
    ua: String(h['user-agent'] || '').slice(0, 300)
  };
}

/* ---------- History (append-only) ---------- */
async function appendHistory(entry) {
  if (!storeReady()) return;
  const [prev] = await redis([['GET', 'history:last']]);
  const sealed = sealEntry(entry, prev);
  await redis([['LPUSH', 'history', JSON.stringify(sealed)], ['SET', 'history:last', sealed.hash]]);
}
const logSafe = entry => appendHistory(entry).catch(e => console.error('history', e.message));
async function readHistory(start = 0, count = 100) {
  // fetch one extra so the last shown entry can be checked against the one before it
  const [list, total] = await redis([['LRANGE', 'history', start, start + count], ['LLEN', 'history']]);
  const parsed = list.map(s => JSON.parse(s));
  return {entries: verifyChain(parsed).slice(0, count), total};
}

/* ---------- Analytics ---------- */
async function trackEvent(ev, info) {
  const day = new Date().toISOString().slice(0, 10);
  const cmds = [];
  const inc = (key, field) => { cmds.push(['HINCRBY', `${key}:${day}`, field, 1], ['EXPIRE', `${key}:${day}`, KEEP]); };
  if (ev.type === 'pageview') {
    inc('pv', ev.path);
    cmds.push(['PFADD', `vis:${day}`, ev.vid], ['EXPIRE', `vis:${day}`, KEEP]);
    if (ev.ref) inc('ref', ev.ref);
    if (ev.dev) inc('dev', ev.dev);
    if (info.country) inc('ctry', info.country);
  } else inc('clk', `${ev.label}${ev.href ? ' → ' + ev.href : ''}`);
  cmds.push(['LPUSH', 'events', JSON.stringify({t: new Date().toISOString(), type: ev.type, path: ev.path, label: ev.label, href: ev.href, dev: ev.dev, ref: ev.ref, city: info.city, country: info.country})], ['LTRIM', 'events', 0, 299]);
  await redis(cmds);
}
async function readAnalytics(n) {
  const days = dayList(n), cmds = [];
  for (const d of days) cmds.push(['HGETALL', `pv:${d}`], ['PFCOUNT', `vis:${d}`], ['HGETALL', `clk:${d}`], ['HGETALL', `ref:${d}`], ['HGETALL', `dev:${d}`], ['HGETALL', `ctry:${d}`]);
  cmds.push(['PFCOUNT', ...days.map(d => `vis:${d}`)], ['LRANGE', 'events', 0, 59]);
  const r = await redis(cmds);
  const perDay = days.map((date, i) => { const o = i * 6; return {date, pv: hash(r[o]), visitors: r[o + 1], clk: hash(r[o + 2]), ref: hash(r[o + 3]), dev: hash(r[o + 4]), ctry: hash(r[o + 5])}; });
  return summarize(perDay, r[r.length - 2], r[r.length - 1].map(s => JSON.parse(s)));
}

module.exports = {storeReady, requestInfo, appendHistory, logSafe, readHistory, trackEvent, readAnalytics};
