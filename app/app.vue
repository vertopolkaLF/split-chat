<template>
  <ClientOnly>
    <div class="app">
      <!-- Fixed settings button -->
      <button class="settings-button" @click="openSettings" title="Settings">
        <Icon name="material-symbols:settings" />
      </button>

      <!-- Full screen chats -->
      <div class=" chats-fullscreen" ref="containerRef">
        <template v-for="(entry, idx) in visibleChats" :key="entry.id">
          <div class="chat-card" :style="{ flex: '0 0 ' + (normalizedWidths[entry.id] ?? equalWidth) + '%' }">
            <div class="frame-wrap" v-if="getEmbed(entry) && !shouldUnload(entry)">
              <iframe :src="getEmbed(entry)!.url" frameborder="0" scrolling="no" height="100%" width="100%" :title="getEmbed(entry)!.title" allowfullscreen>
              </iframe>
            </div>
            <div v-else-if="isChatConfigured(entry)" class="placeholder placeholder-configured">
              <div class="placeholder-content">
                <div class="platform-logo">
                  <Icon :name="getPlatformIcon(entry.platform!)" />
                  <div class="username">{{ getDisplayUsername(entry) }}</div>
                </div>
                <div class="placeholder-text">there will be {{ getDisplayUsername(entry) }}'s chat</div>
                <button class="reload-btn" @click="reloadChat(entry)" :disabled="reloadingChats.has(entry.id)" :title="reloadingChats.has(entry.id) ? 'Loading...' : 'Refresh chat'">
                  <Icon name="material-symbols:refresh" :class="{ spinning: reloadingChats.has(entry.id) }" />
                  <span>{{ reloadingChats.has(entry.id) ? 'Loading...' : 'Refresh' }}</span>
                </button>
              </div>
            </div>
            <div v-else-if="getEmbed(entry) && shouldUnload(entry)" class="placeholder placeholder-unloaded">Unloaded due to tab blur.</div>
            <div v-else class="placeholder">No chat configured.</div>
            <div class="frame-shield" :class="{ visible: isResizing }"></div>
            <div v-if="idx < visibleChats.length - 1" class="col-resizer" @mousedown="startResize(idx, $event)" @dblclick.stop.prevent="equalizeWidths()"></div>
          </div>
        </template>
      </div>

      <!-- Settings Modal -->
      <SettingsModal :open="showSettings" v-model:chats="chats" :settings="settings" @update:settings="onUpdateSettings" @close="closeSettings" />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import { useColorMode } from '#imports'
import SettingsModal from '../components/SettingsModal.vue'
import { applyPresetToLocalStorage } from '../presets'
const colorMode = useColorMode()

type Platform = 'twitch' | 'youtube' | 'kick'
type Mode = 'auto' | 'manual'
type UnloadDelay = 'off' | 'instant' | '5s' | '10s' | '30s' | '1m'
interface SettingsState { unloadOnBlur: UnloadDelay, unloadPlatforms: Platform[] }
interface ChatEntry {
  id: string
  input: string
  platform: Platform | null
  mode: Mode
  parsed: Record<string, any>
  locked?: boolean
}

const STORAGE_KEYS = {
  chats: 'splitchat:chats',
  widths: 'splitchat:widths',
  settings: 'splitchat:settings'
} as const

const chats = ref<ChatEntry[]>([])
const showSettings = ref(false)
const containerRef = ref<HTMLElement | null>(null)
const widthsPercent = ref<Record<string, number>>({})
const settings = ref<SettingsState>({ unloadOnBlur: 'off', unloadPlatforms: ['youtube'] })
const isBlurUnloaded = ref(false)
const reloadingChats = ref<Set<string>>(new Set())
const isSettingsOpen = ref(false)
let unloadTimer: number | null = null
// visible chats comes first so other computeds can depend on it safely
const visibleChats = computed(() => chats.value.filter(e => e.locked && (getEmbed(e) || isChatConfigured(e))))
const MIN_COL = 10
const equalWidth = computed(() => {
  const n = visibleChats.value.length || 1
  return Math.round((100 / n) * 100) / 100
})
const normalizedWidths = computed<Record<string, number>>(() => {
  const ids = visibleChats.value.map(c => c.id)
  if (!ids.length) return {}
  // Start with known widths, clamp to MIN, assign MIN to missing
  const w: Record<string, number> = {}
  for (const id of ids) {
    const v = widthsPercent.value[id]
    if (typeof v === 'number' && isFinite(v)) w[id] = Math.max(0, v)
    else w[id] = MIN_COL
    if (w[id] < MIN_COL) w[id] = MIN_COL
  }
  // Sum and normalize to 100 while keeping >= MIN
  let sum = ids.reduce((acc, id) => acc + (w[id] || 0), 0)
  if (sum > 100 + 1e-6) {
    // Reduce only the portion above MIN proportionally
    let over = sum - 100
    while (over > 1e-6) {
      const adjustable = ids.filter(id => (w[id] - MIN_COL) > 1e-6)
      if (!adjustable.length) break
      const totalExtra = adjustable.reduce((acc, id) => acc + (w[id] - MIN_COL), 0)
      for (const id of adjustable) {
        const take = Math.min(w[id] - MIN_COL, (w[id] - MIN_COL) / totalExtra * over)
        w[id] -= take
      }
      const newSum = ids.reduce((acc, id) => acc + w[id], 0)
      over = newSum - 100
    }
  } else if (sum < 100 - 1e-6) {
    // Scale up proportionally
    const factor = 100 / Math.max(1e-6, sum)
    for (const id of ids) w[id] *= factor
  }
  // Final rounding and fix last to 100
  const result: Record<string, number> = {}
  let running = 0
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    if (i === ids.length - 1) result[id] = Math.max(0, 100 - running)
    else {
      const rounded = Math.max(0, Math.round(w[id] * 1000) / 1000)
      result[id] = rounded
      running += rounded
    }
  }
  return result
})

// When visible set changes, не трогаем сохранённые ширины — только обновляем список
const prevVisibleIds = ref<string[]>([])
watch(visibleChats, (list) => {
  prevVisibleIds.value = list.map(c => c.id)
}, { immediate: false })
const resizing = ref<{ startX: number, leftId: string, rightId: string, leftStart: number, rightStart: number } | null>(null)
const isResizing = computed(() => !!resizing.value)
function openSettings() {
  showSettings.value = true
  isSettingsOpen.value = true
}

function closeSettings() {
  showSettings.value = false
  isSettingsOpen.value = false
}

onMounted(() => {
  // Handle preset links like /:id
  try {
    const path = typeof window !== 'undefined' ? (window.location.pathname || '') : ''
    const m = path.match(/^\/([^\/?#]+)/i)
    if (m) {
      const id = decodeURIComponent(m[1])
      try { applyPresetToLocalStorage(id) } catch { }
      if (typeof window !== 'undefined') window.location.replace('/')
      return
    }
  } catch { }
  // hydrate chats from localStorage
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.chats)
    if (raw) {
      const parsed = JSON.parse(raw) as ChatEntry[]
      chats.value = parsed.map(e => {
        const entry = {
          id: e.id || crypto.randomUUID?.() || Math.random().toString(36).slice(2),
          input: e.input || '',
          platform: e.platform || null,
          mode: e.mode === 'auto' || e.mode === 'manual' ? e.mode : 'manual',
          parsed: e.parsed || {},
          locked: !!e.locked
        }

        // Auto-parse new entries from presets (empty parsed + has input)
        if (entry.input && Object.keys(entry.parsed).length === 0) {
          const detected = detectPlatform(entry.input)
          if (detected) {
            entry.platform = detected.platform
            entry.mode = 'auto'
            entry.parsed = detected.parsed
          } else if (entry.platform) {
            // Manual parse for known platform
            applyManualParse(entry)
          }
        }

        return entry
      })
    }
  } catch {
    // ignore
  }
  // hydrate settings
  try {
    const sr = localStorage.getItem(STORAGE_KEYS.settings)
    if (sr) {
      const parsed = JSON.parse(sr) as SettingsState
      if (parsed && typeof parsed === 'object') {
        const allow: Platform[] = ['twitch', 'youtube', 'kick']
        const up = Array.isArray(parsed.unloadPlatforms) ? parsed.unloadPlatforms.filter(p => allow.includes(p as Platform)) as Platform[] : ['youtube']
        const allowed: UnloadDelay[] = ['off', 'instant', '5s', '10s', '30s', '1m']
        const ud = allowed.includes(parsed.unloadOnBlur as UnloadDelay) ? parsed.unloadOnBlur as UnloadDelay : 'off'
        settings.value = { unloadOnBlur: ud, unloadPlatforms: up.length ? up : ['youtube'] }
      }
    }
  } catch { }
  // init widths equally
  nextTick(() => {
    const ids = visibleChats.value.map(c => c.id)
    if (ids.length && ids.every(id => widthsPercent.value[id] == null)) {
      const each = Math.round((100 / ids.length) * 100) / 100
      const map: Record<string, number> = {}
      ids.forEach((id, i) => { map[id] = i === ids.length - 1 ? 100 - each * (ids.length - 1) : each })
      widthsPercent.value = map
    }
  })
  // hydrate widths
  try {
    const wr = localStorage.getItem(STORAGE_KEYS.widths)
    if (wr) widthsPercent.value = JSON.parse(wr)
  } catch { }
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (unloadTimer) { clearTimeout(unloadTimer); unloadTimer = null }
})

watch(chats, (val) => {
  try {
    localStorage.setItem(STORAGE_KEYS.chats, JSON.stringify(val))
  } catch {
    // ignore
  }
}, { deep: true })

watch(settings, (val) => {
  try { localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(val)) } catch { }
}, { deep: true })

const resolvedYouTubeIds = ref<Record<string, { videoId: string, input: string }>>({})
const resolvingIds = new Set<string>()

watch(chats, async (list) => {
  // Skip API requests when settings are open to avoid unnecessary calls
  if (isSettingsOpen.value) return

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
    url.searchParams.set('theme', colorMode.value === 'dark' ? 'dark' : 'light')
    return { url: url.toString(), title: 'YouTube Live Chat' }
  }
  if (entry.platform === 'kick' && entry.parsed?.channel) {
    const base = `https://kick.com/popout/${encodeURIComponent(entry.parsed.channel)}/chat`
    return { url: base, title: 'Kick Chat' }
  }
  return null
}

function delayToMs(v: UnloadDelay): number | null {
  switch (v) {
    case 'off': return null
    case 'instant': return 0
    case '5s': return 5000
    case '10s': return 10000
    case '30s': return 30000
    case '1m': return 60000
  }
}

function shouldUnload(entry: ChatEntry): boolean {
  return !!(isBlurUnloaded.value && entry.platform && settings.value.unloadPlatforms.includes(entry.platform))
}

function isChatConfigured(entry: ChatEntry): boolean {
  return !!(entry.platform && entry.parsed && Object.keys(entry.parsed).length > 0)
}

function getPlatformIcon(platform: Platform): string {
  switch (platform) {
    case 'twitch': return 'mdi:twitch'
    case 'youtube': return 'mdi:youtube'
    case 'kick': return 'simple-icons:kick'
    default: return 'material-symbols:question-mark'
  }
}

function getDisplayUsername(entry: ChatEntry): string {
  if (!entry.parsed) return entry.input

  switch (entry.platform) {
    case 'twitch':
    case 'kick':
      return entry.parsed.channel || entry.input
    case 'youtube':
      if (entry.parsed.handle) return entry.parsed.handle
      if (entry.parsed.vanity) return entry.parsed.vanity
      if (entry.parsed.channelId) return entry.parsed.channelId
      return entry.input
    default:
      return entry.input
  }
}

async function reloadChat(entry: ChatEntry): Promise<void> {
  if (reloadingChats.value.has(entry.id)) return

  reloadingChats.value.add(entry.id)

  try {
    if (entry.platform === 'youtube') {
      // Clear cached video ID to force fresh API request
      const newResolvedIds = { ...resolvedYouTubeIds.value }
      delete newResolvedIds[entry.id]
      resolvedYouTubeIds.value = newResolvedIds

      // Remove from resolving set if it exists
      resolvingIds.delete(entry.id)

      // Make fresh API request
      const q = new URLSearchParams({ input: entry.input })
      const url = `/api/youtube/live?${q.toString()}`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })

      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json()
        if (data?.videoId) {
          resolvedYouTubeIds.value = {
            ...resolvedYouTubeIds.value,
            [entry.id]: { videoId: data.videoId, input: entry.input }
          }
        }
      }
    } else {
      // For non-YouTube platforms, just reset blur state
      isBlurUnloaded.value = false
    }
  } catch (error) {
    console.error('Failed to reload chat:', error)
  } finally {
    reloadingChats.value.delete(entry.id)
  }
}

function onVisibilityChange() {
  const ms = delayToMs(settings.value.unloadOnBlur)
  if (ms == null) return
  if (document.visibilityState === 'hidden') {
    if (unloadTimer) { clearTimeout(unloadTimer); unloadTimer = null }
    unloadTimer = window.setTimeout(() => { isBlurUnloaded.value = true }, ms)
  } else {
    if (unloadTimer) { clearTimeout(unloadTimer); unloadTimer = null }
    isBlurUnloaded.value = false
  }
}

function onUpdateSettings(next: SettingsState) {
  settings.value = next
}

// Auto-parsing functions (copied from ChatEntryInput.vue)
function detectPlatform(input: string): { platform: Platform, parsed: Record<string, any> } | null {
  let url: URL | null = null
  try {
    url = new URL(input)
  } catch {
    // allow protocol-less
    if (/^(www\.)?(twitch\.tv|kick\.com|youtube\.com|youtu\.be)\//i.test(input)) {
      try { url = new URL('https://' + input) } catch { /* noop */ }
    }
  }
  if (!url) return null
  const host = url.hostname.replace(/^www\./, '').toLowerCase()
  const path = url.pathname
  // Twitch
  if (host === 'twitch.tv' || host === 'm.twitch.tv') {
    const channel = path.replace(/^\//, '').split('/')[0]
    return { platform: 'twitch', parsed: { channel } }
  }
  // Kick
  if (host === 'kick.com') {
    const channel = path.replace(/^\//, '').split('/')[0]
    return { platform: 'kick', parsed: { channel } }
  }
  // YouTube
  if (host === 'youtu.be') {
    const id = path.replace(/^\//, '')
    if (id) return { platform: 'youtube', parsed: { videoId: id } }
  }
  if (host.endsWith('youtube.com')) {
    const sp = url.searchParams
    if (path === '/watch') {
      const v = sp.get('v') || undefined
      if (v) return { platform: 'youtube', parsed: { videoId: v } }
    }
    const liveMatch = path.match(/^\/live\/([\w-]{8,})/)
    if (liveMatch) return { platform: 'youtube', parsed: { videoId: liveMatch[1] } }
    const chMatch = path.match(/^\/channel\/([\w-]{8,})/)
    if (chMatch) return { platform: 'youtube', parsed: { channelId: chMatch[1] } }
    const handleMatch = path.match(/^\/@([\w.-]{2,})/)
    if (handleMatch) return { platform: 'youtube', parsed: { handle: handleMatch[1] } }
    const userMatch = path.match(/^\/(?:user|c)\/([\w.-]{2,})/)
    if (userMatch) return { platform: 'youtube', parsed: { vanity: userMatch[1] } }
    return { platform: 'youtube', parsed: {} }
  }
  return null
}

function applyManualParse(entry: ChatEntry) {
  if (!entry.platform) return
  if (entry.platform === 'twitch' || entry.platform === 'kick') {
    entry.parsed = { channel: entry.input.replace(/^@/, '') }
  } else if (entry.platform === 'youtube') {
    // Accept @handle or channelId or plain text treated as handle
    if (entry.input.startsWith('@')) {
      entry.parsed = { handle: entry.input.slice(1) }
    } else if (/^UC[\w-]{20,}$/.test(entry.input)) {
      entry.parsed = { channelId: entry.input }
    } else {
      entry.parsed = { handle: entry.input }
    }
  }
}

function startResize(index: number, ev: MouseEvent) {
  const left = visibleChats.value[index]
  const right = visibleChats.value[index + 1]
  if (!left || !right) return
  const ls = normalizedWidths.value[left.id] ?? equalWidth.value
  const rs = normalizedWidths.value[right.id] ?? equalWidth.value
  resizing.value = { startX: ev.clientX, leftId: left.id, rightId: right.id, leftStart: ls, rightStart: rs }
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', endResize, { once: true })
}

function onResizeMove(ev: MouseEvent) {
  if (!resizing.value || !containerRef.value) return
  const dx = ev.clientX - resizing.value.startX
  const widthPx = containerRef.value.clientWidth
  if (!widthPx) return
  const deltaPercent = (dx / widthPx) * 100
  let newLeft = resizing.value.leftStart + deltaPercent
  let newRight = resizing.value.rightStart - deltaPercent
  const min = 10
  if (newLeft < min) { newRight -= (min - newLeft); newLeft = min }
  if (newRight < min) { newLeft -= (min - newRight); newRight = min }
  widthsPercent.value = { ...widthsPercent.value, [resizing.value.leftId]: newLeft, [resizing.value.rightId]: newRight }
}

function endResize() {
  window.removeEventListener('mousemove', onResizeMove)
  resizing.value = null
  // persist widths
  try { localStorage.setItem(STORAGE_KEYS.widths, JSON.stringify(widthsPercent.value)) } catch { }
}

function equalizeWidths() {
  const ids = visibleChats.value.map(c => c.id)
  if (!ids.length) return
  const each = 100 / ids.length
  const map: Record<string, number> = {}
  let running = 0
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i]
    if (i === ids.length - 1) map[id] = Math.max(0, 100 - running)
    else {
      const v = Math.round(each * 1000) / 1000
      map[id] = v
      running += v
    }
  }
  widthsPercent.value = map
  try { localStorage.setItem(STORAGE_KEYS.widths, JSON.stringify(widthsPercent.value)) } catch { }
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
  background-color: var(--border);
  overflow-x: hidden;
  overflow-y: hidden;
}

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;
  position: relative;
  user-select: none;
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

.chat-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-row {
  cursor: grab;
}

.chat-row:active {
  cursor: grabbing;
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

.frame-shield {
  position: absolute;
  inset: 0;
  background: #0005;
  z-index: 4;
  user-select: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity .2s ease-in-out, visibility .2s ease-in-out;
}

.frame-shield.visible {
  opacity: 1;
  visibility: visible;
}

.col-resizer {
  position: absolute;
  top: 0;
  right: -2px;
  width: 4px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  z-index: 5;
}

.col-resizer:hover {
  background: rgba(255, 255, 255, 0.06);
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

.placeholder-unloaded {
  color: var(--muted);
}

.placeholder-configured {
  color: var(--text);
}

.placeholder-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 20px;
  max-width: 300px;
}

.platform-logo {
  font-size: 3rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.platform-logo .iconify {
  display: block;
}

.platform-logo .iconify[data-icon="mdi:twitch"] {
  color: #9146FF;
}

.platform-logo .iconify[data-icon="mdi:youtube"] {
  color: #FF0000;
}

.platform-logo .iconify[data-icon="simple-icons:kick"] {
  color: #53FC18;
}

.username {
  font-size: 18px;
  font-weight: 600;
  color: var(--text);
}

.placeholder-text {
  font-size: 14px;
  color: var(--muted);
  line-height: 1.4;
}

.reload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 40px;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  background: var(--bg);
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s ease;
}

.reload-btn:hover:not(:disabled) {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
}

.reload-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reload-btn .iconify {
  font-size: 1.2rem;
  transition: transform 0.3s ease;
}

.reload-btn .iconify.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
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
  background: var(--bg);
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
  display: flex;
  align-items: center;
  gap: 4px;
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

/* Modal transition animations */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  opacity: 0;
  transform: scale(0.9) translateY(30px);
  filter: blur(10px);
}

.modal-enter-to .modal-content {
  opacity: 1;
  transform: scale(1);
  filter: blur(0);
}
</style>
