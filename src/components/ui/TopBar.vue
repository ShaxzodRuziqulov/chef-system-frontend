<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useLangStore } from '@/stores/langStore'
import LangSwitcher from '@/components/ui/LangSwitcher.vue'

defineEmits(['toggle-sidebar'])

const router = useRouter()
const lang   = useLangStore()
const query  = ref('')

function search() {
  if (query.value.trim()) {
    router.push({ path: '/app/recipes', query: { keyword: query.value.trim() } })
    query.value = ''
  }
}
</script>

<template>
  <header class="topbar">
    <!-- Burger -->
    <button class="burger-btn" @click="$emit('toggle-sidebar')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>

    <!-- Search -->
    <form @submit.prevent="search" class="search-form">
      <div class="search-wrap">
        <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input
          v-model="query"
          type="text"
          :placeholder="lang.t('nav.search_mobile')"
          class="search-input"
        />
      </div>
    </form>

    <!-- Right side -->
    <div class="topbar-right">
      <LangSwitcher />
      <RouterLink to="/profile" class="profile-btn" :title="lang.t('nav.profile')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
        </svg>
      </RouterLink>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  height: 64px;
  background: #0d1526;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.burger-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 8px;
  border-radius: 10px;
  transition: background 0.2s, color 0.2s;
  flex-shrink: 0;
}
.burger-btn:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.burger-btn svg { width: 22px; height: 22px; }

@media (max-width: 1023px) {
  .burger-btn { display: flex; align-items: center; }
}

.search-form { flex: 1; max-width: 440px; }

.search-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 12px;
  padding: 0 14px;
  height: 40px;
  transition: border-color 0.2s, background 0.2s;
}
.search-wrap:focus-within {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(216, 90, 48, 0.5);
}
.search-icon { width: 16px; height: 16px; color: #475569; flex-shrink: 0; }

.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  color: #e2e8f0;
  min-width: 0;
}
.search-input::placeholder { color: #334155; }

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.profile-btn {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.profile-btn:hover { background: rgba(216,90,48,0.12); color: #E8713E; }
.profile-btn svg { width: 18px; height: 18px; }
</style>
