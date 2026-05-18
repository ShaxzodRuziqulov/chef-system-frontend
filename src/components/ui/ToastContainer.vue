<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts, remove } = useToast()

const icons: Record<string, string> = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`,
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-wrap">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="toast"
          :class="`toast-${t.type}`"
        >
          <span class="toast-icon" v-html="icons[t.type]" />
          <span class="toast-msg">{{ t.message }}</span>
          <button class="toast-close" @click="remove(t.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-wrap {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.toast {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
  max-width: 400px;
  padding: 13px 14px;
  border-radius: 14px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  backdrop-filter: blur(8px);
  pointer-events: all;
}

.toast-success {
  background: rgba(20, 83, 45, 0.95);
  border-color: rgba(74, 222, 128, 0.25);
  color: #86efac;
}
.toast-error {
  background: rgba(69, 10, 10, 0.95);
  border-color: rgba(239, 68, 68, 0.25);
  color: #fca5a5;
}
.toast-warning {
  background: rgba(69, 45, 5, 0.95);
  border-color: rgba(245, 158, 11, 0.25);
  color: #fde68a;
}
.toast-info {
  background: rgba(15, 23, 60, 0.95);
  border-color: rgba(59, 130, 246, 0.25);
  color: #93c5fd;
}

.toast-icon {
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.toast-icon :deep(svg) { width: 18px; height: 18px; }

.toast-msg { flex: 1; }

.toast-close {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  background: none;
  border: none;
  cursor: pointer;
  opacity: 0.5;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.15s;
  color: inherit;
}
.toast-close:hover { opacity: 1; }
.toast-close svg { width: 14px; height: 14px; }

/* Transition */
.toast-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from  { opacity: 0; transform: translateX(60px) scale(0.95); }
.toast-leave-to    { opacity: 0; transform: translateX(60px) scale(0.95); }
.toast-move        { transition: transform 0.3s ease; }
</style>
