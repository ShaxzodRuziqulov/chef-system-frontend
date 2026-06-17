<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute }      from 'vue-router'
import { recipesApi }    from '@/api/recipes'
import { categoriesApi } from '@/api/categories'
import RecipeCard        from '@/components/recipe/RecipeCard.vue'
import { useLangStore }  from '@/stores/langStore'

const lang  = useLangStore()
const route = useRoute()

// ── State ─────────────────────────────────────────────────────────
const recipes       = ref([])
const categories    = ref([])
const loading       = ref(true)
const loadingMore   = ref(false)
const totalElements = ref(0)
const totalPages    = ref(0)
const searchQuery   = ref(String(route.query.keyword ?? ''))

const filters = ref({
  keyword:    String(route.query.keyword    ?? ''),
  category:   route.query.category ? Number(route.query.category) : null,
  difficulty: String(route.query.difficulty ?? ''),
  sort:       'createdAt,desc',
  page:       0,
})

// ── Options ───────────────────────────────────────────────────────
const difficulties = computed(() => [
  { value: 'EASY',   label: lang.t('common.easy'),   color: '#10b981' },
  { value: 'MEDIUM', label: lang.t('common.medium'),  color: '#eab308' },
  { value: 'HARD',   label: lang.t('common.hard'),    color: '#ef4444' },
])

const sortOptions = [
  { value: 'createdAt,desc',     label: 'Yangi'   },
  { value: 'viewCount,desc',     label: 'Mashhur' },
  { value: 'averageRating,desc', label: 'Top ★'   },
]

// ── Derived ───────────────────────────────────────────────────────
const hasMore          = computed(() => filters.value.page < totalPages.value - 1)
const hasActiveFilters = computed(() =>
  !!filters.value.keyword || !!filters.value.category || !!filters.value.difficulty
)

// ── Fetch ─────────────────────────────────────────────────────────
async function fetchRecipes(reset = false) {
  if (reset) { loading.value = true; filters.value.page = 0 }
  else loadingMore.value = true

  try {
    const params = { page: filters.value.page, size: 12, sort: filters.value.sort }
    let res

    if (filters.value.keyword)         res = await recipesApi.search(filters.value.keyword, params)
    else if (filters.value.category)   res = await recipesApi.getByCategory(filters.value.category, params)
    else if (filters.value.difficulty) res = await recipesApi.getByDifficulty(filters.value.difficulty, params)
    else                               res = await recipesApi.getAll(params)

    const page    = res.data?.data ?? res.data
    const content = page?.content  ?? []

    recipes.value       = reset ? content : [...recipes.value, ...content]
    totalPages.value    = page?.totalPages    ?? 0
    totalElements.value = page?.totalElements ?? 0
  } catch {
    if (reset) recipes.value = []
  } finally {
    loading.value     = false
    loadingMore.value = false
  }
}

// ── Filter actions ─────────────────────────────────────────────────
let searchTimer = null
function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    filters.value.keyword    = searchQuery.value
    filters.value.category   = null
    filters.value.difficulty = ''
    fetchRecipes(true)
  }, 320)
}

function clearSearch() {
  searchQuery.value     = ''
  filters.value.keyword = ''
  fetchRecipes(true)
}

function selectCategory(id) {
  const same = filters.value.category === id
  filters.value.category   = same ? null : id
  filters.value.keyword    = ''
  filters.value.difficulty = ''
  if (!same) searchQuery.value = ''
  fetchRecipes(true)
}

function selectDifficulty(val) {
  filters.value.difficulty = filters.value.difficulty === val ? '' : val
  filters.value.category   = null
  fetchRecipes(true)
}

function setSort(val) {
  filters.value.sort = val
  fetchRecipes(true)
}

function resetAll() {
  searchQuery.value        = ''
  filters.value.keyword    = ''
  filters.value.category   = null
  filters.value.difficulty = ''
  fetchRecipes(true)
}

function diffStyle(d) {
  if (filters.value.difficulty !== d.value) return {}
  return {
    background:   `${d.color}1f`,
    borderColor:  `${d.color}66`,
    color:         d.color,
    boxShadow:    `0 2px 8px ${d.color}30`,
  }
}

// ── Infinite scroll ────────────────────────────────────────────────
const sentinel = ref(null)
let   io       = null

function connectIO() {
  io?.disconnect()
  if (!sentinel.value) return
  io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting && hasMore.value && !loadingMore.value && !loading.value) {
      filters.value.page++
      fetchRecipes(false)
    }
  }, { rootMargin: '300px' })
  io.observe(sentinel.value)
}

onMounted(async () => {
  const [, catRes] = await Promise.all([fetchRecipes(true), categoriesApi.getAll()])
  categories.value = catRes.data?.data ?? catRes.data ?? []
  connectIO()
})
onUnmounted(() => io?.disconnect())
watch(sentinel, el => { if (el) connectIO() })

watch(() => route.query.keyword, kw => {
  if (kw === undefined) return
  searchQuery.value        = String(kw ?? '')
  filters.value.keyword    = String(kw ?? '')
  filters.value.category   = null
  filters.value.difficulty = ''
  fetchRecipes(true)
})

watch(() => route.query.category, cat => {
  if (cat === undefined) return
  filters.value.category   = cat ? Number(cat) : null
  filters.value.keyword    = ''
  filters.value.difficulty = ''
  searchQuery.value        = ''
  fetchRecipes(true)
})
</script>

<template>
  <div class="page">

    <!-- ── Top bar ────────────────────────────────────────────── -->
    <div class="topbar">
      <div class="topbar-left">
        <h1 class="page-title">{{ lang.t('recipes.title') }}</h1>
        <Transition name="pop">
          <span v-if="!loading && totalElements" class="count-badge">
            {{ totalElements.toLocaleString() }}
          </span>
        </Transition>
      </div>

      <div class="sort-seg">
        <button
          v-for="s in sortOptions" :key="s.value"
          class="sort-btn"
          :class="{ 'sort-btn--active': filters.sort === s.value }"
          @click="setSort(s.value)"
        >{{ s.label }}</button>
      </div>
    </div>

    <!-- ── Search ─────────────────────────────────────────────── -->
    <div class="search-box">
      <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/>
      </svg>
      <input
        v-model="searchQuery"
        @input="onSearchInput"
        type="text"
        autocomplete="off"
        spellcheck="false"
        :placeholder="lang.t('recipes.search')"
        class="search-input"
      />
      <Transition name="scale">
        <button v-if="searchQuery" @click="clearSearch" class="search-clear">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </Transition>
    </div>

    <!-- ── Category tabs ──────────────────────────────────────── -->
    <div class="cat-scroll">
      <div class="cat-track">
        <button
          class="cat-tab"
          :class="{ 'cat-tab--on': !filters.category && !filters.difficulty && !filters.keyword }"
          @click="resetAll"
        >
          <span class="cat-all-icon">
            <svg viewBox="0 0 16 16" fill="currentColor">
              <rect x="1" y="1" width="5.5" height="5.5" rx="1.5"/>
              <rect x="9.5" y="1" width="5.5" height="5.5" rx="1.5"/>
              <rect x="1" y="9.5" width="5.5" height="5.5" rx="1.5"/>
              <rect x="9.5" y="9.5" width="5.5" height="5.5" rx="1.5"/>
            </svg>
          </span>
          Barchasi
        </button>
        <button
          v-for="c in categories" :key="c.id"
          class="cat-tab"
          :class="{ 'cat-tab--on': filters.category === c.id }"
          @click="selectCategory(c.id)"
        >{{ lang.catName(c) }}</button>
      </div>
    </div>

    <!-- ── Difficulty + clear row ─────────────────────────────── -->
    <div class="filter-row">
      <button
        v-for="d in difficulties" :key="d.value"
        class="diff-pill"
        :class="{ 'diff-pill--on': filters.difficulty === d.value }"
        :style="diffStyle(d)"
        @click="selectDifficulty(d.value)"
      >
        <span class="diff-dot" :style="`background: ${d.color}`"/>
        {{ d.label }}
      </button>

      <Transition name="scale">
        <button v-if="hasActiveFilters" @click="resetAll" class="clear-pill">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Tozalash
        </button>
      </Transition>
    </div>

    <!-- ── Skeleton ───────────────────────────────────────────── -->
    <div v-if="loading" class="grid">
      <div v-for="i in 12" :key="i" class="skel" :class="{ 'skel--wide': i === 1 }"/>
    </div>

    <!-- ── Grid ──────────────────────────────────────────────── -->
    <template v-else-if="recipes.length">
      <div class="grid">
        <RecipeCard
          v-for="(r, i) in recipes" :key="r.id"
          :recipe="r"
          class="card-in"
          :class="{ 'card--wide': i === 0 }"
          :style="`animation-delay:${Math.min(i % 12, 9) * 40}ms`"
        />
      </div>

      <div ref="sentinel" class="sentinel">
        <Transition name="fade">
          <div v-if="loadingMore" class="loading-ring">
            <span class="ring"/>
          </div>
        </Transition>
      </div>
    </template>

    <!-- ── Empty ─────────────────────────────────────────────── -->
    <div v-else class="empty">
      <div class="empty-circle">
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="32" r="30" stroke="var(--bd)" stroke-width="2"/>
          <path d="M20 42 Q32 26 44 42" stroke="var(--tx-5)" stroke-width="2.5" stroke-linecap="round"/>
          <circle cx="23" cy="27" r="3" fill="var(--tx-5)"/>
          <circle cx="41" cy="27" r="3" fill="var(--tx-5)"/>
        </svg>
      </div>
      <p class="empty-title">{{ lang.t('recipes.not_found') }}</p>
      <p class="empty-sub">{{ lang.t('recipes.not_found_sub') }}</p>
      <button @click="resetAll" class="empty-btn">{{ lang.t('recipes.reset') }}</button>
    </div>

  </div>
</template>

<style scoped>
/* ── Page ─────────────────────────────────────────────────────────── */
.page { display: flex; flex-direction: column; gap: 14px; }

/* ── Top bar ──────────────────────────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.topbar-left { display: flex; align-items: center; gap: 10px; }
.page-title  { font-size: 22px; font-weight: 900; color: var(--tx-1); letter-spacing: -0.3px; }

.count-badge {
  padding: 3px 10px;
  background: rgba(216,90,48,0.1);
  border: 1px solid rgba(216,90,48,0.22);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 800;
  color: #E8713E;
}

/* Sort segment control */
.sort-seg {
  display: flex;
  gap: 2px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 3px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}
.sort-btn {
  padding: 5px 13px;
  border-radius: 9px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 700;
  color: var(--tx-5);
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.15s, background 0.15s, box-shadow 0.15s;
}
.sort-btn:hover:not(.sort-btn--active) { color: var(--tx-3); }
.sort-btn--active {
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  box-shadow: 0 2px 8px rgba(216,90,48,0.35);
}

/* ── Search ───────────────────────────────────────────────────────── */
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 52px;
  padding: 0 16px;
  background: var(--bg-card);
  border: 1.5px solid var(--bd);
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-box:focus-within {
  border-color: rgba(216,90,48,0.5);
  box-shadow: 0 0 0 3px rgba(216,90,48,0.1), 0 1px 4px rgba(0,0,0,0.06);
}
.search-ico {
  width: 18px;
  height: 18px;
  color: var(--tx-5);
  flex-shrink: 0;
  transition: color 0.2s;
}
.search-box:focus-within .search-ico { color: #E8713E; }
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
.search-clear {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: var(--bg-input);
  color: var(--tx-5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.search-clear svg  { width: 12px; height: 12px; }
.search-clear:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

/* ── Category tabs ────────────────────────────────────────────────── */
.cat-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -2px;
  padding: 2px;
}
.cat-scroll::-webkit-scrollbar { display: none; }

.cat-track {
  display: flex;
  gap: 6px;
  width: max-content;
}

.cat-tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  border-radius: 100px;
  border: 1.5px solid var(--bd);
  background: var(--bg-card);
  font-size: 13px;
  font-weight: 700;
  color: var(--tx-4);
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 0.18s, color 0.18s, background 0.18s, transform 0.15s, box-shadow 0.18s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.cat-tab:hover:not(.cat-tab--on) {
  border-color: rgba(216,90,48,0.35);
  color: #E8713E;
  background: rgba(216,90,48,0.06);
  transform: translateY(-1px);
}
.cat-tab--on {
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 4px 14px rgba(216,90,48,0.32);
  transform: translateY(-1px);
}

.cat-all-icon {
  display: flex;
  align-items: center;
  opacity: 0.7;
}
.cat-tab--on .cat-all-icon { opacity: 0.9; }
.cat-all-icon svg { width: 12px; height: 12px; }

/* ── Difficulty + clear ───────────────────────────────────────────── */
.filter-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.diff-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1.5px solid var(--bd);
  background: var(--bg-card);
  font-size: 12px;
  font-weight: 700;
  color: var(--tx-4);
  cursor: pointer;
  white-space: nowrap;
  transition: transform 0.15s, border-color 0.18s, color 0.18s, background 0.18s, box-shadow 0.18s;
}
.diff-pill:hover:not(.diff-pill--on) { transform: translateY(-1px); }
.diff-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
}

.clear-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 100px;
  border: 1.5px solid rgba(239,68,68,0.22);
  background: rgba(239,68,68,0.07);
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s, border-color 0.18s;
  margin-left: auto;
}
.clear-pill svg    { width: 11px; height: 11px; }
.clear-pill:hover  { background: rgba(239,68,68,0.14); border-color: rgba(239,68,68,0.4); }

/* ── Grid ─────────────────────────────────────────────────────────── */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.card--wide { grid-column: span 2; }
.card--wide :deep(.rc-img) { aspect-ratio: 16 / 7; }

@media (max-width: 1100px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 800px)  { .grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 480px)  { .grid { grid-template-columns: repeat(2, 1fr); gap: 10px; } }

/* Card entry animation */
.card-in { animation: cardIn 0.38s cubic-bezier(0.22, 1, 0.36, 1) both; }
@keyframes cardIn {
  from { opacity: 0; transform: translateY(18px); }
  to   { opacity: 1; transform: translateY(0);    }
}

/* ── Skeleton ─────────────────────────────────────────────────────── */
.skel {
  border-radius: 20px;
  aspect-ratio: 3/2;
  background: linear-gradient(
    110deg,
    var(--bg-card-md) 0%,
    var(--bg-card-md) 40%,
    var(--bg-card) 50%,
    var(--bg-card-md) 60%,
    var(--bg-card-md) 100%
  );
  background-size: 200% 100%;
  animation: skeletonShimmer 1.6s ease-in-out infinite;
}
.skel--wide { grid-column: span 2; aspect-ratio: 16 / 7; }

@keyframes skeletonShimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Infinite scroll sentinel ─────────────────────────────────────── */
.sentinel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 64px;
}
.loading-ring {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.ring {
  width: 28px;
  height: 28px;
  border: 2.5px solid var(--bd);
  border-top-color: #E8713E;
  border-radius: 50%;
  animation: spin 0.75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Empty state ──────────────────────────────────────────────────── */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 80px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}
.empty-circle  { width: 80px; height: 80px; margin-bottom: 6px; opacity: 0.6; }
.empty-title   { font-size: 16px; font-weight: 800; color: var(--tx-3); margin: 0; }
.empty-sub     { font-size: 13px; color: var(--tx-5); margin: 0; text-align: center; max-width: 260px; line-height: 1.6; }
.empty-btn {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.18s, transform 0.15s;
  box-shadow: 0 4px 14px rgba(216,90,48,0.3);
}
.empty-btn:hover { opacity: 0.88; transform: translateY(-1px); }

/* ── Transitions ──────────────────────────────────────────────────── */
.scale-enter-active, .scale-leave-active {
  transition: opacity 0.16s, transform 0.16s;
}
.scale-enter-from, .scale-leave-to {
  opacity: 0;
  transform: scale(0.8);
}

.pop-enter-active, .pop-leave-active {
  transition: opacity 0.22s, transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.pop-enter-from, .pop-leave-to {
  opacity: 0;
  transform: scale(0.7);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from,  .fade-leave-to      { opacity: 0; }

/* ── Mobile ───────────────────────────────────────────────────────── */
@media (max-width: 600px) {
  .page-title { font-size: 18px; }
  .sort-btn   { padding: 5px 9px; font-size: 11px; }
  .search-box { height: 46px; border-radius: 14px; padding: 0 12px; }
  .cat-tab    { padding: 7px 14px; font-size: 12px; }
}
</style>
