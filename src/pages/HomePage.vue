<script setup>
import { ref, onMounted } from 'vue'
import { recipesApi  } from '@/api/recipes'
import { categoriesApi } from '@/api/categories'
import RecipeCard from '@/components/recipe/RecipeCard.vue'

const recipes    = ref([])
const categories = ref([])
const loading    = ref(true)

onMounted(async () => {
  try {
    const [r, c] = await Promise.all([
      recipesApi.getAll({ page: 0, size: 8 }),
      categoriesApi.getAll(),
    ])
    recipes.value    = r.data.data?.content ?? []
    categories.value = c.data.data ?? []
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-8">

    <!-- Hero banner -->
    <div class="relative rounded-2xl overflow-hidden bg-gradient-to-br from-primary-600 to-primary-800 p-8 text-white">
      <div class="relative z-10 max-w-lg">
        <p class="text-primary-200 text-sm font-medium mb-2">Xush kelibsiz 👋</p>
        <h1 class="text-3xl md:text-4xl font-bold leading-tight mb-3">
          Eng mazali retseptlar shu yerda
        </h1>
        <p class="text-primary-100 mb-6 text-sm md:text-base">
          O'zbek va jahon taomlarining eng yaxshi retseptlari bir joyda.
        </p>
        <RouterLink
          to="/recipes"
          class="inline-flex items-center gap-2 px-6 py-3 bg-white text-primary-700
                 font-semibold rounded-xl hover:bg-primary-50 transition-colors text-sm"
        >
          Barcha retseptlar
          <span>→</span>
        </RouterLink>
      </div>
      <!-- Decorative emoji -->
      <div class="absolute right-8 top-1/2 -translate-y-1/2 text-8xl opacity-20 select-none hidden md:block">
        🍲
      </div>
    </div>

    <!-- Kategoriyalar -->
    <section>
      <h2 class="text-lg font-bold text-slate-800 mb-4">Kategoriyalar</h2>
      <div v-if="loading" class="flex gap-3 overflow-x-auto pb-2">
        <div v-for="i in 6" :key="i" class="shrink-0 w-24 h-20 bg-slate-200 animate-pulse rounded-2xl" />
      </div>
      <div v-else class="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <RouterLink
          v-for="cat in categories"
          :key="cat.id"
          :to="`/recipes?category=${cat.id}`"
          class="shrink-0 flex flex-col items-center gap-2 p-3 w-24 rounded-2xl
                 bg-white border border-slate-100 shadow-sm
                 hover:border-primary-300 hover:shadow-md transition-all text-center"
        >
          <span class="text-2xl">{{ cat.iconUrl || '🥘' }}</span>
          <span class="text-xs font-medium text-slate-700 leading-tight">{{ cat.nameUz }}</span>
        </RouterLink>
      </div>
    </section>

    <!-- Mashhur retseptlar -->
    <section>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-800">Mashhur retseptlar</h2>
        <RouterLink to="/recipes" class="text-sm text-primary-600 font-medium hover:underline">
          Barchasi →
        </RouterLink>
      </div>

      <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div v-for="i in 8" :key="i" class="bg-slate-200 animate-pulse rounded-2xl h-52" />
      </div>

      <div v-else-if="recipes.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
      </div>

      <div v-else class="text-center py-16 text-slate-400">
        <div class="text-5xl mb-3">🍽️</div>
        <p>Hali retseptlar yo'q</p>
      </div>
    </section>

  </div>
</template>
