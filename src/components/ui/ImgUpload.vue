<script setup>
import { ref, watch } from 'vue'
import { uploadApi } from '@/api/upload'
import { useToast }  from '@/composables/useToast'
import { resolveImageUrl } from '@/utils/imageUrl'

const props = defineProps({
  modelValue: { type: String, default: '' },
  label:      { type: String, default: 'Rasm' },
  placeholder:{ type: String, default: 'Rasm yuklash uchun bosing' },
  accept:     { type: String, default: 'image/jpeg,image/png,image/webp,image/gif' },
  size:       { type: String, default: 'md' }, // 'sm' | 'md'
})
const emit = defineEmits(['update:modelValue'])
const toast = useToast()

const fileRef    = ref(null)
const uploading  = ref(false)
const previewErr = ref(false)

watch(() => props.modelValue, () => { previewErr.value = false })

async function onFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploading.value  = true
  previewErr.value = false
  try {
    const res = await uploadApi.image(file)
    const url = res.data?.data?.url ?? res.data?.url ?? ''
    emit('update:modelValue', url)
    toast.success('Rasm yuklandi!')
  } catch {
    toast.error("Rasm yuklanmadi, qayta urining")
  } finally {
    uploading.value = false
    e.target.value  = ''
  }
}

function clear() { emit('update:modelValue', '') }
</script>

<template>
  <div class="iu-wrap" :class="`iu-${size}`">
    <input ref="fileRef" type="file" :accept="accept" style="display:none" @change="onFile" />

    <!-- Preview -->
    <div v-if="modelValue && !previewErr" class="iu-preview" @click="fileRef?.click()">
      <img :src="resolveImageUrl(modelValue)" @error="previewErr = true" />
      <div class="iu-overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
        <span>Almashtirish</span>
      </div>
      <button class="iu-clear" @click.stop="clear" title="O'chirish">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Upload area -->
    <div v-else class="iu-empty" :class="{ 'iu-loading': uploading }" @click="!uploading && fileRef?.click()">
      <span v-if="uploading" class="iu-spin" />
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
      </svg>
      <span class="iu-hint">{{ uploading ? 'Yuklanmoqda...' : placeholder }}</span>
    </div>
  </div>
</template>

<style scoped>
.iu-wrap { width: 100%; }

/* Sizes */
.iu-md .iu-preview,
.iu-md .iu-empty  { height: 120px; border-radius: 12px; }

.iu-sm .iu-preview,
.iu-sm .iu-empty  { height: 72px; border-radius: 10px; }

/* Empty / upload state */
.iu-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  background: rgba(255,255,255,0.04);
  border: 2px dashed rgba(255,255,255,0.1);
  color: #475569; cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.iu-empty:not(.iu-loading):hover {
  border-color: rgba(216,90,48,0.45);
  background: rgba(216,90,48,0.05);
  color: #E8713E;
}
.iu-empty svg { width: 28px; height: 28px; }
.iu-sm .iu-empty svg { width: 22px; height: 22px; }
.iu-hint { font-size: 12px; font-weight: 600; text-align: center; line-height: 1.3; }
.iu-loading { cursor: default; }

/* Spinner */
.iu-spin {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2.5px solid rgba(255,255,255,0.1);
  border-top-color: #E8713E;
  animation: spin 0.7s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Preview */
.iu-preview {
  position: relative; overflow: hidden; cursor: pointer;
  background: rgba(0,0,0,0.2);
}
.iu-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }

.iu-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  color: white; font-size: 12px; font-weight: 700;
  opacity: 0; transition: opacity 0.2s;
}
.iu-preview:hover .iu-overlay { opacity: 1; }
.iu-overlay svg { width: 22px; height: 22px; }

.iu-clear {
  position: absolute; top: 6px; right: 6px;
  width: 24px; height: 24px; border-radius: 6px;
  background: rgba(0,0,0,0.6); border: none;
  color: white; cursor: pointer; display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.iu-preview:hover .iu-clear { opacity: 1; }
.iu-clear:hover { background: rgba(239,68,68,0.8); }
.iu-clear svg { width: 12px; height: 12px; }
</style>
