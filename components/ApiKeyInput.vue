<template>
    <div class="api-key-entry" ref="root">
        <div class="input-wrap">

            <input class="api-key-input" :type="inputType" :readonly="!isEditing" placeholder="Enter your YouTube API key..." v-model.trim="localValue" @input="onInput" ref="inputEl" />

            <div class="actions-right">
                <button class="icon-btn reveal-btn" type="button" @click="toggleEdit" :title="isEditing ? 'Save API key' : 'Edit API key'" :class="isEditing ? 'save' : 'edit'">
                    <Icon :name="isEditing ? 'material-symbols:check' : 'material-symbols:edit'" />
                </button>
                <button class="icon-btn copy-btn" type="button" @click="onCopy" title="Copy API key">
                    <Icon name="material-symbols:content-copy-outline" />
                </button>
            </div>
        </div>

        <!-- Copied notification -->
        <Transition name="copied" appear>
            <div v-if="showCopied" class="copied-notification">
                Copied!
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const localValue = ref(props.modelValue || '')
const isEditing = ref(false)
const showCopied = ref(false)
const root = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLInputElement | null>(null)

const inputType = computed(() => isEditing.value ? 'text' : 'password')

const STORAGE_KEY = 'splitchat:yt_key'

onMounted(() => {
    // Load from LocalStorage on mount
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
        localValue.value = stored
        emit('update:modelValue', stored)
    }
})

watch(() => props.modelValue, (v) => {
    localValue.value = v || ''
})

function onInput() {
    emit('update:modelValue', localValue.value)
}

async function onCopy() {
    if (!localValue.value) return

    try {
        await navigator.clipboard.writeText(localValue.value)
        showCopied.value = true
        setTimeout(() => {
            showCopied.value = false
        }, 2000)
    } catch (error) {
        console.error('Failed to copy to clipboard:', error)
    }
}

function toggleEdit() {
    if (isEditing.value) {
        // Save to LocalStorage
        localStorage.setItem(STORAGE_KEY, localValue.value)
        emit('update:modelValue', localValue.value)
    }
    isEditing.value = !isEditing.value
}
</script>

<style scoped>
.api-key-entry {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.input-wrap {
    position: relative;
}

.api-key-entry {
    position: relative;
}

.api-key-input {
    width: 100%;
    padding: 14px 80px 14px 20px;
    /* room for icons */
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg);
    color: var(--text);
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
    color: #FF0000;
    z-index: 1;
    cursor: default;
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

.copy-btn:hover {
    background: var(--primary);
    color: #fff;
}

.reveal-btn:hover {
    background: var(--primary);
    color: #fff;
}

.save:hover {
    background: #16a34a;
}

.api-key-input:read-only {
    background: var(--bg);
    color: var(--muted);
    opacity: 0.7;
    cursor: not-allowed;
}

.copied-notification {
    position: absolute;
    top: -32px;
    right: 0;
    background: #16a34a;
    color: #fff;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    z-index: 10;
    white-space: nowrap;
}

.copied-enter-active,
.copied-leave-active {
    transition: all 0.3s ease;
}

.copied-enter-from,
.copied-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
