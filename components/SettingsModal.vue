<template>
    <div v-if="open" class="modal-overlay" @pointerdown.self="onOverlayPointerDown" @pointerup.self="onOverlayPointerUp">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h3>Settings</h3>
                <button class="close-button" @click="emit('close')">
                    <Icon name="material-symbols:close" />
                </button>
            </div>

            <div class="modal-body">
                <div class="field field-inline">
                    <div class="inline-label">
                        <Icon name="material-symbols:palette" />
                        <span>Theme</span>
                    </div>
                    <div class="segmented" role="group" aria-label="Theme toggle">
                        <button type="button" class="segmented-btn" :class="{ active: colorMode.preference === 'light' }" @click="setTheme('light')" :aria-pressed="colorMode.preference === 'light'" title="Light">
                            <Icon name="material-symbols:light-mode" />
                        </button>
                        <button type="button" class="segmented-btn" :class="{ active: colorMode.preference === 'dark' }" @click="setTheme('dark')" :aria-pressed="colorMode.preference === 'dark'" title="Dark">
                            <Icon name="material-symbols:dark-mode" />
                        </button>
                        <button type="button" class="segmented-btn" :class="{ active: colorMode.preference === 'system' }" @click="setTheme('system')" :aria-pressed="colorMode.preference === 'system'" title="System">
                            <Icon name="material-symbols:settings-suggest" />
                        </button>
                    </div>
                </div>
                <div class="field">
                    <div class="chats-header">
                        <div class="inline-label chats-header-left">
                            <Icon name="material-symbols:forum" />
                            <span>Chats</span>
                        </div>
                        <button class="btn" type="button" @click="addEntry">
                            <Icon name="material-symbols:add" />
                            <span>Add chat</span>
                        </button>
                    </div>
                    <div class="chat-list" ref="listRef">
                        <div v-for="({ entry }, idx) in rendered" :key="entry.id" class="chat-row" :draggable="!!entry.locked" @dragstart="onDragStart(idx, $event)" @dragover.prevent="onDragOver(idx, $event)" @drop.prevent="onDrop" @dragend="onDragEnd">
                            <ChatEntryInput v-model="localChats[localChats.findIndex(e => e.id === entry.id)]" @remove="removeEntry(localChats.findIndex(e => e.id === entry.id))" />
                        </div>
                    </div>
                </div>



                <div class="field">
                    <div class="field field-inline">
                        <div class="inline-label">
                            <Icon name="material-symbols:tab" />
                            <span>Unload chats on tab blur</span>
                        </div>
                        <UiSelect v-model="localSettings.unloadOnBlur" :options="delayOptions" />
                    </div>
                    <Transition @before-enter="onPlatformsBeforeEnter" @enter="onPlatformsEnter" @after-enter="onPlatformsAfterEnter" @before-leave="onPlatformsBeforeLeave" @leave="onPlatformsLeave" @after-leave="onPlatformsAfterLeave">
                        <div v-if="localSettings.unloadOnBlur !== 'off'" class="platform-checkboxes" ref="platformsRef">
                            <label class="inline-label platforms-label">Platforms</label>
                            <PlatformMultiPicker v-model="localSettings.unloadPlatforms" />
                            <div class="hint">Checked platforms will be unloaded after the selected delay.</div>
                        </div>
                    </Transition>
                </div>
            </div>

        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useAutoAnimate } from '@formkit/auto-animate/vue'
import { useColorMode } from '#imports'
import ChatEntryInput from './ChatEntryInput.vue'
import UiSelect from './UiSelect.vue'
import PlatformMultiPicker from './PlatformMultiPicker.vue'

type Platform = 'twitch' | 'youtube' | 'kick'
type Mode = 'auto' | 'manual'
type UnloadDelay = 'off' | 'instant' | '5s' | '10s' | '30s' | '1m'

interface ChatEntry {
    id: string
    input: string
    platform: Platform | null
    mode: Mode
    parsed: Record<string, any>
    locked?: boolean
}

interface SettingsState {
    unloadOnBlur: UnloadDelay
    unloadPlatforms: Platform[]
}

const props = defineProps<{
    open: boolean
    chats: ChatEntry[]
    settings: SettingsState
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update:chats', value: ChatEntry[]): void
    (e: 'update:settings', value: SettingsState): void
}>()

const colorMode = useColorMode()
function setTheme(mode: 'light' | 'dark' | 'system') {
    colorMode.preference = mode
}

const localChats = ref<ChatEntry[]>([])
const localSettings = ref<SettingsState>({ unloadOnBlur: 'off', unloadPlatforms: ['youtube'] })
const overlayDown = ref(false)
const [listRef] = useAutoAnimate()
const dragIndex = ref<number | null>(null)
const draggingId = ref<string | null>(null)
const reorderLock = ref(false)
const isDragging = ref(false)
const displayOrder = ref<string[]>([])
const delayOptions = [
    { label: 'Off', value: 'off' },
    { label: 'Instant', value: 'instant' },
    { label: '5s', value: '5s' },
    { label: '10s', value: '10s' },
    { label: '30s', value: '30s' },
    { label: '1m', value: '1m' },
]

const rendered = computed(() => {
    const idToEntry = new Map(localChats.value.map((e, i) => [e.id, { entry: e, index: i }]))
    return displayOrder.value
        .map(id => idToEntry.get(id))
        .filter(Boolean) as { entry: ChatEntry, index: number }[]
})

const platformsRef = ref<HTMLElement | null>(null)

function onPlatformsBeforeEnter(el: Element) {
    const node = el as HTMLElement
    node.style.overflow = 'hidden'
    node.style.height = '0px'
    node.style.opacity = '0'
    node.style.filter = 'blur(4px)'
}

function onPlatformsEnter(el: Element, done: () => void) {
    const node = el as HTMLElement
    const h = node.scrollHeight
    node.style.transition = 'height .22s ease, opacity .22s ease, filter .22s ease'
    // force reflow
    void node.offsetHeight
    requestAnimationFrame(() => {
        node.style.height = h + 'px'
        node.style.opacity = '1'
        node.style.filter = 'blur(0)'
        setTimeout(done, 240)
    })
}

function onPlatformsAfterEnter(el: Element) {
    const node = el as HTMLElement
    node.style.height = 'auto'
    node.style.overflow = ''
    node.style.transition = ''
}

function onPlatformsBeforeLeave(el: Element) {
    const node = el as HTMLElement
    node.style.overflow = 'hidden'
    node.style.height = node.scrollHeight + 'px'
    node.style.opacity = '1'
    node.style.filter = 'blur(0)'
}

function onPlatformsLeave(el: Element, done: () => void) {
    const node = el as HTMLElement
    node.style.transition = 'height .2s ease, opacity .2s ease, filter .2s ease'
    // force reflow
    void node.offsetHeight
    requestAnimationFrame(() => {
        node.style.height = '0px'
        node.style.opacity = '0'
        node.style.filter = 'blur(4px)'
        setTimeout(done, 220)
    })
}

function onPlatformsAfterLeave(_el: Element) {
    // no-op
}

watch(() => props.open, (v) => {
    if (v) {
        // clone to avoid mutating parent directly
        localChats.value = props.chats?.map(x => ({ ...x, parsed: { ...x.parsed }, locked: !!x.locked })) || []
        if (localChats.value.length === 0) addEntry()
        displayOrder.value = localChats.value.map(e => e.id)
        // clone settings
        const s = props.settings || { unloadOnBlur: 'off', unloadPlatforms: ['youtube'] }
        localSettings.value = { unloadOnBlur: s.unloadOnBlur, unloadPlatforms: Array.isArray(s.unloadPlatforms) ? [...s.unloadPlatforms] : ['youtube'] }
    }
})

watch(localChats, (val) => {
    if (!isDragging.value) emit('update:chats', val)
}, { deep: true })

watch(localSettings, (val) => {
    emit('update:settings', { unloadOnBlur: val.unloadOnBlur, unloadPlatforms: [...val.unloadPlatforms] })
}, { deep: true })

function addEntry() {
    const newEntry: ChatEntry = {
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        input: '',
        platform: null,
        mode: 'manual',
        parsed: {},
        locked: false
    }
    localChats.value = [...localChats.value, newEntry]
    // Keep display order in sync if using DnD view
    try { displayOrder.value = [...displayOrder.value, newEntry.id] } catch { }
    // Emit immediately so parent state updates without waiting for deep watch
    emit('update:chats', localChats.value)
}

function removeEntry(index: number) {
    localChats.value.splice(index, 1)
}

function onOverlayPointerDown() {
    overlayDown.value = true
}

function onOverlayPointerUp() {
    if (overlayDown.value) emit('close')
    overlayDown.value = false
}

function onDragStart(index: number, ev: DragEvent) {
    if (!localChats.value[index]?.locked) {
        ev.preventDefault()
        return
    }
    isDragging.value = true
    dragIndex.value = index
    draggingId.value = localChats.value[index].id
    // prevent ghost image
    if (ev.dataTransfer) {
        ev.dataTransfer.setDragImage(new Image(), 0, 0)
    }
}

function onDragOver(index: number, _ev: DragEvent) {
    if (dragIndex.value === null || !draggingId.value) return
    if (reorderLock.value) return
    // reorder displayOrder only
    const from = displayOrder.value.indexOf(draggingId.value)
    if (from === -1 || from === index) return
    const next = [...displayOrder.value]
    next.splice(from, 1)
    next.splice(index, 0, draggingId.value)
    displayOrder.value = next
    reorderLock.value = true
    setTimeout(() => { reorderLock.value = false }, 220)
}

function onDrop(_ev: DragEvent) {
    // commit on drop
    onDragEnd()
}

function onDragEnd() {
    if (isDragging.value) {
        // commit order to localChats
        const idToEntry = new Map(localChats.value.map(e => [e.id, e]))
        const committed = displayOrder.value.map(id => idToEntry.get(id)).filter(Boolean) as ChatEntry[]
        localChats.value = committed
    }
    isDragging.value = false
    dragIndex.value = null
    draggingId.value = null
}
</script>

<!-- Styles intentionally kept global in app.vue to reuse existing modal/theme styling -->
<style scoped>
.platform-checkboxes {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.platforms-label {
    gap: 10px;
}

.platforms-grid {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.platform-check {
    display: inline-flex;
    align-items: center;
    gap: 6px;
}
</style>
