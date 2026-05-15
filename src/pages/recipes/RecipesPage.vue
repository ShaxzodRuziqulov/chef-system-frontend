<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { recipesApi   } from '@/api/recipes'
import { categoriesApi } from '@/api/categories'
import RecipeCard from '@/components/recipe/RecipeCard.vue'

const route  = useRoute()
const router = useRouter()

const recipes    = ref([])
const categories = ref([])
const loading    = ref(true)
const totalPages = ref(0)

const filters = ref({
  keyword:    route.query.keyword  || '',
  category:   route.query.category || '',
  difficulty: route.query.difficulty || '',
  page:       Number(route.query.page) || 0,
})

const difficulties = [
  { value: '', label: 'Barchasi' },
  { value: 'EASY',   label: 'Oson' },
  { value: 'MEDIUM', label: "O'rta" },
  { value: 'HARD',   label: 'Qiyin' },
]

async function fetchRecipes() {
  loading.value = true
  try {
    let res
    const page = { page: filters.value.page, size: 12 }

    if (filters.value.keyword) {
      res = await recipesApi.search(filters.value.keyword, page)
    } else if (filters.value.category) {
      res = await recipesApi.getByCategory(filters.value.category, page)
    } else if (filters.value.difficulty) {
      res = await recipesApi.getByDifficulty(filters.value.difficulty, page)
    } else {
      res = await recipesApi.getAll(page)
    }
    const d = res.data.data
    recipes.value    = d?.content ?? []
    totalPages.value = d?.totalPages ?? 0
  } finally {
    loading.value = false
  }
}

function applyFilter() {
  filters.value.page = 0
  router.replace({ query: Object.fromEntries(Object.entries(filters.value).filter(([,v]) => v !== '' && v !== 0)) })
  fetchRecipes()
}

function setPage(p) {
  filters.value.page = p
  fetchRecipes()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  const [, c] = await Promise.all([fetchRecipes(), categoriesApi.getAll()])
  categories.value = c.data.data ?? []
})
</script>

<template>
  <div class="space-y-6">
    <!-- Page title -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800">Retseptlar</h1>
    </div>

    <!-- Filters -->
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap gap-3">
      <!-- Search -->
      <input
        v-model="filters.keyword"
        @input="applyFilter"
        type="text"
        placeholder="Qidirish..."
        class="flex-1 min-w-40 px-4 py-2 rounded-xl border border-slate-200 text-sm
               focus:outline-none focus:ring-2 focus:ring-primary-500"
      />

      <!-- Category -->
      <select
        v-model="filters.category"
        @change="applyFilter"
        class="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700
               focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Barcha kategoriya</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.nameUz }}</option>
      </select>

      <!-- Difficulty -->
      <select
        v-model="filters.difficulty"
        @change="applyFilter"
        class="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-700
               focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option v-for="d in difficulties" :key="d.value" :value="d.value">{{ d.label }}</option>
      </select>
    </div>

    <!-- Grid -->
    <div v-if="loading" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="i in 12" :key="i" class="bg-slate-200 animate-pulse rounded-2xl h-52" />
    </div>

    <div v-else-if="recipes.length" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
    </div>

    <div v-else class="text-center py-20 text-slate-400">
      <div class="text-6xl mb-4">🔍</div>
      <p class="font-medium">Retsept topilmadi</p>
      <p class="text-sm mt-1">Boshqa kalit so'z bilan urinib ko'ring</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="flex justify-center gap-2">
      <button
        v-for="p in totalPages"
        :key="p"
        @click="setPage(p - 1)"
        class="w-9 h-9 rounded-xl text-sm font-medium transition-colors"
        :class="filters.page === p - 1
          ? 'bg-primary-600 text-white'
          : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-400'"
      >
        {{ p }}
      </button>
    </div>
  </div>
</template>
