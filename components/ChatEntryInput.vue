<template>
    <div class="chat-entry" :class="{ locked: !!local.locked }" ref="root">
        <div class="input-wrap">
            <input class="chat-input" :placeholder="placeholder" v-model.trim="local.input" @input="onInput" @keydown.enter.prevent="onSave" :readonly="!!local.locked" ref="inputEl" />

            <button class="platform-btn" :class="[platformClass, { locked: isAuto }]" type="button" @click="onPlatformClick" :title="isAuto ? 'Auto-detected platform' : 'Pick platform'">
                <Icon :name="platformIcon" />
            </button>

            <div class="actions-right">
                <button v-if="!local.locked" class="icon-btn save-btn" type="button" @click="onSave" title="Save">
                    <Icon name="material-symbols:check" />
                </button>
                <button v-else class="icon-btn edit-btn" type="button" @click="onEdit" title="Edit">
                    <Icon name="material-symbols:edit" />
                </button>
                <button class="icon-btn remove-btn" type="button" @click="$emit('remove')" title="Remove">
                    <Icon name="material-symbols:delete-outline" />
                </button>
            </div>
        </div>

        <Teleport to="body">
            <Transition @before-enter="onPickerBeforeEnter" @enter="onPickerEnter" @after-enter="onPickerAfterEnter" @before-leave="onPickerBeforeLeave" @leave="onPickerLeave" @after-leave="onPickerAfterLeave">
                <div v-if="pickerOpen && !isAuto" class="platform-picker portal" :style="portalStyle" ref="pickerEl">
                    <button type="button" class="picker-item is-twitch" @click="choose('twitch')">
                        <Icon name="mdi:twitch" /> <span>Twitch</span>
                    </button>
                    <button type="button" class="picker-item is-youtube" @click="choose('youtube')">
                        <Icon name="mdi:youtube" /> <span>YouTube</span>
                    </button>
                    <button type="button" class="picker-item is-kick" @click="choose('kick')">
                        <Icon name="simple-icons:kick" /> <span>Kick</span>
                    </button>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useNuxtApp } from '#app'

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

const props = defineProps<{ modelValue: ChatEntry }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: ChatEntry): void, (e: 'remove'): void }>()

const local = reactive<ChatEntry>({ ...props.modelValue })
watch(() => props.modelValue, (v) => Object.assign(local, v), { deep: true })
const { $posthog } = useNuxtApp()

function emitUpdate() {
    emit('update:modelValue', { ...local, parsed: { ...local.parsed } })
}

const pickerOpen = ref(false)
const root = ref<HTMLElement | null>(null)
const pickerEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)
const portalStyle = ref<Record<string, string>>({})
const isAuto = computed(() => local.mode === 'auto')

const platformIcon = computed(() => {
    switch (local.platform) {
        case 'twitch': return 'mdi:twitch'
        case 'youtube': return 'mdi:youtube'
        case 'kick': return 'simple-icons:kick'
        default: return 'material-symbols:question-mark'
    }
})

const platformClass = computed(() => {
    return local.platform ? `is-${local.platform}` : 'is-unknown'
})

const placeholder = computed(() => {
    if (!local.platform || local.mode === 'auto') return 'Paste a link or type username'
    if (local.platform === 'youtube') return 'YouTube link, @handle, channel id or search'
    return 'Channel link or username'
})

function onPlatformClick() {
    if (isAuto.value) return
    pickerOpen.value = !pickerOpen.value
    if (pickerOpen.value) updatePortalPosition()
}

function choose(p: Platform) {
    local.platform = p
    local.mode = 'manual'
    pickerOpen.value = false
    applyManualParse()
    emitUpdate()
}

function onInput() {
    if (!local.input) {
        local.mode = 'manual'
        local.platform = local.platform || null
        local.parsed = {}
        emitUpdate()
        return
    }
    const detected = detectPlatform(local.input)
    if (detected) {
        local.platform = detected.platform
        local.mode = 'auto'
        local.parsed = detected.parsed
        emitUpdate()
    } else {
        // not a URL -> user must pick platform manually
        local.mode = 'manual'
        local.parsed = {}
        applyManualParse()
        emitUpdate()
    }
}

function applyManualParse() {
    if (!local.platform) return
    if (local.platform === 'twitch' || local.platform === 'kick') {
        local.parsed = { channel: local.input.replace(/^@/, '') }
    } else if (local.platform === 'youtube') {
        // Accept @handle or channelId or plain text treated as handle
        if (local.input.startsWith('@')) {
            local.parsed = { handle: local.input.slice(1) }
        } else if (/^UC[\w-]{20,}$/.test(local.input)) {
            local.parsed = { channelId: local.input }
        } else {
            local.parsed = { handle: local.input }
        }
    }
}

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

function onGlobalPointerDown(ev: Event) {
    if (!pickerOpen.value) return
    const target = ev.target as Node | null
    const insideRoot = !!(root.value && target && root.value.contains(target))
    const insidePicker = !!(pickerEl.value && target && pickerEl.value.contains(target))
    if (!insideRoot && !insidePicker) {
        pickerOpen.value = false
    }
}

onMounted(() => {
    document.addEventListener('pointerdown', onGlobalPointerDown, true)
    window.addEventListener('scroll', updatePortalPosition, true)
    window.addEventListener('resize', updatePortalPosition, true)
})

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onGlobalPointerDown, true)
    window.removeEventListener('scroll', updatePortalPosition, true)
    window.removeEventListener('resize', updatePortalPosition, true)
})

function updatePortalPosition() {
    if (!pickerOpen.value || !root.value) return
    const anchor = root.value.querySelector('.input-wrap') as HTMLElement | null
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const top = rect.bottom + 6
    const left = rect.left
    portalStyle.value = {
        position: 'absolute',
        top: `${top}px`,
        left: `${left}px`,
        zIndex: '3000'
    }
}

function onPickerBeforeEnter(el: Element) {
    const node = el as HTMLElement
    node.style.opacity = '0'
    node.style.filter = 'blur(4px)'
    node.style.transform = 'translateY(-8px)'
}

function onPickerEnter(el: Element, done: () => void) {
    const node = el as HTMLElement
    node.style.transition = 'opacity .22s ease, filter .22s ease, transform .22s ease'
    requestAnimationFrame(() => {
        node.style.opacity = '1'
        node.style.filter = 'blur(0)'
        node.style.transform = 'translateY(0)'
        setTimeout(done, 240)
    })
}

function onPickerAfterEnter(el: Element) {
    const node = el as HTMLElement
    node.style.transition = ''
    node.style.transform = ''
}

function onPickerBeforeLeave(el: Element) {
    const node = el as HTMLElement
    node.style.opacity = '1'
    node.style.filter = 'blur(0)'
    node.style.transform = 'translateY(0)'
}

function onPickerLeave(el: Element, done: () => void) {
    const node = el as HTMLElement
    node.style.transition = 'opacity .2s ease, filter .2s ease, transform .2s ease'
    requestAnimationFrame(() => {
        node.style.opacity = '0'
        node.style.filter = 'blur(4px)'
        node.style.transform = 'translateY(-8px)'
        setTimeout(done, 220)
    })
}

function onPickerAfterLeave(_el: Element) {
    // no-op
}

function onSave() {
    if (!local.platform) {
        const detected = detectPlatform(local.input)
        if (detected) {
            local.platform = detected.platform
            local.mode = 'auto'
            local.parsed = detected.parsed
        }
    }
    if (!local.platform) return
    pickerOpen.value = false
    local.locked = true
    emitUpdate()
    try {
        const identifier = (local.parsed?.channel
            || local.parsed?.handle
            || local.parsed?.vanity
            || local.parsed?.channelId
            || local.parsed?.videoId
            || local.input) as string | undefined
        const ph = typeof $posthog === 'function' ? $posthog() : null
        ph?.capture('chat_configured', {
            id: local.id,
            platform: local.platform,
            mode: local.mode,
            identifier
        })
    } catch { }
}

function onEdit() {
    local.locked = false
    emitUpdate()
    nextTick(() => {
        inputEl.value?.focus()
        inputEl.value?.setSelectionRange?.(local.input.length, local.input.length)
    })
}
</script>

<style scoped>
.chat-entry {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.input-wrap {
    position: relative;
}

.chat-input {
    width: 100%;
    padding: 14px 40px 14px 46px;
    /* room for icons */
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg);
    color: var(--text);
}

.locked .chat-input {
    cursor: grab;
    opacity: 0.7;
}

.platform-btn {
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    height: 28px;
    width: 28px;
    display: inline-flex;
    padding: 0;
    align-items: center;
    justify-content: center;
    border: none;
    font-size: 1.4rem;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
}

.platform-btn.locked {
    cursor: default;
    opacity: 0.9;
}

.platform-btn.is-twitch {
    color: #9146FF;
}

.platform-btn.is-youtube {
    color: #FF0000;
}

.platform-btn.is-kick {
    color: #53FC18;
}

.actions-right {
    position: absolute;
    right: 8px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.icon-btn {
    height: 32px;
    width: 32px;
    border-radius: 10px;
    font-size: 1.2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: none;
    padding: 0;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: .2s;
}

.icon-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--surface) 90%, transparent);
    border-radius: 6px;
}

.save-btn {
    color: #16a34a;
}

.save-btn:hover {
    background: #16a34a;
    color: #fff;
}

.edit-btn:hover {
    background: var(--primary);
    color: #fff;
}

.remove-btn:hover {
    background: #ef4444;
    color: #fff;
}

.platform-picker {
    display: flex;
    gap: 2px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
}

.platform-picker.portal {
    position: absolute;
}

.picker-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    color: var(--text);
    transition: .2s;
}

.picker-item .iconify {
    font-size: 1.4rem;
}

.picker-item.is-twitch .iconify {
    color: #9146FF;
}

.picker-item.is-youtube .iconify {
    color: #FF0000;
}

.picker-item.is-kick .iconify {
    color: #53FC18;
}

.picker-item:hover {
    background: var(--bg);
    border-color: var(--border);
}
</style>
