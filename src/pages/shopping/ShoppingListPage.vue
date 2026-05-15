<script setup>
import { ref, onMounted } from 'vue'
import { shoppingApi } from '@/api/shoppingList'
import { mealPlansApi } from '@/api/mealPlans'

const lists    = ref([])
const loading  = ref(true)
const plans    = ref([])
const selected = ref('')
const generating = ref(false)
const expanded = ref(null)

const statusLabel = { PENDING: 'Kutilmoqda', PURCHASED: 'Sotib olindi', SKIPPED: 'Tashlab ketildi' }
const statusColor = {
  PENDING:   'bg-slate-100 text-slate-600',
  PURCHASED: 'bg-green-100 text-green-700',
  SKIPPED:   'bg-red-100 text-red-500',
}

onMounted(async () => {
  try {
    const [l, p] = await Promise.all([
      shoppingApi.getMy({ page: 0, size: 10 }),
      mealPlansApi.getMy({ page: 0, size: 20 }),
    ])
    lists.value = l.data.data?.content ?? []
    plans.value = p.data.data?.content ?? []
  } finally {
    loading.value = false
  }
})

async function generate() {
  if (!selected.value) return
  generating.value = true
  try {
    const res = await shoppingApi.generate(selected.value)
    lists.value.unshift(res.data.data)
    selected.value = ''
  } finally {
    generating.value = false
  }
}

async function toggleItem(listId, itemId, currentStatus) {
  const newStatus = currentStatus === 'PURCHASED' ? 'PENDING' : 'PURCHASED'
  const res = await shoppingApi.updateItem(listId, itemId, { status: newStatus })
  const idx = lists.value.findIndex(l => l.id === listId)
  if (idx !== -1) lists.value[idx] = res.data.data
}

async function deleteList(id) {
  if (!confirm('Ro\'yxatni o\'chirishni tasdiqlaysizmi?')) return
  await shoppingApi.delete(id)
  lists.value = lists.value.filter(l => l.id !== id)
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold text-slate-800">Xarid ro'yxati</h1>

    <!-- Generate from meal plan -->
    <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-700 mb-3">Reja asosida yaratish</h2>
      <div class="flex gap-3">
        <select v-model="selected"
          class="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm
                 focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">Reja tanlang...</option>
          <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
        <button @click="generate" :disabled="!selected || generating"
          class="px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold
                 hover:bg-primary-700 disabled:opacity-60 transition-colors whitespace-nowrap">
          {{ generating ? '...' : '🛒 Yaratish' }}
        </button>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 3" :key="i" class="h-20 bg-slate-200 animate-pulse rounded-2xl" />
    </div>

    <!-- Lists -->
    <div v-else-if="lists.length" class="space-y-4">
      <div v-for="list in lists" :key="list.id"
        class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <!-- List header -->
        <div class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
          @click="expanded = expanded === list.id ? null : list.id">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-800 text-sm">{{ list.name }}</h3>
              <span v-if="list.completed"
                class="px-2 py-0.5 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                ✓ Tugallangan
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ list.items?.length || 0 }} ta mahsulot
              <span v-if="list.mealPlanName"> · {{ list.mealPlanName }}</span>
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button @click.stop="deleteList(list.id)"
              class="px-3 py-1.5 rounded-lg text-xs text-red-500 hover:bg-red-50">
              O'chirish
            </button>
            <span class="text-slate-400 text-sm">{{ expanded === list.id ? '▲' : '▼' }}</span>
          </div>
        </div>

        <!-- Items -->
        <div v-if="expanded === list.id" class="border-t border-slate-100 divide-y divide-slate-50">
          <div v-for="item in list.items" :key="item.id"
            class="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
            @click="toggleItem(list.id, item.id, item.status)">
            <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
              :class="item.status === 'PURCHASED' ? 'border-primary-500 bg-primary-500' : 'border-slate-300'">
              <svg v-if="item.status === 'PURCHASED'" class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <span class="flex-1 text-sm font-medium"
              :class="item.status === 'PURCHASED' ? 'line-through text-slate-400' : 'text-slate-700'">
              {{ item.ingredientNameUz || item.ingredientNameRu }}
            </span>
            <span class="text-xs text-slate-500">{{ item.amount }} {{ item.unit }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-slate-400">
      <div class="text-6xl mb-4">🛒</div>
      <p class="font-medium">Xarid ro'yxati yo'q</p>
      <p class="text-sm mt-1">Haftalik rejadan avtomatik yarating</p>
    </div>
  </div>
</template>
