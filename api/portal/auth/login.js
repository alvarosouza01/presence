// GET /api/portal/auth/login
// Manda para a tela de login do Google. Guarda um "state" aleatório em cookie
// para conferir no retorno (proteção contra CSRF).
// Variáveis: GOOGLE_CLIENT_ID, PORTAL_ALLOWED_EMAIL.

const crypto = require('crypto');
const { cookie, appendCookie, baseUrl, allowedEmails } = require('../_lib/session');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!process.env.GOOGLE_CLIENT_ID) {
    res.statusCode = 500;
    return res.end('Login com Google ainda não configurado (GOOGLE_CLIENT_ID).');
  }

  const state = crypto.randomBytes(24).toString('base64url');
  appendCookie(res, cookie('portal_oauth_state', state, { path: '/api/portal/auth', maxAge: 600 }));

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: baseUrl(req) + '/api/portal/auth/callback',
    response_type: 'code',
    scope: 'openid email',
    state,
    prompt: 'select_account'
  });
  const hint = allowedEmails()[0];
  if (hint) params.set('login_hint', hint);

  res.statusCode = 302;
  res.setHeader('Location', 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
  res.end();
};
