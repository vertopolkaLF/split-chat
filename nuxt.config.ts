// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  runtimeConfig: {
    youtubeApiKey: process.env.YT_API_KEY,
    public: {
      posthogPublicKey: process.env.NUXT_PUBLIC_POSTHOG_KEY,
      posthogHost: process.env.NUXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com',
      posthogDefaults: process.env.NUXT_PUBLIC_POSTHOG_DEFAULTS || '2025-05-24'
    }
  },

  modules: [
    '@nuxt/icon',
    '@nuxtjs/color-mode',
    '@nuxt/fonts',
    '@formkit/auto-animate'
  ],

  // Rely on auto-loaded plugins in `app/plugins`

  colorMode: {
    preference: 'system',
    fallback: 'dark',
    classSuffix: '-mode',
    storageKey: 'splitchat:color-mode'
  },

  app: {
    head: {
      title: 'SplitChat - Multi-Platform Live Streaming Chat Viewer',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'View multiple live streaming chat rooms from Twitch, YouTube, and Kick simultaneously. Perfect for multi-streaming enthusiasts and moderators.'
        },
        {
          name: 'keywords',
          content: 'streaming, twitch, youtube, kick, live chat, multi-streaming, chat viewer, livestream, streaming tools, multi-chat, split screen chat, streaming moderator'
        },
        { name: 'author', content: 'SplitChat' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#007bff' },
        { name: 'msapplication-TileColor', content: '#007bff' },

        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'SplitChat - Multi-Platform Live Streaming Chat Viewer' },
        {
          property: 'og:description',
          content: 'View multiple live streaming chat rooms from Twitch, YouTube, and Kick simultaneously. Perfect for multi-streaming enthusiasts and moderators.'
        },
        { property: 'og:image', content: '/images/avatar.png' },
        { property: 'og:url', content: 'https://www.splitchat.online' },
        { property: 'og:site_name', content: 'SplitChat' },

        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'SplitChat - Multi-Platform Live Streaming Chat Viewer' },
        {
          name: 'twitter:description',
          content: 'View multiple live streaming chat rooms simultaneously from Twitch, YouTube, and Kick.'
        },
        { name: 'twitter:image', content: '/images/avatar.png' },

        // Additional SEO
        { name: 'format-detection', content: 'telephone=no' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
        { name: 'apple-mobile-web-app-title', content: 'SplitChat' }
      ],
      link: [
        { rel: 'canonical', href: 'https://www.splitchat.online' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/images/avatar.png' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
        }
      ],
      htmlAttrs: {
        lang: 'en'
      }
    }
  }
})