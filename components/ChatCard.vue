<template>
    <div class="chat-card">
        <a v-if="showUsername && streamUrl && embed" class="chat-username" :class="usernameClass" :href="streamUrl" target="_blank" rel="noopener noreferrer">
            <span>{{ displayUsername }}</span>
            <!-- <Icon name="material-symbols:open-in-new" /> -->
        </a>
        <div class="frame-wrap" v-if="embed && !shouldUnload">
            <iframe :src="embed.url" frameborder="0" scrolling="no" height="100%" width="100%" :title="embed.title" allowfullscreen></iframe>
        </div>
        <div v-else-if="isConfigured" class="placeholder placeholder-configured">
            <div class="placeholder-content">
                <div class="platform-logo">
                    <Icon :name="platformIcon" />
                    <div class="username">{{ displayUsername }}</div>
                </div>
                <div class="placeholder-text">there will be {{ displayUsername }}'s chat</div>
                <button class="reload-btn" @click="onReloadClick" :disabled="reloading" :title="reloading ? 'Loading...' : 'Refresh chat'">
                    <Icon name="material-symbols:refresh" :class="{ spinning: reloading }" />
                    <span>{{ reloading ? 'Loading...' : 'Refresh' }}</span>
                </button>
            </div>
        </div>
        <div v-else-if="embed && shouldUnload" class="placeholder placeholder-unloaded">Unloaded due to tab blur.</div>
        <div v-else class="placeholder">No chat configured.</div>
        <div class="frame-shield" :class="{ visible: isResizing }"></div>
        <div v-if="showResizer" title="Double click to equalize widths" class="col-resizer" @mousedown="(e) => emit('startResize', index, e)" @dblclick.stop.prevent="emit('equalizeWidths')"></div>
    </div>

</template>

<script setup lang="ts">
import { toRefs, computed } from 'vue'
import { useNuxtApp } from '#app'
interface ChatEntry { id: string; platform: string | null }
interface Embed { url: string; title: string }

const props = defineProps<{
    entry: ChatEntry
    embed: Embed | null
    shouldUnload: boolean
    isConfigured: boolean
    platformIcon: string
    displayUsername: string
    reloading: boolean
    isResizing: boolean
    index: number
    showResizer: boolean
    showUsername: boolean
    streamUrl: string | null
}>()

const { entry, embed, shouldUnload, isConfigured, platformIcon, displayUsername, reloading, isResizing, index, showResizer, showUsername, streamUrl } = toRefs(props)

const emit = defineEmits<{
    (e: 'reload', entry: ChatEntry): void
    (e: 'startResize', index: number, ev: MouseEvent): void
    (e: 'equalizeWidths'): void
}>()

const { $posthog } = useNuxtApp()

const usernameClass = computed(() => {
    const platform = entry.value.platform
    if (platform === 'youtube') return 'yt'
    return 'default'
})

function onReloadClick() {
    try {
        const ph = typeof $posthog === 'function' ? $posthog() : null
        ph?.capture('chat_reloaded', { id: entry.value.id, platform: entry.value.platform })
    } catch { }
    emit('reload', entry.value)
}
</script>

<style scoped>
.chat-username {
    display: flex;
    align-items: center;
    gap: 4px;
    position: absolute;
    z-index: 6;
    background: #000a;
    color: #fff;
    padding: 6px 10px;
    border-radius: 6px;
    font-size: 12px;
    backdrop-filter: blur(4px);
    text-decoration: none;
    margin: 6px;
}

.chat-username:hover {
    background-color: var(--primary-strong);
    color: #fff;
}

.chat-username.default {
    top: 0;
    left: 0;
}

.chat-username.yt {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    margin: 11px;
}
</style>
