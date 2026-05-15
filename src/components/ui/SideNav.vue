<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useLangStore } from '@/stores/langStore'

defineProps({ open: Boolean })
defineEmits(['close'])

const route = useRoute()
const auth  = useAuthStore()
const lang  = useLangStore()

const nav = computed(() => [
  { name: lang.t('nav.home'),      icon: 'home',     to: '/' },
  { name: lang.t('nav.recipes'),   icon: 'recipes',  to: '/recipes' },
  { name: lang.t('nav.meal_plan'), icon: 'calendar', to: '/meal-plans' },
  { name: lang.t('nav.shopping'),  icon: 'cart',     to: '/shopping-lists' },
  { name: lang.t('nav.profile'),   icon: 'user',     to: '/profile' },
])

const isActive = (to) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)
</script>

<template>
  <!-- Mobile Overlay -->
  <Transition name="fade">
    <div v-if="open" class="overlay" @click="$emit('close')" />
  </Transition>

  <!-- Sidebar -->
  <aside class="sidebar" :class="{ 'sidebar-open': open }">
    <!-- Logo -->
    <div class="sidebar-logo">
      <div class="logo-icon">👨‍🍳</div>
      <div class="logo-text">
        <span class="logo-name">OshPaz</span>
        <span class="logo-sub">Premium</span>
      </div>
    </div>

    <!-- Nav -->
    <nav class="sidebar-nav">
      <RouterLink
        v-for="item in nav"
        :key="item.to"
        :to="item.to"
        class="nav-item"
        :class="{ 'nav-item-active': isActive(item.to) }"
        @click="$emit('close')"
      >
        <!-- Icons -->
        <span class="nav-icon">
          <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <svg v-else-if="item.icon === 'recipes'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="2" x2="16" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2" stroke-linecap="round"/></svg>
          <svg v-else-if="item.icon === 'cart'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
        </span>
        <span class="nav-label">{{ item.name }}</span>
        <span v-if="isActive(item.to)" class="nav-dot"></span>
      </RouterLink>
    </nav>

    <!-- User info + Logout -->
    <div class="sidebar-footer">
      <div v-if="auth.isAuthenticated" class="user-block">
        <div class="user-avatar">
          <span>{{ auth.initials || '?' }}</span>
        </div>
        <div class="user-info">
          <span class="user-name">{{ auth.displayName }}</span>
          <span class="user-role">{{ auth.role }}</span>
        </div>
      </div>
      <button class="logout-btn" @click="auth.logout()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
        {{ lang.t('nav.logout') }}
      </button>
    </div>
  </aside>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 20;
  backdrop-filter: blur(4px);
}

.sidebar {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: 260px;
  background: #0d1526;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  z-index: 30;
  transform: translateX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (max-width: 1023px) {
  .sidebar { transform: translateX(-100%); }
  .sidebar-open { transform: translateX(0); }
}

/* Logo */
.sidebar-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}
.logo-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  flex-shrink: 0;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.3);
}
.logo-text { display: flex; flex-direction: column; }
.logo-name { font-size: 15px; font-weight: 800; color: #f1f5f9; }
.logo-sub  { font-size: 10px; font-weight: 700; color: #E8713E; letter-spacing: 0.1em; text-transform: uppercase; }

/* Nav */
.sidebar-nav {
  flex: 1;
  padding: 12px 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  text-decoration: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s, color 0.2s;
  position: relative;
}
.nav-item:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #cbd5e1;
}
.nav-item-active {
  background: rgba(216, 90, 48, 0.12);
  color: #E8713E;
}
.nav-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-icon svg { width: 20px; height: 20px; }
.nav-label { flex: 1; }
.nav-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #E8713E;
  flex-shrink: 0;
}

/* Footer */
.sidebar-footer {
  padding: 12px 10px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.user-block {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 800;
  color: white;
  flex-shrink: 0;
}
.user-info { display: flex; flex-direction: column; min-width: 0; }
.user-name { font-size: 13px; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-role { font-size: 10px; font-weight: 600; color: #E8713E; text-transform: uppercase; letter-spacing: 0.08em; }

.logout-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: none;
  border-radius: 12px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.logout-btn:hover { background: rgba(239, 68, 68, 0.1); }
.logout-btn svg { width: 18px; height: 18px; flex-shrink: 0; }

/* Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
