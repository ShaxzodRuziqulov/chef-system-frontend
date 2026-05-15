<script setup>
import { ref, computed, onMounted } from 'vue'
import { shoppingApi  }             from '@/api/shoppingList'
import { mealPlansApi }             from '@/api/mealPlans'
import { useAuthStore }             from '@/stores/authStore'
import { useRouter }                from 'vue-router'

const router     = useRouter()
const auth       = useAuthStore()
const lists      = ref([])
const plans      = ref([])
const loading    = ref(true)
const generating = ref(false)
const deleting   = ref(null)
const selectedPlanId = ref('')
const expanded   = ref(null)

onMounted(async () => {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  try {
    const [l, p] = await Promise.all([
      shoppingApi.getMy({ page: 0, size: 20 }),
      mealPlansApi.getMy({ page: 0, size: 20 }),
    ])
    lists.value = (l.data?.data ?? l.data)?.content ?? []
    plans.value = (p.data?.data ?? p.data)?.content ?? []
  } finally {
    loading.value = false
  }
})

async function generate() {
  if (!selectedPlanId.value) return
  generating.value = true
  try {
    const res     = await shoppingApi.generate(selectedPlanId.value)
    const created = res.data?.data ?? res.data
    lists.value.unshift(created)
    selectedPlanId.value = ''
  } catch (e) {
    alert(e.response?.data?.message || 'Xatolik yuz berdi')
  } finally {
    generating.value = false
  }
}

async function toggleItem(listId, itemId, currentStatus) {
  const newStatus = currentStatus === 'PURCHASED' ? 'PENDING' : 'PURCHASED'
  const res       = await shoppingApi.updateItem(listId, itemId, { status: newStatus })
  const updated   = res.data?.data ?? res.data
  const idx       = lists.value.findIndex(l => l.id === listId)
  if (idx !== -1) lists.value[idx] = updated
}

async function deleteList(id) {
  if (!confirm("Ro'yxatni o'chirishni tasdiqlaysizmi?")) return
  deleting.value = id
  try {
    await shoppingApi.delete(id)
    lists.value = lists.value.filter(l => l.id !== id)
    if (expanded.value === id) expanded.value = null
  } finally {
    deleting.value = null
  }
}

function progress(list) {
  if (!list.items?.length) return 0
  return Math.round(list.items.filter(i => i.status === 'PURCHASED').length / list.items.length * 100)
}

function purchasedCount(list) {
  return list.items?.filter(i => i.status === 'PURCHASED').length ?? 0
}

// Category groups for items
function groupItems(items) {
  if (!items?.length) return []
  // Just return flat for now — categories can be grouped by unit if needed
  return items
}

const selectedPlanName = computed(() => {
  const p = plans.value.find(p => p.id === selectedPlanId.value)
  return p?.name ?? ''
})
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Xarid ro'yxati</h1>
        <p class="page-sub">Haftalik rejadan avtomatik yarating</p>
      </div>
    </div>

    <!-- Generate panel -->
    <div class="generate-panel">
      <div class="gp-icon">🛒</div>
      <div class="gp-body">
        <div class="gp-title">Reja asosida avtomatik ro'yxat</div>
        <div class="gp-sub">Haftalik reja tanlang — barcha ingredientlar avtomatik qo'shiladi</div>
      </div>
      <div class="gp-controls">
        <select v-model="selectedPlanId" class="plan-select">
          <option value="">— Reja tanlang —</option>
          <option v-for="p in plans" :key="p.id" :value="p.id">
            {{ p.name }} ({{ p.weekStartDate }})
          </option>
        </select>
        <button @click="generate" :disabled="!selectedPlanId || generating" class="btn-generate">
          <span v-if="generating" class="spinner" />
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M12 4v16m8-8H4"/>
          </svg>
          {{ generating ? 'Yaratilmoqda...' : "Ro'yxat yaratish" }}
        </button>
      </div>
      <p v-if="!plans.length" class="gp-hint">
        ⚠️ Avval haftalik reja yarating
      </p>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 3" :key="i" class="skel-item" />
    </div>

    <!-- Lists -->
    <div v-else-if="lists.length" class="lists">
      <div v-for="list in lists" :key="list.id" class="list-card">

        <!-- Header -->
        <div class="list-header" @click="expanded = expanded === list.id ? null : list.id">
          <div class="lh-left">
            <!-- Circular progress -->
            <div class="circle-progress" :style="`--pct: ${progress(list)}`">
              <svg viewBox="0 0 36 36">
                <circle class="cp-bg" cx="18" cy="18" r="15" />
                <circle class="cp-fill" cx="18" cy="18" r="15"
                  :style="`stroke-dashoffset: ${94 - (94 * progress(list) / 100)}`" />
              </svg>
              <span class="cp-text">{{ progress(list) }}%</span>
            </div>

            <div class="lh-info">
              <div class="lh-name-row">
                <span class="lh-name">{{ list.name }}</span>
                <span v-if="list.completed" class="badge-done">✓ Tugallangan</span>
              </div>
              <div class="lh-meta">
                <span>{{ purchasedCount(list) }} / {{ list.items?.length || 0 }} mahsulot</span>
                <span v-if="list.mealPlanName" class="lh-plan">· {{ list.mealPlanName }}</span>
              </div>

              <!-- Progress bar -->
              <div v-if="list.items?.length" class="progress-bar">
                <div class="progress-fill" :style="{ width: progress(list) + '%' }" />
              </div>
            </div>
          </div>

          <div class="lh-actions" @click.stop>
            <button @click="deleteList(list.id)" class="btn-del"
              :disabled="deleting === list.id">
              <span v-if="deleting === list.id" class="spinner sm" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
            <span class="chevron" :class="{ 'chevron-up': expanded === list.id }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </span>
          </div>
        </div>

        <!-- Items -->
        <Transition name="expand">
          <div v-if="expanded === list.id" class="items-wrap">
            <div
              v-for="item in list.items"
              :key="item.id"
              class="item-row"
              :class="{ 'item-done': item.status === 'PURCHASED' }"
              @click="toggleItem(list.id, item.id, item.status)"
            >
              <!-- Checkbox -->
              <div class="item-check" :class="{ 'check-done': item.status === 'PURCHASED' }">
                <svg v-if="item.status === 'PURCHASED'"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>

              <!-- Name -->
              <span class="item-name">{{ item.ingredientNameUz || item.ingredientNameRu }}</span>

              <!-- Amount -->
              <span class="item-amount">
                {{ item.amount }}
                <span class="item-unit">{{ item.unit }}</span>
              </span>
            </div>

            <div v-if="!list.items?.length" class="items-empty">
              Ro'yxat bo'sh
            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">🛒</div>
      <p class="empty-title">Hali ro'yxat yo'q</p>
      <p class="empty-sub">Yuqoridan reja tanlang va avtomatik ro'yxat yarating</p>
    </div>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.page-header  { }
.page-title   { font-size: 22px; font-weight: 900; color: #f1f5f9; }
.page-sub     { font-size: 13px; color: #475569; margin-top: 3px; }

/* ── Generate panel ── */
.generate-panel {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 20px 24px;
  background: rgba(216,90,48,0.06);
  border: 1px solid rgba(216,90,48,0.15);
  border-radius: 20px;
}
.gp-icon   { font-size: 32px; flex-shrink: 0; }
.gp-body   { flex: 1; min-width: 200px; }
.gp-title  { font-size: 14px; font-weight: 800; color: #e2e8f0; }
.gp-sub    { font-size: 12px; color: #475569; margin-top: 2px; }
.gp-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.plan-select {
  height: 42px;
  padding: 0 12px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  min-width: 200px;
  transition: border-color 0.2s;
}
.plan-select:focus  { border-color: rgba(216,90,48,0.5); }
.plan-select option { background: #1e293b; }

.btn-generate {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(216,90,48,0.3);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  white-space: nowrap;
}
.btn-generate:hover:not(:disabled)  { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216,90,48,0.4); }
.btn-generate:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-generate svg { width: 16px; height: 16px; }

.gp-hint { width: 100%; font-size: 12px; color: #f59e0b; font-weight: 600; }

/* ── List card ── */
.lists { display: flex; flex-direction: column; gap: 10px; }
.list-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.list-card:hover { border-color: rgba(255,255,255,0.1); }

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.list-header:hover { background: rgba(255,255,255,0.02); }

/* Circular progress */
.lh-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 0;
}

.circle-progress {
  position: relative;
  width: 52px;
  height: 52px;
  flex-shrink: 0;
}
.circle-progress svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.cp-bg {
  fill: none;
  stroke: rgba(255,255,255,0.06);
  stroke-width: 3;
}
.cp-fill {
  fill: none;
  stroke: #E8713E;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 94;
  transition: stroke-dashoffset 0.5s ease;
}
.cp-text {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  color: #E8713E;
}

.lh-info { flex: 1; min-width: 0; }
.lh-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lh-name    { font-size: 15px; font-weight: 800; color: #e2e8f0; }
.badge-done {
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(216,90,48,0.15);
  color: #E8713E;
}
.lh-meta { font-size: 12px; color: #475569; margin-top: 3px; font-weight: 600; }
.lh-plan { color: #334155; }

.progress-bar {
  height: 4px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
  margin-top: 8px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D85A30, #E8713E);
  border-radius: 4px;
  transition: width 0.5s ease;
}

.lh-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.btn-del {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(239,68,68,0.08);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.btn-del:hover:not(:disabled) { background: rgba(239,68,68,0.16); }
.btn-del svg { width: 15px; height: 15px; }
.btn-del:disabled { opacity: 0.4; cursor: not-allowed; }

.chevron svg { width: 18px; height: 18px; color: #475569; transition: transform 0.3s; }
.chevron-up svg { transform: rotate(180deg); }

/* ── Items ── */
.items-wrap {
  border-top: 1px solid rgba(255,255,255,0.06);
}
.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.item-row:last-child { border-bottom: none; }
.item-row:hover { background: rgba(255,255,255,0.02); }
.item-done .item-name { text-decoration: line-through; color: #334155; }

.item-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.15);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.item-check.check-done {
  background: #D85A30;
  border-color: #D85A30;
}
.item-check svg { width: 11px; height: 11px; color: #fff; }

.item-name   { flex: 1; font-size: 14px; font-weight: 600; color: #cbd5e1; transition: all 0.2s; }
.item-amount { font-size: 13px; font-weight: 700; color: #475569; }
.item-unit   { font-size: 11px; color: #334155; margin-left: 2px; }

.items-empty { padding: 20px; text-align: center; font-size: 13px; color: #334155; }

/* ── Expand animation ── */
.expand-enter-active { transition: all 0.25s ease; }
.expand-leave-active { transition: all 0.2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skel-item {
  height: 88px;
  border-radius: 20px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Empty ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 80px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px;
}
.empty-icon  { font-size: 56px; margin-bottom: 8px; }
.empty-title { font-size: 16px; font-weight: 800; color: #64748b; }
.empty-sub   { font-size: 13px; color: #334155; }

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}
.spinner.sm { width: 12px; height: 12px; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
