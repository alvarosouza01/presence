// ============================================================
// PORTAL CONFIG · the only file you edit to plug in your sites,
// products and social accounts. See README.md and docs/setup.md.
// Nothing here is secret: only public IDs. Keys and tokens live in
// your Vercel environment variables (see .env.example).
// ============================================================

module.exports = {
  // Sites shown in the overview and the menu, in this order.
  sites: [
    {
      slug: 'mysite',                        // used in the portal URL: #/site/mysite
      name: 'mysite.com',
      domain: 'www.mysite.com',
      description: 'Portfolio and products', // short line shown on the card
      // GA4: Admin > Property settings (numeric ID) and Data streams (G-XXXX).
      ga4: { propertyId: '000000000', measurementId: 'G-XXXXXXXXXX' },
      // GA4 event that counts as this site's main conversion (optional, or null).
      conversion: { event: 'generate_lead', label: 'Sign-ups' },
      // Landing pages (optional): GA4 visits and conversions, Stripe sales,
      // Meta ads status and, with Kit, how many people are on the list.
      landingPages: [
        {
          name: 'Waitlist', path: '/waitlist', pages: ['/waitlist'],
          event: 'generate_lead', label: 'Sign-ups',
          campaigns: ['waitlist'],           // part of the Meta campaign names
          product: null,                     // a product name below, if the page sells something
          kitList: 'waitlist'                // part of the Kit form or tag name
        }
      ],
      // Meta ad accounts (numbers only, no "act_") and parts of this site's campaign names.
      meta: { adAccounts: ['000000000000000'], campaignsContaining: ['mysite'] }
    },
    {
      slug: 'app',
      name: 'myapp.com',
      domain: 'myapp.com',
      description: 'App landing page',
      ga4: { propertyId: '000000000', measurementId: 'G-XXXXXXXXXX' },
      conversion: null,
      meta: null
    }
  ],

  // Products sold through Stripe. Each sale is matched to a product by the Payment Link
  // used at checkout (Stripe > Payment Links, the ID starts with plink_).
  // fromAds: true marks products you sell with paid ads: their revenue counts toward
  // return on ad spend. Everything else counts as organic revenue.
  products: [
    { name: 'Ebook', site: 'mysite', fromAds: true, paymentLinks: ['plink_XXXXXXXXXXXXXXXX'] },
    { name: 'Subscription', site: 'mysite', paymentLinks: [] }
  ],

  // Your own test purchases: charges made with these e-mails stay out of the dashboard.
  testEmails: ['you@example.com'],

  // Fix where a sale came from by hand, by Stripe payment_intent, as source__medium__campaign__content.
  // Useful when a buyer clicked your newsletter but paid from another device.
  manualOrigins: {
    // 'pi_123': 'newsletter__email__launch__-'
  },

  // Money that left your bank account to pay Meta (payments or prepaid balance). Meta does not
  // expose billing through the API, so keep this list by hand. since = first payment date.
  adPayments: {
    since: null, // '2026-11-01'
    payments: [
      // { date: '2026-11-01', amount: 250, note: 'Card' }
    ]
  },

  // Sales that match no Payment Link land here.
  defaultProduct: { name: 'Other', site: null },

  // Social section.
  social: {
    // Instagram: professional account ID (Business Manager > Instagram accounts).
    instagram: [
      // { id: '17800000000000000', username: '@yourprofile' }
    ],
    // Kit newsletter: counts every active subscriber (needs KIT_API_KEY). Use null to hide it.
    newsletter: { name: 'Newsletter', url: null }
  }
};
