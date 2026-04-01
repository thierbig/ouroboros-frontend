export default defineNuxtConfig({
  modules: ['@nuxt/ui'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'dark',
  },
  runtimeConfig: {
    public: {
      wsUrl: process.env.NUXT_PUBLIC_WS_URL || 'ws://localhost:8001/api/agent',
      apiUrl: process.env.NUXT_PUBLIC_API_URL || 'http://localhost:8001/api',
    },
  },
  ssr: false,
  devtools: { enabled: false },
  compatibilityDate: '2026-03-15',
})
