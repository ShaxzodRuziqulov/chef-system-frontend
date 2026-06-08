<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { favoritesApi }          from '@/api/favorites'
import { useFavoritesStore }     from '@/stores/favoritesStore'
import { useLangStore }          from '@/stores/langStore'
import RecipeCard                from '@/components/recipe/RecipeCard.vue'

const lang      = useLangStore()
const favorites = useFavoritesStore()


// ── State ──────────────────────────────────────────────────────────
const recipes   = ref([])
const loading   = ref(false)
const page      = ref(0)
const totalPages = ref(0)
const total     = ref(0)
const PAGE_SIZE = 12

// ── Reaktiv tarjima (til o'zgarganda yangilanadi) ──────────────────
const subText = computed(() => {
  void lang.lang   // explicitly track lang changes → computed re-runs on language switch
  return total.value
    ? `${total.value} ${lang.t('saved.count')}`
    : lang.t('saved.empty')
})

// ── Load ───────────────────────────────────────────────────────────
async function load(p = 0) {
  loading.value = true
  try {
    const res   = await favoritesApi.getAll({ page: p, size: PAGE_SIZE })
    const data  = res.data?.data ?? res.data
    if (p === 0) {
      recipes.value = data?.content ?? []
    } else {
      recipes.value = [...recipes.value, ...(data?.content ?? [])]
    }
    totalPages.value = data?.totalPages  ?? 0
    total.value      = data?.totalElements ?? 0
    page.value       = p
  } catch {
    if (p === 0) recipes.value = []
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (page.value + 1 < totalPages.value) load(page.value + 1)
}

onMounted(() => load(0))

// Sevimlilar o'zgarganda (o'chirilganda) ro'yxatni yangilash
watch(() => favorites.count, (newCount, oldCount) => {
  // Faqat qisqarganda (o'chirilganda) qayta yuklaymiz
  if (newCount < oldCount) load(0)
})
</script>

<template>
  <div class="saved-page">

    <!-- ── Header ─────────────────────────────────────────────── -->
    <div class="page-head">
      <div class="page-title-row">
        <div class="page-icon">❤️</div>
        <div>
          <h1 class="page-title">{{ lang.t('nav.saved') }}</h1>
          <p class="page-sub">{{ subText }}</p>
        </div>
      </div>
    </div>

    <!-- ── Loading skeleton ───────────────────────────────────── -->
    <div v-if="loading && !recipes.length" class="recipe-grid">
      <div v-for="i in 8" :key="i" class="skeleton-card">
        <div class="sk-img" />
        <div class="sk-body">
          <div class="sk-line sk-line-title" />
          <div class="sk-line sk-line-meta" />
        </div>
      </div>
    </div>

    <!-- ── Empty state ────────────────────────────────────────── -->
    <div v-else-if="!loading && !recipes.length" class="empty-state">
      <div class="empty-icon">💔</div>
      <h2 class="empty-title">{{ lang.t('saved.empty_title') }}</h2>
      <p class="empty-sub">{{ lang.t('saved.empty_sub') }}</p>
      <RouterLink to="/app/recipes" class="empty-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        {{ lang.t('saved.browse') }}
      </RouterLink>
    </div>

    <!-- ── Recipe grid ────────────────────────────────────────── -->
    <template v-else>
      <div class="recipe-grid">
        <RecipeCard
          v-for="recipe in recipes"
          :key="recipe.id"
          :recipe="recipe"
        />
      </div>

      <!-- Load more -->
      <div v-if="page + 1 < totalPages" class="load-more-wrap">
        <button class="load-more-btn" :disabled="loading" @click="loadMore">
          <span v-if="loading" class="spin-icon">⏳</span>
          <span v-else>{{ lang.t('saved.load_more') }}</span>
          <span class="load-hint">{{ recipes.length }} / {{ total }}</span>
        </button>
      </div>
    </template>

  </div>
</template>

<style scoped>
.saved-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── Header ── */
.page-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.page-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: rgba(239, 68, 68, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--tx-1);
}
.page-sub {
  font-size: 13px;
  color: var(--tx-5);
  margin-top: 2px;
}

/* ── Grid ── */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

/* ── Skeleton ── */
.skeleton-card {
  border-radius: 20px;
  overflow: hidden;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.sk-img {
  aspect-ratio: 4/3;
  background: linear-gradient(90deg, var(--bg-input) 25%, var(--bd-md) 50%, var(--bg-input) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
.sk-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.sk-line {
  border-radius: 6px;
  background: var(--bg-input);
  height: 12px;
  animation: shimmer 1.4s infinite;
}
.sk-line-title { width: 75%; height: 14px; }
.sk-line-meta  { width: 50%; }
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Empty state ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 64px 24px;
  gap: 12px;
}
.empty-icon {
  font-size: 56px;
  margin-bottom: 8px;
  opacity: 0.6;
}
.empty-title {
  font-size: 20px;
  font-weight: 800;
  color: var(--tx-3);
}
.empty-sub {
  font-size: 14px;
  color: var(--tx-5);
  max-width: 340px;
  line-height: 1.6;
}
.empty-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 12px 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: opacity 0.2s, transform 0.2s;
  box-shadow: 0 4px 14px rgba(216,90,48,0.35);
}
.empty-btn:hover { opacity: 0.9; transform: translateY(-1px); }
.empty-btn svg { width: 18px; height: 18px; }

/* ── Load more ── */
.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 8px 0;
}
.load-more-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 28px;
  border-radius: 14px;
  background: var(--bg-card-md);
  border: 1px solid var(--bd-md);
  color: var(--tx-3);
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}
.load-more-btn:hover:not(:disabled) {
  background: var(--bg-input-f);
  color: var(--tx-2);
}
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.load-hint {
  font-size: 11px;
  color: var(--tx-5);
  font-weight: 600;
}

@media (max-width: 640px) {
  .recipe-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .page-title { font-size: 18px; }
  .empty-state { padding: 40px 16px; }
}
@media (max-width: 360px) {
  .recipe-grid { grid-template-columns: 1fr; }
}
</style>
