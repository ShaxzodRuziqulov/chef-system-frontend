<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter }      from 'vue-router'
import { useAuthStore }             from '@/stores/authStore'
import { useLangStore }             from '@/stores/langStore'
import { recipesApi }               from '@/api/recipes'
import RecipeFormModal              from '@/components/recipe/RecipeFormModal.vue'

const route   = useRoute()
const router  = useRouter()
const auth    = useAuthStore()
const lang    = useLangStore()
const recipe  = ref(null)
const loading = ref(true)
const tab     = ref('ingredients')

// ── Modal / actions ───────────────────────────────────────────────
const showFormModal = ref(false)
const deleting      = ref(false)

const canEdit = computed(() =>
  auth.isAuthenticated &&
  (auth.isAdmin || String(auth.user?.id) === String(recipe.value?.authorId))
)

async function deleteRecipe() {
  if (!confirm(lang.t('common.confirm_delete'))) return
  deleting.value = true
  try {
    await recipesApi.delete(recipe.value.id)
    router.push('/recipes')
  } catch {
    alert(lang.t('common.error_delete'))
  } finally {
    deleting.value = false
  }
}

function handleSaved(updated) {
  recipe.value = updated
  showFormModal.value = false
}

// ─────────────────────────────────────────────────────────────────

const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))

onMounted(async () => {
  try {
    const res = await recipesApi.getById(route.params.id)
    recipe.value = res.data?.data ?? res.data
  } catch {
    router.push('/recipes')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <!-- Skeleton -->
  <div v-if="loading" class="detail-wrap">
    <div class="skel-img" />
    <div class="skel-title" />
    <div class="skel-sub" />
    <div class="skel-stats">
      <div v-for="i in 4" :key="i" class="skel-stat" />
    </div>
  </div>

  <div v-else-if="recipe" class="detail-wrap">

    <!-- Back -->
    <button @click="router.back()" class="back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      {{ lang.t('common.back') }}
    </button>

    <!-- Hero image -->
    <div class="hero-img">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="lang.recipeTitle(recipe)" />
      <div v-else class="hero-placeholder">🍽️</div>

      <div class="hero-overlay">
        <span v-if="recipe.categoryNameUz" class="badge-cat">{{ recipe.categoryNameUz }}</span>
        <span v-if="recipe.difficultyLevel"
          class="badge-diff" :class="diffMap[recipe.difficultyLevel]?.cls">
          {{ diffMap[recipe.difficultyLevel]?.label }}
        </span>
      </div>
    </div>

    <!-- Title + meta -->
    <div class="title-block">
      <h1 class="recipe-title">{{ lang.recipeTitle(recipe) }}</h1>

      <p v-if="recipe.description" class="recipe-desc">{{ recipe.description }}</p>

      <!-- Tags -->
      <div v-if="recipe.tags?.length" class="tags">
        <span v-for="tag in recipe.tags" :key="tag.id" class="tag">#{{ tag.nameUz }}</span>
      </div>

      <!-- Author -->
      <div v-if="recipe.authorFullName" class="author">
        <div class="author-avatar">{{ recipe.authorFullName.charAt(0).toUpperCase() }}</div>
        <span>{{ recipe.authorFullName }}</span>
      </div>

      <!-- Edit / Delete (author or admin) -->
      <div v-if="canEdit" class="action-bar">
        <button @click="showFormModal = true" class="btn-action btn-edit-recipe">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
          {{ lang.t('recipe.edit') }}
        </button>
        <button @click="deleteRecipe" :disabled="deleting" class="btn-action btn-del-recipe">
          <span v-if="deleting" class="act-spinner" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
          {{ lang.t('recipe.delete') }}
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-item">
        <span class="stat-icon">⏱</span>
        <div class="stat-val">{{ (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) }} {{ lang.t('common.min') }}</div>
        <div class="stat-lbl">{{ lang.t('common.total_time') }}</div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">👥</span>
        <div class="stat-val">{{ recipe.servings }} {{ lang.t('common.ppl') }}</div>
        <div class="stat-lbl">{{ lang.t('common.servings') }}</div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <div class="stat-val">{{ recipe.averageRating?.toFixed(1) || '—' }}</div>
        <div class="stat-lbl">{{ lang.t('common.rating') }}</div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">👁</span>
        <div class="stat-val">{{ (recipe.viewCount || 0).toLocaleString() }}</div>
        <div class="stat-lbl">{{ lang.t('common.views') }}</div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <button
        v-for="t in [
          { key: 'ingredients', icon: '🧅', label: lang.t('recipe.ingredients') },
          { key: 'steps',       icon: '📋', label: lang.t('recipe.steps')       },
          { key: 'nutrition',   icon: '📊', label: lang.t('recipe.nutrition')   },
        ]"
        :key="t.key"
        @click="tab = t.key"
        class="tab-btn"
        :class="{ 'tab-active': tab === t.key }"
      >
        <span>{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </div>

    <!-- ─── Ingredients ─── -->
    <div v-if="tab === 'ingredients'" class="tab-content">
      <div v-if="recipe.ingredients?.length" class="ingredient-list">
        <div v-for="ing in recipe.ingredients" :key="ing.id" class="ingredient-row">
          <div class="ing-dot" />
          <span class="ing-name">{{ lang.ingName(ing) }}</span>
          <span class="ing-amount">{{ ing.amount }} <span class="ing-unit">{{ ing.unit }}</span></span>
        </div>
      </div>
      <div v-else class="tab-empty">
        <div class="te-icon">🧅</div>
        <p>{{ lang.t('recipe.no_ingredients') }}</p>
      </div>
    </div>

    <!-- ─── Steps ─── -->
    <div v-if="tab === 'steps'" class="tab-content">
      <div v-if="recipe.steps?.length" class="steps-list">
        <div v-for="step in recipe.steps" :key="step.id" class="step-item">
          <div class="step-num">{{ step.stepNumber }}</div>
          <div class="step-body">
            <p class="step-text">{{ step.instruction }}</p>
            <p v-if="step.durationMinutes" class="step-time">⏱ {{ step.durationMinutes }} {{ lang.t('common.min') }}</p>
            <img v-if="step.imageUrl" :src="step.imageUrl" class="step-img" />
          </div>
        </div>
      </div>
      <div v-else class="tab-empty">
        <div class="te-icon">📋</div>
        <p>{{ lang.t('recipe.no_steps') }}</p>
      </div>
    </div>

    <!-- ─── Nutrition ─── -->
    <div v-if="tab === 'nutrition'" class="tab-content">
      <div v-if="recipe.nutritionalInfo" class="nutrition-grid">
        <div v-for="n in [
            { icon: '🔥', label: lang.t('nutrition.calories'), val: recipe.nutritionalInfo.caloriesPerServing, unit: 'kcal' },
            { icon: '💪', label: lang.t('nutrition.protein'),  val: recipe.nutritionalInfo.proteinGrams,       unit: 'g'    },
            { icon: '🫐', label: lang.t('nutrition.fat'),      val: recipe.nutritionalInfo.fatGrams,           unit: 'g'    },
            { icon: '🌾', label: lang.t('nutrition.carbs'),    val: recipe.nutritionalInfo.carbohydrateGrams,  unit: 'g'    },
            { icon: '🥦', label: lang.t('nutrition.fiber'),    val: recipe.nutritionalInfo.fiberGrams,         unit: 'g'    },
            { icon: '🍯', label: lang.t('nutrition.sugar'),    val: recipe.nutritionalInfo.sugarGrams,         unit: 'g'    },
          ]"
          :key="n.label"
          class="nutrition-card"
        >
          <div class="nc-icon">{{ n.icon }}</div>
          <div class="nc-val">{{ n.val ?? '—' }}<span class="nc-unit">{{ n.unit }}</span></div>
          <div class="nc-label">{{ n.label }}</div>
        </div>
      </div>
      <div v-else class="tab-empty">
        <div class="te-icon">📊</div>
        <p>{{ lang.t('recipe.no_nutrition') }}</p>
      </div>
    </div>

  </div>

  <!-- Recipe Form Modal -->
  <RecipeFormModal
    v-if="recipe"
    :recipe="recipe"
    :visible="showFormModal"
    @close="showFormModal = false"
    @saved="handleSaved"
  />

</template>

<style scoped>
.detail-wrap {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Back ── */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: none;
  border: none;
  color: #64748b;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}
.back-btn:hover { color: #E8713E; }
.back-btn svg { width: 18px; height: 18px; }

/* ── Hero image ── */
.hero-img {
  position: relative;
  aspect-ratio: 16/9;
  border-radius: 20px;
  overflow: hidden;
  background: rgba(255,255,255,0.04);
}
.hero-img img { width: 100%; height: 100%; object-fit: cover; }
.hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80px;
  opacity: 0.15;
}
.hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 50%);
}
.badge-cat {
  padding: 5px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
  background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.9);
  backdrop-filter: blur(6px);
}
.badge-diff {
  padding: 5px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
}
.diff-easy   { background: rgba(216,90,48,0.9);  color: #fff; }
.diff-medium { background: rgba(234,179,8,0.9);  color: #fff; }
.diff-hard   { background: rgba(239,68,68,0.9);  color: #fff; }

/* ── Title block ── */
.title-block { display: flex; flex-direction: column; gap: 10px; }

.recipe-title {
  font-size: 26px;
  font-weight: 900;
  color: #f1f5f9;
  line-height: 1.2;
  letter-spacing: -0.3px;
}
.recipe-desc {
  font-size: 14px;
  color: #64748b;
  line-height: 1.7;
}

.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.2);
  color: #E8713E;
  font-size: 12px;
  font-weight: 700;
}

.author {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #64748b;
  font-weight: 600;
}
.author-avatar {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ── Stats ── */
.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.stat-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: border-color 0.2s;
}
.stat-item:hover { border-color: rgba(216,90,48,0.25); }
.stat-icon { font-size: 22px; }
.stat-val  { font-size: 14px; font-weight: 800; color: #e2e8f0; }
.stat-lbl  { font-size: 10px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; }

@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 4px;
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: none;
  border-radius: 12px;
  background: none;
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { color: #94a3b8; }
.tab-active {
  background: rgba(216,90,48,0.15);
  border: 1px solid rgba(216,90,48,0.25);
  color: #E8713E;
}

/* ── Tab content ── */
.tab-content { display: flex; flex-direction: column; gap: 8px; }

/* Ingredients */
.ingredient-list { display: flex; flex-direction: column; gap: 6px; }
.ingredient-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  transition: border-color 0.2s;
}
.ingredient-row:hover { border-color: rgba(216,90,48,0.2); }
.ing-dot  { width: 8px; height: 8px; border-radius: 50%; background: #E8713E; flex-shrink: 0; }
.ing-name { flex: 1; font-size: 14px; font-weight: 600; color: #cbd5e1; }
.ing-amount { font-size: 13px; font-weight: 700; color: #64748b; }
.ing-unit { font-size: 12px; color: #475569; }

/* Steps */
.steps-list { display: flex; flex-direction: column; gap: 12px; }
.step-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
}
.step-num {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 10px rgba(216,90,48,0.3);
}
.step-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.step-text { font-size: 14px; color: #94a3b8; line-height: 1.7; }
.step-time { font-size: 12px; color: #E8713E; font-weight: 700; }
.step-img  { border-radius: 12px; max-height: 160px; width: 100%; object-fit: cover; }

/* Nutrition */
.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.nutrition-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: border-color 0.2s;
}
.nutrition-card:hover { border-color: rgba(216,90,48,0.2); }
.nc-icon  { font-size: 28px; }
.nc-val   { font-size: 18px; font-weight: 900; color: #E8713E; }
.nc-unit  { font-size: 11px; color: #475569; margin-left: 2px; }
.nc-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }

@media (max-width: 480px) { .nutrition-grid { grid-template-columns: repeat(2, 1fr); } }

/* ── Action bar ── */
.action-bar {
  display: flex;
  gap: 8px;
  padding-top: 4px;
}
.btn-action {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-action svg { width: 16px; height: 16px; flex-shrink: 0; }

.btn-edit-recipe {
  flex: 1;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.25);
  color: #E8713E;
}
.btn-edit-recipe:hover { background: rgba(216,90,48,0.2); transform: translateY(-1px); }

.btn-del-recipe {
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.18);
  color: #f87171;
}
.btn-del-recipe:hover:not(:disabled) { background: rgba(239,68,68,0.16); transform: translateY(-1px); }
.btn-del-recipe:disabled { opacity: 0.5; cursor: not-allowed; }

.act-spinner {
  width: 14px; height: 14px;
  border: 2px solid rgba(239,68,68,0.3);
  border-top-color: #f87171;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* Empty states */
.tab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
  gap: 10px;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
}
.te-icon { font-size: 44px; }

/* Skeleton */
.skel-img   { width: 100%; aspect-ratio: 16/9; border-radius: 20px; background: rgba(255,255,255,0.06); animation: pulse 1.5s ease-in-out infinite; }
.skel-title { height: 34px; width: 70%; border-radius: 10px; background: rgba(255,255,255,0.05); animation: pulse 1.5s ease-in-out infinite; }
.skel-sub   { height: 18px; width: 50%; border-radius: 8px; background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; }
.skel-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.skel-stat  { height: 80px; border-radius: 16px; background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
