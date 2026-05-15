<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '@/api/auth'
import { useRouter } from 'vue-router'
import RecipeCard from '@/components/recipe/RecipeCard.vue'
import { recipesApi } from '@/api/recipes'

const router  = useRouter()
const user    = ref(null)
const recipes = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [u, r] = await Promise.all([
      authApi.me(),
      recipesApi.getMy({ page: 0, size: 6 }),
    ])
    user.value    = u.data.data
    recipes.value = r.data.data?.content ?? []
  } finally {
    loading.value = false
  }
})

function logout() {
  const refresh = localStorage.getItem('refresh_token')
  authApi.logout(refresh).catch(() => {})
  localStorage.clear()
  router.push('/login')
}
</script>

<template>
  <div class="space-y-6 max-w-xl mx-auto">
    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div class="h-32 bg-slate-200 animate-pulse rounded-2xl" />
      <div class="h-8 bg-slate-200 animate-pulse rounded-xl w-1/2" />
    </div>

    <template v-else-if="user">
      <!-- Profile card -->
      <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center">
        <div class="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center
                    text-4xl mx-auto mb-4 overflow-hidden">
          <img v-if="user.avatarUrl" :src="user.avatarUrl" class="w-full h-full object-cover" />
          <span v-else>👤</span>
        </div>
        <h2 class="text-xl font-bold text-slate-800">{{ user.fullName }}</h2>
        <p class="text-sm text-slate-500 mt-1">{{ user.roles }}</p>

        <button @click="logout"
          class="mt-4 px-5 py-2 rounded-xl border border-red-200 text-red-500 text-sm
                 font-medium hover:bg-red-50 transition-colors">
          Chiqish
        </button>
      </div>

      <!-- My recipes -->
      <div>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-bold text-slate-800">Mening retseptlarim</h2>
          <RouterLink to="/recipes" class="text-sm text-primary-600 hover:underline">
            Barchasi →
          </RouterLink>
        </div>

        <div v-if="recipes.length" class="grid grid-cols-2 gap-4">
          <RecipeCard v-for="r in recipes" :key="r.id" :recipe="r" />
        </div>
        <div v-else class="text-center py-12 text-slate-400 text-sm">
          <div class="text-5xl mb-3">📝</div>
          Hali retsept qo'shmadingiz
        </div>
      </div>
    </template>
  </div>
</template>
