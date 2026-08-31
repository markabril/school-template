import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Explicit port + host. 3000 is taken by another project on this machine, and
  // Nuxt silently falling back to 3002 breaks the API origin assumptions in
  // api/.env. Fail loudly on a clash instead of drifting.
  devServer: { port: 3100, host: '127.0.0.1' },

  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },

  /**
   * Every public route is CMS-driven, so nothing is prerendered — a
   * prerendered page would not change until the next deploy when an editor
   * publishes. SWR caches instead, and Express purges affected paths on
   * publish via /__revalidate (docs/release-1.md §6).
   */
  routeRules: {
    '/**': { swr: 3600 },
    // noindex via header rather than a robots module: draft content must never
    // be indexed, and a header cannot be forgotten in a template.
    '/preview/**': {
      ssr: true,
      headers: { 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow' },
    },
    '/admin/**': { ssr: false },
    // Release 2:
    // '/portal/**': { ssr: false },
  },

  /**
   * No SWR in development. With it on, an edit appears not to work for up to
   * an hour because Nitro keeps serving the previously rendered page — which
   * looks exactly like a broken change and burns real time chasing it.
   * Production keeps the cache; publishing purges it via /__revalidate.
   */
  $development: {
    routeRules: {
      '/**': { swr: false },
    },
  },

  runtimeConfig: {
    apiBase: 'http://127.0.0.1:4100/api', // server-side calls to Express
    revalidateSecret: '',
    public: {
      siteUrl: 'http://localhost:3100',
    },
  },

  nitro: {
    devProxy: {
      '/api': { target: 'http://127.0.0.1:4100/api', changeOrigin: true },
      // Uploaded files are served by Express from disk. The reverse proxy must
      // map this in production too, alongside /api.
      '/media': { target: 'http://127.0.0.1:4100/media', changeOrigin: true },
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#6E1D2B' },
      ],
    },
  },
})
