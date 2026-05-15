<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const router = useRouter()
const form   = ref({ username: '', password: '' })
const error  = ref('')
const loading = ref(false)

async function submit() {
  error.value   = ''
  loading.value = true
  try {
    const res = await authApi.login(form.value)
    const d   = res.data.data
    localStorage.setItem('access_token',  d.access_token)
    localStorage.setItem('refresh_token', d.refresh_token)
    router.push('/')
  } catch (e) {
    error.value = e.response?.data?.message || 'Username yoki parol noto\'g\'ri'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-600 text-3xl mb-4">
          🍳
        </div>
        <h1 class="text-2xl font-bold text-slate-800">Xush kelibsiz!</h1>
        <p class="text-sm text-slate-500 mt-1">Hisobingizga kiring</p>
      </div>

      <!-- Form -->
      <form @submit.prevent="submit" class="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">Username</label>
          <input
            v-model="form.username"
            type="text"
            required
            placeholder="username"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-600 mb-1.5">Parol</label>
          <input
            v-model="form.password"
            type="password"
            required
            placeholder="••••••••"
            class="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div v-if="error" class="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
          {{ error }}
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 rounded-xl bg-primary-600 text-white font-semibold text-sm
                 hover:bg-primary-700 disabled:opacity-60 transition-colors"
        >
          {{ loading ? 'Kirish...' : 'Kirish' }}
        </button>
      </form>

      <p class="text-center text-sm text-slate-500 mt-6">
        Hisobingiz yo'qmi?
        <RouterLink to="/register" class="text-primary-600 font-semibold hover:underline">
          Ro'yxatdan o'tish
        </RouterLink>
      </p>
    </div>
  </div>
</template>
