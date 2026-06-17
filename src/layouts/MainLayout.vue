<script setup>
import { onMounted }              from 'vue'
import NavBar                     from '@/components/ui/NavBar.vue'
import BottomNav                  from '@/components/ui/BottomNav.vue'
import { useFavoritesStore }      from '@/stores/favoritesStore'
import { useAuthStore }           from '@/stores/authStore'

const auth      = useAuthStore()
const favorites = useFavoritesStore()

onMounted(() => {
  if (auth.isAuthenticated && !favorites.loaded) {
    favorites.loadIds()
  }
})
</script>

<template>
  <div class="layout">
    <NavBar />

    <main class="layout-content">
      <div class="layout-inner">
        <RouterView v-slot="{ Component, route }">
          <keep-alive :include="['MealPlans']">
            <component :is="Component" :key="route.name" />
          </keep-alive>
        </RouterView>
      </div>
    </main>

    <BottomNav class="bottom-mobile" />

    <footer class="app-footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span class="footer-logo">👨‍🍳</span>
          <span class="footer-name">OshPaz</span>
        </div>

        <nav class="footer-links">
          <RouterLink :to="auth.isAuthenticated ? '/app' : '/'" class="footer-link">Asosiy sahifa</RouterLink>
          <RouterLink to="/app/contact" class="footer-link">Bog'lanish</RouterLink>
          <RouterLink to="/app/about"   class="footer-link">Biz haqimizda</RouterLink>
          <RouterLink to="/app/privacy" class="footer-link">Maxfiylik</RouterLink>
          <RouterLink to="/app/terms"   class="footer-link">Shartlar</RouterLink>
        </nav>

        <p class="footer-copy">© {{ new Date().getFullYear() }} OshPaz. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--bg-base);
  display: flex;
  flex-direction: column;
}

.layout-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.layout-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 32px 40px;
}

.bottom-mobile { display: none; }

/* ── Footer ─────────────────────────────────────────────────── */
.app-footer {
  border-top: 1px solid var(--bd);
  background: var(--bg-card);
  padding: 20px 32px;
  margin-top: auto;
}

.footer-inner {
  max-width: 1280px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
  flex-shrink: 0;
}
.footer-logo { font-size: 18px; line-height: 1; }
.footer-name {
  font-size: 14px;
  font-weight: 900;
  color: var(--tx-2);
  letter-spacing: -0.2px;
}

.footer-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.footer-link {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx-5);
  text-decoration: none;
  transition: color 0.15s, background 0.15s;
}
.footer-link:hover {
  color: #E8713E;
  background: rgba(216,90,48,0.08);
}

.footer-copy {
  margin: 0 0 0 auto;
  font-size: 11px;
  color: var(--tx-6);
  white-space: nowrap;
}

@media (max-width: 1023px) {
  .layout-inner  { padding: 20px 16px 90px; }
  .bottom-mobile { display: flex; }
  .app-footer    { display: none; }
}

@media (max-width: 480px) {
  .layout-inner { padding: 16px 12px 88px; }
}
</style>
