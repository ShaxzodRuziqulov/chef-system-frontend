<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter }             from 'vue-router'
import { recipesApi    }                   from '@/api/recipes'
import { categoriesApi }                   from '@/api/categories'
import RecipeCard                          from '@/components/recipe/RecipeCard.vue'
import { useLangStore }                    from '@/stores/langStore'

const lang = useLangStore()

const route  = useRoute()
const router = useRouter()

const recipes       = ref([])
const categories    = ref([])
const loading       = ref(true)
const totalPages    = ref(0)
const totalElements = ref(0)

const filters = ref({
  keyword:    route.query.keyword    || '',
  category:   route.query.category   || '',
  difficulty: route.query.difficulty || '',
  page:       Number(route.query.page) || 0,
})

const difficulties = computed(() => [
  { value: '',       label: lang.t('recipes.all_levels')            },
  { value: 'EASY',   label: '🟢 ' + lang.t('common.easy')          },
  { value: 'MEDIUM', label: '🟡 ' + lang.t('common.medium')        },
  { value: 'HARD',   label: '🔴 ' + lang.t('common.hard')          },
])

async function fetchRecipes() {
  loading.value = true
  try {
    const params = { page: filters.value.page, size: 12 }
    let res

    if (filters.value.keyword) {
      res = await recipesApi.search(filters.value.keyword, params)
    } else if (filters.value.category) {
      res = await recipesApi.getByCategory(filters.value.category, params)
    } else if (filters.value.difficulty) {
      res = await recipesApi.getByDifficulty(filters.value.difficulty, params)
    } else {
      res = await recipesApi.getAll(params)
    }

    const page = res.data?.data ?? res.data
    recipes.value       = page?.content      ?? []
    totalPages.value    = page?.totalPages   ?? 0
    totalElements.value = page?.totalElements ?? 0
  } catch (e) {
    console.error(e)
    recipes.value = []
  } finally {
    loading.value = false
  }
}

function applyFilter() {
  filters.value.page = 0
  fetchRecipes()
}

function setPage(p) {
  filters.value.page = p
  fetchRecipes()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetFilters() {
  filters.value = { keyword: '', category: '', difficulty: '', page: 0 }
  fetchRecipes()
}

// Sync visible pages (max 7 around current)
function pageRange() {
  const total = totalPages.value
  const cur   = filters.value.page
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const start = Math.max(0, Math.min(cur - 3, total - 7))
  return Array.from({ length: 7 }, (_, i) => start + i)
}

onMounted(async () => {
  const [, c] = await Promise.all([fetchRecipes(), categoriesApi.getAll()])
  categories.value = c.data?.data ?? c.data ?? []
})

// Watch URL query changes (from topbar search)
watch(() => route.query.keyword, (kw) => {
  if (kw !== undefined) {
    filters.value.keyword = kw
    filters.value.page = 0
    fetchRecipes()
  }
})
</script>

<template>
  <div class="page">

    <!-- Page header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ lang.t('recipes.title') }}</h1>
        <p v-if="!loading && totalElements" class="page-sub">
          {{ totalElements.toLocaleString() }} {{ lang.t('recipes.count') }}
        </p>
      </div>
    </div>

    <!-- Filters -->
    <div class="filters-bar">
      <!-- Search -->
      <div class="search-wrap">
        <svg class="si" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
        </svg>
        <input
          v-model="filters.keyword"
          @input="applyFilter"
          type="text"
          :placeholder="lang.t('recipes.search')"
          class="search-input"
        />
        <button v-if="filters.keyword" @click="filters.keyword = ''; applyFilter()" class="clear-btn">✕</button>
      </div>

      <!-- Category -->
      <select v-model="filters.category" @change="applyFilter" class="filter-select">
        <option value="">{{ lang.t('recipes.all_categories') }}</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ lang.catName(c) }}</option>
      </select>

      <!-- Difficulty -->
      <select v-model="filters.difficulty" @change="applyFilter" class="filter-select">
        <option v-for="d in difficulties" :key="d.value" :value="d.value">{{ d.label }}</option>
      </select>

      <!-- Reset -->
      <button
        v-if="filters.keyword || filters.category || filters.difficulty"
        @click="resetFilters"
        class="reset-btn"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 4l16 16M4 20L20 4"/>
        </svg>
        Tozalash
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="recipe-grid">
      <div v-for="i in 12" :key="i" class="skeleton-card" />
    </div>

    <!-- Grid -->
    <div v-else-if="recipes.length" class="recipe-grid">
      <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
    </div>

    <!-- Empty -->
    <div v-else class="empty-state">
      <div class="empty-icon">🔍</div>
      <p class="empty-title">{{ lang.t('recipes.not_found') }}</p>
      <p class="empty-sub">{{ lang.t('recipes.not_found_sub') }}</p>
      <button @click="resetFilters" class="empty-action">{{ lang.t('recipes.reset') }}</button>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <button
        @click="setPage(filters.page - 1)"
        :disabled="filters.page === 0"
        class="page-btn page-nav"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
        </svg>
      </button>

      <button
        v-for="p in pageRange()"
        :key="p"
        @click="setPage(p)"
        class="page-btn"
        :class="{ 'page-active': filters.page === p }"
      >
        {{ p + 1 }}
      </button>

      <button
        @click="setPage(filters.page + 1)"
        :disabled="filters.page >= totalPages - 1"
        class="page-btn page-nav"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* Header */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title  { font-size: 22px; font-weight: 900; color: #f1f5f9; }
.page-sub    { font-size: 13px; color: #475569; margin-top: 3px; }

/* Filters */
.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 18px;
}

.search-wrap {
  flex: 1;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0 12px;
  height: 42px;
  transition: border-color 0.2s;
}
.search-wrap:focus-within {
  border-color: rgba(216, 90, 48, 0.5);
  background: rgba(255,255,255,0.07);
}
.si { width: 16px; height: 16px; color: #475569; flex-shrink: 0; }
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
.clear-btn {
  background: none;
  border: none;
  color: #475569;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1;
  transition: color 0.2s;
}
.clear-btn:hover { color: #94a3b8; }

.filter-select {
  height: 42px;
  padding: 0 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  transition: border-color 0.2s;
}
.filter-select:focus  { border-color: rgba(216,90,48,0.5); }
.filter-select option { background: #1e293b; color: #e2e8f0; }

.reset-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 42px;
  padding: 0 14px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 12px;
  color: #f87171;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.reset-btn:hover { background: rgba(239,68,68,0.18); }
.reset-btn svg { width: 14px; height: 14px; }

/* Grid */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
@media (max-width: 1200px) { .recipe-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px)  { .recipe-grid { grid-template-columns: repeat(2, 1fr); } }

/* Skeleton */
.skeleton-card {
  border-radius: 20px;
  height: 220px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px;
  gap: 8px;
}
.empty-icon   { font-size: 56px; margin-bottom: 8px; }
.empty-title  { font-size: 16px; font-weight: 800; color: #64748b; }
.empty-sub    { font-size: 13px; color: #334155; }
.empty-action {
  margin-top: 8px;
  padding: 10px 22px;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.25);
  border-radius: 12px;
  color: #E8713E;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.empty-action:hover { background: rgba(216,90,48,0.2); }

/* Pagination */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding-top: 8px;
}
.page-btn {
  min-width: 38px;
  height: 38px;
  padding: 0 6px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  color: #64748b;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-btn:hover:not(:disabled) {
  border-color: rgba(216,90,48,0.4);
  color: #E8713E;
  background: rgba(216,90,48,0.08);
}
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-active {
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 12px rgba(216,90,48,0.35);
}
.page-nav svg { width: 16px; height: 16px; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
