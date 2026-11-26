const {send, loggedIn} = require('./_lib');
const {storeReady, readAnalytics} = require('./_store');

module.exports = async (req, res) => {
  if (!loggedIn(req)) return send(res, 401, {error: 'Please log in'});
  if (!storeReady()) return send(res, 503, {error: 'Analytics storage is not connected yet (add Upstash Redis in Vercel).'});
  const days = [7, 30, 90].includes(Number(new URL(req.url, 'http://x').searchParams.get('days'))) ? Number(new URL(req.url, 'http://x').searchParams.get('days')) : 7;
  try { send(res, 200, await readAnalytics(days)); } catch (e) { send(res, 500, {error: e.message}); }
};
