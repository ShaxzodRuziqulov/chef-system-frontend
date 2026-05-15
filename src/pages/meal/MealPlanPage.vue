<script setup>
import { ref, onMounted } from 'vue'
import { mealPlansApi } from '@/api/mealPlans'

const plans   = ref([])
const loading = ref(true)
const showCreate = ref(false)
const newPlan = ref({ name: '', weekStartDate: '', notes: '' })
const creating = ref(false)

const days = ['Dushanba','Seshanba','Chorshanba','Payshanba','Juma','Shanba','Yakshanba']
const meals = ['BREAKFAST','LUNCH','DINNER','SNACK']
const mealLabel = { BREAKFAST:'Nonushta', LUNCH:'Tushlik', DINNER:'Kechki ovqat', SNACK:'Gazak' }

const statusColor = {
  DRAFT:  'bg-slate-100 text-slate-600',
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
}
const statusLabel = { DRAFT: 'Qoralama', ACTIVE: 'Faol', COMPLETED: 'Tugallangan' }

onMounted(async () => {
  try {
    const res = await mealPlansApi.getMy({ page: 0, size: 10 })
    plans.value = res.data.data?.content ?? []
  } finally {
    loading.value = false
  }
})

async function createPlan() {
  creating.value = true
  try {
    const res = await mealPlansApi.create(newPlan.value)
    plans.value.unshift(res.data.data)
    showCreate.value = false
    newPlan.value = { name: '', weekStartDate: '', notes: '' }
  } finally {
    creating.value = false
  }
}

async function activate(id) {
  const res = await mealPlansApi.activate(id)
  const idx = plans.value.findIndex(p => p.id === id)
  if (idx !== -1) plans.value[idx] = res.data.data
}

async function deletePlan(id) {
  if (!confirm('Rejani o\'chirishni tasdiqlaysizmi?')) return
  await mealPlansApi.delete(id)
  plans.value = plans.value.filter(p => p.id !== id)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800">Haftalik reja</h1>
      <button
        @click="showCreate = true"
        class="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white
               text-sm font-semibold hover:bg-primary-700 transition-colors"
      >
        <span>+</span> Yangi reja
      </button>
    </div>

    <!-- Create modal -->
    <Transition name="modal">
      <div v-if="showCreate" class="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div class="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
          <h2 class="text-lg font-bold text-slate-800 mb-4">Yangi haftalik reja</h2>
          <div class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Reja nomi</label>
              <input v-model="newPlan.name" type="text" placeholder="Masalan: Sog'lom ovqatlanish"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Hafta boshlanish sanasi</label>
              <input v-model="newPlan.weekStartDate" type="date"
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1.5">Izoh (ixtiyoriy)</label>
              <textarea v-model="newPlan.notes" rows="2" placeholder="Qo'shimcha ma'lumot..."
                class="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
          </div>
          <div class="flex gap-3 mt-6">
            <button @click="showCreate = false"
              class="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Bekor qilish
            </button>
            <button @click="createPlan" :disabled="creating || !newPlan.name || !newPlan.weekStartDate"
              class="flex-1 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-semibold
                     hover:bg-primary-700 disabled:opacity-60 transition-colors">
              {{ creating ? 'Yaratilmoqda...' : 'Yaratish' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Loading -->
    <div v-if="loading" class="space-y-4">
      <div v-for="i in 3" :key="i" class="h-40 bg-slate-200 animate-pulse rounded-2xl" />
    </div>

    <!-- Plans list -->
    <div v-else-if="plans.length" class="space-y-4">
      <div v-for="plan in plans" :key="plan.id"
        class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <!-- Plan header -->
        <div class="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <div class="flex items-center gap-2">
              <h3 class="font-semibold text-slate-800">{{ plan.name }}</h3>
              <span class="px-2 py-0.5 rounded-lg text-xs font-medium" :class="statusColor[plan.status]">
                {{ statusLabel[plan.status] }}
              </span>
            </div>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ plan.weekStartDate }} — {{ plan.weekEndDate }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button v-if="plan.status === 'DRAFT'" @click="activate(plan.id)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary-50 text-primary-600
                     hover:bg-primary-100 transition-colors">
              Faollashtirish
            </button>
            <button @click="deletePlan(plan.id)"
              class="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-500
                     hover:bg-red-100 transition-colors">
              O'chirish
            </button>
          </div>
        </div>

        <!-- Entries grid -->
        <div class="p-4 overflow-x-auto">
          <div v-if="plan.entries?.length" class="min-w-max">
            <div class="grid gap-2" style="grid-template-columns: repeat(7, 1fr)">
              <div v-for="day in days" :key="day"
                class="text-center text-xs font-semibold text-slate-500 pb-2">
                {{ day.slice(0,3) }}
              </div>
              <!-- simplified: just count per day -->
              <div v-for="(_, i) in days" :key="'col-'+i"
                class="min-h-16 rounded-xl bg-slate-50 border border-slate-100 p-2">
                <div v-for="entry in plan.entries.filter(e => e.dayOfWeek === i+1)"
                  :key="entry.id"
                  class="text-xs bg-primary-100 text-primary-700 rounded-lg px-2 py-1 mb-1 truncate">
                  {{ mealLabel[entry.mealType] }}: {{ entry.recipeTitleUz || entry.recipeTitleRu }}
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-8 text-slate-400 text-sm">
            Hali ovqat qo'shilmagan
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-slate-400">
      <div class="text-6xl mb-4">📅</div>
      <p class="font-medium">Hali reja yo'q</p>
      <p class="text-sm mt-1">Yangi haftalik reja yarating</p>
    </div>
  </div>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity .2s; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>
