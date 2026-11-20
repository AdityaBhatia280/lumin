const {send, readJson, loggedIn, sameOrigin, readSiteData, commit, isUploadPath, validData} = require('./_lib');

module.exports = async (req, res) => {
  if (!loggedIn(req)) return send(res, 401, {error: 'Please log in'});
  try {
    if (req.method === 'GET') return send(res, 200, {data: await readSiteData()});
    if (req.method !== 'POST') return send(res, 405, {error: 'Use GET or POST'});
    if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
    const {data, uploads = [], deletes = []} = await readJson(req);
    if (!validData(data)) return send(res, 400, {error: 'Data is missing required sections'});
    if (![...uploads.map(u => u.path), ...deletes].every(isUploadPath)) return send(res, 400, {error: 'Invalid file path'});
    if (uploads.some(u => !/^[0-9a-f]{40}$/.test(u.sha))) return send(res, 400, {error: 'Invalid upload'});
    const parts = [uploads.length && `${uploads.length} new image${uploads.length > 1 ? 's' : ''}`, deletes.length && `${deletes.length} removed`].filter(Boolean);
    const sha = await commit({data, uploads, deletes, message: 'Update site from admin panel' + (parts.length ? ` (${parts.join(', ')})` : '')});
    send(res, 200, {ok: true, commit: sha});
  } catch (error) {
    send(res, error.status === 409 || error.status === 422 ? 409 : 500, {error: error.message});
  }
};
