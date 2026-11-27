// Source: Meta Ads (campaigns, metrics, creatives and spend).
// Env: META_ACCESS_TOKEN = long-lived system user token from
// your Business Manager, with ads_read only on the accounts
// listed in sites.js (meta.adAccounts). Optional: META_API_VERSION (default below).

const { ultimosDias, diaLocal } = require('../util');

const VERSAO = () => process.env.META_API_VERSION || 'v23.0';
const BASE = () => 'https://graph.facebook.com/' + VERSAO() + '/';

async function get(path, params) {
  const url = BASE() + path + '?' + new URLSearchParams(Object.assign({ access_token: process.env.META_ACCESS_TOKEN }, params)).toString();
  return pegar(url);
}

async function pegar(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error('Meta ' + ((j.error && (j.error.code + ' ' + j.error.message)) || r.status));
  return j;
}

// Reads every page of a list (safety limit: 5 pages).
async function todas(path, params) {
  let j = await get(path, params);
  let out = j.data || [];
  for (let i = 0; i < 4 && j.paging && j.paging.next; i++) {
    j = await pegar(j.paging.next);
    out = out.concat(j.data || []);
  }
  const vistos = new Set();
  return out.filter((x) => !x.id || (!vistos.has(x.id) && vistos.add(x.id)));
}

// Which action counts as a "result" for each campaign objective.
const RESULTADO = {
  OUTCOME_SALES: { tipos: ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase'], rotulo: 'purchases' },
  OUTCOME_LEADS: { tipos: ['offsite_conversion.fb_pixel_lead', 'lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_complete_registration'], rotulo: 'leads' },
  OUTCOME_TRAFFIC: { tipos: ['landing_page_view', 'link_click'], rotulo: 'landing page views' },
  OUTCOME_ENGAGEMENT: { tipos: ['post_engagement'], rotulo: 'engagements' },
  OUTCOME_AWARENESS: { tipos: ['reach'], rotulo: 'reach' }
};
function resultadoDe(objetivo) { return RESULTADO[objetivo] || { tipos: ['link_click'], rotulo: 'clicks' }; }
function contarAcoes(actions, tipos) {
  const a = actions || [];
  for (const t of tipos) {
    const hit = a.find((x) => x.action_type === t);
    if (hit) return Number(hit.value) || 0;
  }
  return 0;
}

const OBJETIVO_PT = {
  OUTCOME_SALES: 'Sales', OUTCOME_LEADS: 'Leads', OUTCOME_TRAFFIC: 'Traffic',
  OUTCOME_ENGAGEMENT: 'Engagement', OUTCOME_AWARENESS: 'Awareness', OUTCOME_APP_PROMOTION: 'App'
};

const num = (v) => Number(v) || 0;
const r2 = (v) => Math.round(v * 100) / 100;

async function coletarConta(conta, dias) {
  const [info, campanhas, ins30, insDia, ads, insAds] = await Promise.all([
    get('act_' + conta, { fields: 'name,currency' }),
    todas('act_' + conta + '/campaigns', {
      fields: 'id,name,status,effective_status,objective,start_time,daily_budget,lifetime_budget',
      effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'IN_PROCESS', 'WITH_ISSUES']),
      limit: '100'
    }),
    todas('act_' + conta + '/insights', {
      level: 'campaign', date_preset: 'last_30d', limit: '200',
      fields: 'campaign_id,spend,impressions,reach,clicks,ctr,cpc,actions'
    }),
    todas('act_' + conta + '/insights', {
      level: 'campaign', time_range: JSON.stringify({ since: dias[0], until: dias[dias.length - 1] }),
      time_increment: '1', limit: '500', fields: 'campaign_id,spend'
    }),
    todas('act_' + conta + '/ads', {
      // thumbnail requested at 600px: Meta's default is 64px and looks blurry.
      fields: 'id,name,campaign_id,effective_status,creative.thumbnail_width(600).thumbnail_height(600){title,body,thumbnail_url,image_url,object_type}',
      effective_status: JSON.stringify(['ACTIVE', 'PAUSED', 'IN_PROCESS', 'WITH_ISSUES']),
      limit: '200'
    }),
    todas('act_' + conta + '/insights', {
      level: 'ad', date_preset: 'last_30d', limit: '500', fields: 'ad_id,spend,ctr,actions'
    })
  ]);

  const i30 = {}; ins30.forEach((x) => { i30[x.campaign_id] = x; });
  const serie = {};
  insDia.forEach((x) => {
    const s = serie[x.campaign_id] = serie[x.campaign_id] || dias.map(() => 0);
    const idx = dias.indexOf(x.date_start);
    if (idx >= 0) s[idx] += num(x.spend);
  });
  const iAd = {}; insAds.forEach((x) => { iAd[x.ad_id] = x; });

  const saida = campanhas.map((c) => {
    const m = i30[c.id] || {};
    const res = resultadoDe(c.objective);
    const gs = (serie[c.id] || dias.map(() => 0)).map(r2);
    const gasto = num(m.spend);
    const resultados = c.objective === 'OUTCOME_AWARENESS' ? num(m.reach) : contarAcoes(m.actions, res.tipos);
    const desde = String(c.start_time || '').slice(0, 10);
    const ultimos2 = gs.slice(-2).reduce((a, b) => a + b, 0);
    const diasNoAr = desde ? (Date.now() - new Date(c.start_time).getTime()) / 864e5 : 99;

    let status = 'pausada';
    if (c.effective_status === 'ACTIVE') status = (ultimos2 === 0 && diasNoAr > 2) ? 'sem_entrega' : 'ativa';
    else if (c.effective_status === 'WITH_ISSUES') status = 'sem_entrega';
    else if (c.effective_status === 'IN_PROCESS') status = 'in review';

    const criativos = ads.filter((a) => a.campaign_id === c.id).map((a) => {
      const im = iAd[a.id] || {};
      const cr = a.creative || {};
      return {
        nome: a.name,
        formato: cr.object_type === 'VIDEO' ? 'Video' : (cr.object_type ? 'Image' : 'Ad'),
        titulo: cr.title || a.name,
        texto: cr.body || '',
        imagem: cr.image_url || cr.thumbnail_url || null,
        gasto: r2(num(im.spend)), ctr: r2(num(im.ctr)),
        resultados: contarAcoes(im.actions, res.tipos)
      };
    }).sort((a, b) => b.gasto - a.gasto).slice(0, 8);

    return {
      nome: c.name,
      status,
      objetivo: OBJETIVO_PT[c.objective] || c.objective || '',
      desde,
      orcamentoDia: c.daily_budget ? num(c.daily_budget) / 100 : null,
      gasto: r2(gasto),
      impressoes: num(m.impressions), alcance: num(m.reach), cliques: num(m.clicks),
      ctr: r2(num(m.ctr)), cpc: r2(num(m.cpc)),
      resultados, rotuloResultado: res.rotulo,
      serieGasto: gs,
      criativos,
      // 30 days
      // (still learning). An "active" campaign idle for months is hidden.
      _relevante: gasto > 0 || (c.effective_status === 'ACTIVE' && diasNoAr <= 3) || c.effective_status === 'IN_PROCESS'
    };
  }).filter((c) => c._relevante).map((c) => { delete c._relevante; return c; });

  const gastoTotal = ins30.reduce((a, x) => a + num(x.spend), 0);
  return { conta, nome: info.name, moeda: info.currency, campanhas: saida, gasto30d: gastoTotal };
}

module.exports = {
  id: 'meta',
  nome: 'Meta Ads',
  envs: ['META_ACCESS_TOKEN'],
  isConfigured: () => Boolean(process.env.META_ACCESS_TOKEN),

  async collect({ registry, hoje }) {
    const dias = ultimosDias(hoje, 14);
    const contas = [...new Set(registry.sites.flatMap((s) => (s.meta && s.meta.contas) || []))];
    const res = await Promise.allSettled(contas.map((c) => coletarConta(c, dias)));

    const avisos = [];
    const ok = [];
    res.forEach((r, i) => {
      if (r.status === 'fulfilled') ok.push(r.value);
      else avisos.push('Meta conta ' + contas[i] + ': ' + (r.reason && r.reason.message));
    });
    if (!ok.length && avisos.length) throw new Error(avisos[0]);

    // Assigns campaigns to sites: same account and name matching campaignsContaining.
    // A campaign with no matching site goes to the first site that lists the account.
    const sites = {};
    registry.sites.forEach((s) => { sites[s.slug] = { ads: { ativo: false, conta: null, campanhas: [] } }; });
    ok.forEach((conta) => {
      const donos = registry.sites.filter((s) => s.meta && (s.meta.contas || []).includes(conta.conta));
      conta.campanhas.forEach((c) => {
        const nome = c.nome.toLowerCase();
        const site = donos.find((s) => (s.meta.campanhasContendo || []).some((t) => nome.includes(t.toLowerCase()))) || donos[0];
        if (!site) return;
        const ads = sites[site.slug].ads;
        ads.campanhas.push(c);
        ads.conta = ads.conta && ads.conta !== conta.nome ? ads.conta + ', ' + conta.nome : conta.nome;
      });
    });
    const ordem = { ativa: 0, sem_entrega: 1, 'in review': 2, pausada: 3 };
    Object.values(sites).forEach((s) => {
      s.ads.campanhas.sort((a, b) => (ordem[a.status] - ordem[b.status]) || (b.gasto - a.gasto));
      s.ads.ativo = s.ads.campanhas.some((c) => c.status === 'ativa');
      s.ads.rodando = s.ads.campanhas.filter((c) => c.status === 'ativa').length;
    });
    Object.keys(sites).forEach((k) => { if (!sites[k].ads.campanhas.length) delete sites[k]; });

    // Spend since your first payment to Meta, for the "Invested in ads" block.
    let investimento = null;
    const inv = registry.investimentoMeta;
    if (inv && inv.desde) {
      const ate = diaLocal(hoje.getTime());
      const gs = await Promise.allSettled(contas.map((c) => get('act_' + c + '/insights', {
        fields: 'spend', time_range: JSON.stringify({ since: inv.desde, until: ate })
      })));
      const gastoDesde = gs.reduce((a, r) => a + (r.status === 'fulfilled' ? num(((r.value.data || [])[0] || {}).spend) : 0), 0);
      const pagos = (inv.pagamentos || []).reduce((a, p) => a + (Number(p.valor) || 0), 0);
      investimento = { desde: inv.desde, investido: r2(pagos), gasto: r2(gastoDesde), saldo: r2(pagos - gastoDesde), pagamentos: inv.pagamentos || [] };
    }

    return {
      sites,
      faturamento: { gastoAds30d: r2(ok.reduce((a, c) => a + c.gasto30d, 0)), investimentoMeta: investimento },
      avisos
    };
  }
};
