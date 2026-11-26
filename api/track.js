// Public: the website reports anonymous page views and clicks here. No visitor IPs are stored.
const {send, readJson} = require('./_lib');
const {cleanEvent} = require('./_core');
const {storeReady, requestInfo, trackEvent} = require('./_store');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return send(res, 405, {error: 'Use POST'});
  if (!storeReady()) return send(res, 204, {});
  if (/bot|crawl|spider|preview|headless/i.test(req.headers['user-agent'] || '')) return send(res, 204, {});
  try {
    const ev = cleanEvent(await readJson(req));
    if (ev) { const {city, country} = requestInfo(req); await trackEvent(ev, {city, country}); }
    send(res, 204, {});
  } catch { send(res, 204, {}); }
};
