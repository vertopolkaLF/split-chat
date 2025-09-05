// Centralized preset definitions and helper to apply them to localStorage
// All comments in English per project rules.

type Platform = 'twitch' | 'youtube' | 'kick'
type UnloadDelay = 'off' | 'instant' | '5s' | '10s' | '30s' | '1m'

// Chats in presets contain input and platform. App derives the rest.

export interface ChatEntryPreset {
    // Minimal fields; app derives the rest (locked is always true for presets)
    input: string
    platform: Platform | null
}

export interface SettingsStatePreset {
    unloadOnBlur: UnloadDelay
    unloadPlatforms: Platform[]
}

export interface Preset {
    id: string
    name: string
    description?: string
    // Core state to persist
    chats?: ChatEntryPreset[]
    settings?: SettingsStatePreset
    // Optional UI preferences
    colorMode?: 'light' | 'dark' | 'system'
    widths?: Record<string, number>
}

const STORAGE_KEYS = {
    chats: 'splitchat:chats',
    widths: 'splitchat:widths',
    settings: 'splitchat:settings',
    colorMode: 'splitchat:color-mode'
} as const

export const PRESETS: Record<string, Preset> = {
    empty: {
        id: 'empty',
        name: 'empty',
        description: 'clear settings',
        colorMode: 'dark',
        settings: { unloadOnBlur: 'off', unloadPlatforms: ['youtube'] },
        chats: []
    },

    'theo': {
        id: 'theo',
        name: 'theo',
        description: 'Theo\'s Twitch + YouTube',
        colorMode: 'dark',
        settings: { unloadOnBlur: '5s', unloadPlatforms: ['youtube'] },
        chats: [
            { input: 'https://www.twitch.tv/theo', platform: 'twitch' },
            { input: 'https://www.youtube.com/@t3dotgg', platform: 'youtube' }
        ]
    },

    'popular-streamers': {
        id: 'popular-streamers',
        name: 'Popular Streamers',
        description: 'Preset with a few well-known channels',
        colorMode: 'system',
        settings: { unloadOnBlur: 'off', unloadPlatforms: ['youtube'] },
        chats: [
            { input: 'gaules', platform: 'twitch' },
            { input: 'ludwig', platform: 'twitch' }
        ]
    }
}

/**
 * Apply a preset to localStorage.
 * Returns true if the preset was found and written.
 */
export function applyPresetToLocalStorage(presetId: string): boolean {
    if (typeof window === 'undefined') return false
    const p = PRESETS[presetId]
    if (!p) return false

    try {
        if (p.chats) {
            // Persist minimal objects: { input, platform, locked }
            const allow: Platform[] = ['twitch', 'youtube', 'kick']
            const normalized = p.chats.map(c => ({
                input: String(c.input || ''),
                platform: (allow.includes(c.platform as Platform) ? c.platform : null) as Platform | null,
                locked: true // All preset chats are locked by default
            }))
            localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(normalized))
        }
    } catch { /* ignore */ }

    try {
        if (p.settings) {
            localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(p.settings))
        }
    } catch { /* ignore */ }

    try {
        if (p.widths) {
            localStorage.setItem(STORAGE_KEYS.widths, JSON.stringify(p.widths))
        } else {
            // If widths are not provided, clear to allow app to equalize
            localStorage.removeItem(STORAGE_KEYS.widths)
        }
    } catch { /* ignore */ }

    try {
        if (p.colorMode) {
            localStorage.setItem(STORAGE_KEYS.colorMode, p.colorMode)
        }
    } catch { /* ignore */ }

    return true
}


