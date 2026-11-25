// GET /api/portal/data  ·  tudo o que o portal mostra, só para quem está logado.
// Sem nenhuma fonte configurada, devolve os dados de exemplo (com demo: true).

const { requireSession } = require('./_lib/session');
const { build } = require('./_lib/build');

module.exports = async (req, res) => {
  const s = requireSession(req, res);
  if (!s) return;

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  try {
    const data = await build();
    data.usuario = s.email;
    res.end(JSON.stringify(data));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'build_failed' }));
  }
};
