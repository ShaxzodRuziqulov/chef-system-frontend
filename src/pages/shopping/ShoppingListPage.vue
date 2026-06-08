<script setup>
import { ref, computed, onMounted } from 'vue'
import { shoppingApi  }             from '@/api/shoppingList'
import { mealPlansApi }             from '@/api/mealPlans'
import { useAuthStore }             from '@/stores/authStore'
import { useUnitsStore }            from '@/stores/unitsStore'
import { useLangStore }             from '@/stores/langStore'
import { useToast }                 from '@/composables/useToast'
import { parseApiError }            from '@/utils/parseApiError'
import { useRouter }                from 'vue-router'
import ConfirmModal                 from '@/components/ui/ConfirmModal.vue'

const router     = useRouter()
const auth       = useAuthStore()
const units      = useUnitsStore()
const lang       = useLangStore()
const toast      = useToast()
const lists      = ref([])
const plans      = ref([])
const loading    = ref(true)
const generating = ref(false)
const deleting   = ref(null)
const sharing    = ref(null)
const selectedPlanId = ref('')
const expanded   = ref(null)
const confirmDel = ref({ show: false, id: null })


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
    // Agar shu reja uchun ro'yxat allaqachon mavjud bo'lsa, uni yangilaymiz
    const existingIdx = lists.value.findIndex(l => l.mealPlanId === Number(selectedPlanId.value))
    if (existingIdx !== -1) {
      lists.value[existingIdx] = created
      toast.success(lang.t('shop.updated'))
    } else {
      lists.value.unshift(created)
      toast.success(lang.t('shop.created'))
    }
    selectedPlanId.value = ''
  } catch (e) {
    toast.error(parseApiError(e, lang.t('shop.error_create')))
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

function askDeleteList(id) {
  confirmDel.value = { show: true, id }
}

async function doDeleteList() {
  const id = confirmDel.value.id
  confirmDel.value.show = false
  deleting.value = id
  try {
    await shoppingApi.delete(id)
    lists.value = lists.value.filter(l => l.id !== id)
    if (expanded.value === id) expanded.value = null
    toast.success(lang.t('shop.deleted'))
  } catch (e) {
    toast.error(parseApiError(e, lang.t('shop.error_delete')))
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

function shareList(list) {
  sharing.value = list.id
  const name = listDisplayName(list)
  let text = `🛒 ${name}\n\n`
  for (const item of list.items ?? []) {
    const iname = lang.ingName(item) || item.ingredientNameUz || item.ingredientNameRu
    const amt   = units.formatAmount(item.amount, item.unit)
    const check = item.status === 'PURCHASED' ? '✅' : '▫️'
    text += `${check} ${iname} — ${amt}\n`
  }
  text += `\n📱 ${lang.t('shop.from_app')}`

  const tgUrl = `https://t.me/share/url?url=&text=${encodeURIComponent(text)}`
  window.open(tgUrl, '_blank')

  navigator.clipboard?.writeText(text).then(() => {
    toast.success(lang.t('shop.copied'))
  }).catch(() => {})

  setTimeout(() => { sharing.value = null }, 1500)
}

const selectedPlanName = computed(() => {
  const p = plans.value.find(p => p.id === Number(selectedPlanId.value))
  return p?.name ?? ''
})

const isRegenerating = computed(() =>
  selectedPlanId.value !== '' &&
  lists.value.some(l => l.mealPlanId === Number(selectedPlanId.value))
)

function planForList(list) {
  if (!list.mealPlanId) return null
  return plans.value.find(p => p.id === Number(list.mealPlanId)) ?? null
}

function listDisplayName(list) {
  const plan = planForList(list)
  if (plan?.weekStartDate) {
    return formatWeekRange(plan.weekStartDate)
  }
  // fallback: clean up backend-generated name
  const raw = list.name || ''
  return raw.replace(/\s*[—–-]\s*(xarid ro['ʼ']yxati|список покупок|shopping list)$/i, '').trim() || lang.t('shop.title')
}

function formatWeekRange(startDate) {
  if (!startDate) return ''
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const months = lang.t('meal.months_short').split(',')
  const s = `${start.getDate()} ${months[start.getMonth()]}`
  const e = `${end.getDate()} ${months[end.getMonth()]}`
  return `${s} — ${e}`
}

function weekRelativeLabel(list) {
  const plan = planForList(list)
  if (!plan?.weekStartDate) return ''
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const planStart = new Date(plan.weekStartDate + 'T00:00:00')
  const diff = Math.round((planStart - monday) / (7 * 24 * 60 * 60 * 1000))
  if (diff === 0)  return lang.t('shop.this_week')
  if (diff === 1)  return lang.t('shop.next_week')
  if (diff === -1) return lang.t('shop.last_week')
  if (diff > 1)   return `${diff} ${lang.t('shop.weeks_later')}`
  return `${Math.abs(diff)} ${lang.t('shop.weeks_ago')}`
}

// plan.updatedAt > list.generatedAt → reja ro'yxat yaratilgandan keyin o'zgardi
function isStale(list) {
  if (!list.mealPlanId) return false
  const plan = planForList(list)
  if (!plan?.updatedAt) return false
  if (!list.generatedAt) return true
  return new Date(plan.updatedAt).getTime() > new Date(list.generatedAt).getTime()
}

async function regenerateForList(list) {
  generating.value = true
  try {
    const res = await shoppingApi.generate(list.mealPlanId)
    const updated = res.data?.data ?? res.data
    const idx = lists.value.findIndex(l => l.id === list.id)
    if (idx !== -1) lists.value[idx] = updated
    toast.success(lang.t('shop.updated'))
  } catch (e) {
    toast.error(parseApiError(e, lang.t('shop.error_update')))
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ lang.t('shop.title') }}</h1>
        <p class="page-sub">{{ lang.t('shop.sub') }}</p>
      </div>
    </div>

    <!-- Generate panel -->
    <div class="generate-panel">
      <div class="gp-icon">🛒</div>
      <div class="gp-body">
        <div class="gp-title">{{ lang.t('shop.panel_title') }}</div>
        <div class="gp-sub">{{ lang.t('shop.panel_sub') }}</div>
      </div>
      <div class="gp-controls">
        <select v-model="selectedPlanId" class="plan-select">
          <option value="">{{ lang.t('shop.select_plan') }}</option>
          <option v-for="p in plans" :key="p.id" :value="p.id">
            {{ p.name }} ({{ p.weekStartDate }})
          </option>
        </select>
        <button @click="generate" :disabled="!selectedPlanId || generating" class="btn-generate" :class="{ 'btn-regen': isRegenerating }">
          <span v-if="generating" class="spinner" />
          <svg v-else-if="isRegenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
          {{ generating ? (isRegenerating ? lang.t('shop.updating') : lang.t('shop.creating')) : isRegenerating ? lang.t('shop.regenerate') : lang.t('shop.generate') }}
        </button>
      </div>
      <p v-if="!plans.length" class="gp-hint">{{ lang.t('shop.need_plan') }}</p>
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
            <!-- Progress indicator -->
            <div class="circle-progress" :class="{ 'cp-done': progress(list) === 100, 'cp-empty': !list.items?.length }">
              <template v-if="!list.items?.length">
                <span class="cp-icon">🛒</span>
              </template>
              <template v-else-if="progress(list) === 100">
                <span class="cp-icon">✅</span>
              </template>
              <template v-else>
                <svg viewBox="0 0 36 36">
                  <circle class="cp-bg" cx="18" cy="18" r="15" />
                  <circle class="cp-fill" cx="18" cy="18" r="15"
                    :style="`stroke-dashoffset: ${94 - (94 * progress(list) / 100)}`" />
                </svg>
                <span class="cp-text">{{ progress(list) }}%</span>
              </template>
            </div>

            <div class="lh-info">
              <div class="lh-name-row">
                <span class="lh-name">{{ listDisplayName(list) }}</span>
                <span v-if="weekRelativeLabel(list)" class="badge-week">{{ weekRelativeLabel(list) }}</span>
                <span v-if="progress(list) === 100" class="badge-done">{{ lang.t('shop.done_badge') }}</span>
              </div>
              <div class="lh-meta">
                <span class="lh-count"
                  :class="{ 'lh-count--some': purchasedCount(list) > 0 && progress(list) < 100 }">
                  {{ purchasedCount(list) }} / {{ list.items?.length || 0 }} {{ lang.t('shop.items') }}
                </span>
              </div>

              <!-- Progress bar -->
              <div v-if="list.items?.length" class="progress-bar">
                <div class="progress-fill" :style="{ width: progress(list) + '%' }" />
              </div>
            </div>
          </div>

          <div class="lh-actions" @click.stop>
            <!-- Yangilash tugmasi — faqat reja o'zgarganda -->
            <button
              v-if="isStale(list)"
              @click="regenerateForList(list)"
              :disabled="generating"
              class="btn-refresh"
              :title="lang.t('shop.refresh_title')"
            >
              <span v-if="generating" class="spinner sm" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>

            <!-- Share button -->
            <button
              v-if="list.items?.length"
              @click="shareList(list)"
              class="btn-share"
              :class="{ 'btn-share-done': sharing === list.id }"
              :title="lang.t('shop.share_title')"
            >
              <svg v-if="sharing !== list.id" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
              </svg>
            </button>

            <button @click="askDeleteList(list.id)" class="btn-del"
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

        <!-- Items: pending first, then purchased -->
        <Transition name="expand">
          <div v-if="expanded === list.id" class="items-wrap">

            <div v-if="!list.items?.length" class="items-empty">{{ lang.t('shop.empty_list') }}</div>

            <!-- Sotib olinmaganlar -->
            <template v-if="list.items?.filter(i => i.status !== 'PURCHASED').length">
              <div class="items-section-label">
                Kerakli ({{ list.items.filter(i => i.status !== 'PURCHASED').length }})
              </div>
              <div
                v-for="item in list.items.filter(i => i.status !== 'PURCHASED')"
                :key="item.id"
                class="item-row"
                @click="toggleItem(list.id, item.id, item.status)"
              >
                <div class="item-check">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span class="item-name">{{ lang.ingName(item) || item.ingredientNameUz || item.ingredientNameRu }}</span>
                <span class="item-amount">{{ units.formatAmount(item.amount, item.unit) }}</span>
              </div>
            </template>

            <!-- Sotib olinganlar -->
            <template v-if="list.items?.filter(i => i.status === 'PURCHASED').length">
              <div class="items-section-label items-section-label--done">
                Sotib olindi ({{ list.items.filter(i => i.status === 'PURCHASED').length }})
              </div>
              <div
                v-for="item in list.items.filter(i => i.status === 'PURCHASED')"
                :key="item.id"
                class="item-row item-done"
                @click="toggleItem(list.id, item.id, item.status)"
              >
                <div class="item-check check-done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span class="item-name">{{ lang.ingName(item) || item.ingredientNameUz || item.ingredientNameRu }}</span>
                <span class="item-amount">{{ units.formatAmount(item.amount, item.unit) }}</span>
              </div>
            </template>

          </div>
        </Transition>

      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">🛒</div>
      <p class="empty-title">{{ lang.t('shop.empty_title') }}</p>
      <p class="empty-sub">{{ lang.t('shop.empty_sub') }}</p>
    </div>

    <!-- Confirm delete (v-if/v-else zanjiridan tashqarida) -->
    <ConfirmModal
      :show="confirmDel.show"
      :message="lang.t('shop.confirm_del')"
      :confirm-label="lang.t('shop.confirm_btn')"
      danger
      @confirm="doDeleteList"
      @cancel="confirmDel.show = false"
    />

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.page-header  { }
.page-title   { font-size: 22px; font-weight: 900; color: var(--tx-1); }
.page-sub     { font-size: 13px; color: var(--tx-5); margin-top: 3px; }

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
.gp-title  { font-size: 14px; font-weight: 800; color: var(--tx-2); }
.gp-sub    { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.gp-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.plan-select {
  height: 42px;
  padding: 0 12px;
  background: var(--bg-input);
  border: 1px solid var(--bd-lg);
  border-radius: 12px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  min-width: 200px;
  transition: border-color 0.2s;
}
.plan-select:focus  { border-color: rgba(216,90,48,0.5); }
.plan-select option { background: var(--bg-surface); }

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
.btn-regen { background: linear-gradient(135deg, #1d4ed8, #3b82f6); box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
.btn-regen:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(59,130,246,0.4); }

.gp-hint { width: 100%; font-size: 12px; color: #f59e0b; font-weight: 600; }

/* ── List card ── */
.lists { display: flex; flex-direction: column; gap: 10px; }
.list-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.list-card:hover { border-color: var(--bd-lg); }

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
.list-header:hover { background: var(--bg-card-md); }

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
  stroke: var(--bd);
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
.cp-icon {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.lh-info { flex: 1; min-width: 0; }
.lh-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.lh-name    { font-size: 15px; font-weight: 800; color: var(--tx-2); }
.badge-done {
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 10px;
  font-weight: 800;
  background: rgba(34,197,94,0.12);
  color: #4ade80;
}
.badge-week {
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255,255,255,0.06);
  color: var(--tx-5);
  border: 1px solid var(--bd);
}
.lh-meta { font-size: 12px; color: var(--tx-5); margin-top: 3px; font-weight: 600; }
.lh-count { }
.lh-count--some { color: #E8713E; }

.progress-bar {
  height: 4px;
  background: var(--bd);
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

.btn-refresh {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(59,130,246,0.35);
  background: rgba(59,130,246,0.08);
  color: #60a5fa;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s;
}
.btn-refresh:hover:not(:disabled) {
  background: rgba(59,130,246,0.18);
  border-color: rgba(59,130,246,0.6);
}
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-refresh svg { width: 15px; height: 15px; }


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

.btn-share {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(37,167,138,0.35);
  background: rgba(37,167,138,0.08);
  color: #25a78a;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, border-color 0.2s;
}
.btn-share:hover { background: rgba(37,167,138,0.18); border-color: rgba(37,167,138,0.6); }
.btn-share-done { background: rgba(37,167,138,0.2); }
.btn-share svg { width: 15px; height: 15px; }


.chevron svg { width: 18px; height: 18px; color: var(--tx-5); transition: transform 0.3s; }
.chevron-up svg { transform: rotate(180deg); }

/* ── Items ── */
.items-wrap {
  border-top: 1px solid var(--bd);
}
.items-section-label {
  padding: 8px 20px 6px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--tx-5);
  background: var(--bg-input);
  border-bottom: 1px solid var(--bd);
}
.items-section-label--done {
  color: var(--tx-6);
  border-top: 1px solid var(--bd);
}
.item-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--bd);
  transition: background 0.15s;
}
.item-row:last-child { border-bottom: none; }
.item-row:hover { background: var(--bg-card-md); }
.item-done .item-name { text-decoration: line-through; color: var(--tx-6); }

.item-check {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--bd-xl);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.item-check svg { width: 11px; height: 11px; color: var(--bd-xl); }
.item-row:hover .item-check svg { color: rgba(216,90,48,0.4); }
.item-check.check-done {
  background: #22c55e;
  border-color: #22c55e;
}
.item-check.check-done svg { color: #fff; }

.item-name   { flex: 1; font-size: 14px; font-weight: 600; color: var(--tx-2); transition: all 0.2s; }
.item-amount { font-size: 13px; font-weight: 700; color: var(--tx-5); }
.item-unit   { font-size: 11px; color: var(--tx-6); margin-left: 2px; }

.items-empty { padding: 20px; text-align: center; font-size: 13px; color: var(--tx-6); }

/* ── Expand animation ── */
.expand-enter-active { transition: all 0.25s ease; }
.expand-leave-active { transition: all 0.2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skel-item {
  height: 88px;
  border-radius: 20px;
  background: var(--bg-card-md);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Empty ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 80px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.empty-icon  { font-size: 56px; margin-bottom: 8px; }
.empty-title { font-size: 16px; font-weight: 800; color: var(--tx-4); }
.empty-sub   { font-size: 13px; color: var(--tx-6); }

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
