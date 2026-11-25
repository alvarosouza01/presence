// Turns the English config in sites.js into the internal shape the sources use.
// You never need to edit this file: edit sites.js instead.

module.exports = function config(c) {
  const site = (s) => ({
    slug: s.slug,
    nome: s.name,
    dominio: s.domain,
    papel: s.description || '',
    ga4: s.ga4 || null,
    conversao: s.conversion ? { evento: s.conversion.event, rotulo: s.conversion.label } : null,
    landings: (s.landingPages || []).map((l) => ({
      nome: l.name, caminho: l.path, paginas: l.pages || [l.path],
      evento: l.event, rotulo: l.label, campanhas: l.campaigns || [],
      produto: l.product || null, kit: l.kitList || null
    })),
    meta: s.meta ? { contas: s.meta.adAccounts || [], campanhasContendo: s.meta.campaignsContaining || [] } : null
  });
  const social = c.social || {};
  return {
    sites: (c.sites || []).map(site),
    produtos: (c.products || []).map((p) => ({ nome: p.name, site: p.site, viaAnuncios: Boolean(p.fromAds), paymentLinks: p.paymentLinks || [] })),
    produtoPadrao: { nome: (c.defaultProduct && c.defaultProduct.name) || 'Other', site: (c.defaultProduct && c.defaultProduct.site) || null },
    redes: {
      instagram: (social.instagram || []).map((i) => ({ id: i.id, usuario: i.username })),
      newsletter: social.newsletter ? { nome: social.newsletter.name || 'Newsletter', url: social.newsletter.url || null } : null
    }
  };
};
