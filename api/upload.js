const crypto = require('node:crypto');
const {send, readJson, loggedIn, sameOrigin, createBlob} = require('./_lib');

const types = {'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg'};

// Stores an image in GitHub right away; it goes live with the next Publish.
module.exports = async (req, res) => {
  if (!loggedIn(req)) return send(res, 401, {error: 'Please log in'});
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST'});
  if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
  try {
    const {name = 'photo', type, data} = await readJson(req);
    const ext = types[type];
    if (!ext) return send(res, 400, {error: 'Only JPG, PNG, WebP, GIF or SVG images can be uploaded'});
    if (typeof data !== 'string' || data.length > 4_200_000) return send(res, 413, {error: 'Image is too large (max about 3 MB)'});
    const base = String(name).replace(/\.[^.]*$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'photo';
    const path = `assets/uploads/${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}-${base}.${ext}`;
    const sha = await createBlob(data);
    send(res, 200, {src: '/' + path, pending: {path, sha}});
  } catch (error) {
    send(res, 500, {error: error.message});
  }
};
