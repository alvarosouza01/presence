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
    const dias180 = ultimosDias(hoje, 179).concat([diaLocal(hoje.getTime())]); // up to today, for the week and month views
    const dias = dias180.slice(-30);                   // last 30 days, including today
    const ant30 = dias180.slice(-60, -30);             // the 30 days before, for comparison
    const desde = Math.floor(new Date(dias180[0] + 'T00:00:00Z').getTime() / 1000) - 3600 * 2;

    const [charges, sessions, balance] = await Promise.all([
      listAll('charges', { 'created[gte]': String(desde) }),
      listAll('checkout/sessions', { 'created[gte]': String(desde), status: 'complete' }),
      get('balance')
    ]);

    // payment_intent -> payment_link, from checkout sessions
    const linkPorPI = {};
    const refPorPI = {};
    sessions.forEach((s) => {
      if (s.payment_intent && s.payment_link) linkPorPI[s.payment_intent] = s.payment_link;
      if (s.payment_intent && s.client_reference_id) refPorPI[s.payment_intent] = s.client_reference_id;
    });
    Object.assign(refPorPI, registry.origemManual || {});

    // Where each sale came from: the client_reference_id your landing pages send to Stripe,
    // as source__medium__campaign__content (see docs/tracking.md).
    const PAGO = /^(paid|cpc|ppc|ads?|paid_social|paidsocial|display)$/i;
    function origemDe(c) {
      if (c.invoice && !linkPorPI[c.payment_intent]) return { tipo: 'recorrente', rotulo: 'Recurring' };
      const ref = refPorPI[c.payment_intent];
      if (!ref) return { tipo: 'sem', rotulo: 'Not tracked' };
      const [src, med, camp] = ref.split('__').map((v) => (v && v !== '-' ? v : ''));
      if (!src || /^(direct|direto)$/i.test(src)) return { tipo: 'direto', rotulo: 'Direct' };
      const pago = PAGO.test(med || '');
      return { tipo: pago ? 'ads' : 'organico', rotulo: (pago ? 'Ad' : 'Organic') + ' · ' + src, campanha: camp || null };
    }

    const produtoPorLink = {};
    registry.produtos.forEach((p) => (p.paymentLinks || []).forEach((l) => { produtoPorLink[l] = p; }));
    const assinatura = registry.produtos.find((p) => /assinatura|subscription/i.test(p.nome)) || registry.produtoPadrao;

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

    const diaHoje = diaLocal(hoje.getTime());
    let hojeValor = 0, hojeQtd = 0;
    const testes = (registry.emailsDeTeste || []).map((e) => e.toLowerCase());
    const ehTeste = (c) => [c.billing_details && c.billing_details.email, c.receipt_email]
      .some((e) => e && testes.indexOf(String(e).toLowerCase()) >= 0);
    // Sale from ads: when the sale is tracked, its origin decides (only "ad" counts).
    // Untracked sales fall back to the product's fromAds flag.
    const viaAds = (c, prod) => (refPorPI[c.payment_intent] ? origemDe(c).tipo === 'ads' : Boolean(prod.viaAnuncios));
    charges.forEach((c) => {
      if (ehTeste(c)) return;   // your own test purchases
      const dia = diaLocal(c.created * 1000);
      if (dia === diaHoje && c.status === 'succeeded' && c.currency === CUR) {
        const lq = (c.amount - (c.amount_refunded || 0)) / 100;
        if (lq > 0) { hojeValor += lq; hojeQtd++; }
      }
      const i180 = dias180.indexOf(dia);
      if (i180 < 0) return;
      const idx = dias.indexOf(dia);
      const prod = produtoDe(c);
      // Older than 30 days: only the long series and the comparison.
      if (idx < 0) {
        if (c.status === 'succeeded' && c.currency === CUR) {
          const liq = (c.amount - (c.amount_refunded || 0)) / 100;
          if (liq > 0) {
            diario180[i180] += liq;
            if (ant30.indexOf(dia) >= 0) { receitaAnterior += liq; if (viaAds(c, prod)) receitaAdsAnterior += liq; }
          }
        }
        return;
      }
      const valor = c.amount / 100;
      const reembolsado = (c.amount_refunded || 0) / 100;
      let status = c.status === 'succeeded' ? (c.refunded ? 'refunded' : 'paid') : (c.status === 'failed' ? 'failed' : c.status);

      if (recentes.length < 60) recentes.push({ data: dia, produto: prod.nome, valor, moeda: c.currency, status, hoje: dia === diaHoje, origem: origemDe(c) });
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
      if (viaAds(c, prod)) receitaAds += liquido;
      const k = prod.nome;
      porProduto[k] = porProduto[k] || { nome: k, valor: 0, qtd: 0, viaAnuncios: Boolean(prod.viaAnuncios) };
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
        hoje: { valor: r2(hojeValor), qtd: hojeQtd },
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
