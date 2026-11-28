// Permanent storage for the live site (history + analytics). Works with any of:
//   • Upstash / Vercel KV REST settings:  *KV_REST_API_URL + *KV_REST_API_TOKEN  or  *UPSTASH_REDIS_REST_URL + *_TOKEN
//   • A regular Redis connection string:  *REDIS_URL or *KV_URL  (redis:// or rediss://), e.g. Vercel's "Redis" integration
// Any custom prefix Vercel adds (e.g. STORAGE_KV_REST_API_URL) is detected automatically.
// The admin panel can only ADD history entries; nothing in this code edits or deletes them.
const net = require('node:net');
const tls = require('node:tls');
const {sealEntry, verifyChain, summarize, dayList} = require('./_core');

function findStore() {
  const env = process.env, keys = Object.keys(env);
  const restUrl = keys.find(k => /(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/.test(k) && /^https:\/\//.test(env[k] || ''));
  if (restUrl) {
    const prefix = restUrl.replace(/(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/, '');
    const tokenKey = [prefix + 'KV_REST_API_TOKEN', prefix + 'UPSTASH_REDIS_REST_TOKEN', 'KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN'].find(k => env[k]);
    if (tokenKey) return {kind: 'rest', url: env[restUrl], token: env[tokenKey]};
  }
  const tcpKey = keys.find(k => /(REDIS_URL|KV_URL)$/.test(k) && /^rediss?:\/\//.test(env[k] || ''));
  if (tcpKey) return {kind: 'tcp', url: env[tcpKey]};
  return null;
}
const storeReady = () => Boolean(findStore());
// Names (never values) of storage-looking settings, to help diagnose setup problems.
const storeSettingNames = () => Object.keys(process.env).filter(k => /REDIS|KV_|UPSTASH/.test(k)).sort();
const KEEP = 60 * 60 * 24 * 400; // analytics counters kept ~13 months

/* ---------- Redis over HTTPS (Upstash REST) ---------- */
async function restPipeline(store, commands) {
  const res = await fetch(store.url.replace(/\/$/, '') + '/pipeline', {
    method: 'POST', headers: {Authorization: `Bearer ${store.token}`, 'Content-Type': 'application/json'}, body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error('Storage error ' + res.status + (res.status === 401 ? ' (token rejected)' : ''));
  return (await res.json()).map(r => { if (r.error) throw new Error(r.error); return r.result; });
}

/* ---------- Redis over a normal connection (redis:// or rediss://), no extra packages ---------- */
const encode = args => `*${args.length}\r\n` + args.map(a => { const s = String(a); return `$${Buffer.byteLength(s)}\r\n${s}\r\n`; }).join('');
// Parses one RESP reply at `pos`; returns [value, nextPos] or null if more data is needed.
function parse(buf, pos) {
  const end = buf.indexOf('\r\n', pos);
  if (end < 0) return null;
  const type = String.fromCharCode(buf[pos]), line = buf.toString('utf8', pos + 1, end);
  if (type === '+') return [line, end + 2];
  if (type === '-') return [{error: line}, end + 2];
  if (type === ':') return [Number(line), end + 2];
  if (type === '$') {
    const n = Number(line); if (n < 0) return [null, end + 2];
    if (buf.length < end + 2 + n + 2) return null;
    return [buf.toString('utf8', end + 2, end + 2 + n), end + 2 + n + 2];
  }
  if (type === '*') {
    const n = Number(line); if (n < 0) return [null, end + 2];
    const out = []; let p = end + 2;
    for (let i = 0; i < n; i++) { const r = parse(buf, p); if (!r) return null; out.push(r[0]); p = r[1]; }
    return [out, p];
  }
  throw new Error('Unexpected reply from Redis');
}
function tcpPipeline(store, commands) {
  const u = new URL(store.url);
  const pre = [];
  if (u.password) pre.push(u.username && u.username !== 'default' ? ['AUTH', decodeURIComponent(u.username), decodeURIComponent(u.password)] : ['AUTH', decodeURIComponent(u.password)]);
  const db = Number((u.pathname || '').slice(1));
  if (db) pre.push(['SELECT', db]);
  const all = [...pre, ...commands];
  return new Promise((resolve, reject) => {
    const opts = {host: u.hostname, port: Number(u.port || 6379)};
    const sock = u.protocol === 'rediss:' ? tls.connect({...opts, servername: u.hostname}) : net.connect(opts);
    let buf = Buffer.alloc(0); const replies = [];
    const timer = setTimeout(() => { sock.destroy(); reject(new Error('Redis connection timed out')); }, 8000);
    sock.on(u.protocol === 'rediss:' ? 'secureConnect' : 'connect', () => sock.write(all.map(encode).join('')));
    sock.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      let pos = 0, r;
      while (replies.length < all.length && (r = parse(buf, pos))) { replies.push(r[0]); pos = r[1]; }
      buf = buf.subarray(pos);
      if (replies.length === all.length) {
        clearTimeout(timer); sock.end();
        const authErr = replies.slice(0, pre.length).find(x => x && x.error);
        if (authErr) return reject(new Error('Redis login failed: ' + authErr.error));
        try { resolve(replies.slice(pre.length).map(x => { if (x && x.error) throw new Error(x.error); return x; })); } catch (e) { reject(e); }
      }
    });
    sock.on('error', e => { clearTimeout(timer); reject(new Error('Redis connection failed: ' + e.message)); });
  });
}

async function redis(commands) {
  const store = findStore();
  if (!store) throw new Error('not connected');
  return store.kind === 'rest' ? restPipeline(store, commands) : tcpPipeline(store, commands);
}
async function storeCheck() {
  const store = findStore();
  if (!store) return {ok: false, kind: null, error: 'No Redis settings found', settings: storeSettingNames()};
  try { await redis([['PING']]); return {ok: true, kind: store.kind, settings: storeSettingNames()}; }
  catch (e) { return {ok: false, kind: store.kind, error: e.message, settings: storeSettingNames()}; }
}
const hash = flat => { const o = {}; for (let i = 0; i < (flat || []).length; i += 2) o[flat[i]] = Number(flat[i + 1]); return o; };

// Who is making the request: IP and Vercel's location headers.
function requestInfo(req) {
  const h = req.headers, dec = v => { try { return decodeURIComponent(v || ''); } catch { return v || ''; } };
  return {
    ip: String(h['x-forwarded-for'] || '').split(',')[0].trim() || h['x-real-ip'] || req.socket?.remoteAddress || '',
    city: dec(h['x-vercel-ip-city']), region: h['x-vercel-ip-country-region'] || '', country: h['x-vercel-ip-country'] || '',
    postal: h['x-vercel-ip-postal-code'] || '',
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
    if (info.city) inc('city', [info.city, info.region, info.country].filter(Boolean).join(', '));
  } else inc('clk', `${ev.label}${ev.href ? ' → ' + ev.href : ''}`);
  cmds.push(['LPUSH', 'events', JSON.stringify({t: new Date().toISOString(), type: ev.type, path: ev.path, label: ev.label, href: ev.href, dev: ev.dev, ref: ev.ref, city: info.city, region: info.region, postal: info.postal, country: info.country, device: info.device, visitor: info.visitor, first: ev.first})], ['LTRIM', 'events', 0, 299]);
  await redis(cmds);
}
async function readAnalytics(n) {
  const days = dayList(n), cmds = [];
  for (const d of days) cmds.push(['HGETALL', `pv:${d}`], ['PFCOUNT', `vis:${d}`], ['HGETALL', `clk:${d}`], ['HGETALL', `ref:${d}`], ['HGETALL', `dev:${d}`], ['HGETALL', `ctry:${d}`], ['HGETALL', `city:${d}`]);
  cmds.push(['PFCOUNT', ...days.map(d => `vis:${d}`)], ['LRANGE', 'events', 0, 59]);
  const r = await redis(cmds);
  const perDay = days.map((date, i) => { const o = i * 7; return {date, pv: hash(r[o]), visitors: r[o + 1], clk: hash(r[o + 2]), ref: hash(r[o + 3]), dev: hash(r[o + 4]), ctry: hash(r[o + 5]), city: hash(r[o + 6])}; });
  return summarize(perDay, r[r.length - 2], r[r.length - 1].map(s => JSON.parse(s)));
}

/* ---------- Applications ---------- */
async function saveApplication(app) { await redis([['SET', 'app:' + app.id, JSON.stringify(app)], ['LPUSH', 'apps', app.id]]); }
async function listApplications() {
  const [ids] = await redis([['LRANGE', 'apps', 0, 1999]]);
  if (!ids || !ids.length) return [];
  const vals = await redis(ids.map(id => ['GET', 'app:' + id]));
  return vals.filter(Boolean).map(v => JSON.parse(v));
}
async function updateApplication(id, patch) {
  const [v] = await redis([['GET', 'app:' + id]]);
  if (!v) throw new Error('Application not found');
  const app = {...JSON.parse(v), ...patch};
  await redis([['SET', 'app:' + id, JSON.stringify(app)]]);
  return app;
}
// true while under the limit (e.g. 8 submissions per hour per IP)
async function underLimit(key, max, seconds) { const [n] = await redis([['INCR', key], ['EXPIRE', key, seconds]]); return Number(n) <= max; }

module.exports = {saveApplication, listApplications, updateApplication, underLimit, storeReady, storeCheck, requestInfo, appendHistory, logSafe, readHistory, trackEvent, readAnalytics};
