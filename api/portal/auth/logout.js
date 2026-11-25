// GET /api/portal/auth/logout  ·  ends the session and goes back to the login screen.

const { endSession } = require('../_lib/session');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  endSession(res);
  res.statusCode = 302;
  res.setHeader('Location', '/portal/');
  res.end();
};
