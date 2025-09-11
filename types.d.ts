import type { PostHog } from 'posthog-js'

declare module '#app' {
    interface NuxtApp {
        $posthog: () => PostHog | null
    }
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $posthog: () => PostHog | null
    }
}

export { }


