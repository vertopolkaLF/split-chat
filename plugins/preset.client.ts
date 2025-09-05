// Apply presets from /:id on client side and hard-redirect to /
// All comments in English per project rules.

import { addRouteMiddleware, abortNavigation } from '#app'
import { applyPresetToLocalStorage } from '@/presets'

export default defineNuxtPlugin(() => {
    function tryApplyFromPath(path: string): boolean {
        const match = path.match(/^\/([^\/?#]+)/i)
        if (!match) return false
        const id = decodeURIComponent(match[1])
        try { applyPresetToLocalStorage(id) } catch { /* ignore */ }
        if (typeof window !== 'undefined') window.location.replace('/')
        return true
    }

    // Handle direct loads (initial page load on /:id)
    if (typeof window !== 'undefined') {
        tryApplyFromPath(window.location.pathname || '')
    }

    // Handle client-side navigations
    addRouteMiddleware('preset-applier', (to) => {
        if (typeof window === 'undefined') return
        if (tryApplyFromPath(to.path || '')) {
            return abortNavigation()
        }
    }, { global: true })
})


