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
        <RouterView />
      </div>
    </main>

    <BottomNav class="bottom-mobile" />
  </div>
</template>

<style scoped>
.layout {
  min-height: 100vh;
  background: #0f172a;
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
  max-width: 1280px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 32px 40px;
}

.bottom-mobile { display: none; }

@media (max-width: 1023px) {
  .layout-inner  { padding: 20px 16px 90px; }
  .bottom-mobile { display: flex; }
}

@media (max-width: 480px) {
  .layout-inner { padding: 16px 12px 88px; }
}
</style>
