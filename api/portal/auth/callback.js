// GET /api/portal/auth/callback
// Google callback: checks the state, exchanges the code for the id_token directly with
// Google (server to server, over HTTPS) and only opens a session for an allowed email.
// Env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, PORTAL_ALLOWED_EMAIL, PORTAL_SESSION_SECRET.

const { parseCookies, cookie, appendCookie, startSession, baseUrl, allowedEmails } = require('../_lib/session');

function back(res, erro) {
  res.statusCode = 302;
  res.setHeader('Location', '/portal/' + (erro ? '?erro=' + encodeURIComponent(erro) : ''));
  res.end();
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const q = req.query || {};
  const saved = parseCookies(req).portal_oauth_state;
  appendCookie(res, cookie('portal_oauth_state', '', { path: '/api/portal/auth', maxAge: 0 }));

  if (q.error) return back(res, 'cancelado');
  if (!q.code || !q.state || !saved || q.state !== saved) return back(res, 'sessao');

  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(q.code),
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: baseUrl(req) + '/api/portal/auth/callback',
        grant_type: 'authorization_code'
      })
    });
    if (!r.ok) return back(res, 'google');
    const t = await r.json();

    // The id_token came straight from Google's token endpoint, so it can be trusted;
    // we still check issuer, audience, expiry and verified email.
    const payload = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString('utf8'));
    const issOk = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com';
    const audOk = payload.aud === process.env.GOOGLE_CLIENT_ID;
    const expOk = payload.exp * 1000 > Date.now();
    const email = String(payload.email || '').toLowerCase();

    if (!issOk || !audOk || !expOk || !payload.email_verified) return back(res, 'google');
    if (!allowedEmails().includes(email)) return back(res, 'acesso');

    startSession(res, email);
    return back(res, null);
  } catch (e) {
    return back(res, 'google');
  }
};
