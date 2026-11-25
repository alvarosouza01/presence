// Fonte: Kit (antigo ConvertKit), listas de inscritos das landing pages.
// Variável: KIT_API_KEY = chave da API v4 (Kit > Settings > Developer > API keys).
// Cada landing em sites.js pode ter kit: 'trecho do nome do formulário ou tag no Kit'.

const API = 'https://api.kit.com/v4/';

async function get(path, params) {
  const r = await fetch(API + path + (params ? '?' + new URLSearchParams(params) : ''), {
    headers: { 'X-Kit-Api-Key': process.env.KIT_API_KEY, Accept: 'application/json' }
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Kit ' + path + ' ' + r.status + ' ' + ((j.errors || []).join(' ') || ''));
  return j;
}

// Inscritos de um formulário ou tag, do mais novo para o mais antigo (até 1000).
async function inscritos(tipo, id) {
  let out = [], after = null, total = null;
  for (let i = 0; i < 10; i++) {
    const p = { per_page: '100', include_total_count: 'true' };
    if (after) p.after = after;
    const j = await get(tipo + '/' + id + '/subscribers', p);
    out = out.concat(j.subscribers || []);
    if (total == null && j.pagination) total = j.pagination.total_count;
    if (!j.pagination || !j.pagination.has_next_page) break;
    after = j.pagination.end_cursor;
  }
  return { total: total != null ? total : out.length, lista: out };
}

module.exports = {
  id: 'kit',
  nome: 'Kit',
  envs: ['KIT_API_KEY'],
  isConfigured: () => Boolean(process.env.KIT_API_KEY),

  async collect({ registry }) {
    const [forms, tags] = await Promise.all([get('forms', { per_page: '100' }), get('tags', { per_page: '100' })]);
    const alvos = [];
    (forms.forms || []).forEach((f) => alvos.push({ tipo: 'forms', id: f.id, nome: String(f.name || '') }));
    (tags.tags || []).forEach((t) => alvos.push({ tipo: 'tags', id: t.id, nome: String(t.name || '') }));

    const agora = Date.now();
    const sites = {}, avisos = [];
    for (const site of registry.sites) {
      for (const l of site.landings || []) {
        if (!l.kit) continue;
        const alvo = alvos.find((a) => a.nome.toLowerCase().includes(l.kit.toLowerCase()));
        if (!alvo) { avisos.push('Kit: nenhum formulário ou tag com "' + l.kit + '" no nome. Disponíveis: ' + alvos.map((a) => a.nome).join(', ').slice(0, 300)); continue; }
        try {
          const { total, lista } = await inscritos(alvo.tipo, alvo.id);
          const quando = (s) => new Date(s.added_at || s.created_at).getTime();
          const dentro = (d) => lista.filter((s) => agora - quando(s) <= d * 864e5).length;
          sites[site.slug] = sites[site.slug] || { kit: {} };
          sites[site.slug].kit[l.nome] = {
            origem: (alvo.tipo === 'forms' ? 'Formulário ' : 'Tag ') + alvo.nome,
            total, novos7d: dentro(7), novos30d: dentro(30),
            recentes: lista.slice(0, 15).map((s) => ({
              nome: s.first_name || '', email: s.email_address || '',
              data: new Date(quando(s)).toISOString().slice(0, 10)
            }))
          };
        } catch (e) { avisos.push(e.message); }
      }
    }
    // Newsletter (aba Redes): total de inscritos ativos, novos no período e últimos envios.
    let newsletter = null;
    const cfg = registry.redes && registry.redes.newsletter;
    if (cfg) {
      try {
        const contar = async (extra) => {
          const j = await get('subscribers', Object.assign({ per_page: '1', include_total_count: 'true', status: 'active' }, extra));
          return (j.pagination && j.pagination.total_count) || 0;
        };
        const iso = (d) => new Date(agora - d * 864e5).toISOString();
        const [total, novos30, novos60, novos7] = await Promise.all([
          contar({}), contar({ created_after: iso(30) }), contar({ created_after: iso(60) }), contar({ created_after: iso(7) })
        ]);
        let envios = [];
        try {
          const b = await get('broadcasts', { per_page: '6' });
          const lista = (b.broadcasts || []).filter((x) => x.published_at || x.send_at).slice(0, 5);
          envios = await Promise.all(lista.map(async (x) => {
            let st = {};
            try { st = ((await get('broadcasts/' + x.id + '/stats')).broadcast || {}).stats || {}; } catch (e) { /* sem estatística */ }
            return {
              assunto: x.subject || '(sem assunto)',
              data: String(x.published_at || x.send_at).slice(0, 10),
              enviados: st.recipients != null ? st.recipients : null,
              abertura: st.open_rate != null ? st.open_rate : null,
              cliques: st.click_rate != null ? st.click_rate : null,
              descadastros: st.unsubscribes != null ? st.unsubscribes : null
            };
          }));
        } catch (e) { avisos.push('Kit: não consegui ler os envios (' + e.message + ')'); }
        newsletter = { nome: cfg.nome || 'Newsletter', url: cfg.url || null, inscritos: total, novos30d: novos30, novosAnterior30d: novos60 - novos30, novos7d: novos7, envios };
      } catch (e) { avisos.push('Kit newsletter: ' + e.message); }
    }

    return { sites, avisos, redes: newsletter ? { newsletter } : undefined };
  }
};
