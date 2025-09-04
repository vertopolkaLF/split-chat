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

                <div class="field">
                    <div class="chats-header">
                        <div class="inline-label chats-header-left">
                            <Icon name="material-symbols:forum" />
                            <span>Chats</span>
                        </div>
                        <button class="btn" type="button" @click="addEntry">
                            + Add chat
                        </button>
                    </div>
                    <div class="chat-list">
                        <ChatEntryInput v-for="(entry, idx) in localChats" :key="entry.id" v-model="localChats[idx]" @remove="removeEntry(idx)" />
                    </div>
                </div>


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
            </div>

        </div>
    </div>

</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useColorMode } from '#imports'
import ChatEntryInput from './ChatEntryInput.vue'

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

const props = defineProps<{
    open: boolean
    chats: ChatEntry[]
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update:chats', value: ChatEntry[]): void
}>()

const colorMode = useColorMode()
function setTheme(mode: 'light' | 'dark' | 'system') {
    colorMode.preference = mode
}

const localChats = ref<ChatEntry[]>([])
const overlayDown = ref(false)

watch(() => props.open, (v) => {
    if (v) {
        // clone to avoid mutating parent directly
        localChats.value = props.chats?.map(x => ({ ...x, parsed: { ...x.parsed }, locked: !!x.locked })) || []
        if (localChats.value.length === 0) addEntry()
    }
})

watch(localChats, (val) => {
    emit('update:chats', val)
}, { deep: true })

function addEntry() {
    localChats.value.push({
        id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
        input: '',
        platform: null,
        mode: 'manual',
        parsed: {},
        locked: false
    })
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
</script>

<!-- Styles intentionally kept global in app.vue to reuse existing modal/theme styling -->
