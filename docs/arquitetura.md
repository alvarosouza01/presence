# Arquitetura

```
portal/                 front end estático (HTML, CSS, JS puro)
  index.html
  portal.js             telas: overview, faturamento, redes, site
  portal.css
  data-exemplo.js       dados de exemplo (usados quando nada está configurado)
api/portal/             funções serverless da Vercel (CommonJS, sem dependências)
  data.js               GET: monta o JSON do portal (exige login)
  me.js                 GET: quem está logado
  auth/                 login com Google e autorização do YouTube
  _lib/                 não vira rota
    sites.js            registro: sites, produtos, redes
    build.js            junta as fontes
    session.js          cookie de sessão assinado
    sources/*.js        uma fonte por arquivo
```

## Contrato de uma fonte

```js
module.exports = {
  id: 'nome',
  nome: 'Nome legível',
  envs: ['MINHA_CHAVE'],
  isConfigured: () => Boolean(process.env.MINHA_CHAVE),
  async collect({ registry, hoje }) {
    return {
      sites: { meusite: { campoNovo: 123 } },   // mesclado em cada site pelo slug
      faturamento: { },                          // mesclado no faturamento
      redes: { minhaRede: { } },                 // mesclado em redes
      avisos: []                                 // mensagens que aparecem no topo
    };
  }
};
```

Adicione o arquivo em `FONTES`, dentro de `build.js`. Se a fonte falhar, as outras continuam e o erro aparece no topo do portal. Depois, mostre o campo novo em `portal.js`.
