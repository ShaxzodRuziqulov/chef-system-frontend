<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineEmits(['toggle-sidebar'])

const router = useRouter()
const query  = ref('')

function search() {
  if (query.value.trim()) {
    router.push({ path: '/recipes', query: { keyword: query.value.trim() } })
    query.value = ''
  }
}
</script>

<template>
  <header class="h-16 bg-white border-b border-slate-100 flex items-center gap-4 px-4 md:px-6 sticky top-0 z-10">
    <!-- Burger (mobile) -->
    <button
      class="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
      @click="$emit('toggle-sidebar')"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <!-- Search -->
    <form @submit.prevent="search" class="flex-1 max-w-md">
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
          </svg>
        </span>
        <input
          v-model="query"
          type="text"
          placeholder="Retsept qidirish..."
          class="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-slate-50
                 text-sm text-slate-700 placeholder-slate-400
                 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </form>

    <!-- Auth button (desktop) -->
    <div class="hidden md:block ml-auto">
      <RouterLink
        v-if="!$route.meta.auth || !localStorage?.getItem?.('access_token')"
        to="/login"
        class="px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-semibold
               hover:bg-primary-700 transition-colors"
      >
        Kirish
      </RouterLink>
    </div>
  </header>
</template>
