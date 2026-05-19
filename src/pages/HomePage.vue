<script setup>
import { ref, onMounted } from 'vue'
import { recipesApi    } from '@/api/recipes'
import { categoriesApi } from '@/api/categories'
import RecipeCard        from '@/components/recipe/RecipeCard.vue'
import { useLangStore }  from '@/stores/langStore'

const lang = useLangStore()

const recipes       = ref([])
const categories    = ref([])
const totalRecipes  = ref(0)
const loading       = ref(true)

onMounted(async () => {
  try {
    const [r, c] = await Promise.all([
      recipesApi.getAll({ page: 0, size: 8 }),
      categoriesApi.getAll(),
    ])
    const rData      = r.data?.data ?? r.data
    recipes.value    = rData?.content ?? []
    totalRecipes.value = rData?.totalElements ?? 0
    categories.value = c.data?.data ?? c.data ?? []
  } catch (e) {
    console.error('HomePage error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">

    <!-- Hero Card -->
    <div class="hero">
      <div class="hero-bg-blob"></div>
      <div class="hero-content">
        <span class="hero-badge">{{ lang.t('home.badge') }}</span>
        <h1 class="hero-title" v-html="lang.t('home.title').replace('\n','<br>')"></h1>
        <p class="hero-sub">{{ lang.t('home.sub') }}</p>
        <div class="hero-actions">
          <RouterLink to="/recipes" class="btn-primary">
            {{ lang.t('home.btn_browse') }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </RouterLink>
          <RouterLink to="/meal-plans" class="btn-ghost">{{ lang.t('home.btn_meal') }}</RouterLink>
        </div>
      </div>
      <div class="hero-emoji">🍲</div>
    </div>

    <!-- Stats Row -->
    <div class="stats-row">
      <div class="stat-card">
        <span class="stat-icon">🍽️</span>
        <div>
          <div class="stat-num">{{ totalRecipes > 0 ? totalRecipes.toLocaleString() : '—' }}</div>
          <div class="stat-label">{{ lang.t('home.stat_r') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🏷️</span>
        <div>
          <div class="stat-num">{{ categories.length || '—' }}</div>
          <div class="stat-label">{{ lang.t('home.stat_c') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">📅</span>
        <div>
          <div class="stat-num">7</div>
          <div class="stat-label">{{ lang.t('nav.meal_plan') }}</div>
        </div>
      </div>
      <div class="stat-card">
        <span class="stat-icon">🛒</span>
        <div>
          <div class="stat-num">Auto</div>
          <div class="stat-label">{{ lang.t('nav.shopping') }}</div>
        </div>
      </div>
    </div>

    <!-- Categories -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">{{ lang.t('home.categories') }}</h2>
      </div>

      <div v-if="loading" class="cat-scroll">
        <div v-for="i in 7" :key="i" class="cat-skeleton" />
      </div>

      <div v-else-if="categories.length" class="cat-scroll">
        <RouterLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/recipes?category=${cat.id}`"
          class="cat-item"
        >
          <span class="cat-icon">
              <img v-if="cat.iconUrl && cat.iconUrl.startsWith('http')"
                   :src="cat.iconUrl" :alt="lang.catName(cat)"
                   style="width:28px;height:28px;object-fit:contain;border-radius:4px" />
              <template v-else>{{ cat.iconUrl || '🥘' }}</template>
            </span>
          <span class="cat-name">{{ lang.catName(cat) }}</span>
        </RouterLink>
      </div>

      <div v-else class="empty-sm">{{ lang.t('home.no_recipes') }}</div>
    </section>

    <!-- Popular Recipes -->
    <section class="section">
      <div class="section-header">
        <h2 class="section-title">{{ lang.t('home.popular') }}</h2>
        <RouterLink to="/recipes" class="section-link">{{ lang.t('home.view_all') }}</RouterLink>
      </div>

      <div v-if="loading" class="recipe-grid">
        <div v-for="i in 8" :key="i" class="recipe-skeleton" />
      </div>

      <div v-else-if="recipes.length" class="recipe-grid">
        <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
      </div>

      <div v-else class="empty-card">
        <div class="empty-icon">🍽️</div>
        <p class="empty-title">{{ lang.t('home.no_recipes') }}</p>
      </div>
    </section>

  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* ── Hero ── */
.hero {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #0a2a16 0%, #0d1f2d 60%, #0f172a 100%);
  border: 1px solid rgba(216, 90, 48, 0.15);
  border-radius: 24px;
  padding: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 220px;
}
.hero-bg-blob {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(216, 90, 48, 0.15);
  filter: blur(80px);
  top: -80px;
  right: -60px;
  pointer-events: none;
}
.hero-content { position: relative; z-index: 1; max-width: 520px; }
.hero-badge {
  display: inline-block;
  padding: 5px 12px;
  border-radius: 100px;
  background: rgba(216, 90, 48, 0.15);
  border: 1px solid rgba(216, 90, 48, 0.3);
  color: #F0997B;
  font-size: 12px;
  font-weight: 700;
  margin-bottom: 16px;
  letter-spacing: 0.04em;
}
.hero-title {
  font-size: 32px;
  font-weight: 900;
  color: #f1f5f9;
  line-height: 1.2;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}
.hero-sub {
  font-size: 15px;
  color: #64748b;
  margin-bottom: 24px;
  line-height: 1.6;
}
.hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: white;
  font-size: 14px;
  font-weight: 800;
  border-radius: 12px;
  text-decoration: none;
  box-shadow: 0 4px 16px rgba(216, 90, 48, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary svg { width: 16px; height: 16px; transition: transform 0.2s; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(216, 90, 48, 0.45); }
.btn-primary:hover svg { transform: translateX(3px); }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  padding: 12px 22px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 14px;
  font-weight: 700;
  border-radius: 12px;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }

.hero-emoji {
  font-size: 100px;
  opacity: 0.08;
  user-select: none;
  line-height: 1;
  position: relative;
  z-index: 0;
}
@media (max-width: 640px) {
  .hero { padding: 28px 24px; }
  .hero-title { font-size: 24px; }
  .hero-emoji { display: none; }
}

/* ── Stats ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.stat-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: border-color 0.2s, background 0.2s;
}
.stat-card:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(216,90,48,0.2);
}
.stat-icon { font-size: 28px; line-height: 1; }
.stat-num { font-size: 22px; font-weight: 900; color: #f1f5f9; line-height: 1.1; }
.stat-label { font-size: 11px; font-weight: 600; color: #475569; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.06em; }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .stat-card { padding: 14px 12px; }
}

/* ── Section ── */
.section { display: flex; flex-direction: column; gap: 16px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 18px; font-weight: 800; color: #e2e8f0; }
.section-link { font-size: 13px; font-weight: 700; color: #E8713E; text-decoration: none; transition: color 0.2s; }
.section-link:hover { color: #F0997B; }

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
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  text-decoration: none;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.cat-item:hover {
  background: rgba(216,90,48,0.08);
  border-color: rgba(216,90,48,0.25);
  transform: translateY(-2px);
}
.cat-icon { font-size: 26px; line-height: 1; }
.cat-name { font-size: 10px; font-weight: 700; color: #64748b; text-align: center; line-height: 1.2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.cat-item:hover .cat-name { color: #E8713E; }

.cat-skeleton {
  flex-shrink: 0;
  width: 78px;
  height: 88px;
  border-radius: 16px;
  background: rgba(255,255,255,0.05);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Recipe Grid ── */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.recipe-skeleton {
  border-radius: 16px;
  height: 220px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}
@media (max-width: 1024px) { .recipe-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 768px)  { .recipe-grid { grid-template-columns: repeat(2, 1fr); } }

/* ── Empty ── */
.empty-sm { font-size: 13px; color: #475569; padding: 12px 4px; }
.empty-card {
  text-align: center;
  padding: 60px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
}
.empty-icon { font-size: 48px; margin-bottom: 14px; }
.empty-title { font-size: 16px; font-weight: 700; color: #475569; margin-bottom: 6px; }
.empty-sub { font-size: 13px; color: #334155; }

/* ── Pulse animation ── */
@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
