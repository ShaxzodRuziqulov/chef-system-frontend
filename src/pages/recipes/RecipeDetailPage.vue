<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter }             from 'vue-router'
import { useAuthStore }                    from '@/stores/authStore'
import { useLangStore }                    from '@/stores/langStore'
import { useUnitsStore }                   from '@/stores/unitsStore'
import { useFavoritesStore }               from '@/stores/favoritesStore'
import { useToast }                        from '@/composables/useToast'
import { recipesApi }                      from '@/api/recipes'
import { ratingsApi }                      from '@/api/ratings'
import { commentsApi }                     from '@/api/comments'
import RecipeFormModal                     from '@/components/recipe/RecipeFormModal.vue'
import ConfirmModal                        from '@/components/ui/ConfirmModal.vue'
import { resolveImageUrl }                 from '@/utils/imageUrl'
import { formatDate }                      from '@/utils/formatDate'

const route     = useRoute()
const router    = useRouter()
const auth      = useAuthStore()
const lang      = useLangStore()
const units     = useUnitsStore()
const favorites = useFavoritesStore()
const toast     = useToast()

function requireAuth(msg) { toast.warning(msg) }

const recipe           = ref(null)
const loading          = ref(true)
const tab              = ref('ingredients')
const activeGalleryIdx = ref(null)
const similarRecipes   = ref([])

function scrollToVideo() {
  document.getElementById('recipe-video')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

function getEmbedUrl(url) {
  if (!url) return null
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`
  if (url.includes('youtube.com/embed/')) return url
  return null
}

function isLocalVideo(url) {
  if (!url) return false
  if (url.includes('youtube') || url.includes('youtu.be')) return false
  return url.startsWith('/uploads/') || url.startsWith('http')
}

// ── Serving scaler ────────────────────────────────────────────────
const servings = ref(0)
watch(() => recipe.value?.servings, (v) => { if (v) servings.value = v }, { immediate: true })

function scaleAmount(amount) {
  if (!recipe.value?.servings || !servings.value || !amount) return amount
  return +(amount * servings.value / recipe.value.servings).toFixed(2)
}

function changeServings(delta) {
  const next = servings.value + delta
  if (next >= 1 && next <= 50) servings.value = next
}

// ── Cooking mode — checked ingredients ───────────────────────────
const checkedIngs = ref(new Set())
function toggleIngCheck(id) {
  const s = new Set(checkedIngs.value)
  s.has(id) ? s.delete(id) : s.add(id)
  checkedIngs.value = s
}
const allChecked = computed(() =>
  recipe.value?.ingredients?.length > 0 &&
  recipe.value.ingredients.every(i => checkedIngs.value.has(i.id))
)
function resetChecked() { checkedIngs.value = new Set() }

// ── Modal / actions ───────────────────────────────────────────────
const showFormModal   = ref(false)
const deleting        = ref(false)
const showDeleteModal = ref(false)

const canEdit = computed(() =>
  auth.isAuthenticated &&
  (auth.isAdmin || (auth.isBlogger && String(auth.user?.id) === String(recipe.value?.authorId)))
)

async function confirmDeleteRecipe() {
  showDeleteModal.value = false
  deleting.value = true
  try {
    await recipesApi.delete(recipe.value.id)
    router.push('/app/recipes')
  } catch {
    toast.error(lang.t('common.error_delete'))
  } finally {
    deleting.value = false
  }
}

function handleSaved(updated) {
  recipe.value = updated
  showFormModal.value = false
  tab.value = 'ingredients'
}

// ── Difficulty ────────────────────────────────────────────────────
const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))

// ── Favorites ─────────────────────────────────────────────────────
const favLoading = ref(false)
const isFaved = computed(() => recipe.value ? favorites.isFavorited(recipe.value.id) : false)

async function toggleFav() {
  if (!auth.isAuthenticated) { requireAuth("Sevimlilarga qo'shish uchun tizimga kiring"); return }
  if (favLoading.value) return
  favLoading.value = true
  try { await favorites.toggle(recipe.value.id) }
  finally { favLoading.value = false }
}

// ── Rating ────────────────────────────────────────────────────────
const myScore       = ref(0)
const hoverScore    = ref(0)
const ratingCount   = ref(0)
const avgRating     = ref(0)
const ratingLoading = ref(false)

async function loadRating(recipeId) {
  try {
    const res = await ratingsApi.getMyRating(recipeId)
    const d   = res.data?.data
    if (d) { myScore.value = d.myScore; avgRating.value = d.averageRating; ratingCount.value = d.ratingCount }
  } catch { /* ignore */ }
}

async function submitRating(score) {
  if (!auth.isAuthenticated) { requireAuth('Reyting berish uchun tizimga kiring'); return }
  if (ratingLoading.value) return
  ratingLoading.value = true
  try {
    const res = await ratingsApi.rate(recipe.value.id, score)
    const d   = res.data?.data
    if (d) {
      myScore.value = d.myScore; avgRating.value = d.averageRating; ratingCount.value = d.ratingCount
      if (recipe.value) { recipe.value.averageRating = d.averageRating; recipe.value.ratingCount = d.ratingCount }
    }
  } catch { /* ignore */ } finally { ratingLoading.value = false }
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
  if (!recipe.value || commentsLoad.value) return
  if (reset) { commentsPage.value = 0; commentsLast.value = false; comments.value = [] }
  commentsLoad.value = true
  try {
    const res = await commentsApi.getAll(recipe.value.id, { page: commentsPage.value, size: 15 })
    const d   = res.data?.data
    if (d) {
      comments.value      = reset ? d.content : [...comments.value, ...d.content]
      commentsTotal.value = d.totalElements
      commentsLast.value  = d.last
      commentsPage.value++
    }
  } catch { /* ignore */ } finally { commentsLoad.value = false }
}

async function submitComment() {
  if (!auth.isAuthenticated) { requireAuth('Izoh qoldirish uchun tizimga kiring'); return }
  const text = newComment.value.trim()
  if (!text) return
  submitting.value = true
  try {
    const res = await commentsApi.add(recipe.value.id, text)
    const c   = res.data?.data
    if (c) { comments.value = [c, ...comments.value]; commentsTotal.value++ }
    newComment.value = ''
  } catch { /* ignore */ } finally { submitting.value = false }
}

async function deleteComment(commentId) {
  if (!confirm('Izohni o\'chirishni tasdiqlaysizmi?')) return
  try {
    await commentsApi.delete(recipe.value.id, commentId)
    comments.value = comments.value.filter(c => c.id !== commentId)
    commentsTotal.value--
  } catch { /* ignore */ }
}

const LOCKED_TABS = ['steps', 'nutrition', 'comments']

function onTabClick(key) {
  if (!auth.isAuthenticated && LOCKED_TABS.includes(key)) {
    toast.warning('Bu qismni ko\'rish uchun tizimga kiring')
  }
  tab.value = key
}

watch(tab, (newTab) => {
  if (newTab === 'comments' && auth.isAuthenticated && comments.value.length === 0) {
    loadComments(true)
  }
})

onMounted(async () => {
  try {
    const res = await recipesApi.getById(route.params.id)
    recipe.value = res.data?.data ?? res.data
    if (recipe.value) {
      servings.value    = recipe.value.servings ?? 1
      avgRating.value   = recipe.value.averageRating ?? 0
      ratingCount.value = recipe.value.ratingCount   ?? 0
      loadRating(recipe.value.id)
      recipesApi.incrementView(recipe.value.id).catch(() => {})
      if (recipe.value.categoryId) {
        recipesApi.getSimilar(recipe.value.id, 6)
          .then(r => { similarRecipes.value = r.data?.data ?? [] })
          .catch(() => {})
      }
    }
  } catch {
    router.push('/app/recipes')
  } finally {
    loading.value = false
  }
})

watch(() => route.params.id, async (newId) => {
  if (!newId) return
  loading.value = true
  similarRecipes.value = []
  tab.value = 'ingredients'
  try {
    const res = await recipesApi.getById(newId)
    recipe.value = res.data?.data ?? res.data
    if (recipe.value) {
      servings.value    = recipe.value.servings ?? 1
      avgRating.value   = recipe.value.averageRating ?? 0
      ratingCount.value = recipe.value.ratingCount   ?? 0
      checkedIngs.value = new Set()
      comments.value    = []
      commentsPage.value = 0
      commentsLast.value = false
      loadRating(recipe.value.id)
      recipesApi.incrementView(recipe.value.id).catch(() => {})
      if (recipe.value.categoryId) {
        recipesApi.getSimilar(recipe.value.id, 6)
          .then(r => { similarRecipes.value = r.data?.data ?? [] })
          .catch(() => {})
      }
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
    <div class="skel skel-img" />
    <div class="skel skel-title" />
    <div class="skel skel-sub" />
    <div class="skel-stats-row">
      <div v-for="i in 4" :key="i" class="skel skel-stat" />
    </div>
  </div>

  <div v-else-if="recipe" class="detail-wrap">

    <!-- Back -->
    <button @click="router.push('/app/recipes')" class="back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      {{ lang.t('common.back') }}
    </button>

    <!-- Hero -->
    <div class="hero">
      <img v-if="recipe.imageUrl" :src="resolveImageUrl(recipe.imageUrl)" :alt="lang.recipeTitle(recipe)" class="hero-img" />
      <div v-else class="hero-placeholder">🍽️</div>

      <div class="hero-gradient" />

      <!-- Bottom badges -->
      <div class="hero-bottom">
        <span
          v-if="recipe.categoryNameUz"
          class="hero-badge hero-badge--cat hero-badge--clickable"
          @click="router.push({ name: 'Recipes', query: { category: recipe.categoryId } })"
        >{{ lang.catName(recipe) }}</span>
        <span v-if="recipe.difficultyLevel" class="hero-badge" :class="diffMap[recipe.difficultyLevel]?.cls">
          {{ diffMap[recipe.difficultyLevel]?.label }}
        </span>
      </div>

      <!-- Video play -->
      <button v-if="recipe.videoUrl" class="play-btn" @click="scrollToVideo">
        <div class="play-circle">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="9,7 19,12 9,17"/></svg>
        </div>
      </button>

      <!-- Top-right actions -->
      <div class="hero-top-right">
        <!-- Edit (compact icon) -->
        <button v-if="canEdit" @click="showFormModal = true" class="hero-action-btn" title="Tahrirlash">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>
        </button>
        <!-- Delete (compact icon) -->
        <button v-if="canEdit" @click="showDeleteModal = true" :disabled="deleting" class="hero-action-btn hero-action-btn--del" title="O'chirish">
          <span v-if="deleting" class="act-spinner" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
          </svg>
        </button>
        <!-- Favorite -->
        <button
          class="hero-action-btn"
          :class="{ 'hero-action-btn--fav': isFaved }"
          @click="toggleFav"
          :title="isFaved ? 'Sevimlilardan o\'chirish' : 'Sevimlilarga qo\'shish'"
        >
          <span v-if="!auth.isAuthenticated">🔒</span>
          <svg v-else viewBox="0 0 24 24" :fill="isFaved ? 'currentColor' : 'none'" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Gallery -->
    <div v-if="recipe.images?.length" class="gallery-wrap">
      <div class="gallery-strip">
        <div
          v-for="(img, i) in recipe.images" :key="img.id"
          class="gallery-thumb" :class="{ 'gallery-thumb--active': activeGalleryIdx === i }"
          @click="activeGalleryIdx = i"
        >
          <img :src="resolveImageUrl(img.imageUrl)" :alt="`Rasm ${i+1}`" />
        </div>
      </div>
      <div v-if="activeGalleryIdx !== null" class="gallery-fullview">
        <button class="gal-nav" @click="activeGalleryIdx = Math.max(0, activeGalleryIdx - 1)" :disabled="activeGalleryIdx === 0">‹</button>
        <img :src="resolveImageUrl(recipe.images[activeGalleryIdx].imageUrl)" class="gal-full-img" />
        <button class="gal-nav" @click="activeGalleryIdx = Math.min(recipe.images.length-1, activeGalleryIdx + 1)" :disabled="activeGalleryIdx === recipe.images.length - 1">›</button>
      </div>
    </div>

    <!-- Video -->
    <div v-if="recipe.videoUrl" id="recipe-video" class="video-wrap">
      <video v-if="isLocalVideo(recipe.videoUrl)" class="video-iframe" controls preload="metadata" :src="recipe.videoUrl" />
      <iframe v-else-if="getEmbedUrl(recipe.videoUrl)" :src="getEmbedUrl(recipe.videoUrl)"
        class="video-iframe" frameborder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen />
    </div>

    <!-- Title block -->
    <div class="title-block">
      <h1 class="recipe-title">{{ lang.recipeTitle(recipe) }}</h1>

      <!-- Stars -->
      <div class="star-row">
        <div class="stars" :class="{ 'stars--locked': !auth.isAuthenticated }">
          <button
            v-for="s in 5" :key="s"
            class="star-btn"
            :class="{
              'star-btn--filled': s <= (hoverScore || myScore || (auth.isAuthenticated ? 0 : Math.round(avgRating))),
              'star-btn--hover':  auth.isAuthenticated && s <= hoverScore && s > myScore,
            }"
            @mouseenter="auth.isAuthenticated && (hoverScore = s)"
            @mouseleave="auth.isAuthenticated && (hoverScore = 0)"
            @click="submitRating(s)"
            :disabled="ratingLoading"
          >★</button>
        </div>
        <span class="star-meta">
          <span v-if="avgRating > 0" class="star-avg">{{ avgRating.toFixed(1) }}</span>
          <span v-if="ratingCount > 0" class="star-cnt">({{ ratingCount }})</span>
          <span v-if="myScore > 0 && auth.isAuthenticated" class="star-mine">· Sizniki: {{ myScore }}★</span>
          <span v-if="!auth.isAuthenticated" class="star-hint">· 🔒 Kiring</span>
        </span>
      </div>

      <p v-if="recipe.description" class="recipe-desc">{{ recipe.description }}</p>

      <!-- Tags + Author row -->
      <div class="meta-row">
        <div v-if="recipe.tags?.length" class="tags">
          <span v-for="tag in recipe.tags" :key="tag.id" class="tag">#{{ tag.nameUz }}</span>
        </div>
        <div v-if="recipe.authorFullName" class="author">
          <div class="author-avatar">{{ recipe.authorFullName.charAt(0).toUpperCase() }}</div>
          <span class="author-name">{{ recipe.authorFullName }}</span>
        </div>
      </div>
    </div>

    <!-- Compact stats bar -->
    <div class="stats-bar">
      <div class="stat-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
        </svg>
        <div>
          <div class="sp-val">{{ (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) }} {{ lang.t('common.min') }}</div>
          <div class="sp-lbl">{{ lang.t('common.total_time') }}</div>
        </div>
      </div>
      <div class="stat-divider" />
      <div class="stat-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
        </svg>
        <div>
          <div class="sp-val">{{ recipe.servings }} {{ lang.t('common.ppl') }}</div>
          <div class="sp-lbl">{{ lang.t('common.servings') }}</div>
        </div>
      </div>
      <div class="stat-divider" />
      <div class="stat-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
        <div>
          <div class="sp-val" :class="{ 'sp-val--muted': avgRating === 0 }">
            {{ avgRating > 0 ? avgRating.toFixed(1) : '—' }}
          </div>
          <div class="sp-lbl">{{ lang.t('common.rating') }}</div>
        </div>
      </div>
      <div class="stat-divider" />
      <div class="stat-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
        </svg>
        <div>
          <div class="sp-val">{{ (recipe.viewCount || 0).toLocaleString() }}</div>
          <div class="sp-lbl">{{ lang.t('common.views') }}</div>
        </div>
      </div>
    </div>

    <!-- Tab bar -->
    <div class="tab-bar">
      <!-- Ingredientlar -->
      <button @click="onTabClick('ingredients')" class="tab-btn" :class="{ 'tab-btn--active': tab === 'ingredients' }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <span class="tab-label">{{ lang.t('recipe.ingredients') }}</span>
      </button>

      <!-- Bosqichlar -->
      <button @click="onTabClick('steps')" class="tab-btn" :class="{ 'tab-btn--active': tab === 'steps', 'tab-btn--locked': !auth.isAuthenticated }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>
        </svg>
        <span class="tab-label">{{ lang.t('recipe.steps') }}</span>
        <svg v-if="!auth.isAuthenticated" class="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </button>

      <!-- Ozuqa -->
      <button @click="onTabClick('nutrition')" class="tab-btn" :class="{ 'tab-btn--active': tab === 'nutrition', 'tab-btn--locked': !auth.isAuthenticated }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
        <span class="tab-label">{{ lang.t('recipe.nutrition') }}</span>
        <svg v-if="!auth.isAuthenticated" class="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </button>

      <!-- Izohlar -->
      <button @click="onTabClick('comments')" class="tab-btn" :class="{ 'tab-btn--active': tab === 'comments', 'tab-btn--locked': !auth.isAuthenticated }">
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
        </svg>
        <span class="tab-label">Izohlar</span>
        <span v-if="!auth.isAuthenticated">
          <svg class="tab-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
          </svg>
        </span>
        <span v-else-if="commentsTotal > 0" class="tab-badge">{{ commentsTotal }}</span>
      </button>
    </div>

    <!-- ─── Ingredients tab ─── -->
    <div v-if="tab === 'ingredients'" class="tab-content">

      <!-- Serving scaler -->
      <div class="serving-scaler">
        <div class="ss-left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M23 21v-2a4 4 0 00-3-3.87"/>
          </svg>
          <span class="ss-label">Porsiya</span>
        </div>
        <div class="ss-controls">
          <button class="ss-btn" @click="changeServings(-1)" :disabled="servings <= 1">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="5" y1="12" x2="19" y2="12" stroke-width="2.5" stroke-linecap="round"/></svg>
          </button>
          <span class="ss-val">{{ servings }}</span>
          <button class="ss-btn" @click="changeServings(1)" :disabled="servings >= 50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-width="2.5" d="M12 5v14M5 12h14"/></svg>
          </button>
        </div>
        <button v-if="checkedIngs.size > 0" class="ss-reset" @click="resetChecked" title="Belgilarni tozalash">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          {{ checkedIngs.size }}/{{ recipe.ingredients?.length }}
        </button>
      </div>

      <!-- Progress bar for checked -->
      <div v-if="recipe.ingredients?.length" class="ing-progress-wrap">
        <div class="ing-progress-bar">
          <div class="ing-progress-fill" :style="{ width: (checkedIngs.size / recipe.ingredients.length * 100) + '%' }" />
        </div>
        <span v-if="allChecked" class="ing-all-done">✓ Hammasi tayyor!</span>
      </div>

      <div v-if="recipe.ingredients?.length" class="ingredient-list">
        <div
          v-for="ing in recipe.ingredients" :key="ing.id"
          class="ingredient-row"
          :class="{ 'ingredient-row--checked': checkedIngs.has(ing.id) }"
          @click="toggleIngCheck(ing.id)"
        >
          <div class="ing-check" :class="{ 'ing-check--done': checkedIngs.has(ing.id) }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span class="ing-name" :class="{ 'ing-name--done': checkedIngs.has(ing.id) }">
            {{ lang.ingName(ing) }}
          </span>
          <span class="ing-amount" :class="{ 'ing-amount--changed': servings !== recipe.servings }">
            {{ units.formatAmount(scaleAmount(ing.amount), ing.unit) }}
          </span>
        </div>
      </div>

      <div v-else class="tab-empty">
        <span class="te-icon">🧅</span>
        <p>{{ lang.t('recipe.no_ingredients') }}</p>
      </div>
    </div>

    <!-- ─── Locked panel ─── -->
    <div v-if="!auth.isAuthenticated && LOCKED_TABS.includes(tab)" class="locked-panel">
      <div class="lp-icon">🔒</div>
      <h3 class="lp-title">{{ lang.t('recipe.login_title') }}</h3>
      <p class="lp-desc">{{ lang.t('recipe.login_desc') }}</p>
      <div class="lp-btns">
        <RouterLink to="/login"    class="lp-btn-primary">{{ lang.t('recipe.login_btn') }}</RouterLink>
        <RouterLink to="/register" class="lp-btn-ghost">{{ lang.t('recipe.register_btn') }}</RouterLink>
      </div>
    </div>

    <!-- ─── Steps tab ─── -->
    <div v-if="tab === 'steps' && auth.isAuthenticated" class="tab-content">
      <div v-if="recipe.steps?.length" class="steps-list">
        <div v-for="step in recipe.steps" :key="step.id" class="step-card">
          <div class="step-num">{{ step.stepNumber }}</div>
          <div class="step-body">
            <p class="step-text">{{ step.instruction }}</p>
            <div v-if="step.durationMinutes" class="step-time">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
              </svg>
              {{ step.durationMinutes }} {{ lang.t('common.min') }}
            </div>
            <img v-if="step.imageUrl" :src="resolveImageUrl(step.imageUrl)" class="step-img" />
          </div>
        </div>
      </div>
      <div v-else class="tab-empty">
        <span class="te-icon">📋</span>
        <p>{{ lang.t('recipe.no_steps') }}</p>
      </div>
    </div>

    <!-- ─── Nutrition tab ─── -->
    <div v-if="tab === 'nutrition' && auth.isAuthenticated" class="tab-content">
      <div v-if="recipe.nutritionalInfo" class="nutrition-grid">
        <div v-for="n in [
            { icon: '🔥', label: lang.t('nutrition.calories'), val: recipe.nutritionalInfo.caloriesPerServing,   unit: 'kcal', color: '#ef4444' },
            { icon: '💪', label: lang.t('nutrition.protein'),  val: recipe.nutritionalInfo.proteinGrams,         unit: 'g',    color: '#3b82f6' },
            { icon: '🫐', label: lang.t('nutrition.fat'),      val: recipe.nutritionalInfo.fatGrams,             unit: 'g',    color: '#f59e0b' },
            { icon: '🌾', label: lang.t('nutrition.carbs'),    val: recipe.nutritionalInfo.carbohydrateGrams,    unit: 'g',    color: '#22c55e' },
            { icon: '🥦', label: lang.t('nutrition.fiber'),    val: recipe.nutritionalInfo.fiberGrams,           unit: 'g',    color: '#10b981' },
            { icon: '🍯', label: lang.t('nutrition.sugar'),    val: recipe.nutritionalInfo.sugarGrams,           unit: 'g',    color: '#f97316' },
          ]" :key="n.label"
          class="nutrition-card" :style="`--nc: ${n.color}`"
        >
          <div class="nc-icon">{{ n.icon }}</div>
          <div class="nc-val">{{ n.val ?? '—' }}<span class="nc-unit">{{ n.unit }}</span></div>
          <div class="nc-label">{{ n.label }}</div>
        </div>
      </div>
      <div v-else class="tab-empty">
        <span class="te-icon">📊</span>
        <p>{{ lang.t('recipe.no_nutrition') }}</p>
      </div>
    </div>

    <!-- ─── Comments tab ─── -->
    <div v-if="tab === 'comments' && auth.isAuthenticated" class="tab-content comments-section">
      <div class="comment-form">
        <div class="cf-avatar">{{ auth.initials || '?' }}</div>
        <div class="cf-right">
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
            <button class="cf-submit" :disabled="!newComment.trim() || submitting" @click="submitComment">
              <span v-if="submitting" class="act-spinner" />
              <span v-else>{{ lang.t('auth.reset_send') }}</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="commentsLoad && comments.length === 0" class="comments-skel">
        <div v-for="i in 3" :key="i" class="skel skel-comment" />
      </div>

      <template v-else>
        <div v-if="comments.length === 0" class="tab-empty">
          <span class="te-icon">💬</span>
          <p>{{ lang.t('recipe.no_comments') }}</p>
        </div>
        <div v-for="c in comments" :key="c.id" class="comment-card">
          <div class="ci-avatar">{{ c.userName?.charAt(0)?.toUpperCase() || '?' }}</div>
          <div class="ci-body">
            <div class="ci-header">
              <span class="ci-name">{{ c.userName }}</span>
              <span class="ci-time">{{ formatDate(c.createdAt, 'short', lang.lang) }}</span>
            </div>
            <p class="ci-text">{{ c.content }}</p>
          </div>
          <button v-if="c.mine || auth.isAdmin" class="ci-del" @click="deleteComment(c.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <button v-if="!commentsLast && comments.length > 0" class="load-more" :disabled="commentsLoad" @click="loadComments(false)">
          <span v-if="commentsLoad" class="act-spinner" />
          <span v-else>{{ lang.t('recipe.show_more') }}</span>
        </button>
      </template>
    </div>

    <!-- ─── O'xshash retseptlar ─── -->
    <div v-if="similarRecipes.length" class="similar-section">
      <div class="similar-header">
        <div class="similar-title-row">
          <div class="similar-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <div>
            <h2 class="similar-title">O'xshash retseptlar</h2>
            <p class="similar-sub">{{ lang.catName(recipe) }} kategoriyasidan</p>
          </div>
        </div>
        <button
          class="similar-all-btn"
          @click="router.push({ name: 'Recipes', query: { category: recipe.categoryId } })"
        >
          Hammasini ko'rish
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <div class="similar-scroll">
        <div class="similar-track">
          <div
            v-for="r in similarRecipes" :key="r.id"
            class="similar-card"
            @click="router.push({ name: 'RecipeDetail', params: { id: r.id } })"
          >
            <div class="sc-img-wrap">
              <img
                v-if="r.imageUrl"
                :src="resolveImageUrl(r.imageUrl)"
                :alt="lang.recipeTitle(r)"
                class="sc-img"
              />
              <div v-else class="sc-img-placeholder">🍽️</div>
              <div class="sc-gradient" />
              <span v-if="r.difficultyLevel" class="sc-diff-badge" :class="`sc-diff--${r.difficultyLevel?.toLowerCase()}`">
                {{ diffMap[r.difficultyLevel]?.label }}
              </span>
            </div>
            <div class="sc-body">
              <p class="sc-title">{{ lang.recipeTitle(r) }}</p>
              <div class="sc-meta">
                <span v-if="r.prepTimeMinutes || r.cookTimeMinutes" class="sc-meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
                  </svg>
                  {{ (r.prepTimeMinutes || 0) + (r.cookTimeMinutes || 0) }} {{ lang.t('common.min') }}
                </span>
                <span v-if="r.averageRating > 0" class="sc-meta-item sc-rating">
                  ★ {{ r.averageRating.toFixed(1) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>

  <RecipeFormModal v-if="recipe" :recipe="recipe" :visible="showFormModal" @close="showFormModal = false" @saved="handleSaved" />
  <ConfirmModal :show="showDeleteModal" :message="lang.t('common.confirm_delete')" confirm-label="Ha, o'chirish" :danger="true" @confirm="confirmDeleteRecipe" @cancel="showDeleteModal = false" />
</template>

<style scoped>
.detail-wrap {
  max-width: 680px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding-bottom: 40px;
}

/* ── Back ── */
.back-btn {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none;
  color: var(--tx-5); font-size: 13px; font-weight: 600;
  cursor: pointer; padding: 0; width: fit-content;
  transition: color 0.2s;
}
.back-btn:hover { color: #E8713E; }
.back-btn svg { width: 16px; height: 16px; }

/* ── Hero ── */
.hero {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 24px;
  overflow: hidden;
  background: var(--bg-card-md);
  box-shadow: 0 4px 24px rgba(0,0,0,0.12);
}
@media (min-width: 500px) { .hero { aspect-ratio: 16/9; } }

.hero-img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.4s ease;
}
.hero:hover .hero-img { transform: scale(1.02); }

.hero-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 80px; opacity: 0.12;
}

.hero-gradient {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.1) 40%, transparent 70%);
}

.hero-bottom {
  position: absolute; bottom: 14px; left: 14px;
  display: flex; gap: 8px; align-items: center;
}
.hero-badge {
  padding: 5px 12px; border-radius: 20px;
  font-size: 12px; font-weight: 800;
  backdrop-filter: blur(8px);
}
.hero-badge--cat { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.92); }
.diff-easy   { background: rgba(216,90,48,0.85);  color: #fff; }
.diff-medium { background: rgba(234,179,8,0.85);  color: #fff; }
.diff-hard   { background: rgba(239,68,68,0.85);  color: #fff; }

/* Top-right floating actions */
.hero-top-right {
  position: absolute; top: 12px; right: 12px;
  display: flex; gap: 7px;
}
.hero-action-btn {
  width: 38px; height: 38px; border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  color: rgba(255,255,255,0.9);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 15px;
  transition: all 0.2s;
}
.hero-action-btn svg { width: 17px; height: 17px; }
.hero-action-btn:hover { background: rgba(0,0,0,0.7); transform: scale(1.08); }
.hero-action-btn--fav { color: #ef4444; }
.hero-action-btn--del:hover { background: rgba(239,68,68,0.7); }

/* Play btn */
.play-btn {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  background: none; border: none; cursor: pointer; z-index: 3;
}
.play-circle {
  width: 60px; height: 60px; border-radius: 50%;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(8px);
  border: 2px solid rgba(255,255,255,0.5);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.play-btn:hover .play-circle { background: rgba(255,255,255,0.35); transform: scale(1.1); }
.play-circle svg { width: 22px; height: 22px; color: #fff; margin-left: 3px; }

/* ── Gallery ── */
.gallery-wrap { }
.gallery-strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: thin; }
.gallery-thumb {
  flex-shrink: 0; width: 80px; height: 60px; border-radius: 10px;
  overflow: hidden; cursor: pointer; border: 2px solid transparent;
  transition: all 0.15s;
}
.gallery-thumb img { width: 100%; height: 100%; object-fit: cover; }
.gallery-thumb:hover { transform: translateY(-2px); border-color: rgba(216,90,48,0.4); }
.gallery-thumb--active { border-color: #E8713E !important; }
.gallery-fullview { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.gal-full-img { flex: 1; max-height: 380px; object-fit: contain; border-radius: 14px; background: var(--bg-card); }
.gal-nav {
  flex-shrink: 0; width: 38px; height: 38px; border-radius: 50%;
  background: var(--bg-card); border: 1px solid var(--bd); color: var(--tx-2);
  font-size: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.gal-nav:hover:not(:disabled) { background: rgba(216,90,48,0.1); color: #E8713E; }
.gal-nav:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── Video ── */
.video-wrap {
  position: relative; width: 100%; aspect-ratio: 16/9;
  border-radius: 20px; overflow: hidden; background: #000;
}
.video-iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }

/* ── Title block ── */
.title-block { display: flex; flex-direction: column; gap: 10px; }

.recipe-title {
  font-size: 26px; font-weight: 900; color: var(--tx-1);
  line-height: 1.2; letter-spacing: -0.4px;
}

.star-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.stars     { display: flex; gap: 1px; }
.star-btn  {
  background: none; border: none; font-size: 22px; line-height: 1;
  cursor: pointer; color: var(--tx-6); padding: 0 1px;
  transition: color 0.12s, transform 0.1s;
}
.star-btn:not(:disabled):hover { transform: scale(1.25); }
.star-btn:disabled { cursor: default; }
.star-btn--filled { color: #f59e0b; }
.star-btn--hover  { color: #fcd34d; }
.stars--locked .star-btn { cursor: not-allowed; opacity: 0.5; }
.star-meta { display: flex; align-items: center; gap: 4px; font-size: 13px; }
.star-avg  { font-weight: 900; color: var(--tx-2); }
.star-cnt  { color: var(--tx-5); }
.star-mine { color: #E8713E; font-weight: 700; }
.star-hint { color: var(--tx-5); }

.recipe-desc {
  font-size: 14px; color: var(--tx-4); line-height: 1.75;
}

.meta-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag {
  padding: 4px 10px; border-radius: 20px;
  background: rgba(216,90,48,0.1); border: 1px solid rgba(216,90,48,0.2);
  color: #E8713E; font-size: 12px; font-weight: 700;
}

.author { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.author-avatar {
  width: 28px; height: 28px; border-radius: 8px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff; font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.author-name { font-size: 13px; font-weight: 600; color: var(--tx-4); }

/* ── Stats bar ── */
.stats-bar {
  display: flex; align-items: center;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 18px;
  padding: 14px 20px;
  gap: 0;
  box-shadow: 0 1px 6px rgba(0,0,0,0.05);
  overflow-x: auto;
}
.stat-pill {
  display: flex; align-items: center; gap: 10px;
  flex: 1; min-width: 80px;
  padding: 0 8px;
}
.stat-pill svg { width: 18px; height: 18px; color: #E8713E; flex-shrink: 0; stroke-width: 1.8; }
.sp-val { font-size: 14px; font-weight: 800; color: var(--tx-1); line-height: 1.1; }
.sp-val--muted { color: var(--tx-5); font-size: 12px; }
.sp-lbl { font-size: 10px; font-weight: 600; color: var(--tx-6); text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px; }
.stat-divider { width: 1px; height: 36px; background: var(--bd); flex-shrink: 0; }

/* ── Tab bar ── */
.tab-bar {
  display: flex; gap: 4px;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 16px; padding: 4px;
}
.tab-btn {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 10px 6px;
  border: 1px solid transparent; border-radius: 12px;
  background: none; color: var(--tx-5);
  font-size: 12px; font-weight: 700; cursor: pointer;
  transition: all 0.2s; position: relative; white-space: nowrap;
}
.tab-btn:hover:not(.tab-btn--locked) { color: var(--tx-3); }
.tab-btn--active {
  background: rgba(216,90,48,0.12); border-color: rgba(216,90,48,0.22); color: #E8713E;
}
.tab-btn--locked { opacity: 0.55; }
.tab-icon  { width: 15px; height: 15px; flex-shrink: 0; }
.tab-label { font-size: 12px; }
.tab-lock-icon { width: 11px; height: 11px; opacity: 0.6; flex-shrink: 0; }
.tab-badge {
  background: #E8713E; color: #fff; font-size: 9px; font-weight: 900;
  min-width: 16px; height: 16px; border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center; padding: 0 3px;
}

/* ── Tab content ── */
.tab-content { display: flex; flex-direction: column; gap: 8px; }

/* Serving scaler */
.serving-scaler {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 14px;
}
.ss-left { display: flex; align-items: center; gap: 8px; }
.ss-left svg { width: 16px; height: 16px; color: var(--tx-5); }
.ss-label { font-size: 13px; font-weight: 700; color: var(--tx-3); }
.ss-controls { display: flex; align-items: center; gap: 10px; }
.ss-btn {
  width: 30px; height: 30px; border-radius: 50%;
  border: 1.5px solid var(--bd-lg);
  background: var(--bg-input); color: var(--tx-3);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
}
.ss-btn svg { width: 14px; height: 14px; }
.ss-btn:hover:not(:disabled) { border-color: #E8713E; color: #E8713E; background: rgba(216,90,48,0.08); }
.ss-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.ss-val {
  font-size: 18px; font-weight: 900; color: var(--tx-1);
  min-width: 28px; text-align: center;
}
.ss-reset {
  display: flex; align-items: center; gap: 4px;
  padding: 4px 10px; border-radius: 20px;
  border: 1px solid rgba(34,197,94,0.3);
  background: rgba(34,197,94,0.08); color: #22c55e;
  font-size: 11px; font-weight: 700; cursor: pointer;
  transition: all 0.15s;
}
.ss-reset svg { width: 12px; height: 12px; }
.ss-reset:hover { background: rgba(34,197,94,0.15); }

/* Ingredient progress */
.ing-progress-wrap {
  display: flex; align-items: center; gap: 10px;
}
.ing-progress-bar {
  flex: 1; height: 3px; background: var(--bd); border-radius: 3px; overflow: hidden;
}
.ing-progress-fill {
  height: 100%; background: linear-gradient(90deg, #16a34a, #22c55e);
  border-radius: 3px; transition: width 0.4s ease;
}
.ing-all-done {
  font-size: 11px; font-weight: 800; color: #22c55e; white-space: nowrap; flex-shrink: 0;
}

/* Ingredient rows */
.ingredient-list { display: flex; flex-direction: column; gap: 5px; }
.ingredient-row {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 14px;
  background: var(--bg-card); border: 1.5px solid var(--bd);
  border-radius: 12px; cursor: pointer;
  transition: all 0.18s;
}
.ingredient-row:hover { border-color: rgba(216,90,48,0.3); background: var(--bg-card-md); }
.ingredient-row--checked { border-color: rgba(34,197,94,0.25); background: rgba(34,197,94,0.03); opacity: 0.7; }

.ing-check {
  width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
  border: 2px solid var(--bd-xl);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.ing-check svg { width: 11px; height: 11px; color: transparent; transition: color 0.15s; }
.ingredient-row:hover .ing-check { border-color: rgba(216,90,48,0.5); }
.ing-check--done { background: #22c55e; border-color: #22c55e; }
.ing-check--done svg { color: #fff; }

.ing-name { flex: 1; font-size: 14px; font-weight: 600; color: var(--tx-2); transition: all 0.2s; }
.ing-name--done { text-decoration: line-through; color: var(--tx-6); }
.ing-amount { font-size: 13px; font-weight: 700; color: var(--tx-5); transition: color 0.2s; }
.ing-amount--changed { color: #E8713E; }

/* Steps */
.steps-list { display: flex; flex-direction: column; gap: 10px; }
.step-card {
  display: flex; gap: 16px; padding: 18px 16px;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 16px; transition: border-color 0.2s;
}
.step-card:hover { border-color: rgba(216,90,48,0.2); }
.step-num {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #D85A30, #E8713E); color: #fff;
  font-size: 14px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 10px rgba(216,90,48,0.3);
}
.step-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.step-text { font-size: 14px; color: var(--tx-3); line-height: 1.75; }
.step-time { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #E8713E; font-weight: 700; }
.step-time svg { width: 13px; height: 13px; }
.step-img  { border-radius: 12px; max-height: 160px; width: 100%; object-fit: cover; }

/* Nutrition */
.nutrition-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.nutrition-card {
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 16px; padding: 18px 12px;
  text-align: center; display: flex; flex-direction: column; align-items: center; gap: 5px;
  transition: border-color 0.2s, transform 0.2s;
}
.nutrition-card:hover { border-color: var(--nc); transform: translateY(-2px); }
.nc-icon  { font-size: 26px; }
.nc-val   { font-size: 20px; font-weight: 900; color: var(--nc); }
.nc-unit  { font-size: 11px; color: var(--tx-5); margin-left: 2px; font-weight: 600; }
.nc-label { font-size: 10px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.06em; }
@media (max-width: 480px) { .nutrition-grid { grid-template-columns: repeat(2, 1fr); } }

/* Locked panel */
.locked-panel {
  display: flex; flex-direction: column; align-items: center;
  padding: 60px 24px; gap: 14px; text-align: center;
  background: var(--bg-card); border: 1px solid var(--bd); border-radius: 24px;
}
.lp-icon  { font-size: 46px; line-height: 1; }
.lp-title { font-size: 18px; font-weight: 900; color: var(--tx-1); margin: 0; }
.lp-desc  { font-size: 14px; color: var(--tx-4); max-width: 360px; line-height: 1.6; margin: 0; }
.lp-btns  { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }
.lp-btn-primary {
  padding: 10px 22px; border-radius: 12px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff; font-size: 14px; font-weight: 700; text-decoration: none; transition: opacity 0.2s;
}
.lp-btn-primary:hover { opacity: 0.88; }
.lp-btn-ghost {
  padding: 10px 22px; border-radius: 12px;
  border: 1.5px solid var(--bd-xl); color: var(--tx-3);
  font-size: 14px; font-weight: 700; text-decoration: none; transition: all 0.2s;
}
.lp-btn-ghost:hover { border-color: rgba(216,90,48,0.4); color: #E8713E; }

/* Comments */
.comments-section { gap: 12px; }
.comment-form {
  display: flex; gap: 10px; align-items: flex-start;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 16px; padding: 14px;
}
.cf-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff; font-size: 14px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.cf-right { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.cf-textarea {
  width: 100%; background: var(--bg-input); border: 1.5px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2); font-size: 14px;
  padding: 10px 12px; resize: vertical; min-height: 60px; outline: none;
  font-family: inherit; transition: border-color 0.2s;
}
.cf-textarea:focus { border-color: rgba(216,90,48,0.5); }
.cf-textarea::placeholder { color: var(--tx-5); }
.cf-actions { display: flex; align-items: center; justify-content: space-between; }
.cf-hint   { font-size: 11px; color: var(--tx-6); }
.cf-submit {
  padding: 8px 18px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff; font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: opacity 0.2s;
}
.cf-submit:disabled { opacity: 0.4; cursor: not-allowed; }
.cf-submit:not(:disabled):hover { opacity: 0.88; }

.comments-skel { display: flex; flex-direction: column; gap: 8px; }

.comment-card {
  display: flex; gap: 10px; align-items: flex-start;
  padding: 12px 14px; background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 14px; transition: border-color 0.15s;
}
.comment-card:hover { border-color: var(--bd-lg); }
.ci-avatar {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--bg-input); color: var(--tx-3);
  font-size: 13px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.ci-body   { flex: 1; min-width: 0; }
.ci-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.ci-name   { font-size: 13px; font-weight: 700; color: var(--tx-2); }
.ci-time   { font-size: 11px; color: var(--tx-6); }
.ci-text   { font-size: 14px; color: var(--tx-3); line-height: 1.6; word-break: break-word; }
.ci-del {
  flex-shrink: 0; background: none; border: none; color: var(--tx-6);
  cursor: pointer; padding: 4px; border-radius: 6px;
  display: flex; align-items: center; transition: all 0.15s;
}
.ci-del:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
.ci-del svg { width: 14px; height: 14px; }

.load-more {
  align-self: center; padding: 9px 22px; border-radius: 12px;
  border: 1px solid var(--bd-md); background: var(--bg-card);
  color: var(--tx-4); font-size: 13px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: 6px; transition: all 0.2s;
}
.load-more:hover:not(:disabled) { border-color: rgba(216,90,48,0.3); color: #E8713E; }
.load-more:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty */
.tab-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 50px 24px; gap: 10px;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 18px; color: var(--tx-5); font-size: 14px; font-weight: 600;
}
.te-icon { font-size: 40px; }

/* Spinner */
.act-spinner {
  width: 13px; height: 13px;
  border: 2px solid rgba(255,255,255,0.2); border-top-color: currentColor;
  border-radius: 50%; animation: spin 0.65s linear infinite;
  display: inline-block; flex-shrink: 0;
}

/* Skeleton */
.skel { animation: shimmer 1.5s ease-in-out infinite; background: var(--bg-card-md); }
.skel-img   { width: 100%; aspect-ratio: 16/9; border-radius: 24px; }
.skel-title { height: 32px; width: 65%; border-radius: 10px; margin-top: 4px; }
.skel-sub   { height: 16px; width: 45%; border-radius: 8px; }
.skel-stats-row { display: flex; gap: 10px; }
.skel-stat  { flex: 1; height: 58px; border-radius: 16px; }
.skel-comment { height: 64px; border-radius: 14px; }

@keyframes shimmer { 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Mobile ── */
@media (max-width: 600px) {
  .detail-wrap { gap: 14px; }

  .recipe-title { font-size: 20px; }

  /* Stats bar — scroll */
  .stats-bar {
    padding: 10px 14px;
    overflow-x: auto;
    scrollbar-width: none;
    gap: 0;
    flex-wrap: nowrap;
  }
  .stats-bar::-webkit-scrollbar { display: none; }
  .stat-pill { min-width: 72px; padding: 0 6px; gap: 6px; }
  .stat-pill svg { width: 14px; height: 14px; }
  .sp-val { font-size: 13px; }
  .sp-lbl { font-size: 9px; }
  .stat-divider { height: 28px; }

  /* Tab bar — smaller text, icon only if tight */
  .tab-bar { gap: 2px; padding: 3px; }
  .tab-btn { padding: 8px 4px; gap: 3px; }
  .tab-label { font-size: 10px; }
  .tab-icon  { width: 14px; height: 14px; }

  /* Serving scaler */
  .ss-label { font-size: 12px; }
  .ss-val   { font-size: 16px; }

  /* Comments */
  .cf-hint { display: none; }

  /* Nutrition */
  .nutrition-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .nc-val { font-size: 16px; }

  /* Step card */
  .step-card { padding: 14px 12px; gap: 10px; }
  .step-num  { width: 30px; height: 30px; font-size: 12px; }
}

@media (max-width: 380px) {
  .tab-label { display: none; }
  .tab-btn   { padding: 10px 6px; }
  .tab-icon  { width: 18px; height: 18px; }
  .tab-badge { position: absolute; top: 4px; right: 4px; }
}

/* ── Kategoriya badge click ── */
.hero-badge--clickable {
  cursor: pointer;
  transition: background 0.18s, transform 0.15s;
}
.hero-badge--clickable:hover {
  background: rgba(216,90,48,0.75) !important;
  transform: translateY(-1px);
}

/* ── O'xshash retseptlar ── */
.similar-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 22px 20px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  overflow: hidden;
}

.similar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.similar-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.similar-icon {
  width: 38px; height: 38px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(216,90,48,0.15), rgba(232,113,62,0.22));
  border: 1px solid rgba(216,90,48,0.2);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.similar-icon svg { width: 18px; height: 18px; color: #E8713E; }
.similar-title {
  font-size: 16px; font-weight: 900; color: var(--tx-1); margin: 0;
  letter-spacing: -0.2px;
}
.similar-sub {
  font-size: 11px; font-weight: 600; color: var(--tx-5); margin: 2px 0 0;
}
.similar-all-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 14px; border-radius: 20px;
  border: 1.5px solid rgba(216,90,48,0.25);
  background: rgba(216,90,48,0.06);
  color: #E8713E; font-size: 12px; font-weight: 700;
  cursor: pointer; white-space: nowrap;
  transition: all 0.18s;
  flex-shrink: 0;
}
.similar-all-btn svg { width: 12px; height: 12px; }
.similar-all-btn:hover {
  background: rgba(216,90,48,0.14);
  border-color: rgba(216,90,48,0.45);
  transform: translateX(2px);
}

/* Horizontal scroll container */
.similar-scroll {
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -20px;
  padding: 4px 20px 6px;
}
.similar-scroll::-webkit-scrollbar { display: none; }

.similar-track {
  display: flex;
  gap: 12px;
  width: max-content;
}

/* Individual card */
.similar-card {
  width: 180px;
  flex-shrink: 0;
  border-radius: 16px;
  overflow: hidden;
  background: var(--bg-card-md);
  border: 1.5px solid var(--bd);
  cursor: pointer;
  transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
}
.similar-card:hover {
  transform: translateY(-4px);
  border-color: rgba(216,90,48,0.35);
  box-shadow: 0 8px 24px rgba(216,90,48,0.14);
}

.sc-img-wrap {
  position: relative;
  width: 100%;
  aspect-ratio: 4/3;
  overflow: hidden;
}
.sc-img {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.35s ease;
}
.similar-card:hover .sc-img { transform: scale(1.06); }
.sc-img-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 32px; background: var(--bg-card-md);
  opacity: 0.35;
}
.sc-gradient {
  position: absolute; inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%);
}
.sc-diff-badge {
  position: absolute; bottom: 7px; left: 8px;
  padding: 3px 8px; border-radius: 20px;
  font-size: 10px; font-weight: 800;
  backdrop-filter: blur(6px);
}
.sc-diff--easy   { background: rgba(16,185,129,0.82); color: #fff; }
.sc-diff--medium { background: rgba(234,179,8,0.82);  color: #fff; }
.sc-diff--hard   { background: rgba(239,68,68,0.82);  color: #fff; }
.sc-diff--expert { background: rgba(139,92,246,0.82); color: #fff; }

.sc-body {
  padding: 10px 11px 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.sc-title {
  font-size: 13px; font-weight: 800; color: var(--tx-2);
  line-height: 1.3; margin: 0;
  display: -webkit-box; -webkit-line-clamp: 2;
  -webkit-box-orient: vertical; overflow: hidden;
}
.sc-meta {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
}
.sc-meta-item {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600; color: var(--tx-5);
}
.sc-meta-item svg { width: 11px; height: 11px; }
.sc-rating { color: #f59e0b; font-weight: 800; }

@media (max-width: 600px) {
  .similar-section { padding: 16px 14px 18px; border-radius: 20px; }
  .similar-scroll   { margin: 0 -14px; padding: 4px 14px 4px; }
  .similar-card     { width: 155px; }
  .similar-title    { font-size: 14px; }
}
</style>
