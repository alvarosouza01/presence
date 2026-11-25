/* Dados de EXEMPLO. Nada aqui é real.
   Usado (1) pela API quando nenhuma fonte está configurada e
   (2) no preview local sem a API. Formato = o que /api/portal/data devolve. */

(function () {
  // Gera uma série de N dias terminando ontem, com tendência e ruído determinísticos.
  function serie(n, base, amp, seed) {
    var out = [];
    for (var i = 0; i < n; i++) {
      var x = Math.sin((i + seed) * 1.7) * 0.5 + Math.cos((i + seed) * 0.6) * 0.5;
      out.push(Math.max(0, Math.round(base + amp * x + i * (amp / n))));
    }
    return out;
  }

  // Reescala uma série para que a soma bata com um total.
  function escala(a, total) {
    var s = a.reduce(function (x, y) { return x + y; }, 0) || 1;
    return a.map(function (v) { return Math.round((v / s) * total * 100) / 100; });
  }

  var data = {
    demo: true,
    atualizadoEm: "2026-11-24T06:42:00+01:00",
    periodo: "Ontem, 23 nov",

    faturamento: {
      moeda: "BRL",
      diario: escala(serie(30, 60, 70, 3), 1106.6), // últimos 30 dias, em reais (soma = total por produto)
      porProduto: [
        { nome: "Mentoria (assinatura)", valor: 400, qtd: 2 },
        { nome: "Ebook", valor: 159.6, qtd: 4 },
        { nome: "Mentoria", valor: 398, qtd: 2 },
        { nome: "Review de portfólio", valor: 149, qtd: 1 }
      ],
      recentes: [
        { data: "23 nov", produto: "Ebook", valor: 39.9, status: "reembolsado" },
        { data: "22 nov", produto: "Mentoria", valor: 199, status: "pago" },
        { data: "20 nov", produto: "Ebook", valor: 39.9, status: "pago" },
        { data: "18 nov", produto: "Review de portfólio", valor: 149, status: "pago" },
        { data: "16 nov", produto: "Mentoria (assinatura)", valor: 200, status: "pago" },
        { data: "15 nov", produto: "Mentoria (assinatura)", valor: 200, status: "falhou" },
        { data: "11 nov", produto: "Ebook", valor: 39.9, status: "pago" }
      ],
      aCaminho: 419.2,
      falhas30d: 3,
      reembolsos30d: 39.9,
      gastoAds30d: 312.4
    },

    redes: {
      youtube: {
        canal: "Meu canal", url: "https://www.youtube.com/",
        inscritos: 12840, viewsTotal: 486200, videos: 74,
        dias: [], serie: { ganhos: serie(28, 14, 9, 2), perdidos: serie(28, 3, 2, 6), views: serie(28, 900, 500, 4), minutos: [] },
        novos28: 402, perdidos28: 88, views28: 26120, analyticsOk: true,
        ultimosVideos: [
          { titulo: "5 erros comuns", data: "2026-11-20", views: 3820, likes: 311, comentarios: 46, thumb: null, url: "#" },
          { titulo: "30 segundos para avaliar um portfólio", data: "2026-11-12", views: 2210, likes: 180, comentarios: 22, thumb: null, url: "#" },
          { titulo: "Como montei meu portfólio", data: "2026-11-03", views: 6110, likes: 540, comentarios: 81, thumb: null, url: "#" }
        ]
      },
      instagram: [{
        usuario: "@seuperfil", nome: "Seu Nome", url: "https://www.instagram.com/", foto: null,
        seguidores: 23410, seguindo: 610, posts: 412, dias: [], serieNovos: serie(30, 22, 15, 8),
        novos30: 684, perdidos30: 141, alcanceOntem: 9120, visitasPerfilOntem: 388,
        ultimosPosts: [
          { tipo: "Carrossel", legenda: "5 erros que deixam seu portfólio genérico", data: "2026-11-22", curtidas: 1240, comentarios: 63, thumb: null, url: "#" },
          { tipo: "Reels", legenda: "Antes e depois: portfólio refeito com Claude Code", data: "2026-11-19", curtidas: 2810, comentarios: 142, thumb: null, url: "#" },
          { tipo: "Foto", legenda: "Bastidores do curso", data: "2026-11-15", curtidas: 690, comentarios: 18, thumb: null, url: "#" }
        ]
      }]
    },

    sites: [
      {
        slug: "meusite",
        nome: "meusite.com",
        dominio: "www.meusite.com",
        papel: "Portfólio, curso e ebook",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 9, anterior: 6, serie: serie(14, 9, 7, 1) },
        conversao: { rotulo: "Inscrições na lista", ontem: 2, anterior: 1 },
        paginas: [["/", 3], ["/curso", 2], ["/contact.html", 1], ["/projeto-1", 1], ["/sobre", 1], ["/work.html", 1]],
        origens: [["(direct) / (none)", 4], ["instagram / organic", 2], ["meuapp.com / referral", 1], ["google / organic", 1]],
        receita30d: 708.6,
        ads: {
          ativo: true,
          conta: "Minha conta",
          campanhas: [
            {
              nome: "EBOOK | Vendas | Teste 1",
              status: "ativa",
              objetivo: "Vendas",
              desde: "2026-11-23",
              orcamentoDia: 30,
              gasto: 212.4, impressoes: 18430, alcance: 11920, cliques: 402,
              ctr: 2.18, cpc: 0.53, resultados: 31, rotuloResultado: "compras",
              serieGasto: serie(2, 28, 3, 4),
              criativos: [
                { nome: "Vídeo 30s | portfólio que parece igual", formato: "Reels 9:16", titulo: "Seu portfólio parece com todos os outros?", texto: "Eu refiz o meu com Claude Code em um fim de semana.", gasto: 98.2, ctr: 2.9, resultados: 17, tom: 8 },
                { nome: "Carrossel | antes e depois", formato: "Carrossel 4:5", titulo: "Antes do Framer. Depois do Claude Code.", texto: "Mesmo designer, outro resultado.", gasto: 71.5, ctr: 1.9, resultados: 9, tom: 210 },
                { nome: "Estático | lista de espera", formato: "Feed 1:1", titulo: "Entre na lista", texto: "Turma fechada, vagas limitadas.", gasto: 42.7, ctr: 1.4, resultados: 5, tom: 30 }
              ]
            },
            {
              nome: "Ebook | Vendas | Remarketing",
              status: "pausada",
              objetivo: "Vendas",
              desde: "2026-10-28",
              orcamentoDia: 10,
              gasto: 100, impressoes: 6210, alcance: 2840, cliques: 96,
              ctr: 1.55, cpc: 1.04, resultados: 3, rotuloResultado: "compras",
              serieGasto: serie(12, 9, 4, 9),
              criativos: [
                { nome: "Estático | capa do ebook", formato: "Feed 4:5", titulo: "6 capítulos para entrar em UX", texto: "R$ 39,90. Acesso imediato.", gasto: 100, ctr: 1.55, resultados: 3, tom: 350 }
              ]
            }
          ]
        }
      },
      {
        slug: "mentoria",
        nome: "Mentoria",
        dominio: "www.mentoria.com",
        papel: "Review de portfólio pago",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 14, anterior: 3, serie: serie(14, 6, 6, 5) },
        conversao: { rotulo: "Checkouts iniciados", ontem: 2, anterior: 0 },
        paginas: [["/", 9], ["/br", 4], ["/thanks", 1]],
        origens: [["(direct) / (none)", 7], ["linkedin / social", 4], ["google / organic", 3]],
        receita30d: 398,
        ads: { ativo: false, conta: "Conta nova", campanhas: [] }
      },
      {
        slug: "app",
        nome: "meuapp.com",
        dominio: "meuapp.com",
        papel: "Landing do app",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 5, anterior: 4, serie: serie(14, 4, 3, 2) },
        conversao: null,
        paginas: [["/", 4], ["/stack.html", 1]],
        origens: [["(direct) / (none)", 3], ["meusite.com / referral", 2]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      },
      {
        slug: "blog",
        nome: "Blog",
        dominio: "blog.meusite.com",
        papel: "Blog pessoal",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 41, anterior: 37, serie: serie(14, 35, 12, 7) },
        conversao: null,
        paginas: [["/", 18], ["/pokemon/pikachu", 6], ["/pokemon/charizard", 5], ["/pokemon/mew", 3]],
        origens: [["google / organic", 22], ["(direct) / (none)", 12], ["reddit / referral", 7]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      },
      {
        slug: "loja",
        nome: "loja.com",
        dominio: "loja.com",
        papel: "Loja online",
        ga: "G-XXXXXXXXXX",
        visitas: { ontem: 12, anterior: 15, serie: serie(14, 13, 5, 11) },
        conversao: { rotulo: "Cliques na App Store", ontem: 3, anterior: 5 },
        paginas: [["/", 10], ["/privacy.html", 1], ["/support.html", 1]],
        origens: [["(direct) / (none)", 6], ["instagram / organic", 4], ["google / organic", 2]],
        receita30d: 0,
        ads: { ativo: false, conta: null, campanhas: [] }
      }
    ]
  };

  // Orgânico x anúncios: divide as visitas de cada site (sites com ads ficam com ~35% pagos).
  var paginasAds = {
    meusite: [
      { pagina: "/ebook", campanha: "EBOOK | Vendas | Teste 1", origem: "ig", sessoes: 46, conversoes: 3 },
      { pagina: "/ebook", campanha: "EBOOK | Vendas | Teste 1", origem: "facebook", sessoes: 21, conversoes: 1 },
      { pagina: "/", campanha: null, origem: "facebook", sessoes: 4, conversoes: 0 }
    ]
  };
  data.sites.forEach(function (s) {
    var parte = s.ads.ativo ? 0.35 : 0;
    var n = s.visitas.serie.length;
    s.visitas.serie[n - 1] = s.visitas.ontem; s.visitas.serie[n - 2] = s.visitas.anterior;
    var ads = s.visitas.serie.map(function (v, i) { return i >= n - 2 || i > 6 ? Math.round(v * parte) : 0; });
    var org = s.visitas.serie.map(function (v, i) { return v - ads[i]; });
    s.visitas.organico = { ontem: org[n - 1], anterior: org[n - 2], serie: org };
    s.visitas.ads = { ontem: ads[n - 1], anterior: ads[n - 2], serie: ads };
    s.paginasAds = paginasAds[s.slug] || [];
  });

  // Campos da rodada 25/11: séries longas de receita, países e landing pages.
  (function () {
    var f = data.faturamento, hoje = new Date(), d180 = [];
    for (var i = 180; i >= 1; i--) { var dt = new Date(hoje.getTime() - i * 864e5); d180.push(dt.toISOString().slice(0, 10)); }
    f.dias180 = d180;
    f.diario180 = serie(150, 18, 16, 3).concat(f.diario);
    f.receita30d = f.diario.reduce(function (a, b) { return a + b; }, 0);
    f.receitaAnterior30d = Math.round(f.receita30d * 0.82);
    f.receitaAds30d = 119.7; f.receitaAdsAnterior30d = 39.9;
    f.receitaOrganica30d = f.receita30d - f.receitaAds30d;
    f.disponivel = 0;
    var paises = [["Brazil", 61], ["Portugal", 9], ["Switzerland", 6], ["United States", 4], ["Spain", 3]];
    data.sites.forEach(function (s, k) {
      s.visitas.dias = d180.slice(-s.visitas.serie.length);
      s.paises = paises.map(function (p) { return [p[0], Math.max(1, Math.round(p[1] / (k + 1)))]; });
    });
    data.sites[0].landings = [
      { nome: "Curso", caminho: "/curso", produto: null, campanhas: ["curso"], visitas30d: 412, pessoas30d: 350, conversoes30d: 38, rotulo: "Inscrições" },
      { nome: "Ebook", caminho: "/ebook", produto: "Ebook", campanhas: ["ebook", "e-book", "ebook"], visitas30d: 690, pessoas30d: 588, conversoes30d: 21, rotulo: "Checkouts iniciados" }
    ];
    data.redes.newsletter = { nome: "Newsletter", url: null, inscritos: 5240, novos30d: 212, novosAnterior30d: 180, novos7d: 41,
      envios: [{ assunto: "3 portfólios que contratam", data: "2026-11-20", enviados: 5180, abertura: 41.2, cliques: 3.8, descadastros: 6 },
               { assunto: "O que eu olho em 30 segundos", data: "2026-11-13", enviados: 5120, abertura: 38.7, cliques: 2.9, descadastros: 9 }] };
    (data.redes.instagram || []).forEach(function (ig) { ig.ultimosPosts.forEach(function (p, i) { p.novosSeguidores = [12, 31, 4][i] || 0; p.alcance = [8200, 19400, 3100][i] || 0; }); });
  })();

  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  else window.PORTAL_DEMO = data;
})();
