<template>
    <div class="platform-multi-picker">
        <button type="button" class="picker-item is-twitch" :class="{ active: modelValue.includes('twitch') }" @click="toggle('twitch')">
            <Icon name="mdi:twitch" /> <span>Twitch</span>
        </button>
        <button type="button" class="picker-item is-youtube" :class="{ active: modelValue.includes('youtube') }" @click="toggle('youtube')">
            <Icon name="mdi:youtube" /> <span>YouTube</span>
        </button>
        <button type="button" class="picker-item is-kick" :class="{ active: modelValue.includes('kick') }" @click="toggle('kick')">
            <Icon name="simple-icons:kick" /> <span>Kick</span>
        </button>
    </div>
</template>

<script setup lang="ts">
type Platform = 'twitch' | 'youtube' | 'kick'
const props = defineProps<{ modelValue: Platform[] }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: Platform[]): void }>()

function toggle(p: Platform) {
    const set = new Set(props.modelValue)
    if (set.has(p)) set.delete(p)
    else set.add(p)
    emit('update:modelValue', Array.from(set))
}
</script>

<style scoped>
.platform-multi-picker {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--surface);
}

.picker-item {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    color: var(--text);
    transition: .2s;
    width: 100%;
}

.picker-item .iconify {
    font-size: 1.2rem;
    transition: .2s;
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
}

.picker-item.active {
    background: var(--primary);
    color: #fff;
    border-color: var(--primary);
}

.picker-item.active .iconify {
    color: #fff;
}
</style>
