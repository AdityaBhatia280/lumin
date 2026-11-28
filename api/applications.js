// Admin: read applications and update their status / notes. Applications are never deleted here.
const {send, readJson, loggedIn, sameOrigin} = require('./_lib');
const {storeReady, requestInfo, listApplications, updateApplication, logSafe} = require('./_store');
const STATUSES = ['new', 'reviewing', 'accepted', 'declined', 'archived'];

module.exports = async (req, res) => {
  const session = loggedIn(req);
  if (!session) return send(res, 401, {error: 'Please log in'});
  if (!storeReady()) return send(res, 503, {error: 'not connected'});
  try {
    if (req.method === 'GET') return send(res, 200, {applications: await listApplications()});
    if (req.method !== 'POST') return send(res, 405, {error: 'Use GET or POST'});
    if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
    const {id, status, note} = await readJson(req);
    const patch = {};
    if (status !== undefined) { if (!STATUSES.includes(status)) return send(res, 400, {error: 'Unknown status'}); patch.status = status; }
    if (note !== undefined) patch.note = String(note).slice(0, 3000);
    patch.updatedBy = session.name; patch.updatedAt = new Date().toISOString();
    const app = await updateApplication(String(id), patch);
    await logSafe({type: 'application-update', who: session.name, what: `${app.form} · ${app.fields.name || ''}${status ? ' → ' + status : ' · note edited'}`, ...requestInfo(req)});
    send(res, 200, {application: app});
  } catch (e) { send(res, 500, {error: e.message}); }
};
