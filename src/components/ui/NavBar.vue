<script setup>
import { ref, computed } from 'vue'
import { useRoute }      from 'vue-router'
import { useAuthStore }  from '@/stores/authStore'
import { useLangStore }  from '@/stores/langStore'

const route    = useRoute()
const auth     = useAuthStore()
const langStore = useLangStore()
const menuOpen = ref(false)

const nav = computed(() => [
  { label: langStore.t('nav.home'),      to: '/app',               icon: 'home'     },
  { label: langStore.t('nav.recipes'),   to: '/app/recipes',       icon: 'book'     },
  { label: 'Sevimlilar',                 to: '/app/saved',         icon: 'heart'    },
  { label: langStore.t('nav.meal_plan'), to: '/app/meal-plans',    icon: 'calendar' },
  { label: langStore.t('nav.shopping'),  to: '/app/shopping-lists', icon: 'cart'   },
])

const isActive = (to) =>
  to === '/app' ? route.path === '/app' : route.path.startsWith(to)

const query  = ref('')
function search() {
  if (query.value.trim()) {
    window.location.href = `/app/recipes?keyword=${encodeURIComponent(query.value.trim())}`
    query.value = ''
    menuOpen.value = false
  }
}

const langs = [
  { code: 'uz', label: "O'Z" },
  { code: 'ru', label: 'РУ'  },
  { code: 'en', label: 'EN'  },
]
</script>

<template>
  <header class="navbar">
    <div class="nb-inner">

      <!-- ── Logo ── -->
      <RouterLink to="/app" class="nb-logo" @click="menuOpen = false">
        <div class="logo-icon">🍳</div>
        <div class="logo-text">
          <span class="logo-name">OshPaz</span>
          <span class="logo-tag">Premium</span>
        </div>
      </RouterLink>

      <!-- ── Desktop nav ── -->
      <nav class="nb-nav">
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nb-link"
          :class="{ 'nb-link-active': isActive(item.to) }"
        >
          <!-- Icon -->
          <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <svg v-else-if="item.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <svg v-else-if="item.icon === 'heart'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/></svg>
          <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2" stroke-linecap="round"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          {{ item.label }}
        </RouterLink>

        <!-- Admin link (only for admins) -->
        <RouterLink v-if="auth.isAdmin" to="/app/admin" class="nb-link nb-link-admin"
          :class="{ 'nb-link-active': route.path.startsWith('/app/admin') }">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
          {{ langStore.t('nav.admin') }}
        </RouterLink>
      </nav>

      <!-- ── Search + Auth (desktop) ── -->
      <div class="nb-right">
        <!-- Search -->
        <form @submit.prevent="search" class="nb-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="query" type="text" :placeholder="langStore.t('nav.search')" />
        </form>

        <!-- Language switcher -->
        <div class="nb-lang">
          <button
            v-for="l in langs"
            :key="l.code"
            class="nb-lang-btn"
            :class="{ 'nb-lang-active': langStore.lang === l.code }"
            @click="langStore.setLang(l.code)"
          >{{ l.label }}</button>
        </div>

        <!-- Auth -->
        <template v-if="auth.isAuthenticated">
          <RouterLink to="/app/profile" class="nb-avatar">
            <img v-if="auth.avatarUrl" :src="auth.avatarUrl" />
            <span v-else>{{ auth.initials }}</span>
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink to="/login" class="nb-btn-login">{{ langStore.t('nav.login') }}</RouterLink>
          <RouterLink to="/register" class="nb-btn-reg">{{ langStore.t('nav.register') }}</RouterLink>
        </template>
      </div>

      <!-- ── Hamburger (mobile) ── -->
      <button class="nb-burger" @click="menuOpen = !menuOpen" :aria-expanded="menuOpen">
        <svg v-if="!menuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>

    <!-- ── Mobile menu ── -->
    <Transition name="menu-drop">
      <div v-if="menuOpen" class="nb-mobile">
        <!-- Mobile search -->
        <form @submit.prevent="search" class="nb-mobile-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="query" type="text" :placeholder="langStore.t('nav.search_mobile')" />
        </form>

        <!-- Mobile language switcher -->
        <div class="nb-mobile-lang">
          <button
            v-for="l in langs"
            :key="l.code"
            class="nb-lang-btn"
            :class="{ 'nb-lang-active': langStore.lang === l.code }"
            @click="langStore.setLang(l.code)"
          >{{ l.label }}</button>
        </div>

        <!-- Nav links -->
        <RouterLink
          v-for="item in nav"
          :key="item.to"
          :to="item.to"
          class="nb-mobile-link"
          :class="{ 'nb-mobile-active': isActive(item.to) }"
          @click="menuOpen = false"
        >
          <svg v-if="item.icon === 'home'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>
          <svg v-else-if="item.icon === 'book'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          <svg v-else-if="item.icon === 'calendar'" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="3" y1="10" x2="21" y2="10" stroke-width="2" stroke-linecap="round"/></svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
          {{ item.label }}
        </RouterLink>

        <RouterLink v-if="auth.isAdmin" to="/app/admin" class="nb-mobile-link nb-mobile-admin" @click="menuOpen = false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3" stroke-width="2"/></svg>
          Admin Panel
        </RouterLink>

        <!-- Auth mobile -->
        <div class="nb-mobile-auth">
          <template v-if="auth.isAuthenticated">
            <RouterLink to="/app/profile" class="nb-mobile-profile" @click="menuOpen = false">
              <div class="nb-mobile-avatar">{{ auth.initials }}</div>
              <div>
                <div class="nb-mobile-uname">{{ auth.displayName }}</div>
                <div class="nb-mobile-urole">{{ auth.role }}</div>
              </div>
            </RouterLink>
            <button @click="auth.logout(); menuOpen = false" class="nb-mobile-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              {{ langStore.t('nav.logout') }}
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="nb-mobile-link" @click="menuOpen = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>
              {{ langStore.t('nav.login') }}
            </RouterLink>
          </template>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* ── Navbar shell ── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #0d1526;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  backdrop-filter: blur(20px);
}

.nb-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 64px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Logo ── */
.nb-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
  margin-right: 8px;
}
.logo-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 4px 12px rgba(216,90,48,0.4);
}
.logo-text  { display: flex; flex-direction: column; line-height: 1; }
.logo-name  { font-size: 16px; font-weight: 900; color: #f1f5f9; letter-spacing: -0.3px; }
.logo-tag   { font-size: 9px; font-weight: 800; color: #E8713E; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px; }

/* ── Desktop nav ── */
.nb-nav {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 1;
}

.nb-link {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  text-decoration: none;
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  transition: background 0.2s, color 0.2s;
  white-space: nowrap;
}
.nb-link svg { width: 15px; height: 15px; flex-shrink: 0; }
.nb-link:hover { background: rgba(255,255,255,0.06); color: #94a3b8; }
.nb-link-active {
  background: rgba(216,90,48,0.12);
  color: #E8713E;
}
.nb-link-admin {
  color: #f59e0b;
}
.nb-link-admin.nb-link-active {
  background: rgba(245,158,11,0.12);
  color: #f59e0b;
}

/* ── Right side ── */
.nb-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  flex-shrink: 0;
}

.nb-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 0 12px;
  height: 36px;
  transition: border-color 0.2s, background 0.2s;
}
.nb-search:focus-within {
  border-color: rgba(216,90,48,0.5);
  background: rgba(255,255,255,0.07);
}
.nb-search svg   { width: 14px; height: 14px; color: #475569; flex-shrink: 0; }
.nb-search input {
  background: none;
  border: none;
  outline: none;
  font-size: 13px;
  color: #e2e8f0;
  width: 150px;
}
.nb-search input::placeholder { color: #334155; }

.nb-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  overflow: hidden;
  text-decoration: none;
  border: 2px solid rgba(216,90,48,0.4);
  transition: border-color 0.2s;
}
.nb-avatar:hover { border-color: #E8713E; }
.nb-avatar img   { width: 100%; height: 100%; object-fit: cover; }

.nb-btn-login {
  padding: 7px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
  color: #94a3b8;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.04);
  transition: all 0.2s;
}
.nb-btn-login:hover { color: #e2e8f0; background: rgba(255,255,255,0.08); }

.nb-btn-reg {
  padding: 7px 14px;
  border-radius: 10px;
  text-decoration: none;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  box-shadow: 0 4px 12px rgba(216,90,48,0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.nb-btn-reg:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(216,90,48,0.4); }

/* ── Language switcher ── */
.nb-lang {
  display: flex;
  align-items: center;
  gap: 2px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 3px;
}
.nb-mobile-lang {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 4px;
}
.nb-lang-btn {
  padding: 4px 9px;
  border-radius: 7px;
  border: none;
  background: none;
  color: #475569;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  letter-spacing: 0.04em;
  transition: background 0.15s, color 0.15s;
}
.nb-lang-btn:hover { color: #94a3b8; background: rgba(255,255,255,0.06); }
.nb-lang-active {
  background: linear-gradient(135deg, #D85A30, #E8713E) !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(216,90,48,0.35);
}

/* ── Hamburger ── */
.nb-burger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s, color 0.2s;
  margin-left: auto;
}
.nb-burger:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.nb-burger svg { width: 22px; height: 22px; }

/* ── Mobile menu ── */
.nb-mobile {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #0d1526;
}

.nb-mobile-search {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;
  margin-bottom: 8px;
  transition: border-color 0.2s;
}
.nb-mobile-search:focus-within { border-color: rgba(216,90,48,0.5); }
.nb-mobile-search svg   { width: 16px; height: 16px; color: #475569; flex-shrink: 0; }
.nb-mobile-search input {
  flex: 1; background: none; border: none; outline: none;
  font-size: 14px; color: #e2e8f0;
}
.nb-mobile-search input::placeholder { color: #334155; }

.nb-mobile-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border-radius: 12px;
  text-decoration: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 700;
  transition: background 0.2s, color 0.2s;
}
.nb-mobile-link svg { width: 18px; height: 18px; flex-shrink: 0; }
.nb-mobile-link:hover  { background: rgba(255,255,255,0.05); color: #94a3b8; }
.nb-mobile-active { background: rgba(216,90,48,0.1); color: #E8713E; }
.nb-mobile-admin  { color: #f59e0b; }

.nb-mobile-auth {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.nb-mobile-profile {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  text-decoration: none;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  transition: background 0.2s;
}
.nb-mobile-profile:hover { background: rgba(255,255,255,0.06); }
.nb-mobile-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 800; color: #fff; flex-shrink: 0;
}
.nb-mobile-uname { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.nb-mobile-urole { font-size: 10px; font-weight: 700; color: #E8713E; text-transform: uppercase; letter-spacing: 0.06em; }

.nb-mobile-logout {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: none;
  border-radius: 12px;
  background: rgba(239,68,68,0.08);
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  width: 100%;
  transition: background 0.2s;
}
.nb-mobile-logout:hover { background: rgba(239,68,68,0.15); }
.nb-mobile-logout svg { width: 16px; height: 16px; flex-shrink: 0; }

/* ── Mobile breakpoints ── */
@media (max-width: 1023px) {
  .nb-nav   { display: none; }
  .nb-right { display: none; }
  .nb-burger { display: flex; align-items: center; }
  .nb-inner { padding: 0 16px; }
}

/* ── Menu dropdown animation ── */
.menu-drop-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.menu-drop-leave-active { transition: all 0.15s ease; }
.menu-drop-enter-from   { opacity: 0; transform: translateY(-8px); }
.menu-drop-leave-to     { opacity: 0; transform: translateY(-4px); }
</style>
