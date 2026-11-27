const {configured, send, loggedIn} = require('./_lib');
const {storeCheck} = require('./_store');

module.exports = async (req, res) => {
  const session = loggedIn(req);
  const storage = session ? await storeCheck() : undefined; // only shown to logged-in admins
  send(res, 200, {mode: 'live', configured: configured(), loggedIn: !!session, who: session?.name || null, store: storage ? storage.ok : undefined, storage});
};
