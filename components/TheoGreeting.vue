<template>
    <div class="steam-notification-container" :class="containerClass" v-if="isVisible">

        <!-- 1 Notification -->
        <div class="steam-notification">
            <div class="avatar">
                <img src="/images/avatar.png" alt="Theo" onerror="this.style.display='none'">
                <div class="online-status"></div>
            </div>
            <div class="content">
                <div class="username">vertopolkaLF</div>
                <div class="message">
                    <svg width="57" height="54" viewBox="0 0 57 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M57 0V40.5H35L28.5 54L22 40.5H0V0H57ZM12.5 14.5C10.8431 14.5 9.5 15.8431 9.5 17.5V23.5C9.5 25.1569 10.8431 26.5 12.5 26.5H14.5C16.1569 26.5 17.5 25.1569 17.5 23.5V17.5C17.5 15.8431 16.1569 14.5 14.5 14.5H12.5ZM27.5 14.5C25.8431 14.5 24.5 15.8431 24.5 17.5V23.5C24.5 25.1569 25.8431 26.5 27.5 26.5H29.5C31.1569 26.5 32.5 25.1569 32.5 23.5V17.5C32.5 15.8431 31.1569 14.5 29.5 14.5H27.5ZM43.5 14.5C41.8431 14.5 40.5 15.8431 40.5 17.5V23.5C40.5 25.1569 41.8431 26.5 43.5 26.5H45.5C47.1569 26.5 48.5 25.1569 48.5 23.5V17.5C48.5 15.8431 47.1569 14.5 45.5 14.5H43.5Z" fill="#8b929a" />
                    </svg>
                    <span class="message-content">oh hi, Theo</span>
                </div>
            </div>
        </div>

        <!-- 2 Notification -->
        <div class="steam-notification">
            <div class="avatar">
                <img src="/images/avatar.png" alt="Theo" onerror="this.style.display='none'">
                <div class="online-status"></div>
            </div>
            <div class="content">
                <div class="username">vertopolkaLF</div>
                <div class="message">
                    <svg width="57" height="54" viewBox="0 0 57 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M57 0V40.5H35L28.5 54L22 40.5H0V0H57ZM12.5 14.5C10.8431 14.5 9.5 15.8431 9.5 17.5V23.5C9.5 25.1569 10.8431 26.5 12.5 26.5H14.5C16.1569 26.5 17.5 25.1569 17.5 23.5V17.5C17.5 15.8431 16.1569 14.5 14.5 14.5H12.5ZM27.5 14.5C25.8431 14.5 24.5 15.8431 24.5 17.5V23.5C24.5 25.1569 25.8431 26.5 27.5 26.5H29.5C31.1569 26.5 32.5 25.1569 32.5 23.5V17.5C32.5 15.8431 31.1569 14.5 29.5 14.5H27.5ZM43.5 14.5C41.8431 14.5 40.5 15.8431 40.5 17.5V23.5C40.5 25.1569 41.8431 26.5 43.5 26.5H45.5C47.1569 26.5 48.5 25.1569 48.5 23.5V17.5C48.5 15.8431 47.1569 14.5 45.5 14.5H43.5Z" fill="#8b929a" />
                    </svg>
                    <span class="message-content">i prepared a preset for you</span>
                </div>
            </div>
        </div>


        <!-- 3 Notification -->
        <div class="steam-notification">
            <div class="avatar">
                <img src="/images/avatar.png" alt="Theo" onerror="this.style.display='none'">
                <div class="online-status"></div>
            </div>
            <div class="content">
                <div class="username">vertopolkaLF</div>
                <div class="message">
                    <svg width="57" height="54" viewBox="0 0 57 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M57 0V40.5H35L28.5 54L22 40.5H0V0H57ZM12.5 14.5C10.8431 14.5 9.5 15.8431 9.5 17.5V23.5C9.5 25.1569 10.8431 26.5 12.5 26.5H14.5C16.1569 26.5 17.5 25.1569 17.5 23.5V17.5C17.5 15.8431 16.1569 14.5 14.5 14.5H12.5ZM27.5 14.5C25.8431 14.5 24.5 15.8431 24.5 17.5V23.5C24.5 25.1569 25.8431 26.5 27.5 26.5H29.5C31.1569 26.5 32.5 25.1569 32.5 23.5V17.5C32.5 15.8431 31.1569 14.5 29.5 14.5H27.5ZM43.5 14.5C41.8431 14.5 40.5 15.8431 40.5 17.5V23.5C40.5 25.1569 41.8431 26.5 43.5 26.5H45.5C47.1569 26.5 48.5 25.1569 48.5 23.5V17.5C48.5 15.8431 47.1569 14.5 45.5 14.5H43.5Z" fill="#8b929a" />
                    </svg>
                    <!-- Apply Button -->
                    <button class="message-content apply-preset-btn" @click="applyTheoPreset">
                        Apply Theo Preset
                    </button>
                </div>
            </div>
        </div>


        <!-- Steam Logo -->
        <svg class="steam-logo" width="89" height="89" viewBox="0 0 89 89" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M44.084 0C20.846 0 1.809 17.918 0 40.689L23.71 50.492C25.719 49.118 28.146 48.313 30.757 48.313C30.991 48.313 31.224 48.321 31.455 48.334L41.999 33.051C41.999 32.978 41.998 32.907 41.998 32.835C41.998 23.636 49.481 16.152 58.681 16.152C67.88 16.152 75.363 23.636 75.363 32.835C75.363 42.034 67.88 49.519 58.681 49.519C58.554 49.519 58.428 49.516 58.302 49.513L43.264 60.243C43.272 60.438 43.279 60.637 43.279 60.835C43.279 67.741 37.662 73.357 30.757 73.357C24.696 73.357 19.628 69.031 18.48 63.302L1.524 56.292C6.774 74.86 23.833 88.473 44.084 88.473C68.516 88.473 88.321 68.667 88.321 44.238C88.321 19.805 68.515 0 44.084 0Z" fill="#C5C3C0" />
            <path d="M27.7211 67.122L22.2871 64.877C23.2501 66.882 24.9161 68.561 27.1281 69.483C31.9101 71.475 37.4231 69.206 39.4161 64.42C40.3811 62.106 40.3871 59.551 39.4301 57.231C38.4751 54.91 36.6731 53.1 34.3561 52.134C32.0571 51.177 29.5941 51.212 27.4301 52.029L33.0431 54.35C36.5701 55.82 38.2381 59.87 36.7681 63.397C35.3011 66.925 31.2481 68.593 27.7211 67.122Z" fill="#C5C3C0" />
            <path d="M69.796 32.835C69.796 26.706 64.81 21.719 58.68 21.719C52.551 21.719 47.564 26.706 47.564 32.835C47.564 38.965 52.551 43.95 58.68 43.95C64.81 43.949 69.796 38.964 69.796 32.835ZM50.348 32.816C50.348 28.204 54.087 24.466 58.699 24.466C63.311 24.466 67.05 28.204 67.05 32.816C67.05 37.428 63.311 41.166 58.699 41.166C54.087 41.166 50.348 37.427 50.348 32.816Z" fill="#C5C3C0" />
        </svg>

    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { applyPresetToLocalStorage } from '../presets'

const isVisible = ref(false)
const animationStep = ref(0) // 0: hidden, 1: first message, 2: second message, 3: third message with button

let timeoutIds: number[] = []

// Computed class for container animation
const containerClass = computed(() => {
    if (!isVisible.value) return ''
    switch (animationStep.value) {
        case 1: return 'step-1'
        case 2: return 'step-2'
        case 3: return 'step-3'
        default: return ''
    }
})

onMounted(() => {
    // Check for ?theo parameter
    if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.has('theo')) {
            isVisible.value = true

            // Start the timing sequence - move container in 3 steps
            // 5s delay for component to become visible (first step)
            const step1Timeout = window.setTimeout(() => {
                animationStep.value = 1
                playMessageSound()
            }, 4000)

            // 2s after first step (7s total) - second step
            const step2Timeout = window.setTimeout(() => {
                animationStep.value = 2
                playMessageSound()
            }, 7000)

            // 2s after second step (9s total) - third step with button
            const step3Timeout = window.setTimeout(() => {
                animationStep.value = 3
                playMessageSound()
            }, 11000)

            timeoutIds = [step1Timeout, step2Timeout, step3Timeout]
        }
    }
})

onBeforeUnmount(() => {
    // Clear all timeouts on unmount
    timeoutIds.forEach(id => clearTimeout(id))
    timeoutIds = []
})

function playMessageSound() {
    if (typeof window !== 'undefined') {
        try {
            const audio = new Audio('/sounds/msg.mp3')
            audio.volume = 0.5 // Set volume to 50%
            audio.play().catch(err => {
                console.log('Audio play failed:', err)
                // Silently fail if audio can't play (browser restrictions, etc.)
            })
        } catch (err) {
            console.log('Audio creation failed:', err)
        }
    }
}

function applyTheoPreset() {
    const success = applyPresetToLocalStorage('theo')
    if (success && typeof window !== 'undefined') {
        // Remove the ?theo parameter and reload to apply the preset
        const url = new URL(window.location.href)
        url.searchParams.delete('theo')
        window.location.href = url.toString()
    }
}
</script>

<style scoped>
.steam-notification-container {
    position: fixed;
    bottom: 0px;
    right: 0px;
    z-index: 1000001;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0px;
    pointer-events: none;
    overflow: hidden;
    transform: translateY(213px);
    transition: transform 0.3s;
}

.steam-notification-container.step-1 {
    transform: translateY(142px);
}

.steam-notification-container.step-2 {
    transform: translateY(71px);
}

.steam-notification-container.step-3 {
    transform: translateY(0px);
}

.steam-notification-container.step-4 {
    transform: translateY(-71px);
}

.steam-notification {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 13px;
    padding: 13px 10px;
    background: linear-gradient(180deg, #1b1f27, #0e141b);
    width: 283px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    pointer-events: auto;
}

.avatar {
    display: flex;
    flex-direction: row;
    align-items: center;
    flex-shrink: 0;
}

.avatar img {
    width: 45px;
    height: 45px;
    object-fit: cover;
    background: #2a2e37;
}

.online-status {
    width: 3px;
    height: 45px;
    background: #4cb4ff;
    border-radius: 2px;
    margin-left: 2px;
}

.content {
    display: flex;
    flex-direction: column;
    gap: 5px;
    flex: 1;
    min-width: 0;
}

.username {
    font-size: 12px;
    font-weight: 400;
    color: #ffffff;
    line-height: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: "Noto Sans";
}

.message {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 6px;
    font-family: "Noto Sans";
}

.message-content {
    font-size: 12px;
    font-weight: 400;
    color: #b5b9bd;
    line-height: 1;
    margin-bottom: 1px;
    word-break: break-word;
}

.message svg {
    width: 11px;
    height: 11px;
    flex-shrink: 0;
    margin-top: 1px;
    fill: #8b929a;
}

.steam-logo {
    position: absolute;
    top: -63px;
    right: -70px;
    height: 200px;
    width: 200px;
    opacity: 0.04;
    transition: top 0.2s ease-in-out;
    z-index: 1000;
    pointer-events: none;
}

.steam-notification-container.step-2 .steam-logo {
    top: 7px;
}

.steam-notification-container.step-3 .steam-logo {
    top: 7px;
}

.apply-preset-btn {
    background: linear-gradient(180deg, #1b1f27, #0e141b);
    color: #4cb4ff;
    border: none;
    font-size: 12px;
    padding: 0;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.2s ease;
    pointer-events: auto;
    text-transform: lowercase;
    font-family: inherit;
}

.apply-preset-btn:hover {
    color: #9dd3fa;
}

/* Dark mode adjustments for Steam theme */
.dark-mode .steam-notification {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.dark-mode .apply-preset-btn {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}
</style>
