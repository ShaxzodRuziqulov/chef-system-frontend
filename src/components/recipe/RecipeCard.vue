<script setup>
import { computed }          from 'vue'
import { useLangStore }      from '@/stores/langStore'
import { useFavoritesStore } from '@/stores/favoritesStore'
import { useAuthStore }      from '@/stores/authStore'
import { useToast }          from '@/composables/useToast'
import { resolveImageUrl }   from '@/utils/imageUrl'

const props = defineProps({
  recipe: { type: Object, required: true },
})

const lang      = useLangStore()
const favorites = useFavoritesStore()
const auth      = useAuthStore()
const toast     = useToast()

const title         = computed(() => lang.recipeTitle(props.recipe))
const titleFallback = computed(() => lang.recipeTitleIsFallback(props.recipe))
const isFav         = computed(() => favorites.isFavorited(props.recipe.id))

const totalTime = computed(() =>
  (props.recipe.prepTimeMinutes || 0) + (props.recipe.cookTimeMinutes || 0)
)

const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))

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
  <RouterLink :to="`/app/recipes/${recipe.id}`" class="rc">

    <!-- Image area -->
    <div class="rc-img">
      <img
        v-if="recipe.imageUrl"
        :src="resolveImageUrl(recipe.imageUrl)"
        :alt="title"
        loading="lazy"
        class="rc-photo"
      />
      <div v-else class="rc-placeholder">🍽️</div>

      <!-- Gradient overlay (always, strengthens on hover) -->
      <div class="rc-overlay" />

      <!-- Top badges -->
      <div class="rc-top">
        <!-- Fav btn -->
        <button
          class="rc-fav"
          :class="{ 'rc-fav--on': isFav, 'rc-fav--locked': !auth.isAuthenticated }"
          @click="toggleFav"
        >
          <svg viewBox="0 0 24 24" :fill="isFav ? 'currentColor' : 'none'" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 20.364l-7.682-7.682a4.5 4.5 0 010-6.364z"/>
          </svg>
        </button>

        <!-- Difficulty -->
        <span v-if="recipe.difficultyLevel" class="rc-badge" :class="diffMap[recipe.difficultyLevel]?.cls">
          {{ diffMap[recipe.difficultyLevel]?.label }}
        </span>
      </div>

      <!-- Bottom overlay stats (visible on hover) -->
      <div class="rc-hover-stats">
        <div class="rc-stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          {{ totalTime }} {{ lang.t('common.min') }}
        </div>
        <div class="rc-stat-dot" />
        <div class="rc-stat">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M23 21v-2a4 4 0 00-3-3.87"/>
          </svg>
          {{ recipe.servings }} {{ lang.t('common.ppl') }}
        </div>
        <div v-if="recipe.averageRating" class="rc-stat-dot" />
        <div v-if="recipe.averageRating" class="rc-stat rc-stat--gold">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
          {{ recipe.averageRating.toFixed(1) }}
        </div>
        <span v-if="recipe.videoUrl" class="rc-video-pill">
          <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="9,7 19,12 9,17"/></svg>
          Video
        </span>
      </div>

      <!-- Category tag bottom-left -->
      <span v-if="recipe.categoryNameUz" class="rc-cat">{{ lang.catName(recipe) }}</span>
    </div>

    <!-- Body -->
    <div class="rc-body">
      <h3 class="rc-title">
        {{ title }}
        <span v-if="titleFallback" class="rc-flag" title="O'zbekcha nom">🇺🇿</span>
      </h3>

      <div class="rc-bottom">
        <div v-if="recipe.authorFullName" class="rc-author">
          <div class="rc-author-av">{{ recipe.authorFullName.charAt(0).toUpperCase() }}</div>
          <span class="rc-author-name">{{ recipe.authorFullName }}</span>
        </div>

        <!-- Inline meta when no hover (mobile) -->
        <div class="rc-meta">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/>
          </svg>
          {{ totalTime }}'
          <span v-if="recipe.averageRating" class="rc-meta-rating">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
            </svg>
            {{ recipe.averageRating.toFixed(1) }}
          </span>
        </div>
      </div>
    </div>

  </RouterLink>
</template>

<style scoped>
.rc {
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.07);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
  cursor: pointer;
}
.rc:hover {
  transform: translateY(-4px);
  border-color: rgba(216,90,48,0.28);
  box-shadow: 0 16px 40px rgba(0,0,0,0.16);
}

/* ── Image ── */
.rc-img {
  position: relative;
  aspect-ratio: 3 / 2;
  overflow: hidden;
  flex-shrink: 0;
  background: var(--bg-card-md);
}

.rc-photo {
  width: 100%; height: 100%; object-fit: cover;
  transition: transform 0.35s ease;
}
.rc:hover .rc-photo { transform: scale(1.07); }

.rc-placeholder {
  width: 100%; height: 100%;
  display: flex; align-items: center; justify-content: center;
  font-size: 48px; opacity: 0.2;
}

/* Gradient overlay */
.rc-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(
    to top,
    rgba(0,0,0,0.62) 0%,
    rgba(0,0,0,0.1)  45%,
    transparent       75%
  );
  opacity: 0.7;
  transition: opacity 0.25s;
}
.rc:hover .rc-overlay { opacity: 1; }

/* ── Top row (fav + diff) ── */
.rc-top {
  position: absolute; top: 10px; left: 10px; right: 10px;
  display: flex; align-items: center; justify-content: space-between;
}

.rc-fav {
  width: 32px; height: 32px; border-radius: 50%; border: none;
  background: rgba(0,0,0,0.45); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  color: rgba(255,255,255,0.75); cursor: pointer;
  transition: background 0.18s, color 0.18s, transform 0.15s;
}
.rc-fav svg { width: 15px; height: 15px; transition: transform 0.15s; }
.rc-fav:hover { background: rgba(0,0,0,0.65); color: #ef4444; transform: scale(1.12); }
.rc-fav:active svg { transform: scale(0.82); }
.rc-fav--on { color: #ef4444; background: rgba(239,68,68,0.22); }
.rc-fav--on:hover { background: rgba(239,68,68,0.35); }
.rc-fav--locked { opacity: 0.5; cursor: not-allowed; }
.rc-fav--locked:hover { background: rgba(0,0,0,0.45); color: rgba(255,255,255,0.75); transform: none; }

.rc-badge {
  padding: 4px 10px; border-radius: 20px;
  font-size: 10px; font-weight: 800;
  backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.15);
}
.diff-easy   { background: rgba(16,185,129,0.85); color: #fff; }
.diff-medium { background: rgba(234,179,8,0.88);  color: #fff; }
.diff-hard   { background: rgba(239,68,68,0.85);  color: #fff; }

/* ── Hover stats (bottom of image, slides up on hover) ── */
.rc-hover-stats {
  position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%) translateY(4px);
  display: flex; align-items: center; gap: 7px;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.14);
  padding: 5px 12px; border-radius: 20px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.22s, transform 0.22s;
}
.rc:hover .rc-hover-stats { opacity: 1; transform: translateX(-50%) translateY(0); }

.rc-stat {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.92);
}
.rc-stat svg { width: 11px; height: 11px; opacity: 0.85; }
.rc-stat--gold { color: #fcd34d; }
.rc-stat-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.35); }

.rc-video-pill {
  display: flex; align-items: center; gap: 3px;
  font-size: 10px; font-weight: 800; color: rgba(255,255,255,0.85);
  background: rgba(255,255,255,0.12); padding: 2px 7px; border-radius: 10px;
  margin-left: 2px;
}
.rc-video-pill svg { width: 8px; height: 8px; }

/* Category tag */
.rc-cat {
  position: absolute; bottom: 10px; left: 10px;
  padding: 3px 9px; border-radius: 20px;
  font-size: 10px; font-weight: 700;
  background: rgba(0,0,0,0.5); color: rgba(255,255,255,0.9);
  backdrop-filter: blur(6px); border: 1px solid rgba(255,255,255,0.12);
  opacity: 1;
  transition: opacity 0.2s;
}
.rc:hover .rc-cat { opacity: 0; }

/* Mobile — hover yo'q, statlar doim ko'rinadi, category esa o'chadi */
@media (hover: none) {
  .rc-hover-stats {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  .rc-cat { opacity: 0; }
}

/* ── Body ── */
.rc-body {
  padding: 12px 14px 14px;
  display: flex; flex-direction: column; gap: 8px; flex: 1;
}

.rc-title {
  font-size: 13px; font-weight: 700; color: var(--tx-2);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}
.rc-flag { font-size: 10px; vertical-align: middle; margin-left: 3px; opacity: 0.65; }

.rc-bottom {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: auto;
}

.rc-author {
  display: flex; align-items: center; gap: 6px; min-width: 0;
}
.rc-author-av {
  width: 22px; height: 22px; border-radius: 6px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff; font-size: 10px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.rc-author-name {
  font-size: 11px; font-weight: 600; color: var(--tx-5);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.rc-meta {
  display: flex; align-items: center; gap: 4px; flex-shrink: 0;
  font-size: 11px; font-weight: 700; color: var(--tx-5);
}
.rc-meta svg { width: 11px; height: 11px; }
.rc-meta-rating {
  display: flex; align-items: center; gap: 3px;
  color: #f59e0b; margin-left: 4px;
}
.rc-meta-rating svg { width: 10px; height: 10px; }
</style>
