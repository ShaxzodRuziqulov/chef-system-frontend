<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import SideNav from '@/components/ui/SideNav.vue'
import TopBar  from '@/components/ui/TopBar.vue'
import BottomNav from '@/components/ui/BottomNav.vue'

const route  = useRouter()
const sidebarOpen = ref(false)
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex">
    <!-- Sidebar (desktop) -->
    <SideNav :open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- Main content -->
    <div class="flex-1 flex flex-col min-w-0 lg:ml-64">
      <!-- Top bar -->
      <TopBar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- Page content -->
      <main class="flex-1 p-4 md:p-6 pb-20 lg:pb-6">
        <RouterView />
      </main>
    </div>

    <!-- Bottom nav (mobile) -->
    <BottomNav class="lg:hidden" />
  </div>
</template>
