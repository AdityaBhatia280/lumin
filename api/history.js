// GET: read the history (newest first). POST {what}: record that an admin opened a section.
// There is deliberately no way to edit or delete entries here.
const {send, readJson, loggedIn, sameOrigin} = require('./_lib');
const {storeReady, requestInfo, readHistory, logSafe} = require('./_store');

module.exports = async (req, res) => {
  const session = loggedIn(req);
  if (!session) return send(res, 401, {error: 'Please log in'});
  if (!storeReady()) return send(res, 503, {error: 'History storage is not connected yet (add Upstash Redis in Vercel).'});
  try {
    if (req.method === 'GET') {
      const start = Math.max(0, parseInt(new URL(req.url, 'http://x').searchParams.get('start') || '0', 10) || 0);
      return send(res, 200, await readHistory(start, 100));
    }
    if (req.method === 'POST') {
      if (!sameOrigin(req)) return send(res, 403, {error: 'Blocked'});
      const {what} = await readJson(req).catch(() => ({}));
      await logSafe({type: 'view', who: session.name, what: String(what || '').slice(0, 60), ...requestInfo(req)});
      return send(res, 200, {ok: true});
    }
    send(res, 405, {error: 'Use GET or POST'});
  } catch (e) { send(res, 500, {error: e.message}); }
};
