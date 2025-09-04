<template>
  <ClientOnly>
    <div class="page">
      <header class="header">
        <h1>Theo Chat</h1>
        <p>Enter Twitch and YouTube links to show both chats side by side.</p>
      </header>

      <section class="inputs">
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
      </section>

      <section class="chats">
        <div class="chat-card">
          <h2>Twitch Chat</h2>
          <div class="frame-wrap" v-if="twitchChannel">
            <iframe :src="twitchChatUrl" frameborder="0" scrolling="no" height="100%" width="100%" title="Twitch Chat" allowfullscreen>
            </iframe>
          </div>
          <div v-else class="placeholder">No Twitch channel set.</div>
        </div>

        <div class="chat-card">
          <h2>YouTube Chat</h2>
          <div class="frame-wrap" v-if="youtubeVideoId">
            <iframe :src="youtubeChatUrl" frameborder="0" scrolling="no" height="100%" width="100%" title="YouTube Live Chat" allowfullscreen>
            </iframe>
          </div>
          <div v-else class="placeholder">No YouTube live video set.</div>
        </div>
      </section>
    </div>
  </ClientOnly>

</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

const STORAGE_KEYS = {
  twitchInput: 'theo:twitch:input',
  twitchChannel: 'theo:twitch:channel',
  youtubeInput: 'theo:youtube:input',
  youtubeVideoId: 'theo:youtube:videoId'
} as const

const twitchInput = ref('')
const twitchChannel = ref('')

const youtubeInput = ref('')
const youtubeVideoId = ref('')
const isResolving = ref(false)

const twitchChatUrl = computed(() => {
  if (!twitchChannel.value) return ''
  // Twitch chat embed requires parent param - use current host
  const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  const url = new URL('https://www.twitch.tv/embed/' + encodeURIComponent(twitchChannel.value) + '/chat')
  url.searchParams.set('parent', parent)
  return url.toString()
})

const youtubeChatUrl = computed(() => {
  if (!youtubeVideoId.value) return ''
  const url = new URL('https://www.youtube.com/live_chat')
  url.searchParams.set('v', youtubeVideoId.value)
  url.searchParams.set('is_popout', '1')
  url.searchParams.set('embed_domain', typeof window !== 'undefined' ? window.location.hostname : 'localhost')
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
      const url = `/youtube/live?${q.toString()}`
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
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
}

.header h1 {
  margin: 0 0 4px 0;
}

.header p {
  margin: 0;
  color: #666;
}

.inputs {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

label {
  font-weight: 600;
}

input {
  padding: 10px 12px;
  border: 1px solid #ccc;
  border-radius: 8px;
  font-size: 14px;
}

.actions {
  display: flex;
  gap: 8px;
}

button {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid #888;
  background: #111;
  color: #fff;
  cursor: pointer;
}

button.ghost {
  background: #fff;
  color: #111;
}

button[disabled] {
  opacity: 0.6;
  cursor: default;
}

.hint {
  color: #666;
  font-size: 12px;
  margin: 0;
}

.chats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  min-height: 60vh;
}

.chat-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-card h2 {
  margin: 0;
  font-size: 16px;
}

.frame-wrap {
  flex: 1;
  min-height: 400px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
}

.placeholder {
  flex: 1;
  display: grid;
  place-items: center;
  border: 1px dashed #ccc;
  border-radius: 8px;
  color: #888;
}

@media (max-width: 900px) {
  .chats {
    grid-template-columns: 1fr;
  }
}
</style>
