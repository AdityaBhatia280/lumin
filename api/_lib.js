// Shared helpers for the live admin panel (Vercel serverless functions).
// Required environment variables (set them in Vercel → Project → Settings → Environment Variables):
//   ADMIN_PASSWORD  the password for /admin
//   GITHUB_TOKEN    a fine-grained GitHub token with "Contents: Read and write" on the site repo
// Optional: GITHUB_REPO (default AdityaBhatia280/lumin), GITHUB_BRANCH (default main)
const crypto = require('node:crypto');

const REPO = process.env.GITHUB_REPO || 'AdityaBhatia280/lumin';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const DATA_PATH = 'data/site-data.js';
const COOKIE = 'lumin_admin';
const SESSION_DAYS = 30;

function configured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.GITHUB_TOKEN);
}

// ---------- Responses ----------
function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

// ---------- Sessions: an expiring, signed cookie. Changing ADMIN_PASSWORD signs everyone out. ----------
const key = () => crypto.createHash('sha256').update('lumin-session:' + process.env.ADMIN_PASSWORD).digest();
const sign = value => crypto.createHmac('sha256', key()).update(value).digest('base64url');

// The cookie carries who logged in (their name) and when it expires, signed so it can't be forged.
function sessionCookie(name = 'Admin') {
  const expires = Date.now() + SESSION_DAYS * 864e5;
  const who = Buffer.from(String(name).slice(0, 40)).toString('base64url');
  const token = `${expires}.${who}.${sign(expires + '.' + who)}`;
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}
const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// Returns {name} for a valid session, otherwise null.
function loggedIn(req) {
  if (!configured()) return null;
  const match = (req.headers.cookie || '').match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!match) return null;
  const [expires, who, sig] = match[1].split('.');
  if (!expires || !who || !sig || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(expires + '.' + who)), given = Buffer.from(sig);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return {name: Buffer.from(who, 'base64url').toString('utf8')};
}

function passwordMatches(password) {
  const a = crypto.createHash('sha256').update(String(password || '')).digest();
  const b = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// Blocks writes that come from another website (the cookie is SameSite=Strict as well).
function sameOrigin(req) {
  const origin = req.headers.origin;
  return !origin || new URL(origin).host === req.headers.host;
}

// ---------- GitHub ----------
async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'project-lumin-admin',
      ...(options.body ? {'Content-Type': 'application/json'} : {}),
      ...options.headers
    }
  });
  const text = await res.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    const message = body?.message || text || res.statusText;
    throw Object.assign(new Error(`GitHub: ${message}`), {status: res.status});
  }
  return body;
}

const parseData = text => JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
const serializeData = value => '// Edited by the admin panel (/admin). Safe to edit by hand too.\nwindow.LUMIN_DATA = ' + JSON.stringify(value, null, 2) + ';\n';

async function headCommit() {
  const ref = await github(`/git/ref/heads/${BRANCH}`);
  return ref.object.sha;
}

async function readSiteData() {
  const file = await github(`/contents/${DATA_PATH}?ref=${encodeURIComponent(BRANCH)}`);
  return parseData(Buffer.from(file.content, 'base64').toString('utf8'));
}

async function createBlob(base64) {
  const blob = await github('/git/blobs', {method: 'POST', body: JSON.stringify({content: base64, encoding: 'base64'})});
  return blob.sha;
}

// One commit containing the new data file, any new uploads, and any removed uploads.
async function commit({data, uploads = [], deletes = [], message}) {
  const parent = await headCommit();
  const parentCommit = await github(`/git/commits/${parent}`);
  const dataSha = await createBlob(Buffer.from(serializeData(data)).toString('base64'));
  const tree = [{path: DATA_PATH, mode: '100644', type: 'blob', sha: dataSha}];
  for (const u of uploads) tree.push({path: u.path, mode: '100644', type: 'blob', sha: u.sha});
  for (const path of deletes) tree.push({path, mode: '100644', type: 'blob', sha: null});
  const newTree = await github('/git/trees', {method: 'POST', body: JSON.stringify({base_tree: parentCommit.tree.sha, tree})});
  const newCommit = await github('/git/commits', {method: 'POST', body: JSON.stringify({message, tree: newTree.sha, parents: [parent]})});
  await github(`/git/refs/heads/${BRANCH}`, {method: 'PATCH', body: JSON.stringify({sha: newCommit.sha})});
  return newCommit.sha;
}

// Only files the admin itself uploaded can be added or removed.
const isUploadPath = p => /^assets\/uploads\/[a-z0-9][a-z0-9-]*\.(jpg|png|webp|gif|svg)$/.test(p);

function validData(value) {
  return value && typeof value === 'object' && Array.isArray(value.photos) && Array.isArray(value.partners) &&
    Array.isArray(value.posts) && value.slots && typeof value.slots === 'object' && value.settings && typeof value.settings === 'object';
}

module.exports = {configured, send, readJson, sessionCookie, clearCookie, loggedIn, passwordMatches, sameOrigin, readSiteData, createBlob, commit, isUploadPath, validData, REPO, BRANCH};
