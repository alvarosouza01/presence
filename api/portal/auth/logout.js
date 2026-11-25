// GET /api/portal/auth/logout  ·  encerra a sessão e volta para a tela de login.

const { endSession } = require('../_lib/session');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  endSession(res);
  res.statusCode = 302;
  res.setHeader('Location', '/portal/');
  res.end();
};
