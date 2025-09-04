<template>
    <div v-if="open" class="modal-overlay" @click="emit('close')">
        <div class="modal-content" @click.stop>
            <div class="modal-header">
                <h3>Settings</h3>
                <button class="close-button" @click="emit('close')">✕</button>
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
                    <label for="twitchInput">Twitch stream or channel URL</label>
                    <input id="twitchInput" type="url" v-model.trim="localTwitchInput" placeholder="https://www.twitch.tv/somechannel" @keydown.enter="onSaveTwitch" />
                    <div class="actions">
                        <button class="btn" @click="onSaveTwitch">Save</button>
                        <button class="btn ghost" @click="onClearTwitch" v-if="twitchChannel || localTwitchInput">Clear</button>
                    </div>
                </div>

                <div class="field">
                    <label for="youtubeInput">YouTube stream, channel or @handle URL</label>
                    <input id="youtubeInput" type="url" v-model.trim="localYouTubeInput" placeholder="https://www.youtube.com/@handle or /watch?v=... or /channel/..." @keydown.enter="onSaveYouTube" />
                    <div class="actions">
                        <button class="btn" @click="onSaveYouTube" :disabled="isResolving">{{ isResolving ? 'Resolving…' : 'Save' }}</button>
                        <button class="btn ghost" @click="onClearYouTube" v-if="youtubeVideoId || localYouTubeInput">Clear</button>
                        <p class="hint">If channel URL or @handle is provided, active live will be resolved via API.</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useColorMode } from '#imports'

const props = defineProps<{
    open: boolean
    twitchInput: string
    twitchChannel: string
    youtubeInput: string
    youtubeVideoId: string
    isResolving: boolean
}>()

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'update:twitchInput', value: string): void
    (e: 'update:youtubeInput', value: string): void
    (e: 'save-twitch'): void
    (e: 'clear-twitch'): void
    (e: 'save-youtube'): void
    (e: 'clear-youtube'): void
}>()

const colorMode = useColorMode()
function setTheme(mode: 'light' | 'dark' | 'system') {
    colorMode.preference = mode
}

const localTwitchInput = ref(props.twitchInput)
const localYouTubeInput = ref(props.youtubeInput)

watch(() => props.open, (v) => {
    if (v) {
        localTwitchInput.value = props.twitchInput
        localYouTubeInput.value = props.youtubeInput
    }
})

function onSaveTwitch() {
    emit('update:twitchInput', localTwitchInput.value)
    emit('save-twitch')
}

function onClearTwitch() {
    localTwitchInput.value = ''
    emit('update:twitchInput', '')
    emit('clear-twitch')
}

function onSaveYouTube() {
    emit('update:youtubeInput', localYouTubeInput.value)
    emit('save-youtube')
}

function onClearYouTube() {
    localYouTubeInput.value = ''
    emit('update:youtubeInput', '')
    emit('clear-youtube')
}
</script>

<!-- Styles intentionally kept global in app.vue to reuse existing modal/theme styling -->
