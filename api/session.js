const {configured, send, loggedIn} = require('./_lib');

module.exports = (req, res) => {
  send(res, 200, {mode: 'live', configured: configured(), loggedIn: loggedIn(req)});
};
