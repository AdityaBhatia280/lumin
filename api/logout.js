const {send, clearCookie, loggedIn} = require('./_lib');
const {requestInfo, logSafe} = require('./_store');

module.exports = async (req, res) => {
  const session = loggedIn(req);
  if (session) await logSafe({type: 'logout', who: session.name, ...requestInfo(req)});
  send(res, 200, {ok: true}, {'Set-Cookie': clearCookie()});
};
