// ============================================================
// REGISTRO DO PORTAL · o único arquivo que você edita para plugar
// seus sites, produtos e redes. Veja README.md e docs/portal.md.
// Nada aqui é segredo: são só IDs públicos. Chaves e tokens ficam
// nas variáveis de ambiente da Vercel (veja .env.example).
// ============================================================

module.exports = {
  // Sites que aparecem no overview e no menu, nesta ordem.
  sites: [
    {
      slug: 'meusite',                       // usado na URL do portal: #/site/meusite
      nome: 'meusite.com',
      dominio: 'www.meusite.com',
      papel: 'Portfólio e produtos',         // descrição curta que aparece no card
      // GA4: Admin > Configurações da propriedade (ID numérico) e Fluxo de dados (G-XXXX).
      ga4: { propertyId: '000000000', measurementId: 'G-XXXXXXXXXX' },
      // Evento do GA4 que conta como conversão principal (opcional, ou null).
      conversao: { evento: 'generate_lead', rotulo: 'Inscrições' },
      // Landing pages (opcional): visitas e conversões do GA4, vendas do Stripe,
      // anúncios do Meta e, se usar Kit, quantas pessoas estão na lista.
      landings: [
        {
          nome: 'Lista de espera', caminho: '/lista', paginas: ['/lista'],
          evento: 'generate_lead', rotulo: 'Inscrições',
          campanhas: ['lista'],              // trecho do nome das campanhas no Meta
          produto: null,                     // nome de um produto abaixo, se a página vende algo
          kit: 'lista de espera'             // trecho do nome do formulário ou tag no Kit
        }
      ],
      // Contas de anúncio do Meta (só números, sem "act_") e trechos do nome das campanhas deste site.
      meta: { contas: ['000000000000000'], campanhasContendo: ['meusite'] }
    },
    {
      slug: 'app',
      nome: 'meuapp.com',
      dominio: 'meuapp.com',
      papel: 'Landing do app',
      ga4: { propertyId: '000000000', measurementId: 'G-XXXXXXXXXX' },
      conversao: null,
      meta: null
    }
  ],

  // Produtos vendidos no Stripe. Cada venda é ligada a um produto pelo Payment Link
  // usado no checkout (Stripe > Payment Links, o ID começa com plink_).
  // viaAnuncios: true marca produtos vendidos com anúncio pago: a receita deles entra
  // no retorno dos anúncios (ROI). O resto conta como receita orgânica.
  produtos: [
    { nome: 'Ebook', site: 'meusite', viaAnuncios: true, paymentLinks: ['plink_XXXXXXXXXXXXXXXX'] },
    { nome: 'Assinatura', site: 'meusite', paymentLinks: [] }
  ],

  // Vendas que não batem com nenhum Payment Link entram aqui.
  produtoPadrao: { nome: 'Outros', site: null },

  // Redes sociais da seção "Redes".
  redes: {
    // Instagram: ID da conta profissional (Business Manager > Contas do Instagram).
    instagram: [
      // { id: '17800000000000000', usuario: '@seuperfil' }
    ],
    // Newsletter no Kit: conta todos os inscritos ativos (precisa de KIT_API_KEY). Use null para esconder.
    newsletter: { nome: 'Newsletter', url: null }
  }
};
