// Builds the JSON the portal renders by merging every configured source.
// New source: create _lib/sources/<name>.js with the same contract and add it to FONTES.

const registry = require('./config')(require('./sites'));
const { ultimosDias } = require('./util');

const FONTES = [
  require('./sources/stripe'),
  require('./sources/ga4'),
  require('./sources/meta'),
  require('./sources/youtube'),
  require('./sources/instagram'),
  require('./sources/kit')
];

// Empty skeleton: the portal always gets every field, even with no source on.
function vazio(hoje) {
  return {
    demo: false,
    atualizadoEm: hoje.toISOString(),
    periodo: 'Yesterday, ' + ultimosDias(hoje, 1)[0],
    fontes: {},
    erros: {},
    avisos: [],
    redes: { youtube: null, instagram: [], newsletter: null },
    faturamento: { moeda: String(process.env.PORTAL_CURRENCY || 'usd').toUpperCase(), diario: [], porProduto: [], recentes: [], aCaminho: 0, falhas30d: 0, reembolsos30d: 0, gastoAds30d: null, outrasMoedas: {} },
    sites: registry.sites.map((s) => ({
      slug: s.slug, nome: s.nome, dominio: s.dominio, papel: s.papel,
      ga: s.ga4 ? s.ga4.measurementId : null,
      visitas: { ontem: 0, anterior: 0, serie: [] },
      conversao: null,
      paginas: [], origens: [],
      receita30d: 0,
      ads: { ativo: false, conta: null, campanhas: [] }
    }))
  };
}

function aplicar(data, parcial) {
  if (!parcial) return;
  (parcial.avisos || []).forEach((a) => data.avisos.push(a));
  if (parcial.faturamento) Object.assign(data.faturamento, parcial.faturamento);
  if (parcial.redes) Object.assign(data.redes, parcial.redes);
  Object.entries(parcial.sites || {}).forEach(([slug, campos]) => {
    const s = data.sites.find((x) => x.slug === slug);
    if (s) Object.assign(s, campos);
  });
}

async function build({ demoSeVazio = true } = {}) {
  const hoje = new Date();
  const ligadas = FONTES.filter((f) => f.isConfigured());

  if (!ligadas.length && demoSeVazio) {
    const demo = JSON.parse(JSON.stringify(require('../../../portal/data-exemplo.js')));
    demo.fontes = Object.fromEntries(FONTES.map((f) => [f.id, false]));
    return demo;
  }

  const data = vazio(hoje);
  const ctx = { registry, hoje };
  const resultados = await Promise.allSettled(ligadas.map((f) => f.collect(ctx)));

  FONTES.forEach((f) => { data.fontes[f.id] = false; });
  resultados.forEach((r, i) => {
    const f = ligadas[i];
    if (r.status === 'fulfilled') { aplicar(data, r.value); data.fontes[f.id] = true; }
    else data.erros[f.id] = String(r.reason && r.reason.message || r.reason).slice(0, 200);
  });
  return data;
}

module.exports = { build, FONTES };
