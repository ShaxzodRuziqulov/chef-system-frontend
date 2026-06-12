<script setup>
import { computed }           from 'vue'
import { useLangStore }       from '@/stores/langStore'
import { useFavoritesStore }  from '@/stores/favoritesStore'
import { useAuthStore }       from '@/stores/authStore'
import { useToast }           from '@/composables/useToast'
import { resolveImageUrl }    from '@/utils/imageUrl'

const props = defineProps({
  recipe: { type: Object, required: true },
})

const lang      = useLangStore()
const favorites = useFavoritesStore()
const auth      = useAuthStore()
const toast     = useToast()

const title          = computed(() => lang.recipeTitle(props.recipe))
const titleFallback  = computed(() => lang.recipeTitleIsFallback(props.recipe))

const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))

const isFav = computed(() => favorites.isFavorited(props.recipe.id))

function toggleFav(e) {
  e.preventDefault()
  e.stopPropagation()
  if (!auth.isAuthenticated) {
    toast.warning("Sevimlilarga qo'shish uchun tizimga kiring")
    return
  }
  favorites.toggle(props.recipe.id)
}
</script>

<template>
  <RouterLink :to="`/app/recipes/${recipe.id}`" class="recipe-card">
    <!-- Image -->
    <div class="card-img">
      <img v-if="recipe.imageUrl" :src="resolveImageUrl(recipe.imageUrl)" :alt="title" loading="lazy" />
      <div v-else class="card-img-placeholder">🍽️</div>

      <span v-if="recipe.difficultyLevel" class="badge-diff" :class="diffMap[recipe.difficultyLevel]?.cls">
        {{ diffMap[recipe.difficultyLevel]?.label }}
      </span>
      <span v-if="recipe.categoryNameUz" class="badge-cat">{{ lang.catName(recipe) }}</span>

      <!-- Video badge -->
      <span v-if="recipe.videoUrl" class="badge-video">▶ Video</span>

      <!-- Heart button — always visible, locked for guests -->
      <button
        class="fav-btn"
        :class="{ 'fav-active': isFav, 'fav-locked': !auth.isAuthenticated }"
        @click="toggleFav"
        :title="!auth.isAuthenticated ? 'Sevimlilarga qo\'shish uchun tizimga kiring' : (isFav ? 'Sevimlilardan o\'chirish' : 'Sevimlilarga qo\'shish')"
      >
        <svg viewBox="0 0 24 24" :fill="isFav ? 'currentColor' : 'none'" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="card-body">
      <h3 class="card-title">
        {{ title }}
        <span v-if="titleFallback" class="card-title-fallback" title="O'zbekcha (tarjima mavjud emas)">🇺🇿</span>
      </h3>

      <!-- Muallif -->
      <div v-if="recipe.authorFullName" class="card-author">
        <span class="author-icon">👨‍🍳</span>
        <span class="author-name">{{ recipe.authorFullName }}</span>
      </div>

      <div class="card-meta">
        <span>⏱ {{ (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) }} {{ lang.t('common.min') }}</span>
        <span>·</span>
        <span>👥 {{ recipe.servings }}</span>
        <span v-if="recipe.averageRating" class="card-rating">
          ⭐ {{ recipe.averageRating?.toFixed(1) }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.recipe-card {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}
.recipe-card:hover {
  transform: translateY(-3px);
  border-color: rgba(216, 90, 48, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
}

/* Image */
.card-img {
  position: relative;
  aspect-ratio: 4 / 3;
  background: linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02));
  overflow: hidden;
  flex-shrink: 0;
}
.card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}
.recipe-card:hover .card-img img { transform: scale(1.06); }

.card-img-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  opacity: 0.3;
}

/* Badges */
.badge-diff {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.18);
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
}
.diff-easy   {
  background: rgba(16, 185, 129, 0.82);
  color: #fff;
}
.diff-medium {
  background: rgba(234, 179, 8, 0.88);
  color: #fff;
}
.diff-hard   {
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
}

.badge-cat {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 700;
  background: rgba(0, 0, 0, 0.52);
  color: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
}

/* ── Video badge ── */
.badge-video {
  position: absolute;
  bottom: 8px;
  right: 8px;
  padding: 4px 9px;
  border-radius: 20px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  backdrop-filter: blur(6px);
  border: 1px solid rgba(255,255,255,0.15);
  display: flex; align-items: center; gap: 3px;
}

/* ── Heart button ── */
.fav-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.7);
  transition: background 0.2s, color 0.2s, transform 0.15s;
  z-index: 2;
}
.fav-btn:hover {
  background: rgba(0, 0, 0, 0.65);
  color: #ef4444;
  transform: scale(1.12);
}
.fav-btn.fav-active {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.18);
}
.fav-btn.fav-active:hover { background: rgba(239, 68, 68, 0.28); }
.fav-btn.fav-locked { opacity: 0.55; cursor: not-allowed; }
.fav-btn.fav-locked:hover { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.7); transform: none; }
.fav-btn svg {
  width: 16px;
  height: 16px;
  transition: transform 0.15s;
}
.fav-btn:active svg { transform: scale(0.85); }

/* Body */
.card-body {
  padding: 12px 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}

.card-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--tx-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}
.card-title-fallback {
  font-size: 10px;
  vertical-align: middle;
  margin-left: 3px;
  opacity: 0.7;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--tx-5);
  font-weight: 600;
}
.card-rating {
  margin-left: auto;
  color: #eab308;
  font-weight: 700;
}

/* Muallif */
.card-author {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  color: #E8713E;
}
.author-icon { font-size: 12px; }
.author-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 140px;
}
</style>
