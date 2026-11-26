const {configured, send, loggedIn} = require('./_lib');
const {storeReady} = require('./_store');

module.exports = (req, res) => {
  const session = loggedIn(req);
  send(res, 200, {mode: 'live', configured: configured(), loggedIn: !!session, who: session?.name || null, store: storeReady()});
};
