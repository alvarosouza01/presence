// GET /api/portal/auth/login
// Sends the user to Google's login. Stores a random "state" in a cookie
// to check on the way back (CSRF protection).
// Env: GOOGLE_CLIENT_ID, PORTAL_ALLOWED_EMAIL.

const crypto = require('crypto');
const { cookie, appendCookie, baseUrl, allowedEmails } = require('../_lib/session');

module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (!process.env.GOOGLE_CLIENT_ID) {
    res.statusCode = 500;
    return res.end('Google login is not configured yet (GOOGLE_CLIENT_ID).');
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
