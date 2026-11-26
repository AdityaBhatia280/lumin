// Local preview server + admin panel. Run: node server.cjs  → http://127.0.0.1:3000  (admin: /admin)
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = __dirname;
const dataFile = path.join(root, 'data', 'site-data.js');
const uploadDir = path.join(root, 'assets', 'uploads');
const redirects = {'/our-work': '/blog', '/network': '/impact', '/chapters': '/impact', '/youth-ambassadors': '/', '/digital-hub': '/', '/partners': '/partnerships', '/partners.html': '/partnerships'};
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon'
};
const imageTypes = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg'};
const blocked = /^\/(\.git|\.taste-skill|Microsoft|node_modules|data\/logs)(\/|$)|^\/server\.cjs$|^\/api\//;
const {diffData, sealEntry, verifyChain, summarize, dayList, cleanEvent} = require('./api/_core');

/* ---------- Local history + analytics, kept in data/logs (never uploaded to GitHub) ---------- */
const logDir = path.join(root, 'data', 'logs');
const historyFile = path.join(logDir, 'history.jsonl');
const statsFile = path.join(logDir, 'analytics.json');
const who = 'This computer';
const localInfo = req => ({ip: req.socket.remoteAddress, city: '', region: '', country: '', ua: String(req.headers['user-agent'] || '').slice(0, 300)});
function readHistoryFile() {
  if (!fs.existsSync(historyFile)) return [];
  return fs.readFileSync(historyFile, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l));
}
function appendHistory(entry) {
  fs.mkdirSync(logDir, {recursive: true});
  const all = readHistoryFile();
  fs.appendFileSync(historyFile, JSON.stringify(sealEntry(entry, all.at(-1)?.hash)) + '\n');
}
function readStats() { try { return JSON.parse(fs.readFileSync(statsFile, 'utf8')); } catch { return {days: {}, events: []}; } }
function track(ev, req) {
  const st = readStats(), day = new Date().toISOString().slice(0, 10);
  const d = st.days[day] ||= {pv: {}, vis: [], clk: {}, ref: {}, dev: {}, ctry: {}};
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  if (ev.type === 'pageview') { inc(d.pv, ev.path); if (!d.vis.includes(ev.vid)) d.vis.push(ev.vid); if (ev.ref) inc(d.ref, ev.ref); if (ev.dev) inc(d.dev, ev.dev); inc(d.ctry, isLocal(req) ? 'This computer' : 'Local network'); }
  else inc(d.clk, `${ev.label}${ev.href ? ' → ' + ev.href : ''}`);
  st.events.unshift({t: new Date().toISOString(), type: ev.type, path: ev.path, label: ev.label, href: ev.href, dev: ev.dev, ref: ev.ref, city: '', country: ''});
  st.events = st.events.slice(0, 300);
  fs.mkdirSync(logDir, {recursive: true});
  fs.writeFileSync(statsFile, JSON.stringify(st));
}
function localAnalytics(n) {
  const st = readStats(), days = dayList(n), all = new Set();
  const perDay = days.map(date => { const d = st.days[date] || {}; (d.vis || []).forEach(v => all.add(v)); return {date, pv: d.pv, visitors: (d.vis || []).length, clk: d.clk, ref: d.ref, dev: d.dev, ctry: d.ctry}; });
  return summarize(perDay, all.size, st.events.slice(0, 60));
}

const isLocal = req => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress);
const send = (res, code, body, type = 'text/plain; charset=utf-8') => res.writeHead(code, {'Content-Type': type, 'Cache-Control': 'no-store'}).end(body);
const json = (res, code, value) => send(res, code, JSON.stringify(value), 'application/json');

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > limit) { reject(new Error('File too large')); req.destroy(); } else chunks.push(chunk); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
function readData() {
  const text = fs.readFileSync(dataFile, 'utf8');
  return JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
}
function writeData(value) {
  const tmp = dataFile + '.tmp';
  fs.writeFileSync(tmp, '// Edited by the admin panel (/admin). Safe to edit by hand too.\nwindow.LUMIN_DATA = ' + JSON.stringify(value, null, 2) + ';\n');
  fs.renameSync(tmp, dataFile);
}

async function api(req, res, route) {
  // The public site reports anonymous page views here (works from phones on the Wi-Fi too).
  if (route === '/api/track') {
    try { const ev = cleanEvent(JSON.parse((await readBody(req, 4000)).toString('utf8') || '{}')); if (ev) track(ev, req); } catch {}
    return res.writeHead(204).end();
  }
  if (!isLocal(req)) return json(res, 403, {error: 'The admin panel only works on the computer running the server.'});
  // Same protocol as the live admin in /api, but saves straight to this folder and needs no password.
  try {
    if (route === '/api/session') return json(res, 200, {mode: 'local', configured: true, loggedIn: true, who, store: true});
    if (route === '/api/history' && req.method === 'GET') {
      const start = Math.max(0, Number(new URL(req.url, 'http://x').searchParams.get('start')) || 0);
      const all = readHistoryFile().reverse();
      return json(res, 200, {entries: verifyChain(all.slice(start, start + 101)).slice(0, 100), total: all.length});
    }
    if (route === '/api/history' && req.method === 'POST') {
      const {what} = JSON.parse((await readBody(req, 4000)).toString('utf8') || '{}');
      appendHistory({type: 'view', who, what: String(what || '').slice(0, 60), ...localInfo(req)});
      return json(res, 200, {ok: true});
    }
    if (route === '/api/analytics') {
      const n = [7, 30, 90].includes(Number(new URL(req.url, 'http://x').searchParams.get('days'))) ? Number(new URL(req.url, 'http://x').searchParams.get('days')) : 7;
      return json(res, 200, localAnalytics(n));
    }
    if (route === '/api/login' || route === '/api/logout') return json(res, 200, {ok: true});
    if (route === '/api/data' && req.method === 'GET') return json(res, 200, {data: readData()});
    if (route === '/api/data' && req.method === 'POST') {
      const {data, deletes = []} = JSON.parse((await readBody(req, 5e6)).toString('utf8'));
      if (!data || !Array.isArray(data.photos) || !Array.isArray(data.partners) || !Array.isArray(data.posts) || typeof data.slots !== 'object') throw new Error('Data is missing required sections');
      for (const p of deletes) {
        const file = path.resolve(root, String(p));
        if (path.dirname(file) === uploadDir) fs.rmSync(file, {force: true});
      }
      const before = (() => { try { return readData(); } catch { return null; } })();
      writeData(data);
      appendHistory({type: 'publish', who, changes: diffData(before, data), ...localInfo(req)});
      return json(res, 200, {ok: true});
    }
    if (route === '/api/upload' && req.method === 'POST') {
      const {name = 'photo', type, data} = JSON.parse((await readBody(req, 25e6)).toString('utf8'));
      const ext = imageTypes[type];
      if (!ext) throw new Error('Only JPG, PNG, WebP, GIF or SVG images can be uploaded');
      const base = String(name).replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
      const file = `${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}-${base}${ext}`;
      fs.mkdirSync(uploadDir, {recursive: true});
      fs.writeFileSync(path.join(uploadDir, file), Buffer.from(data, 'base64'));
      appendHistory({type: 'upload', who, file: 'assets/uploads/' + file, original: String(name).slice(0, 80), ...localInfo(req)});
      return json(res, 200, {src: '/assets/uploads/' + file});
    }
    json(res, 404, {error: 'Unknown endpoint'});
  } catch (error) {
    json(res, 400, {error: error.message});
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let route = decodeURIComponent(url.pathname).replace(/\/$/, '') || '/';
  if (route.startsWith('/api/')) return api(req, res, route);
  const redirect = redirects[route] || (route.startsWith('/our-work/') && '/blog');
  if (redirect) return res.writeHead(302, {Location: redirect}).end();
  if (route === '/admin' || route.startsWith('/admin.')) {
    if (!isLocal(req)) return send(res, 403, 'The admin panel only opens on the computer running the server.');
    if (route === '/admin') route = '/admin.html';
  }
  let file = path.extname(route) ? path.resolve(root, '.' + route) : path.join(root, 'index.html');
  if (blocked.test(route) || !file.startsWith(root + path.sep) || !fs.statSync(file, {throwIfNoEntry: false})?.isFile()) return send(res, 404, 'Not found');
  res.writeHead(200, {'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache'});
  fs.createReadStream(file).pipe(res);
}).listen(Number(process.env.LUMEN_PORT || 3000), process.env.LUMEN_HOST || '127.0.0.1', function () {
  const {address, port} = this.address();
  console.log(`Project Lumin preview at http://${address}:${port}  ·  admin panel at http://127.0.0.1:${port}/admin`);
});
