const {configured, send, readJson, sessionCookie, passwordMatches, sameOrigin} = require('./_lib');
const {requestInfo, logSafe} = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST'});
  if (!configured()) return send(res, 503, {error: 'The admin panel is not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN in Vercel.'});
  if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
  const body = await readJson(req).catch(() => ({}));
  const name = String(body.name || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!name) return send(res, 400, {error: 'Please enter your name'});
  const info = requestInfo(req);
  if (!passwordMatches(body.password)) {
    await logSafe({type: 'login-failed', who: name, ...info});
    await new Promise(r => setTimeout(r, 800)); // slows down password guessing
    return send(res, 401, {error: 'Wrong password'});
  }
  await logSafe({type: 'login', who: name, ...info});
  send(res, 200, {ok: true}, {'Set-Cookie': sessionCookie(name)});
};
