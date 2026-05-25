<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useUnitsStore }  from '@/stores/unitsStore'
import { useThemeStore }  from '@/stores/themeStore'
import { useToast }       from '@/composables/useToast'
import ToastContainer     from '@/components/ui/ToastContainer.vue'

useThemeStore()

const toast = useToast()

function onForbidden() {
  toast.error('Bu amalni bajarish uchun sizda yetarli huquq yo\'q')
}

onMounted(() => {
  useUnitsStore().load()
  window.addEventListener('api:forbidden', onForbidden)
})

onUnmounted(() => {
  window.removeEventListener('api:forbidden', onForbidden)
})
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
