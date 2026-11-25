// GET /api/portal/auth/youtube  ·  signed-in users only.
// Asks Google for READ access to the channel (YouTube and YouTube Analytics) with
// access_type=offline to get a refresh token. Used once; the token
// is shown at /api/portal/auth/youtube-callback to be pasted into your env.

const crypto = require('crypto');
const { requireSession, cookie, appendCookie, baseUrl } = require('../_lib/session');

module.exports = (req, res) => {
  const s = requireSession(req, res);
  if (!s) return;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const state = crypto.randomBytes(24).toString('base64url');
  appendCookie(res, cookie('portal_yt_state', state, { path: '/api/portal/auth', maxAge: 600 }));

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: baseUrl(req) + '/api/portal/auth/youtube-callback',
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
    access_type: 'offline',
    prompt: 'consent select_account',
    include_granted_scopes: 'false',
    state
  });
  res.statusCode = 302;
  res.setHeader('Location', 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString());
  res.end();
};
