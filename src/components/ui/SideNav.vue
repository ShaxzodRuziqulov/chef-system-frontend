<script setup>
import { useRoute } from 'vue-router'

defineProps({ open: Boolean })
defineEmits(['close'])

const route = useRoute()

const nav = [
  { name: 'Asosiy',       icon: '🏠', to: '/' },
  { name: 'Retseptlar',   icon: '🍽️', to: '/recipes' },
  { name: 'Haftalik reja',icon: '📅', to: '/meal-plans' },
  { name: 'Xarid ro\'yxati', icon: '🛒', to: '/shopping-lists' },
  { name: 'Profil',       icon: '👤', to: '/profile' },
]

const isLoggedIn = () => !!localStorage.getItem('access_token')

function logout() {
  localStorage.clear()
  window.location.href = '/login'
}
</script>

<template>
  <!-- Overlay (mobile) -->
  <Transition name="fade">
    <div v-if="open" class="fixed inset-0 bg-black/40 z-20 lg:hidden" @click="$emit('close')" />
  </Transition>

  <!-- Sidebar -->
  <aside
    class="fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-100 z-30
           flex flex-col shadow-xl lg:shadow-none
           transition-transform duration-300"
    :class="open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
  >
    <!-- Logo -->
    <div class="h-16 flex items-center gap-3 px-6 border-b border-slate-100">
      <div class="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center text-white text-lg">
        🍳
      </div>
      <span class="font-bold text-lg text-slate-800">Oshpaz</span>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 py-4 px-3 space-y-1">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        @click="$emit('close')"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
               text-slate-600 hover:bg-primary-50 hover:text-primary-700
               transition-colors"
        :class="{
          'bg-primary-50 text-primary-700 font-semibold':
            item.to === '/' ? $route.path === '/' : $route.path.startsWith(item.to)
        }"
      >
        <span class="text-xl leading-none">{{ item.icon }}</span>
        {{ item.name }}
      </RouterLink>
    </nav>

    <!-- User / Auth -->
    <div class="p-4 border-t border-slate-100">
      <template v-if="isLoggedIn()">
        <button
          @click="logout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                 font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <span class="text-xl">🚪</span>
          Chiqish
        </button>
      </template>
      <template v-else>
        <RouterLink
          to="/login"
          class="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
                 bg-primary-600 text-white text-sm font-semibold
                 hover:bg-primary-700 transition-colors"
        >
          Kirish
        </RouterLink>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s; }
.fade-enter-from, .fade-leave-to       { opacity: 0; }
</style>
