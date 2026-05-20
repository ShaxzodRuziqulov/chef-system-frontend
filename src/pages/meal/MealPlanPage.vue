<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { mealPlansApi }   from '@/api/mealPlans'
import { recipesApi }     from '@/api/recipes'
import { useAuthStore }   from '@/stores/authStore'
import { useLangStore }   from '@/stores/langStore'
import { useToast }       from '@/composables/useToast'
import { parseApiError }  from '@/utils/parseApiError'
import { useRouter }      from 'vue-router'
import ConfirmModal       from '@/components/ui/ConfirmModal.vue'
import { resolveImageUrl } from '@/utils/imageUrl'

const router = useRouter()
const auth   = useAuthStore()
const lang   = useLangStore()
const toast  = useToast()

const plans      = ref([])
const allRecipes = ref([])
const loading    = ref(true)
const expanded   = ref(null)

// ── Days (ISO: 1=Monday … 7=Sunday) ───────────────────────────────────
const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']

// ── Meal type config ───────────────────────────────────────────────────
const MEAL_COLORS = {
  BREAKFAST: { bg: 'rgba(59,130,246,0.12)',  border: 'rgba(59,130,246,0.25)',  text: '#60a5fa', dot: '#3b82f6' },
  LUNCH:     { bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.22)',   text: '#4ade80', dot: '#22c55e' },
  DINNER:    { bg: 'rgba(216,90,48,0.12)',   border: 'rgba(216,90,48,0.25)',   text: '#E8713E', dot: '#D85A30' },
  SNACK:     { bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.22)',  text: '#fbbf24', dot: '#f59e0b' },
}

const mealLabel = computed(() => ({
  BREAKFAST: lang.t('meal.breakfast'),
  LUNCH:     lang.t('meal.lunch'),
  DINNER:    lang.t('meal.dinner'),
  SNACK:     lang.t('meal.snack'),
}))

const dayLabel = computed(() => lang.t('meal.days_full').split(','))
const dayShort = computed(() => lang.t('meal.days_short').split(','))

const statusInfo = computed(() => ({
  DRAFT:     { label: lang.t('meal.status_draft'),  cls: 'st-draft'     },
  ACTIVE:    { label: lang.t('meal.status_active'), cls: 'st-active'    },
  COMPLETED: { label: lang.t('meal.status_done'),   cls: 'st-completed' },
}))

// ── Create modal ───────────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createError = ref('')
const newPlan     = ref({ name: '', weekStartDate: '', notes: '' })

function resetCreate() {
  newPlan.value = { name: '', weekStartDate: '', notes: '' }
  createError.value = ''
}

async function createPlan() {
  if (!newPlan.value.name || !newPlan.value.weekStartDate) return
  creating.value = true
  createError.value = ''
  try {
    const res = await mealPlansApi.create(newPlan.value)
    plans.value.unshift(res.data?.data ?? res.data)
    showCreate.value = false
    resetCreate()
    toast.success("Haftalik reja yaratildi!")
  } catch (e) {
    createError.value = parseApiError(e, lang.t('common.error_save'))
  } finally {
    creating.value = false
  }
}

// ── Edit modal ─────────────────────────────────────────────────────────
const showEdit     = ref(false)
const editing      = ref(false)
const editError    = ref('')
const editPlanData = ref({ id: null, name: '', notes: '' })

function openEditModal(plan) {
  editPlanData.value = { id: plan.id, name: plan.name, notes: plan.notes || '' }
  editError.value = ''
  showEdit.value = true
}

async function saveEdit() {
  if (!editPlanData.value.name) return
  editing.value = true
  editError.value = ''
  try {
    const res = await mealPlansApi.update(editPlanData.value.id, {
      name: editPlanData.value.name,
      notes: editPlanData.value.notes
    })
    const updated = res.data?.data ?? res.data
    const idx = plans.value.findIndex(p => p.id === editPlanData.value.id)
    if (idx !== -1) plans.value[idx] = updated
    showEdit.value = false
    toast.success("Reja yangilandi!")
  } catch (e) {
    editError.value = parseApiError(e, lang.t('common.error_save'))
  } finally {
    editing.value = false
  }
}

// ── Activate ────────────────────────────────────────────────────────────
async function activate(id) {
  try {
    const res = await mealPlansApi.activate(id)
    const updated = res.data?.data ?? res.data
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx !== -1) plans.value[idx] = updated
    toast.success("Reja faollashtirildi!")
  } catch (e) {
    toast.error(parseApiError(e, "Faollashtirish xatosi"))
  }
}

// ── Delete plan ─────────────────────────────────────────────────────────
const confirmDelete = ref({ show: false, planId: null })

function askDeletePlan(id) {
  confirmDelete.value = { show: true, planId: id }
}

async function doDeletePlan() {
  const id = confirmDelete.value.planId
  confirmDelete.value.show = false
  try {
    await mealPlansApi.delete(id)
    plans.value = plans.value.filter(p => p.id !== id)
    if (expanded.value === id) expanded.value = null
    toast.success("Reja o'chirildi!")
  } catch (e) {
    toast.error(parseApiError(e, lang.t('common.error_delete')))
  }
}

// ── Expand / collapse ──────────────────────────────────────────────────
async function toggleExpand(plan) {
  if (expanded.value === plan.id) {
    expanded.value = null
    return
  }
  expanded.value = plan.id
  if (!plan.entries) {
    try {
      const res = await mealPlansApi.getById(plan.id)
      const fullPlan = res.data?.data ?? res.data
      const idx = plans.value.findIndex(p => p.id === plan.id)
      if (idx !== -1) plans.value[idx] = fullPlan
    } catch (e) {
      toast.error(parseApiError(e, "Rejani yuklashda xato"))
    }
  }
}

// ── Get week day date ──────────────────────────────────────────────────
function dayDate(plan, i) {
  // i is 0-based index of day (0=Monday)
  if (!plan.weekStartDate) return ''
  const start = new Date(plan.weekStartDate + 'T00:00:00')
  const d = new Date(start)
  d.setDate(start.getDate() + i)
  return d.getDate()
}

function dayMonth(plan, i) {
  if (!plan.weekStartDate) return ''
  const start = new Date(plan.weekStartDate + 'T00:00:00')
  const d = new Date(start)
  d.setDate(start.getDate() + i)
  const months = ['Yan','Fev','Mar','Apr','May','Iyun','Iyul','Avg','Sen','Okt','Noy','Dek']
  return months[d.getMonth()]
}

// ── Add entry modal ────────────────────────────────────────────────────
const showEntry    = ref(false)
const entryPlanId  = ref(null)
const addingEntry  = ref(false)
const recipeSearch = ref('')
const newEntry     = ref({
  recipeId: null,
  selectedRecipe: null,
  dayOfWeek: 'MONDAY',
  mealType: 'LUNCH',
  servings: 1,
})

const filteredRecipes = computed(() => {
  const q = recipeSearch.value.trim().toLowerCase()
  if (!q) return allRecipes.value
  return allRecipes.value.filter(r =>
    (r.titleUz || '').toLowerCase().includes(q) ||
    (r.titleRu || '').toLowerCase().includes(q)
  )
})

function resetEntry() {
  newEntry.value = { recipeId: null, selectedRecipe: null, dayOfWeek: 'MONDAY', mealType: 'LUNCH', servings: 1 }
  recipeSearch.value = ''
}

function openEntryModal(planId, prefilledDay) {
  entryPlanId.value = planId
  resetEntry()
  if (prefilledDay) newEntry.value.dayOfWeek = prefilledDay
  showEntry.value = true
}

function selectRecipe(r) {
  newEntry.value.recipeId = r.id
  newEntry.value.selectedRecipe = r
  recipeSearch.value = ''
}

function clearRecipe() {
  newEntry.value.recipeId = null
  newEntry.value.selectedRecipe = null
}

async function addEntry() {
  if (!newEntry.value.recipeId) return
  addingEntry.value = true
  try {
    await mealPlansApi.addEntry(entryPlanId.value, {
      recipeId:  newEntry.value.recipeId,
      dayOfWeek: newEntry.value.dayOfWeek,
      mealType:  newEntry.value.mealType,
      servings:  newEntry.value.servings,
    })
    const planRes   = await mealPlansApi.getById(entryPlanId.value)
    const updatedPlan = planRes.data?.data ?? planRes.data
    const idx = plans.value.findIndex(p => p.id === entryPlanId.value)
    if (idx !== -1) plans.value[idx] = updatedPlan
    showEntry.value = false
    toast.success("Ovqat qo'shildi!")
  } catch (e) {
    toast.error(parseApiError(e, lang.t('common.error_save')))
  } finally {
    addingEntry.value = false
  }
}

// ── Delete entry ───────────────────────────────────────────────────────
const confirmEntryDelete = ref({ show: false, planId: null, entryId: null })

function askDeleteEntry(planId, entryId) {
  confirmEntryDelete.value = { show: true, planId, entryId }
}

async function doDeleteEntry() {
  const { planId, entryId } = confirmEntryDelete.value
  confirmEntryDelete.value.show = false
  try {
    await mealPlansApi.removeEntry(planId, entryId)
    const planRes = await mealPlansApi.getById(planId)
    const updatedPlan = planRes.data?.data ?? planRes.data
    const idx = plans.value.findIndex(p => p.id === planId)
    if (idx !== -1) plans.value[idx] = updatedPlan
    toast.success("Ovqat o'chirildi!")
  } catch (e) {
    toast.error(parseApiError(e, lang.t('common.error_delete')))
  }
}

// ── Entries for a given day ─────────────────────────────────────────────
function entriesForDay(plan, dayName) {
  const ISO_DAY = { MONDAY:1, TUESDAY:2, WEDNESDAY:3, THURSDAY:4, FRIDAY:5, SATURDAY:6, SUNDAY:7 }
  return plan.entries?.filter(e => {
    const d = typeof e.dayOfWeek === 'number' ? DAYS[e.dayOfWeek - 1] : e.dayOfWeek
    return d === dayName
  }) ?? []
}

// ── Formatted dates ─────────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('uz-UZ', { day: '2-digit', month: 'short' })
}

// ── Load ────────────────────────────────────────────────────────────────
onMounted(async () => {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  await load()
})

async function load() {
  loading.value = true
  try {
    const [resPlans, resRecipes] = await Promise.all([
      mealPlansApi.getMy({ page: 0, size: 10 }),
      recipesApi.getAll({ page: 0, size: 200 })
    ])
    plans.value      = (resPlans.data?.data   ?? resPlans.data)?.content   ?? []
    allRecipes.value = (resRecipes.data?.data ?? resRecipes.data)?.content ?? []
  } catch (e) {
    toast.error(parseApiError(e, "Ma'lumotlarni yuklashda xato"))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">{{ lang.t('meal.title') }}</h1>
        <p class="page-sub">{{ lang.t('meal.sub') }}</p>
      </div>
      <button @click="resetCreate(); showCreate = true" class="btn-primary">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
        </svg>
        {{ lang.t('meal.new_plan') }}
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 2" :key="i" class="skel-plan" />
    </div>

    <!-- Plans list -->
    <div v-else-if="plans.length" class="plans-list">
      <div v-for="plan in plans" :key="plan.id" class="plan-card">

        <!-- Plan header -->
        <div class="plan-header" @click="toggleExpand(plan)">
          <div class="plan-info">
            <div class="plan-name-row">
              <h3 class="plan-name">{{ plan.name }}</h3>
              <span class="status-badge" :class="statusInfo[plan.status]?.cls">
                {{ statusInfo[plan.status]?.label }}
              </span>
            </div>
            <p class="plan-dates">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="date-icon">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              {{ formatDate(plan.weekStartDate) }} — {{ formatDate(plan.weekEndDate) }}
              <span class="dot-sep">·</span>
              <span class="entry-count">{{ plan.entries?.length || 0 }} ta ovqat</span>
            </p>
          </div>

          <div class="plan-actions" @click.stop>
            <button
              v-if="plan.status === 'DRAFT'"
              @click="activate(plan.id)"
              class="btn-activate"
              title="Faollashtirish"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="act-icon">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {{ lang.t('meal.activate') }}
            </button>
            <button @click="openEntryModal(plan.id, null)" class="btn-icon btn-add" title="Ovqat qo'shish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button @click="openEditModal(plan)" class="btn-icon btn-edit" title="Tahrirlash">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button @click="askDeletePlan(plan.id)" class="btn-icon btn-del" title="O'chirish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>
            <span class="chevron" :class="{ 'chevron-up': expanded === plan.id }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </span>
          </div>
        </div>

        <!-- Weekly grid -->
        <Transition name="expand">
          <div v-if="expanded === plan.id" class="weekly-grid-wrap">
            <div class="weekly-grid">

              <!-- Day headers -->
              <div v-for="(dayName, i) in DAYS" :key="'h'+dayName" class="day-header">
                <span class="day-short">{{ dayShort[i] }}</span>
                <span class="day-num">{{ dayDate(plan, i) }}</span>
                <span class="day-mon">{{ dayMonth(plan, i) }}</span>
                <button
                  class="day-add-btn"
                  @click.stop="openEntryModal(plan.id, dayName)"
                  title="Ovqat qo'shish"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
                  </svg>
                </button>
              </div>

              <!-- Day cells -->
              <div v-for="(dayName, i) in DAYS" :key="'c'+dayName" class="day-cell">
                <template v-if="entriesForDay(plan, dayName).length">
                  <div
                    v-for="entry in entriesForDay(plan, dayName)"
                    :key="entry.id"
                    class="entry-chip"
                    :style="{
                      background: MEAL_COLORS[entry.mealType]?.bg,
                      borderColor: MEAL_COLORS[entry.mealType]?.border,
                    }"
                  >
                    <span
                      class="meal-dot"
                      :style="{ background: MEAL_COLORS[entry.mealType]?.dot }"
                    />
                    <div class="chip-body">
                      <span class="entry-meal" :style="{ color: MEAL_COLORS[entry.mealType]?.text }">
                        {{ mealLabel[entry.mealType] }}
                      </span>
                      <span class="entry-recipe" :title="entry.recipeTitleUz">
                        {{ entry.recipeTitleUz || entry.recipeTitleRu }}
                      </span>
                      <span v-if="entry.servings > 1" class="entry-servings">
                        {{ entry.servings }} porsiya
                      </span>
                    </div>
                    <button
                      class="entry-del"
                      @click.stop="askDeleteEntry(plan.id, entry.id)"
                      title="O'chirish"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                </template>
                <div v-else class="day-empty">
                  <button class="day-empty-add" @click.stop="openEntryModal(plan.id, dayName)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
                    </svg>
                  </button>
                </div>
              </div>

            </div>
          </div>
        </Transition>

      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="empty-state">
      <div class="empty-icon">📅</div>
      <p class="empty-title">{{ lang.t('meal.no_plans') }}</p>
      <p class="empty-sub">{{ lang.t('meal.no_plans_sub') }}</p>
      <button @click="resetCreate(); showCreate = true" class="btn-primary">{{ lang.t('meal.create') }}</button>
    </div>

    <!-- ══════════ CREATE MODAL ══════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ lang.t('meal.new_plan_title') }}</h2>
              <button class="modal-close" @click="showCreate = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.plan_name') }} <span class="req">*</span></label>
                <input
                  v-model="newPlan.name"
                  type="text"
                  :placeholder="lang.t('meal.plan_name')"
                  class="form-input"
                  @keydown.enter="createPlan"
                />
              </div>
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.week_start') }} <span class="req">*</span></label>
                <input v-model="newPlan.weekStartDate" type="date" class="form-input" />
                <p class="form-hint">Hafta Dushanbadan boshlanishi tavsiya etiladi</p>
              </div>
              <div class="form-group">
                <label class="form-label">
                  {{ lang.t('meal.notes') }}
                  <span class="opt">{{ lang.t('meal.optional') }}</span>
                </label>
                <textarea
                  v-model="newPlan.notes"
                  rows="3"
                  :placeholder="lang.t('meal.notes')"
                  class="form-input form-textarea"
                />
              </div>
              <div v-if="createError" class="modal-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="err-icon">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {{ createError }}
              </div>
            </div>
            <div class="modal-footer">
              <button @click="showCreate = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button
                @click="createPlan"
                :disabled="creating || !newPlan.name || !newPlan.weekStartDate"
                class="btn-primary"
              >
                <span v-if="creating" class="spinner" />
                {{ creating ? lang.t('meal.creating') : lang.t('meal.create') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ EDIT MODAL ══════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ lang.t('meal.edit_title') }}</h2>
              <button class="modal-close" @click="showEdit = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.plan_name') }} <span class="req">*</span></label>
                <input
                  v-model="editPlanData.name"
                  type="text"
                  :placeholder="lang.t('meal.plan_name')"
                  class="form-input"
                  @keydown.enter="saveEdit"
                />
              </div>
              <div class="form-group">
                <label class="form-label">
                  {{ lang.t('meal.notes') }}
                  <span class="opt">{{ lang.t('meal.optional') }}</span>
                </label>
                <textarea
                  v-model="editPlanData.notes"
                  rows="3"
                  :placeholder="lang.t('meal.notes')"
                  class="form-input form-textarea"
                />
              </div>
              <div v-if="editError" class="modal-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="err-icon">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/>
                </svg>
                {{ editError }}
              </div>
            </div>
            <div class="modal-footer">
              <button @click="showEdit = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button
                @click="saveEdit"
                :disabled="editing || !editPlanData.name"
                class="btn-primary"
              >
                <span v-if="editing" class="spinner" />
                {{ editing ? lang.t('common.saving') : lang.t('meal.edit_btn') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ ADD ENTRY MODAL ══════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEntry" class="modal-overlay" @click.self="showEntry = false">
          <div class="modal-box modal-box--entry">
            <div class="modal-header">
              <h2 class="modal-title">{{ lang.t('meal.add_entry') }}</h2>
              <button class="modal-close" @click="showEntry = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">

              <!-- Recipe search -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.recipe') }} <span class="req">*</span></label>

                <!-- Selected recipe pill -->
                <div v-if="newEntry.selectedRecipe" class="selected-recipe">
                  <img
                    v-if="newEntry.selectedRecipe.imageUrl"
                    :src="resolveImageUrl(newEntry.selectedRecipe.imageUrl)"
                    class="sr-thumb"
                    alt=""
                  />
                  <span class="sr-thumb-placeholder" v-else>🍽️</span>
                  <span class="sr-name">{{ lang.recipeTitle(newEntry.selectedRecipe) }}</span>
                  <button class="sr-clear" @click="clearRecipe" title="O'chirish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                  </button>
                </div>

                <!-- Search input -->
                <div v-else class="search-wrap">
                  <div class="search-field">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="sf-icon">
                      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                    </svg>
                    <input
                      v-model="recipeSearch"
                      class="sf-input"
                      placeholder="Retsept nomini kiriting…"
                      autocomplete="off"
                    />
                    <span v-if="recipeSearch" class="sf-count">{{ filteredRecipes.length }}</span>
                  </div>
                  <div v-if="filteredRecipes.length" class="search-dropdown">
                    <button
                      v-for="r in filteredRecipes.slice(0, 8)"
                      :key="r.id"
                      class="search-result"
                      @click="selectRecipe(r)"
                    >
                      <div class="sr-img">
                        <img v-if="r.imageUrl" :src="resolveImageUrl(r.imageUrl)" alt="" />
                        <span v-else>🍽️</span>
                      </div>
                      <div class="sr-info">
                        <span class="sr-title">{{ lang.recipeTitle(r) }}</span>
                        <span class="sr-meta" v-if="r.preparationTime">{{ r.preparationTime }} daq</span>
                      </div>
                    </button>
                    <div v-if="filteredRecipes.length > 8" class="search-more">
                      + {{ filteredRecipes.length - 8 }} ta retsept…
                    </div>
                    <div v-if="filteredRecipes.length === 0 && recipeSearch" class="search-empty">
                      Retsept topilmadi
                    </div>
                  </div>
                </div>
              </div>

              <!-- Day + Meal type -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ lang.t('meal.day') }}</label>
                  <select v-model="newEntry.dayOfWeek" class="form-input">
                    <option v-for="(dayName, i) in DAYS" :key="dayName" :value="dayName">
                      {{ dayLabel[i] }}
                    </option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ lang.t('meal.meal_type') }}</label>
                  <select v-model="newEntry.mealType" class="form-input">
                    <option v-for="(label, key) in mealLabel" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
              </div>

              <!-- Meal type color preview -->
              <div
                class="meal-preview"
                :style="{
                  background: MEAL_COLORS[newEntry.mealType]?.bg,
                  borderColor: MEAL_COLORS[newEntry.mealType]?.border,
                  color: MEAL_COLORS[newEntry.mealType]?.text,
                }"
              >
                <span class="meal-dot" :style="{ background: MEAL_COLORS[newEntry.mealType]?.dot }" />
                {{ mealLabel[newEntry.mealType] }} · {{ dayLabel[DAYS.indexOf(newEntry.dayOfWeek)] }}
              </div>

              <!-- Servings -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.servings_lbl') }}</label>
                <div class="servings-control">
                  <button
                    class="srv-btn"
                    @click="newEntry.servings = Math.max(1, newEntry.servings - 1)"
                    :disabled="newEntry.servings <= 1"
                  >−</button>
                  <span class="srv-val">{{ newEntry.servings }}</span>
                  <button
                    class="srv-btn"
                    @click="newEntry.servings = Math.min(20, newEntry.servings + 1)"
                  >+</button>
                  <span class="srv-label">porsiya</span>
                </div>
              </div>

            </div>

            <div class="modal-footer">
              <button @click="showEntry = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button
                @click="addEntry"
                :disabled="addingEntry || !newEntry.recipeId"
                class="btn-primary"
              >
                <span v-if="addingEntry" class="spinner" />
                {{ addingEntry ? lang.t('meal.adding') : lang.t('meal.add') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ CONFIRM MODALS ══════════ -->
    <ConfirmModal
      :show="confirmDelete.show"
      message="Rejani o'chirmoqchimisiz? Barcha ovqatlar ham o'chib ketadi."
      confirm-label="Ha, o'chirish"
      danger
      @confirm="doDeletePlan"
      @cancel="confirmDelete.show = false"
    />

    <ConfirmModal
      :show="confirmEntryDelete.show"
      message="Ushbu ovqatni o'chirmoqchimisiz?"
      confirm-label="Ha, o'chirish"
      danger
      @confirm="doDeleteEntry"
      @cancel="confirmEntryDelete.show = false"
    />

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* ── Header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 900; color: #f1f5f9; }
.page-sub    { font-size: 13px; color: #475569; margin-top: 3px; }

/* ── Buttons ── */
.btn-primary {
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
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216,90,48,0.4); }
.btn-primary:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
.btn-primary svg { width: 15px; height: 15px; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-ghost:hover { background: rgba(255,255,255,0.09); }

/* ── Plan card ── */
.plans-list { display: flex; flex-direction: column; gap: 12px; }
.plan-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.plan-card:hover { border-color: rgba(255,255,255,0.11); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }

.plan-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}
.plan-header:hover { background: rgba(255,255,255,0.02); }

.plan-info      { flex: 1; min-width: 0; }
.plan-name-row  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.plan-name      { font-size: 15px; font-weight: 800; color: #e2e8f0; }
.plan-dates     {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #475569;
  margin-top: 5px;
  font-weight: 600;
}
.date-icon      { width: 13px; height: 13px; flex-shrink: 0; }
.dot-sep        { color: #334155; }
.entry-count    { color: #64748b; }

/* Status badges */
.status-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.st-draft     { background: rgba(100,116,139,0.15); color: #94a3b8; }
.st-active    { background: rgba(216,90,48,0.15);   color: #E8713E; }
.st-completed { background: rgba(59,130,246,0.15);  color: #60a5fa; }

/* Action buttons */
.plan-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.btn-activate {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 8px;
  border: none;
  background: rgba(216,90,48,0.12);
  color: #E8713E;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-activate:hover { background: rgba(216,90,48,0.22); }
.act-icon { width: 11px; height: 11px; }

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.05);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.btn-icon svg { width: 15px; height: 15px; }
.btn-add  { color: #E8713E; }
.btn-add:hover  { background: rgba(216,90,48,0.15); }
.btn-edit { color: #3b82f6; }
.btn-edit:hover { background: rgba(59,130,246,0.15); }
.btn-del  { color: #ef4444; }
.btn-del:hover  { background: rgba(239,68,68,0.12); }

.chevron svg   { width: 18px; height: 18px; color: #475569; transition: transform 0.3s; }
.chevron-up svg { transform: rotate(180deg); }

/* ── Weekly grid ── */
.weekly-grid-wrap {
  padding: 0 16px 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  overflow-x: auto;
}
.weekly-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(110px, 1fr));
  gap: 8px;
  min-width: 750px;
  padding-top: 14px;
}

.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-bottom: 10px;
  position: relative;
}
.day-short {
  font-size: 10px;
  font-weight: 800;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.day-num {
  font-size: 18px;
  font-weight: 900;
  color: #94a3b8;
  line-height: 1;
}
.day-mon {
  font-size: 10px;
  color: #334155;
  font-weight: 600;
}
.day-add-btn {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1px dashed rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.03);
  color: #475569;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 4px;
  transition: all 0.2s;
}
.day-add-btn svg { width: 12px; height: 12px; }
.day-add-btn:hover {
  border-color: rgba(216,90,48,0.4);
  background: rgba(216,90,48,0.08);
  color: #E8713E;
}

.day-cell {
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.015);
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Entry chip */
.entry-chip {
  position: relative;
  border-radius: 8px;
  border-width: 1px;
  border-style: solid;
  padding: 5px 24px 5px 8px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  transition: filter 0.15s;
}
.entry-chip:hover { filter: brightness(1.1); }

.meal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 3px;
}
.chip-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.entry-meal   { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
.entry-recipe { font-size: 10px; color: #94a3b8; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.entry-servings { font-size: 9px; color: #64748b; font-weight: 600; }

.entry-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 16px;
  height: 16px;
  border: none;
  background: rgba(239,68,68,0.12);
  border-radius: 4px;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s, background 0.15s;
}
.entry-del svg { width: 9px; height: 9px; color: #ef4444; }
.entry-chip:hover .entry-del { opacity: 1; }
.entry-del:hover { background: rgba(239,68,68,0.25); }

/* Empty cell */
.day-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.day-empty-add {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px dashed rgba(255,255,255,0.08);
  background: none;
  color: #334155;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.day-empty-add svg { width: 14px; height: 14px; }
.day-empty-add:hover {
  border-color: rgba(216,90,48,0.3);
  background: rgba(216,90,48,0.06);
  color: #E8713E;
}

/* ── Expand transition ── */
.expand-enter-active { transition: all 0.25s ease; }
.expand-leave-active { transition: all 0.2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-6px); }

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 12px; }
.skel-plan {
  height: 80px;
  border-radius: 20px;
  background: rgba(255,255,255,0.04);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Empty state ── */
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

/* ══════════ MODAL ══════════ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-box {
  background: #111827;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  overflow: hidden;
}
.modal-box--entry { max-width: 520px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title  { font-size: 17px; font-weight: 900; color: #f1f5f9; }
.modal-close {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: none;
  background: rgba(255,255,255,0.06);
  color: #64748b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.modal-close:hover { background: rgba(255,255,255,0.1); color: #e2e8f0; }
.modal-close svg { width: 16px; height: 16px; }

.modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 0 24px 24px;
}
.modal-footer > * { flex: 1; justify-content: center; }

/* Form elements */
.form-group   { display: flex; flex-direction: column; gap: 6px; }
.form-row     { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.form-hint  { font-size: 11px; color: #334155; }
.req { color: #ef4444; }
.opt { color: #334155; font-weight: 600; text-transform: none; letter-spacing: 0; font-size: 10px; }

.form-input {
  width: 100%;
  padding: 11px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}
.form-input:focus { border-color: rgba(216,90,48,0.5); background: rgba(255,255,255,0.07); }
.form-input option { background: #1e293b; }
.form-textarea { resize: none; line-height: 1.5; }

/* Selected recipe pill */
.selected-recipe {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: rgba(216,90,48,0.08);
  border: 1px solid rgba(216,90,48,0.2);
  border-radius: 12px;
}
.sr-thumb {
  width: 36px; height: 36px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.sr-thumb-placeholder {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.sr-name { flex: 1; font-size: 13px; font-weight: 700; color: #e2e8f0; }
.sr-clear {
  width: 22px; height: 22px;
  border: none;
  background: rgba(239,68,68,0.1);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  transition: background 0.15s;
  flex-shrink: 0;
}
.sr-clear:hover { background: rgba(239,68,68,0.2); }
.sr-clear svg { width: 11px; height: 11px; }

/* Recipe search */
.search-wrap { position: relative; }
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0 12px;
  height: 44px;
  transition: border-color 0.2s;
}
.search-field:focus-within { border-color: rgba(216,90,48,0.5); }
.sf-icon  { width: 16px; height: 16px; color: #475569; flex-shrink: 0; }
.sf-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  color: #e2e8f0;
}
.sf-input::placeholder { color: #334155; }
.sf-count {
  font-size: 11px;
  font-weight: 700;
  color: #475569;
  background: rgba(255,255,255,0.06);
  padding: 2px 7px;
  border-radius: 6px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: #1a2234;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  z-index: 10;
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
  max-height: 280px;
  overflow-y: auto;
}
.search-result {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: none;
  background: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
}
.search-result:last-child { border-bottom: none; }
.search-result:hover { background: rgba(255,255,255,0.04); }
.sr-img {
  width: 36px; height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}
.sr-img img { width: 100%; height: 100%; object-fit: cover; }
.sr-info { display: flex; flex-direction: column; gap: 2px; }
.sr-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.sr-meta  { font-size: 11px; color: #475569; }
.search-more  { padding: 8px 12px; font-size: 11px; color: #475569; text-align: center; border-top: 1px solid rgba(255,255,255,0.04); }
.search-empty { padding: 16px 12px; font-size: 13px; color: #475569; text-align: center; }

/* Meal preview pill */
.meal-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  border-width: 1px;
  border-style: solid;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
}

/* Servings control */
.servings-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.srv-btn {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
  color: #e2e8f0;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.srv-btn:hover:not(:disabled) { background: rgba(216,90,48,0.12); border-color: rgba(216,90,48,0.3); color: #E8713E; }
.srv-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.srv-val   { font-size: 20px; font-weight: 900; color: #e2e8f0; min-width: 28px; text-align: center; }
.srv-label { font-size: 12px; color: #475569; font-weight: 600; }

/* Error box */
.modal-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #f87171;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  padding: 10px 12px;
}
.err-icon { width: 16px; height: 16px; flex-shrink: 0; }

/* Spinner */
.spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255,255,255,0.2);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  flex-shrink: 0;
}

/* Modal transition */
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.15s ease; }
.modal-fade-enter-from  { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to    { opacity: 0; transform: scale(0.97); }

@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes spin  { to { transform: rotate(360deg); } }
</style>
