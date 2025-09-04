// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    youtubeApiKey: process.env.YT_API_KEY
  },

  modules: ['@nuxt/icon', '@nuxtjs/color-mode'],

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    classSuffix: '-mode',
    storageKey: 'splitchat:color-mode'
  }
})