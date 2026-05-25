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
  category:   route.query.category   ? Number(route.query.category) : null,
  difficulty: route.query.difficulty || '',
  page:       Number(route.query.page) || 0,
})

const difficulties = computed(() => [
  { value: 'EASY',   label: lang.t('common.easy'),   icon: '🟢', cls: 'chip-easy'   },
  { value: 'MEDIUM', label: lang.t('common.medium'),  icon: '🟡', cls: 'chip-medium' },
  { value: 'HARD',   label: lang.t('common.hard'),    icon: '🔴', cls: 'chip-hard'   },
])

const hasActiveFilters = computed(
  () => !!filters.value.keyword || !!filters.value.category || !!filters.value.difficulty
)

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

function setCategory(id) {
  filters.value.category   = filters.value.category === id ? null : id
  filters.value.difficulty = ''
  filters.value.keyword    = ''
  applyFilter()
}

function setDifficulty(val) {
  filters.value.difficulty = filters.value.difficulty === val ? '' : val
  filters.value.category   = null
  applyFilter()
}

function setPage(p) {
  filters.value.page = p
  fetchRecipes()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function resetFilters() {
  filters.value = { keyword: '', category: null, difficulty: '', page: 0 }
  fetchRecipes()
}

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

  // Apply URL category filter after categories load
  if (route.query.category) {
    filters.value.category = Number(route.query.category)
    fetchRecipes()
  }
})

watch(() => route.query.keyword, (kw) => {
  if (kw !== undefined) {
    filters.value.keyword    = kw
    filters.value.category   = null
    filters.value.difficulty = ''
    filters.value.page       = 0
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

    <!-- Search bar -->
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
      <button v-if="filters.keyword" @click="filters.keyword = ''; applyFilter()" class="clear-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Filter chips block -->
    <div class="filters-block">

      <!-- Difficulty chips -->
      <div class="filter-group">
        <span class="filter-group-label">{{ lang.t('recipes.all_levels') }}</span>
        <div class="chips-row">
          <button
            v-for="d in difficulties"
            :key="d.value"
            @click="setDifficulty(d.value)"
            class="chip"
            :class="[d.cls, { 'chip-active': filters.difficulty === d.value }]"
          >
            <span class="chip-dot"></span>
            {{ d.label }}
          </button>
        </div>
      </div>

      <!-- Category chips -->
      <div class="filter-group">
        <span class="filter-group-label">{{ lang.t('recipes.all_categories') }}</span>
        <div class="chips-row chips-scroll">
          <button
            v-for="c in categories"
            :key="c.id"
            @click="setCategory(c.id)"
            class="chip chip-cat"
            :class="{ 'chip-active chip-cat-active': filters.category === c.id }"
          >
            {{ lang.catName(c) }}
          </button>
        </div>
      </div>

      <!-- Reset -->
      <div v-if="hasActiveFilters" class="filter-reset-row">
        <button @click="resetFilters" class="reset-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M6 18L18 6M6 6l12 12"/>
          </svg>
          {{ lang.t('recipes.reset') }}
        </button>
      </div>
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
      >{{ p + 1 }}</button>

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
.page { display: flex; flex-direction: column; gap: 16px; }

/* Header */
.page-header { display: flex; align-items: flex-start; justify-content: space-between; }
.page-title  { font-size: 22px; font-weight: 900; color: var(--tx-1); }
.page-sub    { font-size: 13px; color: var(--tx-5); margin-top: 3px; }

/* ── Search ── */
.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 14px;
  padding: 0 14px;
  height: 48px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s;
}
.search-wrap:focus-within {
  border-color: rgba(216, 90, 48, 0.5);
}
.si { width: 18px; height: 18px; color: var(--tx-5); flex-shrink: 0; }
.search-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--tx-2);
  min-width: 0;
}
.search-input::placeholder { color: var(--tx-6); }
.clear-btn {
  background: none;
  border: none;
  color: var(--tx-5);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}
.clear-btn svg { width: 14px; height: 14px; }
.clear-btn:hover { color: var(--tx-3); }

/* ── Filters Block ── */
.filters-block {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.filter-group-label {
  font-size: 11px;
  font-weight: 800;
  color: var(--tx-5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
  min-width: 80px;
}

/* Chips row */
.chips-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chips-scroll {
  flex-wrap: nowrap;
  overflow-x: auto;
  scrollbar-width: none;
  padding-bottom: 2px;
}
.chips-scroll::-webkit-scrollbar { display: none; }

/* ── Chip base ── */
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 700;
  border: 1.5px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  background: var(--bg-input);
  color: var(--tx-4);
  border-color: var(--bd-md);
}
.chip:hover {
  transform: translateY(-1px);
}

/* Dot indicator */
.chip-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* Difficulty variants */
.chip-easy   .chip-dot { background: #10b981; }
.chip-medium .chip-dot { background: #eab308; }
.chip-hard   .chip-dot { background: #ef4444; }

.chip-easy:hover,   .chip-easy.chip-active   { background: rgba(16, 185, 129, 0.12); border-color: rgba(16,185,129,0.4);  color: #10b981; }
.chip-medium:hover, .chip-medium.chip-active { background: rgba(234, 179, 8, 0.12);  border-color: rgba(234,179,8,0.4);   color: #ca8a04; }
.chip-hard:hover,   .chip-hard.chip-active   { background: rgba(239, 68, 68, 0.12);  border-color: rgba(239,68,68,0.4);   color: #ef4444; }

/* Category chips */
.chip-cat:hover {
  background: rgba(216,90,48,0.08);
  border-color: rgba(216,90,48,0.3);
  color: #E8713E;
}
.chip-cat-active {
  background: rgba(216,90,48,0.14) !important;
  border-color: rgba(216,90,48,0.5) !important;
  color: #E8713E !important;
}

/* Reset row */
.filter-reset-row { display: flex; }
.reset-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 100px;
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.reset-btn:hover { background: rgba(239,68,68,0.16); }
.reset-btn svg { width: 12px; height: 12px; }

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
  background: var(--bg-card-md);
  animation: pulse 1.5s ease-in-out infinite;
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  gap: 8px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.empty-icon   { font-size: 56px; margin-bottom: 8px; }
.empty-title  { font-size: 16px; font-weight: 800; color: var(--tx-4); }
.empty-sub    { font-size: 13px; color: var(--tx-6); }
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
  border: 1px solid var(--bd-md);
  background: var(--bg-card-md);
  color: var(--tx-4);
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
