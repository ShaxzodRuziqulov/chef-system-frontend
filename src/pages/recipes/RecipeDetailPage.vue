<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { recipesApi } from '@/api/recipes'

const route   = useRoute()
const recipe  = ref(null)
const loading = ref(true)
const tab     = ref('ingredients') // ingredients | steps | nutrition

const difficultyLabel = { EASY: 'Oson', MEDIUM: "O'rta", HARD: 'Qiyin' }

onMounted(async () => {
  try {
    const res = await recipesApi.getById(route.params.id)
    recipe.value = res.data.data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div v-if="loading" class="space-y-4">
    <div class="h-64 bg-slate-200 animate-pulse rounded-2xl" />
    <div class="h-8  bg-slate-200 animate-pulse rounded-xl w-2/3" />
    <div class="h-4  bg-slate-200 animate-pulse rounded-xl w-1/2" />
  </div>

  <div v-else-if="recipe" class="max-w-2xl mx-auto space-y-6">
    <!-- Image -->
    <div class="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden">
      <img v-if="recipe.imageUrl" :src="recipe.imageUrl" :alt="recipe.titleUz"
           class="w-full h-full object-cover" />
      <div v-else class="w-full h-full flex items-center justify-center text-7xl">🍽️</div>
    </div>

    <!-- Header info -->
    <div>
      <div class="flex items-start justify-between gap-4">
        <h1 class="text-2xl font-bold text-slate-800 leading-tight">
          {{ recipe.titleUz || recipe.titleRu }}
        </h1>
        <span class="shrink-0 px-3 py-1 rounded-xl text-xs font-semibold bg-primary-100 text-primary-700">
          {{ difficultyLabel[recipe.difficultyLevel] }}
        </span>
      </div>
      <p v-if="recipe.description" class="mt-2 text-sm text-slate-600 leading-relaxed">
        {{ recipe.description }}
      </p>
    </div>

    <!-- Stats row -->
    <div class="grid grid-cols-3 gap-3">
      <div class="bg-white rounded-2xl p-4 border border-slate-100 text-center">
        <div class="text-2xl mb-1">⏱</div>
        <div class="font-bold text-slate-800">{{ (recipe.prepTimeMinutes||0)+(recipe.cookTimeMinutes||0) }}</div>
        <div class="text-xs text-slate-500">daqiqa</div>
      </div>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 text-center">
        <div class="text-2xl mb-1">👥</div>
        <div class="font-bold text-slate-800">{{ recipe.servings }}</div>
        <div class="text-xs text-slate-500">kishi</div>
      </div>
      <div class="bg-white rounded-2xl p-4 border border-slate-100 text-center">
        <div class="text-2xl mb-1">⭐</div>
        <div class="font-bold text-slate-800">{{ recipe.averageRating?.toFixed(1) || '—' }}</div>
        <div class="text-xs text-slate-500">reyting</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 bg-slate-100 p-1 rounded-xl">
      <button
        v-for="t in [
          { key:'ingredients', label:'Ingredientlar' },
          { key:'steps',       label:'Bosqichlar'    },
          { key:'nutrition',   label:'Kaloriya'      },
        ]"
        :key="t.key"
        @click="tab = t.key"
        class="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
        :class="tab === t.key
          ? 'bg-white text-primary-700 shadow-sm'
          : 'text-slate-500 hover:text-slate-700'"
      >
        {{ t.label }}
      </button>
    </div>

    <!-- Ingredients tab -->
    <div v-if="tab === 'ingredients'" class="space-y-2">
      <div
        v-for="ing in recipe.ingredients"
        :key="ing.id"
        class="flex items-center justify-between bg-white rounded-xl px-4 py-3
               border border-slate-100"
      >
        <span class="text-sm font-medium text-slate-700">
          {{ ing.ingredientNameUz || ing.ingredientNameRu }}
        </span>
        <span class="text-sm text-slate-500">
          {{ ing.amount }} {{ ing.unit }}
        </span>
      </div>
      <div v-if="!recipe.ingredients?.length" class="text-center py-8 text-slate-400 text-sm">
        Ingredientlar ko'rsatilmagan
      </div>
    </div>

    <!-- Steps tab -->
    <div v-if="tab === 'steps'" class="space-y-3">
      <div
        v-for="step in recipe.steps"
        :key="step.id"
        class="flex gap-4 bg-white rounded-2xl p-4 border border-slate-100"
      >
        <div class="shrink-0 w-8 h-8 rounded-full bg-primary-600 text-white
                    flex items-center justify-center text-sm font-bold">
          {{ step.stepNumber }}
        </div>
        <div class="flex-1">
          <p class="text-sm text-slate-700 leading-relaxed">{{ step.instruction }}</p>
          <p v-if="step.durationMinutes" class="mt-1 text-xs text-slate-400">
            ⏱ {{ step.durationMinutes }} daqiqa
          </p>
        </div>
      </div>
      <div v-if="!recipe.steps?.length" class="text-center py-8 text-slate-400 text-sm">
        Bosqichlar ko'rsatilmagan
      </div>
    </div>

    <!-- Nutrition tab -->
    <div v-if="tab === 'nutrition'">
      <div v-if="recipe.nutritionalInfo" class="grid grid-cols-2 gap-3">
        <div v-for="[label, val, unit] in [
          ['Kaloriya',     recipe.nutritionalInfo.caloriesPerServing, 'kcal'],
          ['Oqsil',        recipe.nutritionalInfo.proteinGrams,       'g'],
          ['Yog\'',         recipe.nutritionalInfo.fatGrams,           'g'],
          ['Uglevodlar',   recipe.nutritionalInfo.carbohydrateGrams,  'g'],
          ['Kletchatka',   recipe.nutritionalInfo.fiberGrams,         'g'],
          ['Shakar',       recipe.nutritionalInfo.sugarGrams,         'g'],
        ]" :key="label"
          class="bg-white rounded-2xl p-4 border border-slate-100 text-center"
        >
          <div class="text-xl font-bold text-primary-600">{{ val ?? '—' }}</div>
          <div class="text-xs text-slate-500 mt-0.5">{{ label }} <span class="text-slate-400">({{ unit }})</span></div>
        </div>
      </div>
      <div v-else class="text-center py-8 text-slate-400 text-sm">
        Ozuqaviy ma'lumot kiritilmagan
      </div>
    </div>
  </div>
</template>
