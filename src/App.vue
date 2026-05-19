<script setup lang="ts">
import { onMounted }      from 'vue'
import { useUnitsStore }  from '@/stores/unitsStore'
import ToastContainer     from '@/components/ui/ToastContainer.vue'

// O'lchov birliklarini bir marta yuklaydi (cached)
onMounted(() => useUnitsStore().load())
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
