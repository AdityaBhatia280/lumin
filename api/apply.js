// Public: application forms on the website submit here. Saved for admins to review under "Applications".
const crypto = require('node:crypto');
const {send, readJson} = require('./_lib');
const {cleanApplication} = require('./_core');
const {storeReady, requestInfo, saveApplication, underLimit, logSafe} = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST'});
  if (!storeReady()) return send(res, 503, {error: 'Applications are not available right now.'});
  try {
    const c = cleanApplication(await readJson(req).catch(() => ({})));
    if (c.spam) return send(res, 200, {ok: true}); // look successful to bots
    if (c.error) return send(res, 400, {error: c.error});
    const info = requestInfo(req);
    if (!(await underLimit('rl:apply:' + info.ip, 8, 3600))) return send(res, 429, {error: 'Too many applications from this connection. Please try again later.'});
    const app = {id: Date.now().toString(36) + crypto.randomBytes(3).toString('hex'), form: c.form, fields: c.fields, status: 'new', note: '',
      submittedAt: new Date().toISOString(), city: info.city, region: info.region, country: info.country};
    await saveApplication(app);
    await logSafe({type: 'application', who: c.fields.name, what: c.form, ...info});
    send(res, 200, {ok: true});
  } catch (e) { send(res, 500, {error: 'Could not send your application. Please try again.'}); }
};
