<script setup>
import { ref, computed, onMounted } from 'vue'
import { recipesApi    } from '@/api/recipes'
import { categoriesApi } from '@/api/categories'
import { favoritesApi  } from '@/api/favorites'
import RecipeCard        from '@/components/recipe/RecipeCard.vue'
import RecipeFormModal   from '@/components/recipe/RecipeFormModal.vue'
import { useLangStore }  from '@/stores/langStore'
import { useAuthStore }  from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'

const lang      = useLangStore()
const auth      = useAuthStore()
const favorites = useFavoritesStore()

// ── Data ──────────────────────────────────────────────────────────
const popular        = ref([])
const favRecipes     = ref([])
const myRecipes      = ref([])
const categories     = ref([])
const myRecipeCount  = ref(0)
const loading        = ref(true)

// ── Recipe Modal ──────────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)

function openCreateRecipe() {
  editingRecipe.value   = null
  showRecipeModal.value = true
}

async function handleRecipeSaved() {
  showRecipeModal.value = false
  // Mening retseptlarim ro'yxatini yangilash
  if (auth.isBlogger) {
    const res = await recipesApi.getMy({ page: 0, size: 8 })
    const d = res.data?.data ?? res.data
    myRecipes.value     = d?.content      ?? []
    myRecipeCount.value = d?.totalElements ?? 0
  }
}

// ── Greeting ──────────────────────────────────────────────────────
const hour = new Date().getHours()
const greeting = computed(() => {
  if (hour < 6)  return lang.t('home.greet_night')
  if (hour < 12) return lang.t('home.greet_morning')
  if (hour < 18) return lang.t('home.greet_day')
  return lang.t('home.greet_evening')
})

const roleBadge = computed(() => {
  if (auth.isAdmin)   return { label: 'Admin',  cls: 'role-admin' }
  if (auth.isBlogger) return { label: 'Oshpaz', cls: 'role-blogger' }
  return null
})

// ── Category icon map ─────────────────────────────────────────────
const CAT_ICONS = [
  { keys: ['milliy', 'national', 'узбек'],          icon: '🏺' },
  { keys: ["sho'rva", 'shorva', 'soup', 'суп'],     icon: '🍜' },
  { keys: ['salat', 'salad', 'салат'],              icon: '🥗' },
  { keys: ['pishiriq', 'выпечк', 'baking', 'non'],  icon: '🥐' },
  { keys: ['shirin', 'desert', 'десерт'],           icon: '🍰' },
  { keys: ["go'sht", 'мясо', 'meat', 'kabob'],      icon: '🥩' },
  { keys: ['sabzavot', 'овощ', 'vegetable'],        icon: '🥦' },
  { keys: ['baliq', 'рыба', 'fish'],                icon: '🐟' },
  { keys: ['ichimlik', 'напиток', 'drink'],         icon: '🥤' },
  { keys: ['tez', 'fast', 'быстр', 'snack'],        icon: '⚡' },
]
function catIcon(cat) {
  const name = ((cat.nameUz || '') + ' ' + (cat.nameRu || '') + ' ' + (cat.nameEng || '')).toLowerCase()
  for (const entry of CAT_ICONS) {
    if (entry.keys.some(k => name.includes(k))) return entry.icon
  }
  return '🍽️'
}

// ── Load ──────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const calls = [
      recipesApi.getAll({ page: 0, size: 8, sort: ['averageRating,desc', 'viewCount,desc'] }),
      categoriesApi.getAll(),
    ]
    if (auth.isAuthenticated) {
      calls.push(favoritesApi.getAll({ page: 0, size: 8 }))
      if (auth.isBlogger) {
        calls.push(recipesApi.getMy({ page: 0, size: 8 }))
      }
    }
    const results = await Promise.allSettled(calls)

    // Popular
    if (results[0].status === 'fulfilled') {
      const d = results[0].value.data?.data ?? results[0].value.data
      popular.value = d?.content ?? []
    }
    // Categories
    if (results[1].status === 'fulfilled') {
      categories.value = results[1].value.data?.data ?? results[1].value.data ?? []
    }
    // Favorites
    if (auth.isAuthenticated && results[2]?.status === 'fulfilled') {
      const d = results[2].value.data?.data ?? results[2].value.data
      favRecipes.value = d?.content ?? []
    }
    // My recipes (blogger/admin)
    if (auth.isBlogger && results[3]?.status === 'fulfilled') {
      const d = results[3].value.data?.data ?? results[3].value.data
      myRecipes.value    = d?.content      ?? []
      myRecipeCount.value = d?.totalElements ?? 0
    }
  } catch (e) {
    console.error('HomePage error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">

    <!-- ── Welcome Banner ── -->
    <div class="welcome-banner">
      <div class="welcome-left">
        <!-- Avatar -->
        <div class="avatar-wrap">
          <img v-if="auth.avatarUrl" :src="auth.avatarUrl" :alt="auth.displayName" class="avatar-img" />
          <div v-else class="avatar-initials">{{ auth.initials }}</div>
        </div>
        <!-- Text -->
        <div class="welcome-text">
          <div class="welcome-greeting">{{ greeting }},</div>
          <div class="welcome-name">
            {{ auth.displayName }}
            <span v-if="roleBadge" class="role-badge" :class="roleBadge.cls">{{ roleBadge.label }}</span>
          </div>
          <div class="welcome-sub">{{ lang.t('home.welcome_sub') }}</div>
        </div>
      </div>
      <!-- Quick actions -->
      <div class="quick-actions">
        <RouterLink to="/app/recipes" class="qa-btn qa-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          {{ lang.t('home.btn_browse') }}
        </RouterLink>
        <button v-if="auth.isBlogger" @click="openCreateRecipe" class="qa-btn qa-create">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          {{ lang.t('home.btn_create') }}
        </button>
        <RouterLink to="/app/meal-plans" class="qa-btn qa-ghost">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          {{ lang.t('nav.meal_plan') }}
        </RouterLink>
      </div>
    </div>

    <!-- ── Personal Stats ── (only when logged in) -->
    <div v-if="auth.isAuthenticated" class="stats-row">
      <RouterLink to="/app/saved" class="stat-card stat-link">
        <span class="stat-icon">❤️</span>
        <div>
          <div class="stat-num">{{ favorites.count }}</div>
          <div class="stat-label">{{ lang.t('home.stat_fav') }}</div>
        </div>
      </RouterLink>
      <RouterLink v-if="auth.isBlogger" to="/app/recipes" class="stat-card stat-link">
        <span class="stat-icon">📖</span>
        <div>
          <div class="stat-num">{{ loading ? '—' : myRecipeCount }}</div>
          <div class="stat-label">{{ lang.t('home.stat_my') }}</div>
        </div>
      </RouterLink>
      <RouterLink to="/app/meal-plans" class="stat-card stat-link">
        <span class="stat-icon">📅</span>
        <div>
          <div class="stat-num">7</div>
          <div class="stat-label">{{ lang.t('nav.meal_plan') }}</div>
        </div>
      </RouterLink>
      <RouterLink to="/app/shopping-lists" class="stat-card stat-link">
        <span class="stat-icon">🛒</span>
        <div>
          <div class="stat-num">Auto</div>
          <div class="stat-label">{{ lang.t('nav.shopping') }}</div>
        </div>
      </RouterLink>
    </div>

    <!-- ── Saved Recipes ── (logged in + has favorites) -->
    <section v-if="auth.isAuthenticated" class="section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">❤️</span>
          {{ lang.t('home.saved') }}
          <span v-if="favorites.count > 0" class="section-count">{{ favorites.count }}</span>
        </h2>
        <RouterLink v-if="favorites.count > 0" to="/app/saved" class="section-link">
          {{ lang.t('home.view_all') }}
        </RouterLink>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="recipe-grid-sm">
        <div v-for="i in 8" :key="i" class="recipe-skeleton" />
      </div>

      <!-- Has favorites -->
      <div v-else-if="favRecipes.length" class="recipe-grid-sm">
        <RecipeCard v-for="r in favRecipes" :key="r.id" :recipe="r" />
      </div>

      <!-- No favorites yet -->
      <div v-else class="empty-inline">
        <span class="empty-inline-icon">🤍</span>
        <span class="empty-inline-text">{{ lang.t('home.no_fav') }}</span>
        <RouterLink to="/app/recipes" class="empty-inline-link">{{ lang.t('home.explore') }}</RouterLink>
      </div>
    </section>

    <!-- ── My Recipes ── (blogger/admin only) -->
    <section v-if="auth.isBlogger" class="section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">📖</span>
          {{ lang.t('home.my_recipes') }}
        </h2>
        <div class="section-header-right">
          <button @click="openCreateRecipe" class="btn-create-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            {{ lang.t('home.btn_create') }}
          </button>
          <RouterLink v-if="myRecipeCount > 4" to="/app/recipes" class="section-link">{{ lang.t('home.view_all') }}</RouterLink>
        </div>
      </div>

      <div v-if="loading" class="recipe-grid-sm">
        <div v-for="i in 8" :key="i" class="recipe-skeleton" />
      </div>
      <div v-else-if="myRecipes.length" class="recipe-grid-sm">
        <RecipeCard v-for="r in myRecipes" :key="r.id" :recipe="r" />
      </div>
      <div v-else class="empty-inline">
        <span class="empty-inline-icon">✍️</span>
        <span class="empty-inline-text">{{ lang.t('home.no_my') }}</span>
        <button @click="openCreateRecipe" class="empty-inline-link empty-inline-btn">{{ lang.t('home.btn_create') }}</button>
      </div>
    </section>

    <!-- ── Categories ── -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">🏷️</span>
          {{ lang.t('home.categories') }}
        </h2>
      </div>

      <div v-if="loading" class="cat-scroll">
        <div v-for="i in 7" :key="i" class="cat-skeleton" />
      </div>
      <div v-else-if="categories.length" class="cat-scroll">
        <RouterLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/app/recipes?category=${cat.id}`"
          class="cat-item"
        >
          <span class="cat-icon">{{ catIcon(cat) }}</span>
          <span class="cat-name">{{ lang.catName(cat) }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- ── Popular Recipes ── -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">
          <span class="section-icon">🔥</span>
          {{ lang.t('home.popular') }}
        </h2>
        <RouterLink to="/app/recipes" class="section-link">{{ lang.t('home.view_all') }}</RouterLink>
      </div>

      <div v-if="loading" class="recipe-grid-sm">
        <div v-for="i in 8" :key="i" class="recipe-skeleton" />
      </div>
      <div v-else-if="popular.length" class="recipe-grid-sm">
        <RecipeCard v-for="r in popular" :key="r.id" :recipe="r" />
      </div>
      <div v-else class="empty-inline">
        <span class="empty-inline-icon">🍽️</span>
        <span class="empty-inline-text">{{ lang.t('home.no_recipes') }}</span>
      </div>
    </section>

  </div>

  <!-- Recipe create/edit modal -->
  <RecipeFormModal
    :recipe="editingRecipe"
    :visible="showRecipeModal"
    @close="showRecipeModal = false"
    @saved="handleRecipeSaved"
  />
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Welcome Banner ── */
.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  padding: 24px 28px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  flex-wrap: wrap;
}
.welcome-left {
  display: flex;
  align-items: center;
  gap: 16px;
}
.avatar-wrap {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(216,90,48,0.3);
}
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-initials {
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  letter-spacing: -0.5px;
}
.welcome-text { display: flex; flex-direction: column; gap: 2px; }
.welcome-greeting {
  font-size: 13px;
  color: var(--tx-5);
  font-weight: 600;
}
.welcome-name {
  font-size: 22px;
  font-weight: 900;
  color: var(--tx-1);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.role-badge {
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.04em;
}
.role-admin   { background: rgba(234,179,8,0.18);  color: #ca8a04; border: 1px solid rgba(234,179,8,0.3);  }
.role-blogger { background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.25); }
.welcome-sub {
  font-size: 13px;
  color: var(--tx-5);
  margin-top: 2px;
}

/* Quick actions */
.quick-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.qa-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.15s, box-shadow 0.15s;
  white-space: nowrap;
}
.qa-btn svg { width: 14px; height: 14px; flex-shrink: 0; }
.qa-btn:hover { transform: translateY(-1px); }
.qa-primary {
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  box-shadow: 0 4px 12px rgba(216,90,48,0.3);
}
.qa-primary:hover { box-shadow: 0 6px 18px rgba(216,90,48,0.4); }
.qa-create {
  background: rgba(99,102,241,0.12);
  border: 1px solid rgba(99,102,241,0.25);
  color: #818cf8;
}
.qa-create:hover { background: rgba(99,102,241,0.2); }
.qa-ghost {
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  color: var(--tx-4);
}
.qa-ghost:hover { border-color: rgba(216,90,48,0.3); color: #E8713E; }

/* ── Stats Row ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: border-color 0.2s, background 0.2s, transform 0.15s;
}
.stat-link { text-decoration: none; cursor: pointer; }
.stat-link:hover {
  border-color: rgba(216,90,48,0.25);
  background: var(--bg-card-lg);
  transform: translateY(-2px);
}
.stat-icon { font-size: 26px; line-height: 1; }
.stat-num { font-size: 22px; font-weight: 900; color: var(--tx-1); line-height: 1.1; }
.stat-label { font-size: 10px; font-weight: 700; color: var(--tx-5); margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

@media (max-width: 768px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }

/* ── Section ── */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.section-header-right { display: flex; align-items: center; gap: 12px; }
.section-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--tx-2);
  display: flex;
  align-items: center;
  gap: 7px;
}
.section-icon { font-size: 18px; }
.section-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(216,90,48,0.15);
  color: #E8713E;
  font-size: 11px;
  font-weight: 800;
}
.section-link {
  font-size: 13px;
  font-weight: 700;
  color: #E8713E;
  text-decoration: none;
  transition: color 0.2s;
}
.section-link:hover { color: #F0997B; }

.btn-create-sm {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.25);
  color: #E8713E;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
  transition: background 0.2s;
}
.btn-create-sm svg { width: 12px; height: 12px; }
.btn-create-sm:hover { background: rgba(216,90,48,0.2); }

/* ── Recipe horizontal scroll row ── */
.recipe-grid-sm {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: none;
}
.recipe-grid-sm::-webkit-scrollbar { display: none; }
.recipe-grid-sm > :deep(.recipe-card) {
  flex: 0 0 240px;
  width: 240px;
}
.recipe-skeleton {
  flex: 0 0 240px;
  width: 240px;
  border-radius: 20px;
  height: 260px;
  background: var(--bg-card-md);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Empty Inline ── */
.empty-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--bg-card);
  border: 1px dashed var(--bd-md);
  border-radius: 16px;
  color: var(--tx-5);
  font-size: 13px;
}
.empty-inline-icon { font-size: 20px; }
.empty-inline-text { flex: 1; font-weight: 600; }
.empty-inline-link {
  font-size: 13px;
  font-weight: 700;
  color: #E8713E;
  text-decoration: none;
  white-space: nowrap;
}
.empty-inline-link:hover { color: #F0997B; }
.empty-inline-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

/* ── Categories ── */
.cat-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  scrollbar-width: none;
}
.cat-scroll::-webkit-scrollbar { display: none; }
.cat-item {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 10px;
  width: 78px;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.cat-item:hover {
  background: rgba(216,90,48,0.08);
  border-color: rgba(216,90,48,0.25);
  transform: translateY(-2px);
}
.cat-icon {
  width: 48px; height: 48px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; line-height: 1;
  background: rgba(216,90,48,0.08);
  border: 1px solid rgba(216,90,48,0.15);
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
}
.cat-item:hover .cat-icon {
  background: rgba(216,90,48,0.14);
  border-color: rgba(216,90,48,0.35);
  transform: scale(1.05);
}
.cat-name {
  font-size: 10px; font-weight: 700; color: var(--tx-4);
  text-align: center; line-height: 1.2;
  overflow: hidden; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.cat-item:hover .cat-name { color: #E8713E; }
.cat-skeleton {
  flex-shrink: 0;
  width: 78px; height: 88px;
  border-radius: 16px;
  background: var(--bg-input);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Welcome banner responsive ── */
@media (max-width: 640px) {
  .welcome-banner { padding: 20px; }
  .welcome-name { font-size: 18px; }
  .quick-actions { width: 100%; }
  .qa-btn { flex: 1; justify-content: center; }
}

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
