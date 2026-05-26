<script setup>
import { ref, computed, onMounted } from 'vue'
import { recipesApi        } from '@/api/recipes'
import { favoritesApi      } from '@/api/favorites'
import { mealPlansApi      } from '@/api/mealPlans'
import RecipeCard            from '@/components/recipe/RecipeCard.vue'
import RecipeFormModal       from '@/components/recipe/RecipeFormModal.vue'
import { useLangStore }      from '@/stores/langStore'
import { useAuthStore }      from '@/stores/authStore'
import { useFavoritesStore } from '@/stores/favoritesStore'

const lang      = useLangStore()
const auth      = useAuthStore()
const favorites = useFavoritesStore()

// ── State ─────────────────────────────────────────────────────────
const popular       = ref([])
const favRecipes    = ref([])
const myRecipes     = ref([])
const myRecipeCount = ref(0)
const todayMeals    = ref([])
const loading       = ref(true)

// ── Meal plan helpers ─────────────────────────────────────────────
// JS: 0=Yak…6=Sha → backend: 1=Du…7=Yak
const todayDow = new Date().getDay() || 7   // 0 → 7 (Yakshanba)

const DAY_NAMES  = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
const MEAL_ORDER = ['BREAKFAST','LUNCH','DINNER','SNACK']
const MEAL_LABELS = {
  BREAKFAST: { uz: 'Nonushta',     icon: '🌅' },
  LUNCH:     { uz: 'Tushlik',      icon: '☀️'  },
  DINNER:    { uz: 'Kechki ovqat', icon: '🌙'  },
  SNACK:     { uz: 'Gazak',        icon: '🍎'  },
}

// backend dayOfWeek: number(1-7) yoki string('MONDAY'…) — ikkalasini qabul qilish
const normDay = (d) =>
  typeof d === 'number' ? d : DAY_NAMES.indexOf(d) + 1

const todayMealsSorted = computed(() =>
  [...todayMeals.value].sort(
    (a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType)
  )
)

// ── Sana (Uzbekcha) ───────────────────────────────────────────────
const UZ_DAYS   = ['Yakshanba','Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba']
const UZ_MONTHS = ['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr']
const todayDateStr = computed(() => {
  const d = new Date()
  return `${UZ_DAYS[d.getDay()]}, ${d.getDate()} ${UZ_MONTHS[d.getMonth()]}`
})

// ── Greeting ──────────────────────────────────────────────────────
const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 6)  return lang.t('home.greet_night')
  if (h < 12) return lang.t('home.greet_morning')
  if (h < 18) return lang.t('home.greet_day')
  return lang.t('home.greet_evening')
})

const roleBadge = computed(() => {
  if (auth.isAdmin)   return { label: 'Admin',  cls: 'role-admin'   }
  if (auth.isBlogger) return { label: 'Oshpaz', cls: 'role-blogger' }
  return null
})

// Saqlangan retseptlar preview — template ichida .slice() bo'lmasin
const favPreview = computed(() => favRecipes.value.slice(0, 4))

// ── Recipe Modal ──────────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)

function openCreateRecipe() {
  editingRecipe.value   = null
  showRecipeModal.value = true
}

async function handleRecipeSaved() {
  showRecipeModal.value = false
  if (!auth.isBlogger) return
  const res = await recipesApi.getMy({ page: 0, size: 8 })
  const d   = res.data?.data ?? res.data
  myRecipes.value     = d?.content      ?? []
  myRecipeCount.value = d?.totalElements ?? 0
}

// ── Data parsing helper ───────────────────────────────────────────
const unwrap = (res) => res.data?.data ?? res.data

// ── Load ──────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    // Har bir so'rov nomli — indeks mo'rtligi yo'q
    const [popRes, favRes, planRes, myRes] = await Promise.allSettled([
      recipesApi.getAll({ page: 0, size: 8, sort: ['averageRating,desc', 'viewCount,desc'] }),
      auth.isAuthenticated ? favoritesApi.getAll({ page: 0, size: 8 })         : null,
      auth.isAuthenticated ? mealPlansApi.getMy({ page: 0, size: 20 })         : null,
      auth.isBlogger       ? recipesApi.getMy({ page: 0, size: 8 })            : null,
    ])

    if (popRes.status === 'fulfilled' && popRes.value) {
      popular.value = unwrap(popRes.value)?.content ?? []
    }
    if (favRes?.status === 'fulfilled' && favRes.value) {
      favRecipes.value = unwrap(favRes.value)?.content ?? []
    }
    if (planRes?.status === 'fulfilled' && planRes.value) {
      const data  = unwrap(planRes.value)
      const plans = data?.content ?? data ?? []
      const active = plans.find(p => p.status === 'ACTIVE') ?? plans[0] ?? null
      if (active) {
        todayMeals.value = (active.entries ?? []).filter(
          e => normDay(e.dayOfWeek) === todayDow
        )
      }
    }
    if (myRes?.status === 'fulfilled' && myRes.value) {
      const d     = unwrap(myRes.value)
      myRecipes.value     = d?.content      ?? []
      myRecipeCount.value = d?.totalElements ?? 0
    }
  } catch (e) {
    console.error('[HomePage]', e)
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
          <div class="stat-num">{{ loading ? '—' : (todayMealsSorted.length || '—') }}</div>
          <div class="stat-label">{{ lang.t('nav.meal_plan') }}</div>
        </div>
      </RouterLink>
      <RouterLink to="/app/shopping-lists" class="stat-card stat-link">
        <span class="stat-icon">🛒</span>
        <div>
          <div class="stat-num">→</div>
          <div class="stat-label">{{ lang.t('nav.shopping') }}</div>
        </div>
      </RouterLink>
    </div>

    <!-- ── Two-column: Meal Plan + Saved ── -->
    <div v-if="auth.isAuthenticated" class="two-col">

      <!-- Kunlik ovqat rejasi -->
      <section class="today-widget">
        <div class="today-header">
          <div class="today-header-left">
            <div class="today-icon-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="16" y1="2" x2="16" y2="6"/>
              </svg>
            </div>
            <div>
              <div class="today-label">Kunlik ovqat rejasi</div>
              <div class="today-date">{{ todayDateStr }}</div>
            </div>
          </div>
          <RouterLink to="/app/meal-plans" class="today-link">
            Ko'rish
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/></svg>
          </RouterLink>
        </div>

        <div v-if="loading" class="today-list">
          <div v-for="i in 3" :key="i" class="today-item-skeleton" />
        </div>

        <div v-else-if="todayMealsSorted.length" class="today-list">
          <RouterLink
            v-for="entry in todayMealsSorted"
            :key="entry.id"
            :to="`/app/recipes/${entry.recipeId}`"
            class="today-item"
            :class="`today-item--${entry.mealType.toLowerCase()}`"
          >
            <div class="today-item-thumb">
              <img v-if="entry.recipeImageUrl" :src="entry.recipeImageUrl" :alt="entry.recipeTitleUz" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/>
              </svg>
            </div>
            <div class="today-item-body">
              <span class="today-item-type">{{ MEAL_LABELS[entry.mealType]?.icon }}&nbsp;{{ MEAL_LABELS[entry.mealType]?.uz }}</span>
              <span class="today-item-name">{{ entry.recipeTitleUz || entry.recipeTitleRu }}</span>
            </div>
            <svg class="today-item-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
            </svg>
          </RouterLink>
        </div>

        <div v-else class="today-empty">
          <div class="today-empty-illo">📅</div>
          <div class="today-empty-body">
            <span class="today-empty-title">Bugun uchun reja yo'q</span>
            <RouterLink to="/app/meal-plans" class="today-empty-link">Reja tuzish →</RouterLink>
          </div>
        </div>
      </section>

      <!-- Saqlangan retseptlar -->
      <section class="saved-widget">
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

        <div v-if="loading" class="recipe-grid-sm">
          <div v-for="i in 4" :key="i" class="recipe-skeleton" />
        </div>
        <div v-else-if="favRecipes.length" class="recipe-grid-sm">
          <RecipeCard v-for="r in favPreview" :key="r.id" :recipe="r" />
        </div>
        <div v-else class="empty-inline">
          <span class="empty-inline-icon">🤍</span>
          <span class="empty-inline-text">{{ lang.t('home.no_fav') }}</span>
          <RouterLink to="/app/recipes" class="empty-inline-link">{{ lang.t('home.explore') }}</RouterLink>
        </div>
      </section>

    </div>

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

/* ── Two-column layout ── */
.two-col {
  display: grid;
  grid-template-columns: 380px 1fr;
  gap: 16px;
  align-items: start;
}
@media (max-width: 900px) {
  .two-col { grid-template-columns: 1fr; }
}

/* Umumiy panel: today-widget + saved-widget */
.today-widget,
.saved-widget {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
}

.saved-widget {
  padding: 20px;
  min-width: 0; /* grid ichida overflow-x ishlashi uchun */
}

.today-widget {
  padding: 20px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* Header */
.today-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.today-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}
.today-icon-wrap {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(216,90,48,0.1);
  border: 1px solid rgba(216,90,48,0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #E8713E;
}
.today-icon-wrap svg { width: 18px; height: 18px; }
.today-label {
  font-size: 15px;
  font-weight: 800;
  color: var(--tx-1);
  line-height: 1.2;
}
.today-date {
  font-size: 12px;
  color: var(--tx-4);
  font-weight: 500;
  margin-top: 1px;
}
.today-link {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 700;
  color: #E8713E;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: 10px;
  background: rgba(216,90,48,0.08);
  transition: background 0.2s, gap 0.15s;
}
.today-link:hover { background: rgba(216,90,48,0.14); gap: 5px; }
.today-link svg { width: 13px; height: 13px; }

/* List */
.today-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Row item */
.today-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 14px;
  text-decoration: none;
  border: 1px solid transparent;
  transition: background 0.18s, border-color 0.18s, transform 0.15s;
  background: var(--bg-input);
}
.today-item:hover {
  transform: translateX(4px);
  border-color: var(--bd-md);
}

/* Rangli left-accent har bir ovqat turi uchun */
.today-item--breakfast { border-left: 3px solid #60a5fa; }
.today-item--lunch     { border-left: 3px solid #34d399; }
.today-item--dinner    { border-left: 3px solid #f97316; }
.today-item--snack     { border-left: 3px solid #a78bfa; }

/* Kichik thumbnail */
.today-item-thumb {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-card-md);
  border: 1px solid var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--tx-5);
}
.today-item-thumb img { width: 100%; height: 100%; object-fit: cover; }
.today-item-thumb svg { width: 20px; height: 20px; }

/* Matn bloki */
.today-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.today-item-type {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx-4);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.today-item-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--tx-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* O'q */
.today-item-chevron {
  width: 16px;
  height: 16px;
  color: var(--tx-5);
  flex-shrink: 0;
  transition: color 0.15s, transform 0.15s;
}
.today-item:hover .today-item-chevron {
  color: #E8713E;
  transform: translateX(2px);
}

/* Skeleton */
.today-item-skeleton {
  height: 64px;
  border-radius: 14px;
  background: var(--bg-input);
  animation: pulse 1.5s ease-in-out infinite;
}

/* Empty */
.today-empty {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 4px;
}
.today-empty-illo { font-size: 32px; flex-shrink: 0; }
.today-empty-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.today-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--tx-3);
}
.today-empty-link {
  font-size: 13px;
  font-weight: 700;
  color: #E8713E;
  text-decoration: none;
  transition: color 0.2s;
}
.today-empty-link:hover { color: #F0997B; }

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
