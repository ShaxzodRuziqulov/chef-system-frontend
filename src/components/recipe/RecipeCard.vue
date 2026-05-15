<script setup>
import { computed }      from 'vue'
import { useLangStore }  from '@/stores/langStore'

const props = defineProps({
  recipe: { type: Object, required: true },
})

const lang = useLangStore()

const title = computed(() => lang.recipeTitle(props.recipe))

const diffMap = computed(() => ({
  EASY:   { label: lang.t('common.easy'),   cls: 'diff-easy'   },
  MEDIUM: { label: lang.t('common.medium'), cls: 'diff-medium' },
  HARD:   { label: lang.t('common.hard'),   cls: 'diff-hard'   },
}))
</script>

<template>
  <RouterLink :to="`/recipes/${recipe.id}`" class="recipe-card">
    <!-- Image -->
    <div class="card-img">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="title" loading="lazy" />
      <div v-else class="card-img-placeholder">🍽️</div>

      <span v-if="recipe.difficultyLevel" class="badge-diff" :class="diffMap[recipe.difficultyLevel]?.cls">
        {{ diffMap[recipe.difficultyLevel]?.label }}
      </span>
      <span v-if="recipe.categoryNameUz" class="badge-cat">{{ recipe.categoryNameUz }}</span>
    </div>

    <!-- Body -->
    <div class="card-body">
      <h3 class="card-title">{{ title }}</h3>
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
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  overflow: hidden;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
}
.recipe-card:hover {
  transform: translateY(-3px);
  border-color: rgba(216, 90, 48, 0.25);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3);
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
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.diff-easy   { background: rgba(216, 90, 48, 0.85);  color: #fff; }
.diff-medium { background: rgba(234, 179, 8, 0.85);  color: #fff; }
.diff-hard   { background: rgba(239, 68, 68, 0.85);  color: #fff; }

.badge-cat {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.5);
  color: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
}

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
  color: #e2e8f0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.6em;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #475569;
  font-weight: 600;
}
.card-rating {
  margin-left: auto;
  color: #eab308;
  font-weight: 700;
}
</style>
