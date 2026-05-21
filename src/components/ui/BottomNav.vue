<script setup>
import { computed }          from 'vue'
import { useRoute }          from 'vue-router'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { useLangStore }      from '@/stores/langStore'

const route     = useRoute()
const favorites = useFavoritesStore()
const lang      = useLangStore()

const nav = computed(() => {
  void lang.lang  // lang o'zgarganda qayta hisoblansin
  return [
    { icon: 'home',     label: lang.t('nav.home'),      to: '/app' },
    { icon: 'recipes',  label: lang.t('nav.recipes'),   to: '/app/recipes' },
    { icon: 'heart',    label: lang.t('nav.saved'),     to: '/app/saved' },
    { icon: 'calendar', label: lang.t('nav.meal_plan'), to: '/app/meal-plans' },
    { icon: 'cart',     label: lang.t('nav.shopping'),  to: '/app/shopping-lists' },
  ]
})

const isActive = (to) =>
  to === '/app' ? route.path === '/app' : route.path.startsWith(to)
</script>

<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in nav"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      :class="{ 'nav-active': isActive(item.to) }"
    >
      <span class="nav-icon">
        <!-- Home -->
        <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
        </svg>
        <!-- Recipes -->
        <svg v-else-if="item.icon === 'recipes'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <!-- Heart (Saved) — filled when active or has favorites -->
        <svg v-else-if="item.icon === 'heart'" viewBox="0 0 24 24"
          :fill="isActive(item.to) || favorites.count > 0 ? 'currentColor' : 'none'"
          stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
        </svg>
        <!-- Calendar -->
        <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="3" y1="10" x2="21" y2="10" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <!-- Cart -->
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
        </svg>
      </span>
      <span class="nav-label">{{ item.label }}</span>

      <!-- Favorites count badge -->
      <span v-if="item.icon === 'heart' && favorites.count > 0 && !isActive(item.to)" class="fav-badge">
        {{ favorites.count > 99 ? '99+' : favorites.count }}
      </span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 68px;
  background: var(--bg-surface);
  border-top: 1px solid var(--bd);
  display: flex;
  align-items: stretch;
  z-index: 20;
  padding: 0 4px;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  text-decoration: none;
  color: var(--tx-6);
  border-radius: 12px;
  transition: color 0.2s, background 0.2s;
  margin: 6px 2px;
  position: relative;
}
.nav-item:hover { color: var(--tx-4); }

.nav-active { color: #E8713E; background: rgba(216, 90, 48, 0.1); }

.nav-icon { display: flex; align-items: center; justify-content: center; }
.nav-icon svg { width: 22px; height: 22px; }

.nav-label {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

/* Favorites badge */
.fav-badge {
  position: absolute;
  top: 4px;
  right: 6px;
  background: #ef4444;
  color: #fff;
  font-size: 8px;
  font-weight: 800;
  min-width: 14px;
  height: 14px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  line-height: 1;
}
</style>
