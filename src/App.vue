<script setup lang="ts">
import { onMounted }      from 'vue'
import { useUnitsStore }  from '@/stores/unitsStore'
import { useThemeStore }  from '@/stores/themeStore'
import ToastContainer     from '@/components/ui/ToastContainer.vue'

// Mavzuni ilk boshlanishda qo'llaydi (localStorage dan o'qib data-theme ni o'rnatadi)
useThemeStore()

// O'lchov birliklarini bir marta yuklaydi (cached)
onMounted(() => useUnitsStore().load())
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>
