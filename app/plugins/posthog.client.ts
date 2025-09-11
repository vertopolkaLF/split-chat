import { defineNuxtPlugin, useRuntimeConfig } from '#imports'
import posthog from 'posthog-js'

export default defineNuxtPlugin((nuxtApp) => {
    const runtimeConfig = useRuntimeConfig()

    const key = (runtimeConfig.public?.posthogPublicKey
        || (import.meta as any)?.env?.NUXT_PUBLIC_POSTHOG_KEY
        || (process as any)?.env?.NUXT_PUBLIC_POSTHOG_KEY) as string | undefined
    const host = (runtimeConfig.public?.posthogHost
        || (import.meta as any)?.env?.NUXT_PUBLIC_POSTHOG_HOST
        || (process as any)?.env?.NUXT_PUBLIC_POSTHOG_HOST
        || 'https://eu.i.posthog.com') as string
    const defaults = (runtimeConfig.public?.posthogDefaults
        || (import.meta as any)?.env?.NUXT_PUBLIC_POSTHOG_DEFAULTS
        || (process as any)?.env?.NUXT_PUBLIC_POSTHOG_DEFAULTS
        || '2025-05-24') as string

    if (process.dev) {
        // eslint-disable-next-line no-console
        console.info('[PostHog] Plugin loaded', { hasKey: !!key, host })
    }

    if (!key) {
        if (process.dev) {
            // eslint-disable-next-line no-console
            console.warn('[PostHog] Not initialized: missing public key', { hasKey: !!key, host })
        }
        if (typeof window !== 'undefined') {
            ; (window as any).posthog = posthog
        }
        return {
            provide: {
                posthog: () => null
            }
        }
    }

    const client = posthog.init(key, {
        api_host: host,
        defaults,
        person_profiles: 'identified_only',
        capture_pageview: false,
        loaded: (ph) => {
            if (import.meta.env.MODE === 'development') ph.debug()
        }
    })

    if (typeof window !== 'undefined') {
        ; (window as any).posthog = client
    }
    if (process.dev) {
        // eslint-disable-next-line no-console
        console.info('[PostHog] Initialized', { host, hasKey: !!key })
        try { client.capture('debug_dev_boot', { ts: Date.now() }) } catch { }
    }

    // Capture initial page view and subsequent route changes
    try { client.capture('$pageview') } catch { }

    nuxtApp.hook('page:finish', () => {
        try { client.capture('$pageview') } catch { }
    })

    // Capture page leave for accurate bounce rate/session duration
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const sendLeave = () => { try { client.capture('$pageleave') } catch { } }
        window.addEventListener('pagehide', sendLeave)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') sendLeave()
        })
    }

    return {
        provide: {
            posthog: () => client
        }
    }
})


