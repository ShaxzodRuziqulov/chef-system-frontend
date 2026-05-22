<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter }             from 'vue-router'
import { useAuthStore }                    from '@/stores/authStore'
import { useLangStore }                    from '@/stores/langStore'
import { useUnitsStore }                   from '@/stores/unitsStore'
import { useFavoritesStore }               from '@/stores/favoritesStore'
import { recipesApi }                      from '@/api/recipes'
import { ratingsApi }                      from '@/api/ratings'
import { commentsApi }                     from '@/api/comments'
import RecipeFormModal                     from '@/components/recipe/RecipeFormModal.vue'
import { resolveImageUrl }                 from '@/utils/imageUrl'

const route     = useRoute()
const router    = useRouter()
const auth      = useAuthStore()
const lang      = useLangStore()
const units     = useUnitsStore()
const favorites = useFavoritesStore()

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
    router.push('/app/recipes')
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

// ── Difficulty map ────────────────────────────────────────────────
const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))

// ── Favorites ─────────────────────────────────────────────────────
const favLoading = ref(false)

const isFaved = computed(() =>
  recipe.value ? favorites.isFavorited(recipe.value.id) : false
)

async function toggleFav() {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  if (favLoading.value) return
  favLoading.value = true
  try {
    await favorites.toggle(recipe.value.id)
  } finally {
    favLoading.value = false
  }
}

// ── Rating ────────────────────────────────────────────────────────
const myScore      = ref(0)
const hoverScore   = ref(0)
const ratingCount  = ref(0)
const avgRating    = ref(0)
const ratingLoading = ref(false)

async function loadRating(recipeId) {
  try {
    const res = await ratingsApi.getMyRating(recipeId)
    const d   = res.data?.data
    if (d) {
      myScore.value     = d.myScore
      avgRating.value   = d.averageRating
      ratingCount.value = d.ratingCount
    }
  } catch { /* ignore */ }
}

async function submitRating(score) {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  if (ratingLoading.value) return
  ratingLoading.value = true
  try {
    const res = await ratingsApi.rate(recipe.value.id, score)
    const d   = res.data?.data
    if (d) {
      myScore.value     = d.myScore
      avgRating.value   = d.averageRating
      ratingCount.value = d.ratingCount
      // Sync displayed rating on recipe card
      if (recipe.value) {
        recipe.value.averageRating = d.averageRating
        recipe.value.ratingCount   = d.ratingCount
      }
    }
  } catch { /* ignore */ } finally {
    ratingLoading.value = false
  }
}

// ── Comments ──────────────────────────────────────────────────────
const comments      = ref([])
const commentsTotal = ref(0)
const commentsPage  = ref(0)
const commentsLast  = ref(false)
const commentsLoad  = ref(false)
const newComment    = ref('')
const submitting    = ref(false)

async function loadComments(reset = false) {
  if (!recipe.value) return
  if (commentsLoad.value) return
  if (reset) { commentsPage.value = 0; commentsLast.value = false; comments.value = [] }
  commentsLoad.value = true
  try {
    const res = await commentsApi.getAll(recipe.value.id, { page: commentsPage.value, size: 15 })
    const d   = res.data?.data
    if (d) {
      comments.value    = reset ? d.content : [...comments.value, ...d.content]
      commentsTotal.value = d.totalElements
      commentsLast.value  = d.last
      commentsPage.value++
    }
  } catch { /* ignore */ } finally {
    commentsLoad.value = false
  }
}

async function submitComment() {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  const text = newComment.value.trim()
  if (!text) return
  submitting.value = true
  try {
    const res = await commentsApi.add(recipe.value.id, text)
    const c   = res.data?.data
    if (c) {
      comments.value = [c, ...comments.value]
      commentsTotal.value++
    }
    newComment.value = ''
  } catch { /* ignore */ } finally {
    submitting.value = false
  }
}

async function deleteComment(commentId) {
  if (!confirm('Izohni o\'chirishni tasdiqlaysizmi?')) return
  try {
    await commentsApi.delete(recipe.value.id, commentId)
    comments.value  = comments.value.filter(c => c.id !== commentId)
    commentsTotal.value--
  } catch { /* ignore */ }
}

watch(tab, (newTab) => {
  if (newTab === 'comments' && comments.value.length === 0) {
    loadComments(true)
  }
})

// ── Mount ─────────────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await recipesApi.getById(route.params.id)
    recipe.value = res.data?.data ?? res.data
    if (recipe.value) {
      avgRating.value   = recipe.value.averageRating ?? 0
      ratingCount.value = recipe.value.ratingCount   ?? 0
      loadRating(recipe.value.id)
      recipesApi.incrementView(recipe.value.id).catch(() => {})
    }
  } catch {
    router.push('/app/recipes')
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
      <img v-if="recipe.imageUrl" :src="resolveImageUrl(recipe.imageUrl)" :alt="lang.recipeTitle(recipe)" />
      <div v-else class="hero-placeholder">🍽️</div>

      <div class="hero-overlay">
        <span v-if="recipe.categoryNameUz" class="badge-cat">{{ lang.catName(recipe) }}</span>
        <span v-if="recipe.difficultyLevel"
          class="badge-diff" :class="diffMap[recipe.difficultyLevel]?.cls">
          {{ diffMap[recipe.difficultyLevel]?.label }}
        </span>
      </div>

      <!-- Favorite button -->
      <button
        class="fav-btn"
        :class="{ 'fav-active': isFaved, 'fav-loading': favLoading }"
        @click="toggleFav"
        :title="isFaved ? 'Sevimlilardan o\'chirish' : 'Sevimlilarga qo\'shish'"
      >
        <svg viewBox="0 0 24 24" :fill="isFaved ? 'currentColor' : 'none'" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
        </svg>
      </button>
    </div>

    <!-- Title + meta -->
    <div class="title-block">
      <h1 class="recipe-title">{{ lang.recipeTitle(recipe) }}</h1>

      <!-- Interactive star rating -->
      <div class="star-row">
        <div class="stars">
          <button
            v-for="s in 5"
            :key="s"
            class="star-btn"
            :class="{
              'star-filled': s <= (hoverScore || myScore),
              'star-hover':  s <= hoverScore && s > myScore
            }"
            @mouseenter="hoverScore = s"
            @mouseleave="hoverScore = 0"
            @click="submitRating(s)"
            :disabled="ratingLoading"
          >★</button>
        </div>
        <span class="star-meta">
          <span v-if="avgRating > 0" class="star-avg">{{ avgRating.toFixed(1) }}</span>
          <span v-if="ratingCount > 0" class="star-count">({{ ratingCount }})</span>
          <span v-if="myScore > 0" class="star-mine">· Sizning bahoyingiz: {{ myScore }}⭐</span>
        </span>
      </div>

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
        <div class="stat-val">{{ avgRating > 0 ? avgRating.toFixed(1) : '—' }}</div>
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
          { key: 'comments',    icon: '💬', label: 'Izohlar'                    },
        ]"
        :key="t.key"
        @click="tab = t.key"
        class="tab-btn"
        :class="{ 'tab-active': tab === t.key }"
      >
        <span>{{ t.icon }}</span>
        <span>{{ t.label }}</span>
        <span v-if="t.key === 'comments' && commentsTotal > 0" class="tab-badge">{{ commentsTotal }}</span>
      </button>
    </div>

    <!-- ─── Ingredients ─── -->
    <div v-if="tab === 'ingredients'" class="tab-content">
      <div v-if="recipe.ingredients?.length" class="ingredient-list">
        <div v-for="ing in recipe.ingredients" :key="ing.id" class="ingredient-row">
          <div class="ing-dot" />
          <span class="ing-name">{{ lang.ingName(ing) }}</span>
          <span class="ing-amount">{{ units.formatAmount(ing.amount, ing.unit) }}</span>
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
            <img v-if="step.imageUrl" :src="resolveImageUrl(step.imageUrl)" class="step-img" />
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

    <!-- ─── Comments ─── -->
    <div v-if="tab === 'comments'" class="tab-content comments-section">

      <!-- Add comment -->
      <div v-if="auth.isAuthenticated" class="comment-form">
        <div class="cf-avatar">{{ auth.initials || '?' }}</div>
        <div class="cf-input-wrap">
          <textarea
            v-model="newComment"
            class="cf-textarea"
            placeholder="Izohingizni yozing..."
            rows="2"
            maxlength="2000"
            @keydown.ctrl.enter="submitComment"
          />
          <div class="cf-actions">
            <span class="cf-hint">Ctrl+Enter — yuborish</span>
            <button
              class="cf-submit"
              :disabled="!newComment.trim() || submitting"
              @click="submitComment"
            >
              <span v-if="submitting" class="act-spinner" />
              <span v-else>Yuborish</span>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="comment-login-hint">
        <span>Izoh qoldirish uchun </span>
        <RouterLink to="/login" class="cl-link">tizimga kiring</RouterLink>
      </div>

      <!-- Comments list -->
      <div v-if="commentsLoad && comments.length === 0" class="comments-loading">
        <div v-for="i in 3" :key="i" class="skel-comment" />
      </div>

      <template v-else>
        <div v-if="comments.length === 0 && !commentsLoad" class="tab-empty">
          <div class="te-icon">💬</div>
          <p>Hali izoh qoldirilmagan. Birinchi bo'ling!</p>
        </div>

        <div v-for="c in comments" :key="c.id" class="comment-item">
          <div class="ci-avatar">{{ c.userName?.charAt(0)?.toUpperCase() || '?' }}</div>
          <div class="ci-body">
            <div class="ci-header">
              <span class="ci-name">{{ c.userName }}</span>
              <span class="ci-time">{{ new Date(c.createdAt).toLocaleDateString('uz-UZ') }}</span>
            </div>
            <p class="ci-text">{{ c.content }}</p>
          </div>
          <button
            v-if="c.mine || auth.isAdmin"
            class="ci-del"
            @click="deleteComment(c.id)"
            title="O'chirish"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Load more -->
        <button
          v-if="!commentsLast && comments.length > 0"
          class="load-more-btn"
          :disabled="commentsLoad"
          @click="loadComments(false)"
        >
          <span v-if="commentsLoad" class="act-spinner" />
          <span v-else>Ko'proq ko'rsatish</span>
        </button>
      </template>
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
  color: var(--tx-4);
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
  background: var(--bg-card-md);
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

/* Favourite btn on hero */
.fav-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: all 0.2s;
  flex-shrink: 0;
}
.fav-btn svg { width: 22px; height: 22px; }
.fav-btn:hover { background: rgba(216,90,48,0.7); transform: scale(1.1); }
.fav-active { color: #ef4444 !important; background: rgba(239,68,68,0.2) !important; }
.fav-loading { opacity: 0.6; pointer-events: none; }

/* ── Title block ── */
.title-block { display: flex; flex-direction: column; gap: 10px; }

.recipe-title {
  font-size: 26px;
  font-weight: 900;
  color: var(--tx-1);
  line-height: 1.2;
  letter-spacing: -0.3px;
}
.recipe-desc {
  font-size: 14px;
  color: var(--tx-4);
  line-height: 1.7;
}

/* ── Star rating ── */
.star-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.stars { display: flex; gap: 2px; }
.star-btn {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: var(--tx-6);
  transition: color 0.15s, transform 0.1s;
  padding: 0 1px;
}
.star-btn:disabled { cursor: default; }
.star-btn:not(:disabled):hover { transform: scale(1.2); }
.star-filled { color: #f59e0b; }
.star-hover  { color: #fbbf24; }
.star-meta   { display: flex; align-items: center; gap: 5px; font-size: 13px; }
.star-avg    { font-weight: 800; color: var(--tx-2); }
.star-count  { color: var(--tx-5); }
.star-mine   { color: #E8713E; font-weight: 600; }

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
  color: var(--tx-4);
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
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.stat-item:hover { border-color: rgba(216,90,48,0.25); }
.stat-icon { font-size: 22px; }
.stat-val  { font-size: 14px; font-weight: 800; color: var(--tx-2); }
.stat-lbl  { font-size: 10px; font-weight: 600; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.05em; }

@media (max-width: 480px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}

/* ── Tab bar ── */
.tab-bar {
  display: flex;
  gap: 4px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  padding: 10px 6px;
  border: none;
  border-radius: 12px;
  background: none;
  color: var(--tx-5);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}
.tab-btn:hover { color: var(--tx-3); }
.tab-active {
  background: rgba(216,90,48,0.15);
  border: 1px solid rgba(216,90,48,0.25);
  color: #E8713E;
}
.tab-badge {
  background: #E8713E;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
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
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 12px;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.ingredient-row:hover { border-color: rgba(216,90,48,0.2); }
.ing-dot  { width: 8px; height: 8px; border-radius: 50%; background: #E8713E; flex-shrink: 0; }
.ing-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--tx-2); }
.ing-amount { font-size: 13px; font-weight: 700; color: var(--tx-4); }

/* Steps */
.steps-list { display: flex; flex-direction: column; gap: 12px; }
.step-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
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
.step-text { font-size: 14px; color: var(--tx-3); line-height: 1.7; }
.step-time { font-size: 12px; color: #E8713E; font-weight: 700; }
.step-img  { border-radius: 12px; max-height: 160px; width: 100%; object-fit: cover; }

/* Nutrition */
.nutrition-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}
.nutrition-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 16px 12px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.nutrition-card:hover { border-color: rgba(216,90,48,0.2); }
.nc-icon  { font-size: 28px; }
.nc-val   { font-size: 18px; font-weight: 900; color: #E8713E; }
.nc-unit  { font-size: 11px; color: var(--tx-5); margin-left: 2px; }
.nc-label { font-size: 11px; font-weight: 700; color: var(--tx-4); text-transform: uppercase; letter-spacing: 0.06em; }

@media (max-width: 480px) { .nutrition-grid { grid-template-columns: repeat(2, 1fr); } }

/* ── Action bar ── */
.action-bar { display: flex; gap: 8px; padding-top: 4px; }
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
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Comments ── */
.comments-section { gap: 12px; }

.comment-form {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 16px;
  padding: 14px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.cf-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cf-input-wrap { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.cf-textarea {
  width: 100%;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px;
  color: var(--tx-2);
  font-size: 14px;
  padding: 10px 12px;
  resize: vertical;
  min-height: 60px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s;
}
.cf-textarea:focus { border-color: rgba(216,90,48,0.4); }
.cf-textarea::placeholder { color: var(--tx-5); }
.cf-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.cf-hint { font-size: 11px; color: var(--tx-6); }
.cf-submit {
  padding: 8px 18px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cf-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.cf-submit:not(:disabled):hover { opacity: 0.85; transform: translateY(-1px); }

.comment-login-hint {
  text-align: center;
  font-size: 14px;
  color: var(--tx-5);
  padding: 16px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.cl-link { color: #E8713E; font-weight: 700; text-decoration: none; }
.cl-link:hover { text-decoration: underline; }

.comment-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px 14px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 14px;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.comment-item:hover { border-color: var(--bd-md); }
.ci-avatar {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--bg-input-f);
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.ci-body { flex: 1; min-width: 0; }
.ci-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.ci-name  { font-size: 13px; font-weight: 700; color: var(--tx-2); }
.ci-time  { font-size: 11px; color: var(--tx-6); }
.ci-text  { font-size: 14px; color: var(--tx-3); line-height: 1.6; word-break: break-word; }
.ci-del {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--tx-6);
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  transition: color 0.2s, background 0.2s;
}
.ci-del:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
.ci-del svg { width: 14px; height: 14px; }

.comments-loading { display: flex; flex-direction: column; gap: 8px; }
.skel-comment {
  height: 68px;
  border-radius: 14px;
  background: var(--bg-card-md);
  animation: pulse 1.5s ease-in-out infinite;
}

.load-more-btn {
  align-self: center;
  padding: 10px 24px;
  border-radius: 12px;
  border: 1px solid var(--bd-md);
  background: var(--bg-card);
  color: var(--tx-4);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.load-more-btn:hover:not(:disabled) { border-color: rgba(216,90,48,0.3); color: #E8713E; }
.load-more-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty states */
.tab-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  gap: 10px;
  color: var(--tx-5);
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.te-icon { font-size: 44px; }

/* Skeleton */
.skel-img   { width: 100%; aspect-ratio: 16/9; border-radius: 20px; background: var(--bd); animation: pulse 1.5s ease-in-out infinite; }
.skel-title { height: 34px; width: 70%; border-radius: 10px; background: var(--bg-input); animation: pulse 1.5s ease-in-out infinite; }
.skel-sub   { height: 18px; width: 50%; border-radius: 8px; background: var(--bg-card-md); animation: pulse 1.5s ease-in-out infinite; }
.skel-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
.skel-stat  { height: 80px; border-radius: 16px; background: var(--bg-card-md); animation: pulse 1.5s ease-in-out infinite; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
