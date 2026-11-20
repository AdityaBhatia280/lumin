const {configured, send, readJson, sessionCookie, passwordMatches, sameOrigin} = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST'});
  if (!configured()) return send(res, 503, {error: 'The admin panel is not set up yet. Add ADMIN_PASSWORD and GITHUB_TOKEN in Vercel.'});
  if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
  const {password} = await readJson(req).catch(() => ({}));
  if (!passwordMatches(password)) {
    await new Promise(r => setTimeout(r, 800)); // slows down password guessing
    return send(res, 401, {error: 'Wrong password'});
  }
  send(res, 200, {ok: true}, {'Set-Cookie': sessionCookie()});
};
