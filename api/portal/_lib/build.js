// Monta o JSON que o portal desenha, juntando as fontes que estão configuradas.
// Fonte nova: crie _lib/sources/<nome>.js com o mesmo contrato e adicione em FONTES.

const registry = require('./sites');
const { ultimosDias } = require('./util');

const FONTES = [
  require('./sources/stripe'),
  require('./sources/ga4'),
  require('./sources/meta'),
  require('./sources/youtube'),
  require('./sources/instagram'),
  require('./sources/kit')
];

// Esqueleto vazio: o portal sempre recebe todos os campos, mesmo sem fonte ligada.
function vazio(hoje) {
  return {
    demo: false,
    atualizadoEm: hoje.toISOString(),
    periodo: 'Ontem, ' + ultimosDias(hoje, 1)[0].split('-').reverse().slice(0, 2).join('/'),
    fontes: {},
    erros: {},
    avisos: [],
    redes: { youtube: null, instagram: [], newsletter: null },
    faturamento: { moeda: 'BRL', diario: [], porProduto: [], recentes: [], aCaminho: 0, falhas30d: 0, reembolsos30d: 0, gastoAds30d: null, outrasMoedas: {} },
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
