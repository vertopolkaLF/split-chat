<template>
    <div class="ui-select" ref="root">
        <button type="button" class="ui-select__button" :class="open ? 'open' : 'closed'" :style="{ minWidth: buttonMinWidth + 'px' }" :aria-expanded="open ? 'true' : 'false'" :disabled="disabled" @click="toggle">
            <span>{{ selectedLabel }}</span>
            <Icon name="material-symbols:expand-more" class="ui-select__chevron" />
        </button>
        <Teleport to="body">
            <Transition @before-enter="onMenuBeforeEnter" @enter="onMenuEnter" @after-enter="onMenuAfterEnter" @before-leave="onMenuBeforeLeave" @leave="onMenuLeave" @after-leave="onMenuAfterLeave">
                <div v-if="open" class="ui-select__menu portal" :style="menuStyle" role="listbox" ref="menuRef">
                    <button v-for="opt in options" :key="opt.value" type="button" class="ui-select__option" :class="{ active: opt.value === currentValue }" @click="choose(opt.value)" role="option" :aria-selected="opt.value === currentValue">
                        {{ opt.label }}
                    </button>
                </div>
            </Transition>
        </Teleport>
    </div>

</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, nextTick } from 'vue'

interface Option<T = string> { label: string; value: T }

const props = defineProps<{
    modelValue: string
    options: Option<string>[]
    disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'update:modelValue', v: string): void }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const menuStyle = ref<Record<string, string>>({})
const menuRef = ref<HTMLElement | null>(null)
const buttonMinWidth = ref(0)
const currentValue = ref(props.modelValue)

const selectedLabel = computed(() => props.options.find(o => o.value === currentValue.value)?.label || 'Select')

function toggle() {
    if (props.disabled) return
    open.value = !open.value
    if (open.value) nextTick(updateMenuPosition)
}

function choose(v: string) {
    currentValue.value = v
    emit('update:modelValue', v)
    open.value = false
}

function onDocPointerDown(ev: Event) {
    if (!open.value) return
    const t = ev.target as Node | null
    if (!t) return
    if (root.value && root.value.contains(t)) return
    if (menuRef.value && menuRef.value.contains(t)) return
    open.value = false
}

onMounted(() => {
    document.addEventListener('pointerdown', onDocPointerDown, true)
    document.addEventListener('scroll', updateMenuPosition, true)
    window.addEventListener('resize', updateMenuPosition, true)
    measureMinWidth()
})

onBeforeUnmount(() => {
    document.removeEventListener('pointerdown', onDocPointerDown, true)
    document.removeEventListener('scroll', updateMenuPosition, true)
    window.removeEventListener('resize', updateMenuPosition, true)
})

watch(() => props.options, () => { measureMinWidth() }, { deep: true })
watch(() => props.modelValue, (v) => { currentValue.value = v })

function updateMenuPosition() {
    if (!open.value || !root.value) return
    const button = root.value.querySelector('.ui-select__button') as HTMLElement | null
    if (!button) return
    const rect = button.getBoundingClientRect()
    const gap = 6
    const top = rect.bottom + gap
    let left = rect.left
    const minWidth = rect.width
    menuStyle.value = {
        position: 'absolute',
        top: `${Math.round(top)}px`,
        left: `${Math.round(left)}px`,
        width: `${Math.round(minWidth)}px`,
        zIndex: '2100'
    }
    // clamp to viewport right edge after render
    nextTick(() => {
        const menu = menuRef.value
        if (!menu) return
        const mrect = menu.getBoundingClientRect()
        const overflow = (mrect.right + 6) - window.innerWidth
        if (overflow > 0) {
            left = Math.max(6, left - overflow)
            menuStyle.value = { ...menuStyle.value, left: `${Math.round(left)}px` }
        }
    })
}

function measureMinWidth() {
    const labels = (props.options || []).map(o => o.label)
    if (!labels.length) { buttonMinWidth.value = 0; return }
    // Use canvas with computed font from the button
    const button = root.value?.querySelector('.ui-select__button') as HTMLElement | null
    const ctx = document.createElement('canvas').getContext('2d')
    let font = '14px Inter, Roboto, Helvetica Neue, Arial, Noto Sans, sans-serif'
    let paddingLeft = 12, paddingRight = 12
    let gap = 8, chevron = 16
    if (button && ctx) {
        const cs = getComputedStyle(button)
        font = `${cs.fontStyle} ${cs.fontVariant} ${cs.fontWeight} ${cs.fontSize}/${cs.lineHeight} ${cs.fontFamily}`
        paddingLeft = parseFloat(cs.paddingLeft || '12') || 12
        paddingRight = parseFloat(cs.paddingRight || '12') || 12
    }
    if (!ctx) { buttonMinWidth.value = 120; return }
    ctx.font = font
    let max = 0
    for (const label of labels) {
        max = Math.max(max, ctx.measureText(label).width)
    }
    const total = Math.ceil(max + paddingLeft + paddingRight + gap + chevron)
    // Prevent ridiculous widths
    buttonMinWidth.value = Math.min(Math.max(total, 100), 220)
}

function onMenuBeforeEnter(el: Element) {
    const node = el as HTMLElement
    node.style.overflow = 'hidden'
    node.style.height = '0px'
    node.style.opacity = '0'
    node.style.filter = 'blur(4px)'
}

function onMenuEnter(el: Element, done: () => void) {
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

function onMenuAfterEnter(el: Element) {
    const node = el as HTMLElement
    node.style.height = 'auto'
    node.style.overflow = ''
    node.style.transition = ''
}

function onMenuBeforeLeave(el: Element) {
    const node = el as HTMLElement
    node.style.overflow = 'hidden'
    node.style.height = node.scrollHeight + 'px'
    node.style.opacity = '1'
    node.style.filter = 'blur(0)'
}

function onMenuLeave(el: Element, done: () => void) {
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

function onMenuAfterLeave(_el: Element) {
    // no-op
}
</script>

<style scoped>
.ui-select {
    position: relative;
}

.ui-select__button {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    gap: 8px;
    ;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 14px;
    background: var(--bg);
    color: var(--text);
    cursor: pointer;
}

.ui-select__button:disabled {
    opacity: .6;
    cursor: default;
}

.ui-select__chevron {
    font-size: 1.2rem;
    opacity: .8;
    transition: .2s;
}

.ui-select__button.open .ui-select__chevron {
    transform: rotate(-180deg);
}


.ui-select__menu {
    position: absolute;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(0, 0, 0, .25);
    padding: 4px;
    z-index: 2100;
    overflow: clip;
}

.ui-select__menu.portal {
    position: absolute;
}

.ui-select__option {
    width: 100%;
    text-align: left;
    padding: 8px 10px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--text);
    cursor: pointer;
}

.ui-select__option:hover {
    background: var(--bg);
    border-color: var(--border);
}

.ui-select__option.active {
    background: var(--primary);
    border-color: var(--border);
    color: #fff;
}
</style>
