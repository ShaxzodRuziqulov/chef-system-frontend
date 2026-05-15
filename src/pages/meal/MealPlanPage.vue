<script setup>
import { ref, computed, onMounted } from 'vue'
import { mealPlansApi }   from '@/api/mealPlans'
import { recipesApi }     from '@/api/recipes'
import { useAuthStore }   from '@/stores/authStore'
import { useLangStore }   from '@/stores/langStore'
import { useRouter }      from 'vue-router'

const router   = useRouter()
const auth     = useAuthStore()
const lang     = useLangStore()
const plans    = ref([])
const allRecipes = ref([])
const loading  = ref(true)
const expanded = ref(null)

// ── Create modal ──────────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createError = ref('')
const newPlan     = ref({ name: '', weekStartDate: '', notes: '' })

function resetCreate() {
  newPlan.value.name          = ''
  newPlan.value.weekStartDate = ''
  newPlan.value.notes         = ''
  createError.value           = ''
}

// ── Edit modal ────────────────────────────────────────────────────
const showEdit  = ref(false)
const editing   = ref(false)
const editError = ref('')
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
  } catch (e) {
    editError.value = e?.response?.data?.message || lang.t('common.error_save')
  } finally {
    editing.value = false
  }
}

// ── Add entry modal ───────────────────────────────────────────────
const showEntry    = ref(false)
const entryPlanId  = ref(null)
const addingEntry  = ref(false)
const entrySearch  = ref('')
const searchResults = ref([])
const searchLoading = ref(false)
const newEntry = ref({
  recipeId: '',
  dayOfWeek: 1,
  mealType: 'LUNCH',
  servings: 1,
  notes: '',
})

const mealLabel = computed(() => ({
  BREAKFAST: lang.t('meal.breakfast'),
  LUNCH:     lang.t('meal.lunch'),
  DINNER:    lang.t('meal.dinner'),
  SNACK:     lang.t('meal.snack'),
}))
const dayLabel  = computed(() => lang.t('meal.days_full').split(','))
const dayShort  = computed(() => lang.t('meal.days_short').split(','))

const statusInfo = computed(() => ({
  DRAFT:     { label: lang.t('meal.status_draft'), cls: 'st-draft'     },
  ACTIVE:    { label: lang.t('meal.status_active'), cls: 'st-active'   },
  COMPLETED: { label: lang.t('meal.status_done'),  cls: 'st-completed' },
}))

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
    plans.value = (resPlans.data?.data ?? resPlans.data)?.content ?? []
    allRecipes.value = (resRecipes.data?.data ?? resRecipes.data)?.content ?? []
  } finally {
    loading.value = false
  }
}

async function createPlan() {
  if (!newPlan.value.name || !newPlan.value.weekStartDate) return
  creating.value    = true
  createError.value = ''
  try {
    const res = await mealPlansApi.create(newPlan.value)
    plans.value.unshift(res.data?.data ?? res.data)
    showCreate.value = false
    resetCreate()
  } catch (e) {
    createError.value =
      e?.response?.data?.message ||
      e?.response?.data?.data?.weekStartDate ||
      lang.t('common.error_save')
  } finally {
    creating.value = false
  }
}

async function activate(id) {
  const res     = await mealPlansApi.activate(id)
  const updated = res.data?.data ?? res.data
  const idx     = plans.value.findIndex(p => p.id === id)
  if (idx !== -1) plans.value[idx] = updated
}

async function deletePlan(id) {
  if (!confirm(lang.t('common.confirm_delete'))) return
  await mealPlansApi.delete(id)
  plans.value = plans.value.filter(p => p.id !== id)
  if (expanded.value === id) expanded.value = null
}

async function toggleExpand(plan) {
  if (expanded.value === plan.id) {
    expanded.value = null
    return
  }
  expanded.value = plan.id
  // Agar ichidagi ovqatlar yuklanmagan bo'lsa (faqat list bo'lsa), to'liq reja olib kelamiz
  if (!plan.entries) {
    try {
      const res = await mealPlansApi.getById(plan.id)
      const fullPlan = res.data?.data ?? res.data
      const idx = plans.value.findIndex(p => p.id === plan.id)
      if (idx !== -1) plans.value[idx] = fullPlan
    } catch (e) {
      console.error(e)
    }
  }
}

function resetEntry() {
  newEntry.value.recipeId  = ''
  newEntry.value.dayOfWeek = 1
  newEntry.value.mealType  = 'LUNCH'
  newEntry.value.servings  = 1
  newEntry.value.notes     = ''
}

function openEntryModal(planId) {
  entryPlanId.value = planId
  resetEntry()
  showEntry.value   = true
}

async function addEntry() {
  if (!newEntry.value.recipeId) return
  addingEntry.value = true
  try {
    const addRes = await mealPlansApi.addEntry(entryPlanId.value, newEntry.value)
    // API qaytargan ma'lumot qanday bo'lishidan qat'iy nazar, aniq ishlashi uchun to'liq rejani qayta olamiz
    const planRes = await mealPlansApi.getById(entryPlanId.value)
    const updatedPlan = planRes.data?.data ?? planRes.data
    
    const idx = plans.value.findIndex(p => p.id === entryPlanId.value)
    if (idx !== -1) {
      plans.value[idx] = updatedPlan
    }
    showEntry.value = false
  } catch (e) {
    alert(e.response?.data?.message || lang.t('common.error_save'))
  } finally {
    addingEntry.value = false
  }
}

async function removeEntry(planId, entryId) {
  if (!confirm(lang.t('common.confirm_delete'))) return
  try {
    await mealPlansApi.removeEntry(planId, entryId)
    // O'chirilgandan so'ng rejani yangilash
    const planRes = await mealPlansApi.getById(planId)
    const updatedPlan = planRes.data?.data ?? planRes.data
    
    const idx = plans.value.findIndex(p => p.id === planId)
    if (idx !== -1) {
      plans.value[idx] = updatedPlan
    }
  } catch (e) {
    alert(e.response?.data?.message || lang.t('common.error_delete'))
  }
}

const DAY_MAP = {
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
  SUNDAY: 7
}

function entriesForDay(plan, day) {
  return plan.entries?.filter(e => {
    // API dan MONDAY deb kelsa 1 ga, raqam kelsa o'ziga o'giramiz
    const d = typeof e.dayOfWeek === 'string' ? DAY_MAP[e.dayOfWeek] : Number(e.dayOfWeek)
    return d === day
  }) ?? []
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
              📅 {{ plan.weekStartDate }} → {{ plan.weekEndDate }}
              · {{ plan.entries?.length || 0 }} {{ lang.t('meal.meals_count') }}
            </p>
          </div>

          <div class="plan-actions" @click.stop>
            <button v-if="plan.status === 'DRAFT'" @click="activate(plan.id)" class="btn-activate">
              {{ lang.t('meal.activate') }}
            </button>
            <button @click="openEntryModal(plan.id)" class="btn-icon btn-add" title="Ovqat qo'shish">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
              </svg>
            </button>
            <button @click="openEditModal(plan)" class="btn-icon btn-edit" title="Tahrirlash">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button @click="deletePlan(plan.id)" class="btn-icon btn-del" title="O'chirish">
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
              <div v-for="(d, i) in dayShort" :key="'h'+i" class="day-header">{{ d }}</div>

              <!-- Day cells -->
              <div v-for="(_, i) in dayShort" :key="'c'+i" class="day-cell">
                <div
                  v-for="entry in entriesForDay(plan, i + 1)"
                  :key="entry.id"
                  class="entry-chip"
                  :title="entry.recipeTitleUz"
                >
                  <span class="entry-meal">{{ mealLabel[entry.mealType] }}</span>
                  <span class="entry-recipe">{{ entry.recipeTitleUz || entry.recipeTitleRu || entry.recipeTitleEng }}</span>
                  <button class="entry-del" @click.stop="removeEntry(plan.id, entry.id)" title="O'chirish">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <div v-if="!entriesForDay(plan, i + 1).length" class="day-empty">—</div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Empty -->
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
                <input v-model="newPlan.name" type="text"
                  :placeholder="lang.t('meal.plan_name')"
                  class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.week_start') }} <span class="req">*</span></label>
                <input v-model="newPlan.weekStartDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.notes') }} <span class="opt">{{ lang.t('meal.optional') }}</span></label>
                <textarea v-model="newPlan.notes" rows="3"
                  :placeholder="lang.t('meal.notes')"
                  class="form-input form-textarea" />
              </div>

              <!-- Xato xabari -->
              <div v-if="createError" class="modal-error">
                ⚠️ {{ createError }}
              </div>
            </div>

            <div class="modal-footer">
              <button @click="showCreate = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button @click="createPlan"
                :disabled="creating || !newPlan.name || !newPlan.weekStartDate"
                class="btn-primary">
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
                <input v-model="editPlanData.name" type="text"
                  :placeholder="lang.t('meal.plan_name')"
                  class="form-input" />
              </div>
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.notes') }} <span class="opt">{{ lang.t('meal.optional') }}</span></label>
                <textarea v-model="editPlanData.notes" rows="3"
                  :placeholder="lang.t('meal.notes')"
                  class="form-input form-textarea" />
              </div>

              <!-- Xato xabari -->
              <div v-if="editError" class="modal-error">
                ⚠️ {{ editError }}
              </div>
            </div>

            <div class="modal-footer">
              <button @click="showEdit = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button @click="saveEdit"
                :disabled="editing || !editPlanData.name"
                class="btn-primary">
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
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ lang.t('meal.add_entry') }}</h2>
              <button class="modal-close" @click="showEntry = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">
              <!-- Recipe select -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.recipe') }} <span class="req">*</span></label>
                <select v-model="newEntry.recipeId" class="form-input">
                  <option value="" disabled>— Retseptni tanlang —</option>
                  <option v-for="r in allRecipes" :key="r.id" :value="r.id">
                    {{ lang.recipeTitle(r) }}
                  </option>
                </select>
              </div>

              <!-- Day + Meal -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ lang.t('meal.day') }}</label>
                  <select v-model="newEntry.dayOfWeek" class="form-input">
                    <option v-for="(d, i) in dayLabel" :key="i" :value="i + 1">{{ d }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ lang.t('meal.meal_type') }}</label>
                  <select v-model="newEntry.mealType" class="form-input">
                    <option v-for="(label, key) in mealLabel" :key="key" :value="key">{{ label }}</option>
                  </select>
                </div>
              </div>

              <!-- Servings -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.servings_lbl') }}</label>
                <input v-model.number="newEntry.servings" type="number" min="1" max="20"
                  class="form-input" style="width: 100px" />
              </div>
            </div>

            <div class="modal-footer">
              <button @click="showEntry = false" class="btn-ghost">{{ lang.t('common.cancel') }}</button>
              <button @click="addEntry" :disabled="addingEntry || !newEntry.recipeId" class="btn-primary">
                <span v-if="addingEntry" class="spinner" />
                {{ addingEntry ? lang.t('meal.adding') : lang.t('meal.add') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* ── Header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; }
.page-title  { font-size: 22px; font-weight: 900; color: #f1f5f9; }
.page-sub    { font-size: 13px; color: #475569; margin-top: 3px; }

/* Buttons */
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
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary svg { width: 16px; height: 16px; }

.btn-ghost {
  display: inline-flex;
  align-items: center;
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
.plans-list   { display: flex; flex-direction: column; gap: 12px; }
.plan-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.2s;
}
.plan-card:hover { border-color: rgba(255,255,255,0.1); }

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

.plan-info    { flex: 1; min-width: 0; }
.plan-name-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.plan-name    { font-size: 15px; font-weight: 800; color: #e2e8f0; }
.plan-dates   { font-size: 12px; color: #475569; margin-top: 4px; font-weight: 600; }

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
  transition: background 0.2s, color 0.2s;
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
  padding: 0 20px 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  overflow-x: auto;
}
.weekly-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(120px, 1fr));
  gap: 8px;
  min-width: 780px;
  padding-top: 16px;
}

.day-header {
  text-align: center;
  font-size: 11px;
  font-weight: 800;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding-bottom: 8px;
}

.day-cell {
  min-height: 80px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.06);
  background: rgba(255,255,255,0.02);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.entry-chip {
  position: relative;
  border-radius: 8px;
  background: rgba(216,90,48,0.1);
  border: 1px solid rgba(216,90,48,0.2);
  padding: 5px 22px 5px 6px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.entry-meal   { font-size: 9px; font-weight: 800; color: #E8713E; }
.entry-recipe { font-size: 10px; color: #94a3b8; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.entry-del {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 14px;
  height: 14px;
  border: none;
  background: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.entry-del svg { width: 10px; height: 10px; color: #ef4444; }
.entry-chip:hover .entry-del { opacity: 1; }

.day-empty { font-size: 11px; color: #334155; text-align: center; padding: 12px 0; }

/* ── Expand transition ── */
.expand-enter-active { transition: all 0.25s ease; }
.expand-leave-active { transition: all 0.2s ease; }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-8px); }

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 12px; }
.skel-plan {
  height: 80px;
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
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title  { font-size: 17px; font-weight: 900; color: #f1f5f9; }
.modal-close {
  width: 32px;
  height: 32px;
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
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-row   { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-label {
  font-size: 11px;
  font-weight: 800;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
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
.form-input:focus {
  border-color: rgba(216,90,48,0.5);
  background: rgba(255,255,255,0.07);
}
.form-input option { background: #1e293b; }
.form-textarea { resize: none; line-height: 1.5; }

/* Recipe search in modal */
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

.search-dropdown {
  background: #1e293b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  overflow: hidden;
  margin-top: 4px;
  box-shadow: 0 16px 40px rgba(0,0,0,0.4);
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
  border-bottom: 1px solid rgba(255,255,255,0.05);
  transition: background 0.15s;
}
.search-result:last-child { border-bottom: none; }
.search-result:hover { background: rgba(255,255,255,0.04); }
.sr-img {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}
.sr-img img { width: 100%; height: 100%; object-fit: cover; }
.sr-info { display: flex; flex-direction: column; gap: 2px; }
.sr-title { font-size: 13px; font-weight: 700; color: #e2e8f0; }
.sr-meta  { font-size: 11px; color: #475569; }

.selected-recipe {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(216,90,48,0.08);
  border: 1px solid rgba(216,90,48,0.2);
  border-radius: 10px;
  color: #E8713E;
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
}
.selected-recipe svg { width: 14px; height: 14px; flex-shrink: 0; }

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

/* Error */
.modal-error {
  font-size: 13px;
  font-weight: 600;
  color: #f87171;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  padding: 10px 12px;
}

/* Modal transition */
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.15s ease; }
.modal-fade-enter-from  { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to    { opacity: 0; transform: scale(0.97); }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
