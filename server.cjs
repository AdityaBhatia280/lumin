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
const blocked = /^\/(\.git|\.taste-skill|Microsoft|node_modules)(\/|$)|^\/server\.cjs$/;

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
  if (!isLocal(req)) return json(res, 403, {error: 'The admin panel only works on the computer running the server.'});
  // Same protocol as the live admin in /api, but saves straight to this folder and needs no password.
  try {
    if (route === '/api/session') return json(res, 200, {mode: 'local', configured: true, loggedIn: true});
    if (route === '/api/login' || route === '/api/logout') return json(res, 200, {ok: true});
    if (route === '/api/data' && req.method === 'GET') return json(res, 200, {data: readData()});
    if (route === '/api/data' && req.method === 'POST') {
      const {data, deletes = []} = JSON.parse((await readBody(req, 5e6)).toString('utf8'));
      if (!data || !Array.isArray(data.photos) || !Array.isArray(data.partners) || !Array.isArray(data.posts) || typeof data.slots !== 'object') throw new Error('Data is missing required sections');
      for (const p of deletes) {
        const file = path.resolve(root, String(p));
        if (path.dirname(file) === uploadDir) fs.rmSync(file, {force: true});
      }
      writeData(data);
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
