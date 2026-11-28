// Admin: read applications and update their status / notes. Applications are never deleted here.
const {send, readJson, loggedIn, sameOrigin} = require('./_lib');
const {storeReady, requestInfo, listApplications, updateApplication, logSafe} = require('./_store');
const {emailReady, recipients, sendEmail} = require('./_email');
const STATUSES = ['new', 'reviewing', 'accepted', 'declined', 'archived'];

module.exports = async (req, res) => {
  const session = loggedIn(req);
  if (!session) return send(res, 401, {error: 'Please log in'});
  if (!storeReady()) return send(res, 503, {error: 'not connected'});
  try {
    if (req.method === 'GET') return send(res, 200, {applications: await listApplications(), alerts: {on: emailReady(), to: emailReady() ? recipients() : []}});
    if (req.method !== 'POST') return send(res, 405, {error: 'Use GET or POST'});
    if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
    const body = await readJson(req);
    if (body.action === 'test-email') {
      if (!emailReady()) return send(res, 400, {error: 'Email alerts are not set up yet.'});
      try {
        await sendEmail({subject: 'Test: Project Lumin application alerts are working', text: `This is a test alert sent by ${session.name} from the admin panel. New applications will arrive like this.`, html: `<p>This is a test alert sent by <b>${String(session.name).replace(/[<>&]/g, '')}</b> from the Project Lumin admin panel.</p><p>New applications from the website will arrive at this address.</p>`});
        await logSafe({type: 'email-test', who: session.name, what: 'sent to ' + recipients().join(', '), ...requestInfo(req)});
        return send(res, 200, {ok: true, to: recipients()});
      } catch (e) {
        await logSafe({type: 'email-test', who: session.name, what: 'failed: ' + e.message.slice(0, 120), ...requestInfo(req)});
        return send(res, 502, {error: e.message});
      }
    }
    const {id, status, note} = body;
    const patch = {};
    if (status !== undefined) { if (!STATUSES.includes(status)) return send(res, 400, {error: 'Unknown status'}); patch.status = status; }
    if (note !== undefined) patch.note = String(note).slice(0, 3000);
    patch.updatedBy = session.name; patch.updatedAt = new Date().toISOString();
    const app = await updateApplication(String(id), patch);
    await logSafe({type: 'application-update', who: session.name, what: `${app.form} · ${app.fields.name || ''}${status ? ' → ' + status : ' · note edited'}`, ...requestInfo(req)});
    send(res, 200, {application: app});
  } catch (e) { send(res, 500, {error: e.message}); }
};
