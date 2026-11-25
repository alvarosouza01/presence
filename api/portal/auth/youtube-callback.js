// GET /api/portal/auth/youtube-callback  ·  retorno do Google com o código.
// Troca o código por um refresh token e mostra o token UMA vez, só para quem está
// logado no portal, com instruções para colar em YOUTUBE_REFRESH_TOKEN na Vercel.

const { requireSession, parseCookies, cookie, appendCookie, baseUrl } = require('../_lib/session');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pagina(res, titulo, corpo) {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end('<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><title>' + esc(titulo) + '</title>' +
    '<style>body{font-family:-apple-system,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.25rem;color:#171717;line-height:1.5}' +
    'h1{font-weight:500;letter-spacing:-.02em}textarea{width:100%;height:7rem;font-family:ui-monospace,monospace;font-size:.8rem;padding:.75rem;border:1px solid #ccc;border-radius:4px}' +
    'button,a.b{display:inline-block;margin-top:.75rem;padding:.7rem 1.1rem;background:#171717;color:#fff;border:0;border-radius:3px;font-size:.95rem;cursor:pointer;text-decoration:none}' +
    'ol{padding-left:1.2rem}code{background:#f3f3f1;padding:.1rem .3rem;border-radius:3px}.err{color:#e8452c}</style></head><body>' +
    corpo + '</body></html>');
}

module.exports = async (req, res) => {
  const s = requireSession(req, res);
  if (!s) return;
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  const q = req.query || {};
  const saved = parseCookies(req).portal_yt_state;
  appendCookie(res, cookie('portal_yt_state', '', { path: '/api/portal/auth', maxAge: 0 }));

  if (q.error) return pagina(res, 'YouTube', '<h1>Autorização cancelada</h1><p class="err">' + esc(q.error) + '</p><a class="b" href="/portal/">Voltar ao portal</a>');
  if (!q.code || !q.state || q.state !== saved) return pagina(res, 'YouTube', '<h1>Sessão expirada</h1><p>Comece de novo.</p><a class="b" href="/api/portal/auth/youtube">Autorizar o YouTube</a>');

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(q.code),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: baseUrl(req) + '/api/portal/auth/youtube-callback',
      grant_type: 'authorization_code'
    })
  });
  const t = await r.json().catch(() => ({}));
  if (!r.ok || !t.refresh_token) {
    return pagina(res, 'YouTube', '<h1>O Google não devolveu o token</h1><p class="err">' + esc(t.error_description || t.error || r.status) +
      '</p><p>Se você já tinha autorizado antes, remova o acesso do app em myaccount.google.com/permissions e tente de novo.</p>' +
      '<a class="b" href="/api/portal/auth/youtube">Tentar de novo</a>');
  }

  pagina(res, 'Token do YouTube',
    '<h1>Token do YouTube gerado</h1>' +
    '<p>Este token dá ao portal acesso <strong>só de leitura</strong> ao seu canal. Ele aparece uma única vez.</p>' +
    '<textarea id="t" readonly>' + esc(t.refresh_token) + '</textarea>' +
    '<button onclick="navigator.clipboard.writeText(document.getElementById(\'t\').value);this.textContent=\'Copiado\'">Copiar token</button>' +
    '<ol><li>Na Vercel, crie a variável <code>YOUTUBE_REFRESH_TOKEN</code> como <strong>Secret</strong>, em Production, e cole o token.</li>' +
    '<li>Publique de novo (git push ou Redeploy).</li><li>Feche esta página.</li></ol>' +
    '<a class="b" href="/portal/#/redes">Voltar ao portal</a>');
};
