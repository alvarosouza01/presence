// Source: Stripe (revenue).
// Env: STRIPE_PORTAL_KEY = RESTRICTED, read-only key with read access to
// Charges, Checkout Sessions and Balance. PORTAL_CURRENCY sets the currency (default usd).

const { diaLocal, ultimosDias } = require('../util');

const API = 'https://api.stripe.com/v1/';
const CUR = String(process.env.PORTAL_CURRENCY || 'usd').toLowerCase();

async function get(path, params) {
  const url = API + path + (params ? '?' + new URLSearchParams(params).toString() : '');
  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + process.env.STRIPE_PORTAL_KEY } });
  if (!r.ok) throw new Error('Stripe ' + path + ' ' + r.status);
  return r.json();
}

// Reads every page of a list (safety limit: 10 pages).
async function listAll(path, params) {
  let out = [], after = null;
  for (let i = 0; i < 10; i++) {
    const p = Object.assign({ limit: '100' }, params, after ? { starting_after: after } : {});
    const page = await get(path, p);
    out = out.concat(page.data);
    if (!page.has_more || !page.data.length) break;
    after = page.data[page.data.length - 1].id;
  }
  return out;
}

module.exports = {
  id: 'stripe',
  nome: 'Stripe',
  envs: ['STRIPE_PORTAL_KEY'],
  isConfigured: () => Boolean(process.env.STRIPE_PORTAL_KEY),

  async collect(ctx) {
    const { registry, hoje } = ctx;
    const dias180 = ultimosDias(hoje, 180);           // for the week and month views
    const dias = dias180.slice(-30);                   // 30 days
    const ant30 = dias180.slice(-60, -30);             // 30 days
    const desde = Math.floor(new Date(dias180[0] + 'T00:00:00Z').getTime() / 1000) - 3600 * 2;

    const [charges, sessions, balance] = await Promise.all([
      listAll('charges', { 'created[gte]': String(desde) }),
      listAll('checkout/sessions', { 'created[gte]': String(desde), status: 'complete' }),
      get('balance')
    ]);

    // payment_intent -> payment_link, from checkout sessions
    const linkPorPI = {};
    sessions.forEach((s) => { if (s.payment_intent && s.payment_link) linkPorPI[s.payment_intent] = s.payment_link; });

    const produtoPorLink = {};
    registry.produtos.forEach((p) => (p.paymentLinks || []).forEach((l) => { produtoPorLink[l] = p; }));
    const assinatura = registry.produtos.find((p) => /assinatura/i.test(p.nome)) || registry.produtoPadrao;

    function produtoDe(c) {
      const link = linkPorPI[c.payment_intent];
      if (link && produtoPorLink[link]) return produtoPorLink[link];
      if (c.invoice) return assinatura;
      return registry.produtoPadrao;
    }

    const diario = dias.map(() => 0);
    const diario180 = dias180.map(() => 0);
    let receitaAnterior = 0, receitaAds = 0, receitaAdsAnterior = 0;
    const porProduto = {};
    const porSite = {};
    const outrasMoedas = {};
    let reembolsos = 0, falhas = 0;
    const recentes = [];

    charges.forEach((c) => {
      const dia = diaLocal(c.created * 1000);
      const i180 = dias180.indexOf(dia);
      if (i180 < 0) return;
      const idx = dias.indexOf(dia);
      const prod = produtoDe(c);
      // 30 days
      if (idx < 0) {
        if (c.status === 'succeeded' && c.currency === CUR) {
          const liq = (c.amount - (c.amount_refunded || 0)) / 100;
          if (liq > 0) {
            diario180[i180] += liq;
            if (ant30.indexOf(dia) >= 0) { receitaAnterior += liq; if (prod.viaAnuncios) receitaAdsAnterior += liq; }
          }
        }
        return;
      }
      const valor = c.amount / 100;
      const reembolsado = (c.amount_refunded || 0) / 100;
      let status = c.status === 'succeeded' ? (c.refunded ? 'refunded' : 'paid') : (c.status === 'failed' ? 'failed' : c.status);

      if (recentes.length < 12) recentes.push({ data: dia, produto: prod.nome, valor, moeda: c.currency, status });
      if (c.status === 'failed') { falhas++; return; }
      if (c.status !== 'succeeded') return;

      if (c.currency !== CUR) {
        outrasMoedas[c.currency] = (outrasMoedas[c.currency] || 0) + valor - reembolsado;
        return;
      }
      const liquido = valor - reembolsado;
      reembolsos += reembolsado;
      if (liquido <= 0) return; // full refund: not counted as a sale
      diario[idx] += liquido;
      diario180[i180] += liquido;
      if (prod.viaAnuncios) receitaAds += liquido;
      const k = prod.nome;
      porProduto[k] = porProduto[k] || { nome: k, valor: 0, qtd: 0 };
      porProduto[k].valor += liquido; porProduto[k].qtd += 1;
      if (prod.site) porSite[prod.site] = (porSite[prod.site] || 0) + liquido;
    });

    // Stripe balance: "pending" is money from paid sales that Stripe has not released yet
    // (shown under Balances as incoming). It is not a subscription forecast.
    const pend = (balance.pending || []).find((b) => b.currency === CUR);
    const disp = (balance.available || []).find((b) => b.currency === CUR);
    const r2 = (v) => Math.round(v * 100) / 100;
    const total30 = diario.reduce((a, b) => a + b, 0);
    const sites = {};
    registry.sites.forEach((s) => { sites[s.slug] = { receita30d: Math.round((porSite[s.slug] || 0) * 100) / 100 }; });

    return {
      faturamento: {
        moeda: CUR.toUpperCase(),
        diario: diario.map((v) => Math.round(v * 100) / 100),
        porProduto: Object.values(porProduto).sort((a, b) => b.valor - a.valor),
        recentes,
        aCaminho: pend ? pend.amount / 100 : 0,
        disponivel: disp ? disp.amount / 100 : 0,
        dias180,
        diario180: diario180.map(r2),
        receita30d: r2(total30),
        receitaAnterior30d: r2(receitaAnterior),
        receitaAds30d: r2(receitaAds),
        receitaAdsAnterior30d: r2(receitaAdsAnterior),
        receitaOrganica30d: r2(total30 - receitaAds),
        falhas30d: falhas,
        reembolsos30d: Math.round(reembolsos * 100) / 100,
        outrasMoedas
      },
      sites
    };
  }
};
