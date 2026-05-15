<script setup>
defineProps({
  recipe: { type: Object, required: true },
})

const difficultyLabel = { EASY: 'Oson', MEDIUM: "O'rta", HARD: 'Qiyin' }
const difficultyColor = {
  EASY:   'bg-green-100 text-green-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HARD:   'bg-red-100 text-red-700',
}
</script>

<template>
  <RouterLink
    :to="`/recipes/${recipe.id}`"
    class="group bg-white rounded-2xl overflow-hidden border border-slate-100
           shadow-sm hover:shadow-md hover:-translate-y-1 transition-all"
  >
    <!-- Image -->
    <div class="relative aspect-[4/3] bg-slate-100 overflow-hidden">
      <img
        v-if="recipe.imageUrl"
        :src="recipe.imageUrl"
        :alt="recipe.titleUz"
        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />
      <div v-else class="w-full h-full flex items-center justify-center text-5xl">🍽️</div>

      <!-- Difficulty badge -->
      <span
        v-if="recipe.difficultyLevel"
        class="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-semibold"
        :class="difficultyColor[recipe.difficultyLevel]"
      >
        {{ difficultyLabel[recipe.difficultyLevel] }}
      </span>
    </div>

    <!-- Info -->
    <div class="p-3">
      <h3 class="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 mb-2">
        {{ recipe.titleUz || recipe.titleRu }}
      </h3>
      <div class="flex items-center gap-3 text-xs text-slate-500">
        <span class="flex items-center gap-1">
          ⏱ {{ (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) }} daq
        </span>
        <span class="flex items-center gap-1">
          👥 {{ recipe.servings }} kishi
        </span>
        <span v-if="recipe.averageRating" class="flex items-center gap-1 ml-auto text-amber-500 font-medium">
          ⭐ {{ recipe.averageRating?.toFixed(1) }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>
