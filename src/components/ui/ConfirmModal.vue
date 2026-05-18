<script setup lang="ts">
defineProps<{
  show: boolean
  message: string
  confirmLabel?: string
  danger?: boolean
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="overlay" @click.self="emit('cancel')">
        <div class="box" role="dialog" aria-modal="true">
          <div class="icon" :class="danger ? 'icon-danger' : 'icon-warn'">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            </svg>
          </div>
          <p class="msg">{{ message }}</p>
          <div class="actions">
            <button class="btn-cancel" @click="emit('cancel')">Bekor qilish</button>
            <button class="btn-confirm" :class="danger ? 'btn-danger' : 'btn-ok'" @click="emit('confirm')">
              {{ confirmLabel ?? "Ha, davom etish" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(4px);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.box {
  background: #111827;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 28px 24px 24px;
  max-width: 360px;
  width: 100%;
  text-align: center;
  box-shadow: 0 40px 80px rgba(0,0,0,0.5);
}

.icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
}
.icon svg { width: 26px; height: 26px; }
.icon-danger { background: rgba(239,68,68,0.12); color: #ef4444; }
.icon-warn   { background: rgba(245,158,11,0.12); color: #f59e0b; }

.msg {
  font-size: 14px;
  font-weight: 600;
  color: #cbd5e1;
  line-height: 1.5;
  margin-bottom: 24px;
}

.actions {
  display: flex;
  gap: 10px;
}
.actions > * { flex: 1; }

.btn-cancel {
  padding: 11px 16px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-cancel:hover { background: rgba(255,255,255,0.1); }

.btn-confirm {
  padding: 11px 16px;
  border: none;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn-danger { background: #ef4444; color: #fff; }
.btn-danger:hover { opacity: 0.88; }
.btn-ok     { background: linear-gradient(135deg, #D85A30, #E8713E); color: #fff; }
.btn-ok:hover { opacity: 0.88; }

.modal-fade-enter-active { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.15s ease; }
.modal-fade-enter-from  { opacity: 0; transform: scale(0.93); }
.modal-fade-leave-to    { opacity: 0; transform: scale(0.97); }
</style>
