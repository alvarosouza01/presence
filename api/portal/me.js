// GET /api/portal/me  ·  who is signed in (or 401).

const { requireSession } = require('./_lib/session');

module.exports = (req, res) => {
  const s = requireSession(req, res);
  if (!s) return;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ email: s.email }));
};
