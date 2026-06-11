// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  ui: {
    fonts: false
  },

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:4000',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL || 'mistral:latest',
    public: {
      apiBase: '/api',
      apiAdapter: process.env.NUXT_PUBLIC_API_ADAPTER || 'moleculer'
    }
  },

  routeRules: {
    '/login': { redirect: '/' }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
