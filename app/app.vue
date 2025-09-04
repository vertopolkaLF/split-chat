<template>
  <ClientOnly>
    <div class="app">
      <!-- Fixed settings button -->
      <button class="settings-button" @click="openSettings" title="Settings">
        <Icon name="material-symbols:settings" />
      </button>

      <!-- Full screen chats -->
      <div class=" chats-fullscreen">
        <div class="chat-card" v-for="entry in chats" :key="entry.id">
          <div class="frame-wrap" v-if="getEmbed(entry)">
            <iframe :src="getEmbed(entry)!.url" frameborder="0" scrolling="no" height="100%" width="100%" :title="getEmbed(entry)!.title" allowfullscreen>
            </iframe>
          </div>
          <div v-else class="placeholder">No chat configured.</div>
        </div>
      </div>

      <!-- Settings Modal -->
      <SettingsModal :open="showSettings" v-model:chats="chats" @close="closeSettings" />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { useColorMode } from '#imports'
import SettingsModal from '../components/SettingsModal.vue'
const colorMode = useColorMode()

type Platform = 'twitch' | 'youtube' | 'kick'
type Mode = 'auto' | 'manual'
interface ChatEntry {
  id: string
  input: string
  platform: Platform | null
  mode: Mode
  parsed: Record<string, any>
  locked?: boolean
}

const STORAGE_KEYS = {
  chats: 'splitchat:chats'
} as const

const chats = ref<ChatEntry[]>([])
const showSettings = ref(false)
function openSettings() {
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

onMounted(() => {
  // hydrate chats from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats)
    if (raw) {
      const parsed = JSON.parse(raw) as ChatEntry[]
      chats.value = parsed.map(e => ({
        id: e.id || Math.random().toString(36).slice(2),
        input: e.input || '',
        platform: e.platform || null,
        mode: e.mode === 'auto' || e.mode === 'manual' ? e.mode : 'manual',
        parsed: e.parsed || {},
        locked: !!e.locked
      }))
    }
  } catch {
    // ignore
  }
})

watch(chats, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(val))
  } catch {
    // ignore
  }
}, { deep: true })

const resolvedYouTubeIds = ref<Record<string, { videoId: string, input: string }>>({})
const resolvingIds = new Set<string>()

watch(chats, async (list) => {
  for (const entry of list) {
    if (entry.platform !== 'youtube') continue
    if (!entry.locked) continue
    const id = entry.id
    const cache = resolvedYouTubeIds.value[id]
    const cacheMatches = !!(cache && cache.input === entry.input)
    const hasVideo = !!(entry.parsed?.videoId || (cacheMatches && cache.videoId))
    if (hasVideo || resolvingIds.has(id)) continue
    // attempt resolve via API using raw input
    if (!entry.input) continue
    try {
      resolvingIds.add(id)
      const q = new URLSearchParams({ input: entry.input })
      const url = `/api/youtube/live?${q.toString()}`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if ((res.headers.get('content-type') || '').includes('application/json')) {
        const data = await res.json()
        if (data?.videoId) {
          resolvedYouTubeIds.value = { ...resolvedYouTubeIds.value, [id]: { videoId: data.videoId, input: entry.input } }
        }
      }
    } catch {
      // ignore
    } finally {
      resolvingIds.delete(id)
    }
  }
}, { deep: true, immediate: true })

function getEmbed(entry: ChatEntry): { url: string, title: string } | null {
  if (!entry.locked) return null
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  if (entry.platform === 'twitch' && entry.parsed?.channel) {
    const url = new URL('https://www.twitch.tv/embed/' + encodeURIComponent(entry.parsed.channel) + '/chat')
    url.searchParams.set('parent', parent)
    if (colorMode.value === 'dark') url.searchParams.set('darkpopout', 'true')
    return { url: url.toString(), title: 'Twitch Chat' }
  }
  if (entry.platform === 'youtube') {
    const cache = resolvedYouTubeIds.value[entry.id]
    const cachedId = cache && cache.input === entry.input ? cache.videoId : ''
    const videoId = entry.parsed?.videoId || cachedId
    if (!videoId) return null
    const url = new URL('https://www.youtube.com/live_chat')
    url.searchParams.set('v', videoId)
    url.searchParams.set('is_popout', '1')
    url.searchParams.set('embed_domain', parent)
    if (colorMode.value === 'dark') url.searchParams.set('dark_theme', '1')
    return { url: url.toString(), title: 'YouTube Live Chat' }
  }
  if (entry.platform === 'kick' && entry.parsed?.channel) {
    const base = `https://kick.com/popout/${encodeURIComponent(entry.parsed.channel)}/chat`
    return { url: base, title: 'Kick Chat' }
  }
  return null
}
</script>

<style>
/* Reset and base styles */
* {
  box-sizing: border-box;
  font-family: "Inter", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", sans-serif;
  margin: 0;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
  font-size: 16px;
}

/* Light theme variables */
:root {
  --bg: #ffffff;
  --text: #222222;
  --muted: #6c757d;
  --surface: #f8f9fa;
  --border: #e9ecef;
  --primary: #007bff;
  --primary-strong: #0056b3;
}

/* Dark theme variables (applied by @nuxtjs/color-mode) */
.dark-mode :root,
.dark-mode {
  --bg: #0f1115;
  --text: #e6e6e6;
  --muted: #9aa4af;
  --surface: #151923;
  --border: #242c3a;
  --primary: #4c8dff;
  --primary-strong: #2d6fff;
}

.app {
  height: 100vh;
  width: 100vw;
  position: relative;
  overflow: hidden;
  background: var(--bg);
  color: var(--text);
}


/* Full screen chats */
.chats-fullscreen {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  height: 100vh;
  gap: 1px;
  background-color: #222;
  overflow-x: auto;
  overflow-y: hidden;
}

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;
  width: 100%;
}

.chat-card h2 {
  margin: 0;
  padding: 12px 16px;
  font-size: 16px;
  font-weight: 600;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.frame-wrap {
  flex: 1;
  border: none;
  border-radius: 0;
  overflow: hidden;
}

.frame-wrap iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  background: var(--surface);
  border: none;
  color: var(--muted);
  font-size: 14px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--surface);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 14px 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 24px;
  border-radius: 6px;
  cursor: pointer;
  padding: 2px;
  width: 30px;
  height: 30px;
  display: flex;
  font-size: 2rem;
  align-items: center;
  justify-content: center;
  color: #6c757d;
  transition: .2s;
}

.close-button:hover {
  background: var(--primary-strong);
  color: var(--text);
  transform: scale(1.1);
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.chats-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.chats-header-left {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.inline-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--text);
  font-weight: 600;
}

.inline-label .iconify {
  font-size: 1.4rem;
}

.segmented {
  display: inline-flex;
  align-items: center;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0px;
  gap: 0px;
}

.segmented-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  font-size: 1.2rem;
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, transform 0.05s ease;
}

.segmented-btn:hover {
  background: color-mix(in srgb, var(--surface) 95%, transparent);
  color: var(--text);
}

.segmented-btn.active {
  background: var(--primary);
  color: #fff;
  box-shadow: 0 0 0 1px var(--border) inset;
}

label {
  font-weight: 600;
  color: var(--text);
}

input,
select {
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s ease;
  background: var(--bg);
  color: var(--text);
}

input:focus,
select:focus {
  outline: none;
  border-color: var(--primary);
}

.actions {
  display: flex;
  gap: 8px;
}

button.btn {
  padding: 10px 16px;
  border-radius: 6px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  transition: .2s;
}

button.btn:hover:not(:disabled) {
  background: var(--primary-strong);
  transform: translateY(-1px);
}

button.btn.ghost {
  background: var(--bg);
  color: var(--primary);
  border-color: var(--primary);
}

button.btn.ghost:hover {
  background: var(--surface);
}

button[disabled] {
  opacity: 0.6;
  cursor: default;
}

.hint {
  color: var(--muted);
  font-size: 12px;
}


/* Settings button */
.settings-button {
  position: fixed;
  bottom: 0px;
  left: 50%;
  width: 2rem;
  height: 2rem;
  border-radius: 50% 50% 0 0;
  transform: translateX(-50%);
  border: 2px solid var(--border);
  border-bottom: none;
  background: color-mix(in srgb, var(--surface) 90%, transparent);
  color: var(--muted);
  font-size: 2rem;
  cursor: pointer;
  z-index: 1000;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.settings-button:hover {
  background: var(--surface);
  color: var(--text);
  transform: translateX(-50%);
}
</style>
