<script setup>
import { ref, watch, computed } from 'vue'
import { uploadApi, UploadError } from '@/api/upload'
import { useToast }              from '@/composables/useToast'
import { resolveImageUrl }       from '@/utils/imageUrl'

const props = defineProps({
  modelValue:  { type: String,  default: '' },
  placeholder: { type: String,  default: 'Rasm tanlash uchun bosing' },
  accept:      { type: String,  default: 'image/jpeg,image/png,image/webp,image/gif' },
  size:        { type: String,  default: 'md' }, // 'sm' | 'md'
  disabled:    { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const toast = useToast()

const fileRef   = ref(null)
const uploading = ref(false)
const progress  = ref(0)
const imgError  = ref(false)
const dragging  = ref(false)

// URL o'zgarganda xato holatini tozala
watch(() => props.modelValue, () => { imgError.value = false })

const resolvedUrl = computed(() => resolveImageUrl(props.modelValue))
const hasImage    = computed(() => !!props.modelValue && !imgError.value)

// ── Fayl yuklash ────────────────────────────────────────────────────

async function upload(file) {
  if (!file || props.disabled) return
  uploading.value = true
  progress.value  = 0
  imgError.value  = false
  try {
    const res = await uploadApi.image(file, (pct) => { progress.value = pct })
    const url = res.data?.data?.url ?? res.data?.url ?? ''
    emit('update:modelValue', url)
    toast.success('Rasm yuklandi!')
  } catch (err) {
    const msg = err instanceof UploadError
      ? err.message
      : (err?.response?.data?.message ?? 'Rasm yuklanmadi. Qayta urining.')
    toast.error(msg)
  } finally {
    uploading.value = false
    progress.value  = 0
  }
}

function onFileInput(e) {
  const file = e.target.files?.[0]
  if (file) upload(file)
  e.target.value = ''
}

// ── Drag & drop ─────────────────────────────────────────────────────

function onDragOver(e) {
  e.preventDefault()
  if (!props.disabled) dragging.value = true
}
function onDragLeave() { dragging.value = false }
function onDrop(e) {
  e.preventDefault()
  dragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) upload(file)
}

// ── Boshqa ──────────────────────────────────────────────────────────

function clear(e) {
  e.stopPropagation()
  emit('update:modelValue', '')
  imgError.value = false
}

function openPicker() {
  if (!uploading.value && !props.disabled) fileRef.value?.click()
}
</script>

<template>
  <div class="iu" :class="[`iu-${size}`, { 'iu-disabled': disabled }]">
    <input ref="fileRef" type="file" :accept="accept" class="iu-hidden" @change="onFileInput" />

    <!-- ── Preview ── -->
    <div
      v-if="hasImage"
      class="iu-preview"
      @click="openPicker"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <img :src="resolvedUrl" @error="imgError = true" />

      <!-- Hover overlay -->
      <div class="iu-overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>Almashtirish</span>
      </div>

      <!-- Clear button -->
      <button class="iu-clear" :title="`O'chirish`" @click="clear">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>

      <!-- Upload progress overlay (almashtirish paytida) -->
      <div v-if="uploading" class="iu-progress-overlay">
        <div class="iu-progress-ring">
          <svg viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="#E8713E" stroke-width="3"
              stroke-dasharray="94.25" :stroke-dashoffset="94.25 * (1 - progress / 100)"
              stroke-linecap="round" transform="rotate(-90 18 18)"/>
          </svg>
          <span>{{ progress }}%</span>
        </div>
      </div>
    </div>

    <!-- ── Upload zone ── -->
    <div
      v-else
      class="iu-zone"
      :class="{ 'iu-dragging': dragging, 'iu-loading': uploading }"
      @click="openPicker"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDrop"
    >
      <!-- Uploading state -->
      <template v-if="uploading">
        <div class="iu-bar-wrap">
          <div class="iu-bar" :style="{ width: progress + '%' }" />
        </div>
        <span class="iu-hint">Yuklanmoqda... {{ progress }}%</span>
      </template>

      <!-- Drag active -->
      <template v-else-if="dragging">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="iu-icon iu-icon-drag">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
        </svg>
        <span class="iu-hint">Tashlang!</span>
      </template>

      <!-- Idle -->
      <template v-else>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="iu-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span class="iu-hint">{{ placeholder }}</span>
        <span class="iu-sub">JPEG, PNG, WEBP · maks 5 MB</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.iu { width: 100%; position: relative; }
.iu-hidden { display: none; }
.iu-disabled { opacity: 0.5; pointer-events: none; }

/* ── Sizes ── */
.iu-md .iu-preview,
.iu-md .iu-zone { height: 88px; border-radius: 10px; }

.iu-sm .iu-preview,
.iu-sm .iu-zone { height: 56px; border-radius: 8px; }

/* ── Upload zone ── */
.iu-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  background: var(--bg-input);
  border: 1.5px dashed var(--bd-xl);
  color: var(--tx-5);
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s, color 0.2s;
  padding: 6px;
}
.iu-zone:not(.iu-loading):not(.iu-dragging):hover {
  border-color: rgba(216, 90, 48, 0.5);
  background: rgba(216, 90, 48, 0.04);
  color: #E8713E;
}
.iu-dragging {
  border-color: #E8713E;
  background: rgba(216, 90, 48, 0.08);
  color: #E8713E;
}
.iu-loading { cursor: default; }

.iu-icon { width: 20px; height: 20px; }
.iu-icon-drag { animation: bounce 0.4s ease infinite alternate; }
@keyframes bounce { to { transform: translateY(-3px); } }

.iu-sm .iu-icon { width: 16px; height: 16px; }
.iu-hint { font-size: 11px; font-weight: 600; text-align: center; line-height: 1.2; }
.iu-sub  { font-size: 9px; opacity: 0.55; }
.iu-sm .iu-hint { font-size: 10px; }
.iu-sm .iu-sub { display: none; }

/* Progress bar (zone da) */
.iu-bar-wrap {
  width: 65%; height: 3px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px; overflow: hidden;
  margin-bottom: 2px;
}
.iu-bar {
  height: 100%;
  background: #E8713E;
  border-radius: 3px;
  transition: width 0.2s;
}

/* ── Preview ── */
.iu-preview {
  position: relative; overflow: hidden; cursor: pointer;
  background: rgba(0,0,0,0.15);
}
.iu-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }

.iu-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: white; font-size: 10px; font-weight: 700;
  opacity: 0; transition: opacity 0.2s;
}
.iu-preview:hover .iu-overlay { opacity: 1; }
.iu-overlay svg { width: 16px; height: 16px; }

.iu-clear {
  position: absolute; top: 4px; right: 4px;
  width: 20px; height: 20px; border-radius: 6px;
  background: rgba(0,0,0,0.6); border: none;
  color: white; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s, background 0.2s;
  z-index: 2;
}
.iu-preview:hover .iu-clear { opacity: 1; }
.iu-clear:hover { background: rgba(239, 68, 68, 0.85); }
.iu-clear svg { width: 10px; height: 10px; }

/* Progress overlay (almashtirish paytida) */
.iu-progress-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
}
.iu-progress-ring {
  position: relative; width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
}
.iu-progress-ring svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.iu-progress-ring span {
  font-size: 9px; font-weight: 700; color: #fff;
  position: relative; z-index: 1;
}
</style>
