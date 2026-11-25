# Architecture

```
portal/                 static front end (plain HTML, CSS, JS)
  index.html
  portal.js             screens: overview, revenue, social, site
  portal.css
  data-exemplo.js       example data, used when nothing is configured
api/portal/             Vercel serverless functions (CommonJS, no dependencies)
  data.js               GET: builds the portal JSON (sign-in required)
  me.js                 GET: who is signed in
  auth/                 Google sign-in and YouTube authorization
  _lib/                 not exposed as routes
    sites.js            your config (sites, products, social)
    config.js           turns sites.js into the internal shape
    build.js            merges every source
    session.js          signed session cookie
    sources/*.js        one source per file
```

## Source contract

```js
module.exports = {
  id: 'name',
  nome: 'Readable name',
  envs: ['MY_KEY'],
  isConfigured: () => Boolean(process.env.MY_KEY),
  async collect({ registry, hoje }) {
    return {
      sites: { mysite: { newField: 123 } },   // merged into each site by slug
      faturamento: { },                        // merged into revenue
      redes: { myNetwork: { } },               // merged into social
      avisos: []                               // messages shown at the top
    };
  }
};
```

Add the file to `FONTES` in `build.js`. If a source fails, the others keep working and the error shows at the top of the portal. Then render the new field in `portal.js`.

Internal field names are in Portuguese (the project started as a personal tool). Your config in `sites.js` is in English and `config.js` maps it.
