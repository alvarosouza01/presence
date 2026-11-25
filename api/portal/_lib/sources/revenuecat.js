// Source: RevenueCat. App subscriptions: MRR, revenue, active subscriptions, trials, new customers.
// Env: REVENUECAT_API_KEY = v2 secret key with the charts_metrics:overview:read permission
//      (RevenueCat > Project settings > API keys > New secret key, version V2).
// Optional: REVENUECAT_PROJECT_ID to show a single project. Without it, every project the key can see is shown.

const API = 'https://api.revenuecat.com/v2/';

async function get(path, params) {
  const r = await fetch(API + path + (params ? '?' + new URLSearchParams(params) : ''), {
    headers: { Authorization: 'Bearer ' + process.env.REVENUECAT_API_KEY, Accept: 'application/json' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('RevenueCat ' + path + ' ' + r.status + ' ' + (j.message || ''));
  return j;
}

module.exports = {
  id: 'revenuecat',
  nome: 'RevenueCat',
  envs: ['REVENUECAT_API_KEY'],
  isConfigured: () => Boolean(process.env.REVENUECAT_API_KEY),

  async collect() {
    const moeda = String(process.env.PORTAL_CURRENCY || 'usd').toUpperCase();
    let projetos;
    if (process.env.REVENUECAT_PROJECT_ID) projetos = [{ id: process.env.REVENUECAT_PROJECT_ID, name: '' }];
    else projetos = ((await get('projects', { limit: '20' })).items || []);

    const apps = [];
    for (const p of projetos) {
      const j = await get('projects/' + p.id + '/metrics/overview', { currency: moeda });
      const m = {};
      (j.metrics || []).forEach((x) => { m[x.id] = x.value; });
      apps.push({
        nome: p.name || p.id,
        mrr: m.mrr != null ? m.mrr : null,
        receita28d: m.revenue != null ? m.revenue : null,
        assinaturas: m.active_subscriptions != null ? m.active_subscriptions : null,
        trials: m.active_trials != null ? m.active_trials : null,
        novos28d: m.new_customers != null ? m.new_customers : null,
        ativos28d: m.active_users != null ? m.active_users : null
      });
    }
    return { faturamento: { apps }, avisos: [] };
  }
};
