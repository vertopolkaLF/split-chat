<template>
  <ClientOnly>
    <div class="app">
      <!-- Fixed settings button -->
      <button class="settings-button" @click="openSettings" title="Settings">
        <Icon name="solar:settings-linear" />
      </button>

      <!-- Full screen chats -->
      <div class=" chats-fullscreen">
        <div class="chat-card">
          <div class="frame-wrap" v-if="twitchChannel">
            <iframe :src="twitchChatUrl" frameborder="0" scrolling="no" height="100%" width="100%" title="Twitch Chat" allowfullscreen>
            </iframe>
          </div>
          <div v-else class="placeholder">No Twitch channel set.</div>
        </div>

        <div class="chat-card">
          <div class="frame-wrap" v-if="youtubeVideoId">
            <iframe :src="youtubeChatUrl" frameborder="0" scrolling="no" height="100%" width="100%" title="YouTube Live Chat" allowfullscreen>
            </iframe>
          </div>
          <div v-else class="placeholder">No YouTube live video set.</div>
        </div>
      </div>

      <!-- Settings Modal -->
      <div v-if="showSettings" class="modal-overlay" @click="closeSettings">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>Настройки стримов</h3>
            <button class="close-button" @click="closeSettings">✕</button>
          </div>

          <div class="modal-body">
            <div class="field">
              <label for="themeSelect">Theme</label>
              <select id="themeSelect" v-model="colorMode.preference">
                <option value="system">System</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>

            <div class="field">
              <label for="twitchInput">Twitch stream or channel URL</label>
              <input id="twitchInput" type="url" v-model.trim="twitchInput" placeholder="https://www.twitch.tv/somechannel" @keydown.enter="saveTwitch" />
              <div class="actions">
                <button @click="saveTwitch">Save</button>
                <button class="ghost" @click="clearTwitch" v-if="twitchInput || twitchChannel">Clear</button>
              </div>
            </div>

            <div class="field">
              <label for="youtubeInput">YouTube stream, video, channel or @handle URL</label>
              <input id="youtubeInput" type="url" v-model.trim="youtubeInput" placeholder="https://www.youtube.com/@handle or /watch?v=... or /channel/..." @keydown.enter="saveYouTube" />
              <div class="actions">
                <button @click="saveYouTube" :disabled="isResolving">{{ isResolving ? 'Resolving…' : 'Save' }}</button>
                <button class="ghost" @click="clearYouTube" v-if="youtubeInput || youtubeVideoId">Clear</button>
                <p class="hint">If channel URL or @handle is provided, active live will be resolved via API.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useColorMode } from '#imports'
const colorMode = useColorMode()

const STORAGE_KEYS = {
  twitchInput: 'splitchat:twitch:input',
  twitchChannel: 'splitchat:twitch:channel',
  youtubeInput: 'splitchat:youtube:input',
  youtubeVideoId: 'splitchat:youtube:videoId'
} as const

const twitchInput = ref('')
const twitchChannel = ref('')

const youtubeInput = ref('')
const youtubeVideoId = ref('')
const isResolving = ref(false)
const showSettings = ref(false)

const twitchChatUrl = computed(() => {
  if (!twitchChannel.value) return ''
  // Twitch chat embed requires parent param - use current host
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const url = new URL('https://www.twitch.tv/embed/' + encodeURIComponent(twitchChannel.value) + '/chat')
  url.searchParams.set('parent', parent)
  if (colorMode.value === 'dark') {
    url.searchParams.set('darkpopout', 'true')
  }
  return url.toString()
})

const youtubeChatUrl = computed(() => {
  if (!youtubeVideoId.value) return ''
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', youtubeVideoId.value)
  url.searchParams.set('is_popout', '1')
  url.searchParams.set('embed_domain', typeof window !== 'undefined' ? window.location.hostname : 'localhost')
  if (colorMode.value === 'dark') {
    url.searchParams.set('dark_theme', '1')
  }
  return url.toString()
})

function extractTwitchChannel(input: string): string | '' {
  try {
    const url = new URL(input)
    const host = url.hostname.replace(/^www\./, '')
    if (host === 'twitch.tv' || host === 'm.twitch.tv') {
      const seg = url.pathname.replace(/^\//, '').split('/')[0]
      return seg || ''
    }
  } catch {
    // not a URL, treat as channel name
    if (/^[a-zA-Z0-9_]{3,25}$/.test(input)) return input
  }
  return ''
}

function parseYouTubeInputOnClient(input: string): { videoId?: string, channelId?: string, handle?: string, vanity?: string } {
  // raw handle
  if (input.startsWith('@') && !input.startsWith('@http')) {
    return { handle: input.replace(/^@/, '') }
  }
  // raw channel id
  if (/^UC[\w-]{20,}$/.test(input)) {
    return { channelId: input }
  }

  let url: URL | null = null
  try {
    url = new URL(input)
  } catch {
    if (/^(www\.)?youtube\.com\//.test(input) || /^youtu\.be\//.test(input)) {
      try { url = new URL('https://' + input) } catch { }
    }
  }
  if (!url) return {}

  const host = url.hostname.replace(/^www\./, '')
  if (host === 'youtu.be') {
    const id = url.pathname.replace(/^\//, '')
    if (id) return { videoId: id }
  }
  if (host.endsWith('youtube.com')) {
    const path = url.pathname
    const sp = url.searchParams
    if (path === '/watch') {
      const v = sp.get('v') || undefined
      if (v) return { videoId: v }
    }
    const liveMatch = path.match(/^\/live\/([\w-]{8,})/)
    if (liveMatch) return { videoId: liveMatch[1] }
    const chMatch = path.match(/^\/channel\/([\w-]{8,})/)
    if (chMatch) return { channelId: chMatch[1] }
    const handleMatch = path.match(/^\/@([\w.-]{2,})/)
    if (handleMatch) return { handle: handleMatch[1] }
    const userMatch = path.match(/^\/(?:user|c)\/([\w.-]{2,})/)
    if (userMatch) return { vanity: userMatch[1] }
  }
  return {}
}

async function saveTwitch() {
  const channel = extractTwitchChannel(twitchInput.value)
  twitchChannel.value = channel
  localStorage.setItem(STORAGE_KEYS.twitchInput, twitchInput.value)
  localStorage.setItem(STORAGE_KEYS.twitchChannel, channel)
}

function clearTwitch() {
  twitchInput.value = ''
  twitchChannel.value = ''
  localStorage.removeItem(STORAGE_KEYS.twitchInput)
  localStorage.removeItem(STORAGE_KEYS.twitchChannel)
}

async function saveYouTube() {
  if (!youtubeInput.value) return
  isResolving.value = true
  try {
    console.log('[ui] saveYouTube start', { input: youtubeInput.value })
    const parsed = parseYouTubeInputOnClient(youtubeInput.value)
    console.log('[ui] parsed', parsed)

    if (parsed.videoId) {
      youtubeVideoId.value = parsed.videoId
      console.log('[ui] youtubeVideoId set (local)', youtubeVideoId.value)
    } else {
      const q = new URLSearchParams({ input: youtubeInput.value })
      const url = `/api/youtube/live?${q.toString()}`
      console.log('[ui] request', url)
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      console.log('[ui] response status', res.status)
      const ct = res.headers.get('content-type') || ''
      if (ct.includes('application/json')) {
        const data = await res.json()
        console.log('[ui] response payload', data)
        youtubeVideoId.value = data?.videoId || ''
      } else {
        const text = await res.text()
        console.error('[ui] non-json response from /api/youtube/live', text.slice(0, 400))
        youtubeVideoId.value = ''
      }
      console.log('[ui] youtubeVideoId set (api)', youtubeVideoId.value)
    }
  } catch (e) {
    console.error('[ui] saveYouTube error', e)
    youtubeVideoId.value = ''
  } finally {
    isResolving.value = false
    localStorage.setItem(STORAGE_KEYS.youtubeInput, youtubeInput.value)
    if (youtubeVideoId.value) {
      localStorage.setItem(STORAGE_KEYS.youtubeVideoId, youtubeVideoId.value)
    } else {
      localStorage.removeItem(STORAGE_KEYS.youtubeVideoId)
    }
  }
}

function clearYouTube() {
  youtubeInput.value = ''
  youtubeVideoId.value = ''
  localStorage.removeItem(STORAGE_KEYS.youtubeInput)
  localStorage.removeItem(STORAGE_KEYS.youtubeVideoId)
}

function openSettings() {
  showSettings.value = true
}

function closeSettings() {
  showSettings.value = false
}

onMounted(() => {
  // hydrate from localStorage
  try {
    const ti = localStorage.getItem(STORAGE_KEYS.twitchInput) || ''
    const tc = localStorage.getItem(STORAGE_KEYS.twitchChannel) || ''
    const yi = localStorage.getItem(STORAGE_KEYS.youtubeInput) || ''
    const yv = localStorage.getItem(STORAGE_KEYS.youtubeVideoId) || ''
    twitchInput.value = ti
    twitchChannel.value = tc
    youtubeInput.value = yi
    youtubeVideoId.value = yv
  } catch {
    // ignore
  }
})
</script>

<style>
/* Reset and base styles */
* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  height: 100vh;
  gap: 1px;
  background-color: #222;
}

.chat-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: none;
}

.chat-card h2 {
  margin: 0;
  padding: 12px 16px;
  font-size: 14px;
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
  padding: 20px;
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
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
}

.close-button:hover {
  color: #000;
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  max-height: calc(80vh - 80px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.field:last-child {
  margin-bottom: 0;
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
  margin-top: 4px;
}

button {
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid var(--primary);
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

button:hover:not(:disabled) {
  background: var(--primary-strong);
}

button.ghost {
  background: var(--bg);
  color: var(--primary);
  border-color: var(--primary);
}

button.ghost:hover {
  background: var(--surface);
}

button[disabled] {
  opacity: 0.6;
  cursor: default;
}

.hint {
  color: var(--muted);
  font-size: 12px;
  margin: 4px 0 0 0;
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
  padding: 4px;
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
