// Portal session: HMAC-signed cookie, no database.
// The cookie stores only { email, exp } and cannot be read by JavaScript (HttpOnly).
// Env: PORTAL_SESSION_SECRET, PORTAL_ALLOWED_EMAIL.

const crypto = require('crypto');

const COOKIE = 'portal_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const s = process.env.PORTAL_SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('PORTAL_SESSION_SECRET missing or too short (32 characters minimum)');
  return s;
}

function allowedEmails() {
  return String(process.env.PORTAL_ALLOWED_EMAIL || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + sig;
}

function verify(token) {
  if (!token || token.indexOf('.') < 0) return null;
  const [body, sig] = token.split('.');
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')); } catch (e) { return null; }
  if (!p || typeof p.exp !== 'number' || p.exp < Math.floor(Date.now() / 1000)) return null;
  if (!allowedEmails().includes(String(p.email || '').toLowerCase())) return null;
  return p;
}

function parseCookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((part) => {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  });
  return out;
}

function cookie(name, value, opts) {
  opts = opts || {};
  const parts = [name + '=' + encodeURIComponent(value), 'Path=' + (opts.path || '/'), 'HttpOnly', 'Secure', 'SameSite=Lax'];
  if (opts.maxAge != null) parts.push('Max-Age=' + opts.maxAge);
  return parts.join('; ');
}

function appendCookie(res, value) {
  const prev = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', prev ? [].concat(prev, value) : [value]);
}

function getSession(req) {
  try { return verify(parseCookies(req)[COOKIE]); } catch (e) { return null; }
}

function startSession(res, email) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  appendCookie(res, cookie(COOKIE, sign({ email: email.toLowerCase(), exp }), { maxAge: MAX_AGE }));
}

function endSession(res) {
  appendCookie(res, cookie(COOKIE, '', { maxAge: 0 }));
}

// Used by protected functions. Returns the session, or answers 401 and returns null.
function requireSession(req, res) {
  const s = getSession(req);
  if (s) return s;
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ error: 'unauthorized' }));
  return null;
}

// Public site URL, used to build the Google redirect.
function baseUrl(req) {
  if (process.env.PORTAL_BASE_URL) return process.env.PORTAL_BASE_URL.replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const proto = req.headers['x-forwarded-proto'] || (/^localhost|^127\./.test(host) ? 'http' : 'https');
  return proto + '://' + host;
}

module.exports = {
  parseCookies, cookie, appendCookie, getSession, startSession, endSession,
  requireSession, baseUrl, allowedEmails
};
