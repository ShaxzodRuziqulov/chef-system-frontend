<script>
export default { name: 'MealPlans' }
</script>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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

const fabVisible = ref(false)
function onScroll() { fabVisible.value = window.scrollY > 200 }
onMounted(() => window.addEventListener('scroll', onScroll))
onUnmounted(() => window.removeEventListener('scroll', onScroll))

const isMobile = ref(false)
function checkMobile() { isMobile.value = window.innerWidth <= 640 }
onMounted(() => { checkMobile(); window.addEventListener('resize', checkMobile) })
onUnmounted(() => window.removeEventListener('resize', checkMobile))

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
}

const mealLabel = computed(() => ({
  BREAKFAST: lang.t('meal.breakfast'),
  LUNCH:     lang.t('meal.lunch'),
  DINNER:    lang.t('meal.dinner'),
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

function snapToMonday(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function onWeekDateChange(e) {
  newPlan.value.weekStartDate = e.target.value ? snapToMonday(e.target.value) : ''
}

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
    let plan = res.data?.data ?? res.data

    // Darhol faollashtirish
    try {
      const actRes = await mealPlansApi.activate(plan.id)
      plan = actRes.data?.data ?? actRes.data ?? plan
    } catch { /* faollashtirish xatosi bo'lsa plan baribir qo'shiladi */ }

    expanded.value = plan.id
    showCreate.value = false
    resetCreate()
    // Barcha rejalarni qayta yuklaymiz — eski rejaning statusi o'zgargan bo'lishi mumkin
    await load()
    toast.success(lang.t('meal.created'))
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
    toast.success(lang.t('meal.updated_ok'))
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
    toast.success(lang.t('meal.activated'))
  } catch (e) {
    toast.error(parseApiError(e, lang.t('meal.activate_err')))
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
    toast.success(lang.t('meal.deleted_ok'))
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
      toast.error(parseApiError(e, lang.t('meal.load_err')))
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
  const months = lang.t('meal.months_short').split(',')
  return months[d.getMonth()]
}

function isToday(plan, i) {
  if (!plan.weekStartDate) return false
  const start = new Date(plan.weekStartDate + 'T00:00:00')
  const d = new Date(start)
  d.setDate(start.getDate() + i)
  const now = new Date()
  return d.getDate() === now.getDate() &&
         d.getMonth() === now.getMonth() &&
         d.getFullYear() === now.getFullYear()
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

const entryPrefilled = ref(false)

function openEntryModal(planId, prefilledDay, prefilledMeal) {
  entryPlanId.value = planId
  resetEntry()
  if (prefilledDay)  newEntry.value.dayOfWeek = prefilledDay
  if (prefilledMeal) newEntry.value.mealType  = prefilledMeal
  entryPrefilled.value = !!(prefilledDay && prefilledMeal)
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
    const entryRes = await mealPlansApi.addEntry(entryPlanId.value, {
      recipeId:  newEntry.value.recipeId,
      dayOfWeek: newEntry.value.dayOfWeek,
      mealType:  newEntry.value.mealType,
      servings:  newEntry.value.servings,
    })
    const updatedPlan = entryRes.data?.data ?? entryRes.data
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

// ── Random to'ldirish ─────────────────────────────────────────────────
const showRandom      = ref(false)
const randomPlanId    = ref(null)
const randomLoading   = ref(false)
const randomSearch    = ref('')
const randomSelected  = ref([])   // tanlangan recipe id lar (bo'sh = hammasi)
const randomMeals     = ref({ BREAKFAST: true, LUNCH: true, DINNER: true })
const randomOnlyEmpty = ref(true)

const randomPool = computed(() => {
  const q = randomSearch.value.trim().toLowerCase()
  if (!q) return allRecipes.value
  return allRecipes.value.filter(r =>
    (r.titleUz || '').toLowerCase().includes(q) ||
    (r.titleRu || '').toLowerCase().includes(q)
  )
})

function toggleRandomRecipe(id) {
  const idx = randomSelected.value.indexOf(id)
  if (idx === -1) randomSelected.value.push(id)
  else randomSelected.value.splice(idx, 1)
}

const allPoolSelected = computed(() =>
  randomPool.value.length > 0 &&
  randomPool.value.every(r => randomSelected.value.includes(r.id))
)

function toggleSelectAll() {
  if (allPoolSelected.value) {
    randomSelected.value = randomSelected.value.filter(
      id => !randomPool.value.some(r => r.id === id)
    )
  } else {
    const toAdd = randomPool.value
      .map(r => r.id)
      .filter(id => !randomSelected.value.includes(id))
    randomSelected.value = [...randomSelected.value, ...toAdd]
  }
}

function openRandomModal(planId) {
  randomPlanId.value = planId
  randomSelected.value = []
  randomSearch.value = ''
  randomMeals.value = { BREAKFAST: true, LUNCH: true, DINNER: true }
  randomOnlyEmpty.value = true
  showRandom.value = true
}

// Qoidalar: BREAKFAST uchun HARD tavsiya etilmaydi
const MEAL_DIFFICULTY_RULES = {
  BREAKFAST: ['EASY', 'MEDIUM'],
  LUNCH:     ['EASY', 'MEDIUM', 'HARD'],
  DINNER:    ['EASY', 'MEDIUM', 'HARD'],
}

async function applyRandom() {
  const plan = plans.value.find(p => p.id === randomPlanId.value)
  if (!plan) return

  randomLoading.value = true
  try {
    // Mavjud entries (bo'sh slotlarni o'tkazib yuborish uchun)
    const existingEntries = plan.entries || []

    // Pool: tanlangan yoki hammasi
    const pool = randomSelected.value.length > 0
      ? allRecipes.value.filter(r => randomSelected.value.includes(r.id))
      : allRecipes.value

    // Hafta davomida ishlatilgan recipe id larni kuzatamiz (takrorlanishni kamaytirish)
    const usedThisWeek = new Map() // recipeId → necha marta ishlatildi

    const toAdd = []

    for (const day of DAYS) {
      const dayEntries = existingEntries.filter(e => {
        const d = typeof e.dayOfWeek === 'number' ? DAYS[e.dayOfWeek - 1] : e.dayOfWeek
        return d === day
      })
      const usedThisDay = new Set(dayEntries.map(e => e.recipeId))

      for (const mealType of Object.keys(randomMeals.value)) {
        if (!randomMeals.value[mealType]) continue

        // Bo'sh slotni tekshirish
        if (randomOnlyEmpty.value) {
          const alreadyFilled = dayEntries.some(e => e.mealType === mealType)
          if (alreadyFilled) continue
        }

        // Qoidaga mos retseptlar
        const allowed = MEAL_DIFFICULTY_RULES[mealType]
        let candidates = pool.filter(r =>
          allowed.includes(r.difficultyLevel || 'MEDIUM') &&
          !usedThisDay.has(r.id)
        )

        // Agar yetarli bo'lmasa, usedThisDay shartini olib tashlaymiz
        if (!candidates.length) {
          candidates = pool.filter(r => allowed.includes(r.difficultyLevel || 'MEDIUM'))
        }
        // Hali ham bo'sh bo'lsa — barcha pool dan
        if (!candidates.length) candidates = [...pool]
        if (!candidates.length) continue

        // Kam ishlatilganlarni ustunlik bilan tanlash
        candidates.sort((a, b) =>
          (usedThisWeek.get(a.id) || 0) - (usedThisWeek.get(b.id) || 0)
        )
        // Bir xil "ball" li retseptlar orasidan tasodifiy
        const minUsed = usedThisWeek.get(candidates[0].id) || 0
        const topCandidates = candidates.filter(r => (usedThisWeek.get(r.id) || 0) === minUsed)
        const chosen = topCandidates[Math.floor(Math.random() * topCandidates.length)]

        usedThisDay.add(chosen.id)
        usedThisWeek.set(chosen.id, (usedThisWeek.get(chosen.id) || 0) + 1)

        toAdd.push({ recipeId: chosen.id, dayOfWeek: day, mealType, servings: 1 })
      }
    }

    let lastRes
    for (const entry of toAdd) {
      lastRes = await mealPlansApi.addEntry(randomPlanId.value, entry)
    }
    const updatedPlan = lastRes.data?.data ?? lastRes.data
    const idx = plans.value.findIndex(p => p.id === randomPlanId.value)
    if (idx !== -1) plans.value[idx] = updatedPlan

    showRandom.value = false
    toast.success(`${toAdd.length} ta ovqat qo'shildi! 🎲`)
  } catch (e) {
    toast.error(parseApiError(e, "Random to'ldirishda xato"))
  } finally {
    randomLoading.value = false
  }
}

// ── Delete entry ───────────────────────────────────────────────────────
async function doDeleteEntry(planId, entryId) {
  try {
    const delRes = await mealPlansApi.removeEntry(planId, entryId)
    const updatedPlan = delRes.data?.data ?? delRes.data
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
  const date = new Date(d + 'T00:00:00')
  const months = lang.t('meal.months_short').split(',')
  return `${date.getDate()} ${months[date.getMonth()]}`
}

function weekRelativeLabel(plan) {
  if (!plan.weekStartDate) return ''
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0,0,0,0)

  const planStart = new Date(plan.weekStartDate + 'T00:00:00')
  const diff = Math.round((planStart - monday) / (7 * 24 * 60 * 60 * 1000))

  if (diff === 0)  return lang.t('shop.this_week')
  if (diff === 1)  return lang.t('shop.next_week')
  if (diff === -1) return lang.t('shop.last_week')
  if (diff > 1)   return `${diff} ${lang.t('shop.weeks_later')}`
  return `${Math.abs(diff)} ${lang.t('shop.weeks_ago')}`
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
    if (expanded.value === null && plans.value.length) {
      expanded.value = plans.value[0].id
    }
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
              <span class="week-rel-badge">{{ weekRelativeLabel(plan) }}</span>
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
              <span class="entry-count">{{ plan.entries?.length || 0 }} {{ lang.t('meal.meals_count') }}</span>
            </p>
          </div>

          <div class="plan-actions" @click.stop>
            <button @click.stop="openRandomModal(plan.id)" class="btn-icon btn-random" title="Random to'ldirish">
              🎲
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

            <!-- Mobile: kunlar vertikal -->
            <div v-if="isMobile" class="mobile-week">
              <div
                v-for="(dayName, di) in DAYS"
                :key="'mob'+dayName"
                class="mobile-day"
                :class="{ 'mobile-day--today': isToday(plan, di) }"
              >
                <div class="mobile-day-header">
                  <span class="mobile-day-label">{{ dayShort[di] }}</span>
                  <span class="mobile-day-date">{{ dayDate(plan, di) }} {{ dayMonth(plan, di) }}</span>
                </div>
                <div class="mobile-meals">
                  <div v-for="mealType in ['BREAKFAST','LUNCH','DINNER']" :key="mealType" class="mobile-meal-slot">
                    <div
                      v-for="entry in entriesForDay(plan, dayName).filter(e => e.mealType === mealType).slice(0,1)"
                      :key="entry.id"
                      class="slot-card"
                      :class="{ 'slot-card--img': entry.recipeImageUrl }"
                      :style="entry.recipeImageUrl ? {
                        backgroundImage: `url(${resolveImageUrl(entry.recipeImageUrl)})`,
                        borderColor: MEAL_COLORS[mealType]?.border,
                      } : {
                        background: MEAL_COLORS[mealType]?.bg,
                        borderColor: MEAL_COLORS[mealType]?.border,
                      }"
                    >
                      <div v-if="entry.recipeImageUrl" class="slot-img-overlay" />
                      <span class="slot-name">{{ lang.recipeTitle({ titleUz: entry.recipeTitleUz, titleRu: entry.recipeTitleRu, titleEng: entry.recipeTitleEng }) }}</span>
                      <div class="slot-actions">
                        <button class="slot-btn slot-btn--edit" @click.stop="openEntryModal(plan.id, dayName, mealType)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                        <button class="slot-btn slot-btn--del" @click.stop="doDeleteEntry(plan.id, entry.id)">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                        </button>
                      </div>
                    </div>
                    <div
                      v-if="entriesForDay(plan, dayName).filter(e => e.mealType === mealType).length === 0"
                      class="cell-empty-hint"
                      @click.stop="openEntryModal(plan.id, dayName, mealType)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Desktop grid -->
            <div v-else class="weekly-grid">

              <!-- Corner -->
              <div class="grid-corner"></div>

              <!-- Kun sarlavhalari -->
              <div v-for="(dayName, i) in DAYS" :key="'h'+dayName" class="day-header" :class="{ 'day-header--today': isToday(plan, i) }">
                <span class="day-short">{{ dayShort[i] }}</span>
                <span class="day-num">{{ dayDate(plan, i) }}</span>
                <span class="day-mon">{{ dayMonth(plan, i) }}</span>
              </div>

              <!-- 3 ovqat vaqti qatori -->
              <template v-for="mealType in ['BREAKFAST','LUNCH','DINNER']" :key="mealType">

                <!-- Qator labeli -->
                <div class="meal-row-label">
                  <span class="meal-row-icon">{{ { BREAKFAST: '☀️', LUNCH: '🍽️', DINNER: '🌙' }[mealType] }}</span>
                  <span class="meal-row-dot" :style="{ background: MEAL_COLORS[mealType]?.dot }"/>
                </div>

                <!-- 7 kun katak -->
                <div
                  v-for="(dayName, di) in DAYS"
                  :key="mealType+dayName"
                  class="day-cell"
                  :class="{ 'day-cell--today': isToday(plan, di) }"
                >
                  <!-- Ovqat bor -->
                  <div
                    v-for="entry in entriesForDay(plan, dayName).filter(e => e.mealType === mealType).slice(0,1)"
                    :key="entry.id"
                    class="slot-card"
                    :class="{ 'slot-card--img': entry.recipeImageUrl }"
                    :style="entry.recipeImageUrl ? {
                      backgroundImage: `url(${resolveImageUrl(entry.recipeImageUrl)})`,
                      borderColor: MEAL_COLORS[mealType]?.border,
                    } : {
                      background: MEAL_COLORS[mealType]?.bg,
                      borderColor: MEAL_COLORS[mealType]?.border,
                    }"
                  >
                    <div v-if="entry.recipeImageUrl" class="slot-img-overlay" />
                    <span class="slot-name" :title="lang.recipeTitle({ titleUz: entry.recipeTitleUz, titleRu: entry.recipeTitleRu, titleEng: entry.recipeTitleEng })">
                      {{ lang.recipeTitle({ titleUz: entry.recipeTitleUz, titleRu: entry.recipeTitleRu, titleEng: entry.recipeTitleEng }) }}
                    </span>
                    <span v-if="entry.servings > 1" class="slot-servings">{{ entry.servings }} porsiya</span>
                    <div class="slot-actions">
                      <button class="slot-btn slot-btn--edit" @click.stop="openEntryModal(plan.id, dayName, mealType)" title="Almashtirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button class="slot-btn slot-btn--del" @click.stop="doDeleteEntry(plan.id, entry.id)" title="O'chirish">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                  <!-- Bo'sh katak -->
                  <div
                    v-if="entriesForDay(plan, dayName).filter(e => e.mealType === mealType).length === 0"
                    class="cell-empty-hint"
                    @click.stop="openEntryModal(plan.id, dayName, mealType)"
                    :title="`${mealLabel[mealType]} qo'shish`"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
                    </svg>
                  </div>
                </div>

              </template>
            </div><!-- /weekly-grid -->

            <!-- Legend -->
            <div class="grid-legend">
              <span v-for="(color, mt) in MEAL_COLORS" :key="mt" class="legend-item">
                <span class="legend-dot" :style="{ background: color.dot }"/>
                {{ mealLabel[mt] }}
              </span>
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
                <input :value="newPlan.weekStartDate" type="date" class="form-input" @change="onWeekDateChange" />
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
              <div v-if="!entryPrefilled" class="form-row">
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

              <!-- Servings -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('meal.servings_lbl') }}</label>
                <input
                  type="number"
                  v-model.number="newEntry.servings"
                  min="1"
                  max="20"
                  class="form-input"
                  style="width: 100px"
                />
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

    <!-- ══════════ RANDOM MODAL ══════════ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showRandom" class="modal-overlay" @click.self="showRandom = false">
          <div class="modal-box modal-box--random">
            <div class="modal-header">
              <h2 class="modal-title">🎲 Random to'ldirish</h2>
              <button class="modal-close" @click="showRandom = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <div class="modal-body">

              <!-- Qoidalar -->
              <div class="random-info">
                <div class="ri-row"><span class="ri-badge ri-breakfast">Ertalik</span> Faqat yengil/o'rta ovqatlar (EASY / MEDIUM)</div>
                <div class="ri-row"><span class="ri-badge ri-lunch">Tushlik / Kechki</span> Har qanday ovqat</div>
              </div>

              <!-- Ovqat turlari -->
              <div class="form-group">
                <label class="form-label">Qaysi ovqat turlarini to'ldirish?</label>
                <div class="meal-type-checks">
                  <label v-for="(checked, mt) in randomMeals" :key="mt" class="mt-check"
                    :style="{ borderColor: checked ? MEAL_COLORS[mt]?.border : 'var(--bd)', background: checked ? MEAL_COLORS[mt]?.bg : 'transparent' }">
                    <input type="checkbox" v-model="randomMeals[mt]" class="mt-cb" />
                    <span class="mt-dot" :style="{ background: MEAL_COLORS[mt]?.dot }" />
                    <span :style="{ color: checked ? MEAL_COLORS[mt]?.text : 'var(--tx-4)' }">{{ mealLabel[mt] }}</span>
                  </label>
                </div>
              </div>

              <!-- Faqat bo'sh slotlar -->
              <label class="only-empty-check">
                <input type="checkbox" v-model="randomOnlyEmpty" />
                <span>Faqat bo'sh slotlarni to'ldirish (mavjud ovqatlarni o'zgartirmaslik)</span>
              </label>

              <!-- Retsept tanlash (ixtiyoriy) -->
              <div class="form-group">
                <label class="form-label">
                  Foydalaniladigan retseptlar
                  <span class="opt">ixtiyoriy — bo'sh qoldirsa barcha retseptlardan</span>
                </label>
                <div class="search-field" style="margin-bottom: 8px;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="sf-icon">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                  <input v-model="randomSearch" class="sf-input" placeholder="Retsept qidirish…" />
                  <span v-if="randomSelected.length" class="sf-count">{{ randomSelected.length }} ta tanlangan</span>
                </div>
                <label class="select-all-check" @click.prevent="toggleSelectAll">
                  <input type="checkbox" :checked="allPoolSelected" :indeterminate="randomSelected.length > 0 && !allPoolSelected" class="rr-cb" readonly />
                  <span>Hammasini tanlash</span>
                  <span class="sf-count" style="margin-left:auto">{{ randomSelected.length }} / {{ randomPool.length }}</span>
                </label>

                <div class="random-recipe-list">
                  <label
                    v-for="r in randomPool.slice(0, 30)"
                    :key="r.id"
                    class="rr-item"
                    :class="{ 'rr-selected': randomSelected.includes(r.id) }"
                  >
                    <input type="checkbox" :value="r.id" :checked="randomSelected.includes(r.id)"
                      @change="toggleRandomRecipe(r.id)" class="rr-cb" />
                    <div class="rr-img">
                      <img v-if="r.imageUrl" :src="r.imageUrl" alt="" />
                      <span v-else>🍽️</span>
                    </div>
                    <div class="rr-info">
                      <span class="rr-title">{{ r.titleUz || r.titleRu }}</span>
                      <span class="rr-diff"
                        :class="{ 'diff-easy': r.difficultyLevel==='EASY', 'diff-med': r.difficultyLevel==='MEDIUM', 'diff-hard': r.difficultyLevel==='HARD' }">
                        {{ r.difficultyLevel === 'EASY' ? 'Oson' : r.difficultyLevel === 'MEDIUM' ? "O'rta" : 'Qiyin' }}
                      </span>
                    </div>
                  </label>
                  <div v-if="randomPool.length > 30" class="search-more">+{{ randomPool.length - 30 }} ta retsept ko'rinmayapti — qidiruv orqali toping</div>
                </div>
              </div>

            </div>

            <div class="modal-footer">
              <button @click="showRandom = false" class="btn-ghost">Bekor qilish</button>
              <button
                @click="applyRandom"
                :disabled="randomLoading || !Object.values(randomMeals).some(Boolean)"
                class="btn-primary"
              >
                <span v-if="randomLoading" class="spinner" />
                <span v-else>🎲 To'ldirish</span>
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


    <!-- Floating action button — scroll qilinganda ko'rinadi -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <button
          v-if="fabVisible"
          class="fab-new-plan fab-visible"
          @click="resetCreate(); showCreate = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/>
          </svg>
          {{ lang.t('meal.new_plan') }}
        </button>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }

/* ── Header ── */
.page-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.page-title  { font-size: 22px; font-weight: 900; color: var(--tx-1); }
.page-sub    { font-size: 13px; color: var(--tx-5); margin-top: 3px; }

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
  background: var(--bg-input);
  border: 1px solid var(--bd-lg);
  border-radius: 12px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-ghost:hover { background: var(--bg-input-f); }

/* ── Plan card ── */
.plans-list { display: flex; flex-direction: column; gap: 12px; }
.plan-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.plan-card:hover { border-color: var(--bd-md); box-shadow: 0 4px 20px rgba(0,0,0,0.15); }

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
.plan-header:hover { background: var(--bg-card-md); }

.plan-info      { flex: 1; min-width: 0; }
.plan-name-row  { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.plan-name      { font-size: 15px; font-weight: 800; color: var(--tx-2); }
.plan-dates     {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--tx-5);
  margin-top: 5px;
  font-weight: 600;
}
.date-icon      { width: 13px; height: 13px; flex-shrink: 0; }
.dot-sep        { color: var(--tx-6); }
.entry-count    { color: var(--tx-4); }

/* Week relative label */
.week-rel-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(255,255,255,0.06);
  color: var(--tx-5);
  border: 1px solid var(--bd);
}

/* Status badges */
.status-badge {
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.st-draft     { background: rgba(100,116,139,0.15); color: var(--tx-3); }
.st-active    { background: rgba(34,197,94,0.12); color: #4ade80; }
.st-completed { background: rgba(59,130,246,0.15);  color: #60a5fa; }

/* Action buttons */
.plan-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }


.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--bg-input);
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

.chevron svg   { width: 18px; height: 18px; color: var(--tx-5); transition: transform 0.3s; }
.chevron-up svg { transform: rotate(180deg); }

/* ── Weekly grid ── */
.weekly-grid-wrap {
  padding: 0 16px 16px;
  border-top: 1px solid var(--bd);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.weekly-grid {
  display: grid;
  grid-template-columns: 80px repeat(7, minmax(100px, 1fr));
  gap: 1px;
  background: var(--bd-md);
  border: 1px solid var(--bd-md);
  border-radius: 14px;
  overflow: hidden;
  min-width: 780px;
  margin-top: 12px;
}

/* All grid cells share the same surface background */
.grid-corner,
.day-header,
.meal-row-label,
.day-cell {
  background: var(--bg-surface);
}

/* Corner */
.grid-corner { background: var(--bg-card); }

/* Kun sarlavhasi */
.day-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  background: var(--bg-card);
}
.day-short { font-size: 10px; font-weight: 800; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.08em; }
.day-num   { font-size: 20px; font-weight: 900; color: var(--tx-2); line-height: 1.1; }
.day-mon   { font-size: 10px; color: var(--tx-5); font-weight: 600; }

/* Today highlight */
.day-header--today { background: var(--bg-card); }
.day-header--today .day-short { color: #E8713E; }
.day-header--today .day-num   {
  color: #fff;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(216,90,48,0.4);
}
.day-cell--today { background: var(--bg-surface); }

/* Ovqat vaqti qator labeli */
.meal-row-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px 4px;
  background: var(--bg-card);
  min-height: 64px;
}
.meal-row-dot  { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.meal-row-icon { font-size: 18px; line-height: 1; }

/* Kun katak */
.day-cell {
  min-height: 64px;
  padding: 5px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  position: relative;
}

/* Slot card — 1 ta ovqat to'liq katakni egallaydi */
.slot-card {
  flex: 1;
  border-radius: 9px;
  border: 1px solid;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  position: relative;
  overflow: hidden;
  transition: filter 0.15s;
}
.slot-card:hover { filter: brightness(1.06); }
.slot-card--img {
  background-size: cover;
  background-position: center;
}
.slot-img-overlay {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.62) 100%);
}
.slot-card--img .slot-name    { position: relative; z-index: 1; color: #fff; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.slot-card--img .slot-servings { position: relative; z-index: 1; color: rgba(255,255,255,0.75); }
.slot-card--img .slot-actions  { z-index: 2; }
.slot-name {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx-2);
  text-align: center;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.35;
}
.slot-servings { font-size: 9px; color: var(--tx-4); font-weight: 600; margin-top: 1px; }

.slot-actions {
  position: absolute;
  inset: 0;
  border-radius: 9px;
  background: rgba(0,0,0,0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}
.slot-card:hover .slot-actions { opacity: 1; }
.slot-btn {
  width: 30px; height: 30px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, transform 0.12s;
}
.slot-btn:hover { transform: scale(1.12); }
.slot-btn--edit { background: rgba(255,255,255,0.22); color: #fff; }
.slot-btn--edit:hover { background: rgba(255,255,255,0.38); }
.slot-btn--del  { background: rgba(239,68,68,0.75); color: #fff; }
.slot-btn--del:hover { background: rgba(239,68,68,0.95); }
.slot-btn svg { width: 13px; height: 13px; }

/* Bo'sh katak placeholder */
.cell-empty-hint {
  width: 100%;
  flex: 1;
  min-height: 52px;
  border-radius: 9px;
  border: 1.5px dashed var(--bd-xl);
  background: var(--bg-card-md);
  color: var(--tx-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}
.cell-empty-hint svg { width: 14px; height: 14px; opacity: 0.45; }
.cell-empty-hint:hover {
  border-color: rgba(216,90,48,0.45);
  background: rgba(216,90,48,0.06);
  color: #E8713E;
}
.cell-empty-hint:hover svg { opacity: 0.8; }

/* Legend */
.grid-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-top: 10px;
  flex-wrap: wrap;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--tx-4);
}
.legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
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
  background: var(--bg-card-md);
  animation: pulse 1.5s ease-in-out infinite;
}

/* ── Empty state ── */
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
  background: var(--bg-surface);
  border: 1px solid var(--bd-md);
  border-radius: 24px;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  overflow: hidden;
}
.modal-box--entry { max-width: 520px; overflow: visible; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title  { font-size: 17px; font-weight: 900; color: var(--tx-1); }
.modal-close {
  width: 32px; height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--bd);
  color: var(--tx-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.modal-close:hover { background: var(--bd-md); color: var(--tx-2); }
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
  color: var(--tx-4);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.form-hint  { font-size: 11px; color: var(--tx-6); }
.req { color: #ef4444; }
.opt { color: var(--tx-6); font-weight: 600; text-transform: none; letter-spacing: 0; font-size: 10px; }

.form-input {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 12px;
  color: var(--tx-2);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s, background 0.2s;
  box-sizing: border-box;
}
.form-input:focus { border-color: rgba(216,90,48,0.5); background: var(--bg-input-f); }
.form-input option { background: var(--bg-surface); }
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
  background: var(--bd);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.sr-name { flex: 1; font-size: 13px; font-weight: 700; color: var(--tx-2); }
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
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 12px;
  padding: 0 12px;
  height: 44px;
  transition: border-color 0.2s;
}
.search-field:focus-within { border-color: rgba(216,90,48,0.5); }
.sf-icon  { width: 16px; height: 16px; color: var(--tx-5); flex-shrink: 0; }
.sf-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--tx-2);
}
.sf-input::placeholder { color: var(--tx-6); }
.sf-count {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx-5);
  background: var(--bd);
  padding: 2px 7px;
  border-radius: 6px;
}

.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  background: var(--bg-surface);
  border: 1px solid var(--bd-md);
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
  border-bottom: 1px solid var(--bd);
  transition: background 0.15s;
}
.search-result:last-child { border-bottom: none; }
.search-result:hover { background: var(--bg-card-md); }
.sr-img {
  width: 36px; height: 36px;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 16px;
}
.sr-img img { width: 100%; height: 100%; object-fit: cover; }
.sr-info { display: flex; flex-direction: column; gap: 2px; }
.sr-title { font-size: 13px; font-weight: 700; color: var(--tx-2); }
.sr-meta  { font-size: 11px; color: var(--tx-5); }
.search-more  { padding: 8px 12px; font-size: 11px; color: var(--tx-5); text-align: center; border-top: 1px solid var(--bd); }
.search-empty { padding: 16px 12px; font-size: 13px; color: var(--tx-5); text-align: center; }

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
  border: 1px solid var(--bd-lg);
  background: var(--bg-input);
  color: var(--tx-2);
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
.srv-val   { font-size: 20px; font-weight: 900; color: var(--tx-2); min-width: 28px; text-align: center; }
.srv-label { font-size: 12px; color: var(--tx-5); font-weight: 600; }

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

/* ── Random button ── */
.btn-random {
  font-size: 16px;
  color: #a855f7;
  background: rgba(168,85,247,0.1);
}
.btn-random:hover { background: rgba(168,85,247,0.2); }

/* ── Random modal ── */
.modal-box--random { max-width: 560px; }

.random-info {
  background: rgba(216,90,48,0.06);
  border: 1px solid rgba(216,90,48,0.15);
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.ri-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--tx-4);
  font-weight: 600;
}
.ri-badge {
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 10px;
  font-weight: 800;
  flex-shrink: 0;
}
.ri-breakfast { background: rgba(59,130,246,0.15); color: #60a5fa; }
.ri-snack     { background: rgba(245,158,11,0.15); color: #fbbf24; }
.ri-lunch     { background: rgba(34,197,94,0.12);  color: #4ade80; }

/* Meal type checkboxes */
.meal-type-checks {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mt-check {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid var(--bd);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  transition: all 0.2s;
  user-select: none;
}
.mt-cb { display: none; }
.mt-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

/* Only empty checkbox */
.only-empty-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tx-4);
  font-weight: 600;
  cursor: pointer;
  user-select: none;
}
.only-empty-check input { width: 15px; height: 15px; accent-color: #E8713E; cursor: pointer; }

/* Select all */
.select-all-check {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
  color: var(--tx-3);
  user-select: none;
  margin-bottom: 6px;
  transition: background 0.15s;
}
.select-all-check:hover { background: rgba(216,90,48,0.08); color: #E8713E; }

/* Recipe list */
.random-recipe-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--bd);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
}
.rr-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid var(--bd);
  transition: background 0.15s;
  user-select: none;
}
.rr-item:last-child { border-bottom: none; }
.rr-item:hover { background: var(--bg-card-md); }
.rr-selected { background: rgba(216,90,48,0.07); }
.rr-cb { width: 15px; height: 15px; accent-color: #E8713E; flex-shrink: 0; cursor: pointer; }
.rr-img {
  width: 32px; height: 32px;
  border-radius: 7px;
  overflow: hidden;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.rr-img img { width: 100%; height: 100%; object-fit: cover; }
.rr-info { flex: 1; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.rr-title { font-size: 12px; font-weight: 700; color: var(--tx-2); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.rr-diff  { font-size: 10px; font-weight: 800; padding: 2px 7px; border-radius: 6px; flex-shrink: 0; }
.diff-easy { background: rgba(34,197,94,0.12); color: #4ade80; }
.diff-med  { background: rgba(245,158,11,0.12); color: #fbbf24; }
.diff-hard { background: rgba(239,68,68,0.12);  color: #f87171; }

/* ── Floating action button (scroll qilinganda ko'rinadi) ── */
.fab-new-plan {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 50;
  display: none;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(216,90,48,0.45);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.3s;
}
.fab-new-plan.fab-visible { display: inline-flex; }
.fab-new-plan:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(216,90,48,0.55); }
.fab-new-plan svg { width: 16px; height: 16px; }

/* ── Mobile ── */
@media (max-width: 640px) {
  /* Plan header — kichikroq padding */
  .plan-header { padding: 12px 14px; gap: 8px; }

  /* Plan info area — truncate long names */
  .plan-name  { font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
  .plan-dates { font-size: 11px; flex-wrap: wrap; gap: 4px; }
  .entry-count { display: none; }

  /* Action buttons — compact */
  .plan-actions { gap: 4px; }
  .btn-icon     { width: 28px; height: 28px; }
  .btn-icon svg { width: 13px; height: 13px; }
  .btn-random   { font-size: 14px; }
  .chevron svg  { width: 16px; height: 16px; }

  /* Modal — bottom sheet */
  .modal-overlay { padding: 0; align-items: flex-end; }
  .modal-box     { border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto; }

  /* Form row — ustma-ust */
  .form-row { grid-template-columns: 1fr; gap: 10px; }

  /* Mobile week — vertikal kunlar */
  .mobile-week { display: flex; flex-direction: column; gap: 8px; padding: 12px; }
  .mobile-day {
    border-radius: 14px;
    border: 1px solid var(--bd-md);
    background: var(--bg-surface);
    overflow: hidden;
  }
  .mobile-day--today { border-color: #E8713E; }
  .mobile-day-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px 8px;
    border-bottom: 1px solid var(--bd);
  }
  .mobile-day-label {
    font-size: 11px;
    font-weight: 800;
    color: var(--tx-4);
    text-transform: uppercase;
  }
  .mobile-day--today .mobile-day-label { color: #E8713E; }
  .mobile-day-date { font-size: 13px; font-weight: 700; color: var(--tx-2); }
  .mobile-meals {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    padding: 8px;
  }
  .mobile-meal-slot { display: flex; flex-direction: column; }
  .mobile-meal-slot .slot-card { min-height: 64px; }
  .mobile-meal-slot .cell-empty-hint { min-height: 64px; border-radius: 9px; }

  /* FAB scroll qilib tushganda ko'rinsin */
  .fab-new-plan { bottom: 20px; right: 16px; padding: 11px 16px; font-size: 12px; }
}

/* ── Dark mode grid ko'rinishi ── */
[data-theme="dark"] .plan-card   { border-color: rgba(255,255,255,0.10); }
[data-theme="dark"] .weekly-grid { background: rgba(255,255,255,0.10); border-color: rgba(255,255,255,0.10); }

[data-theme="dark"] .grid-corner,
[data-theme="dark"] .day-header,
[data-theme="dark"] .meal-row-label { background: rgba(255,255,255,0.06); }

[data-theme="dark"] .day-cell       { background: rgba(255,255,255,0.02); }

[data-theme="dark"] .day-short,
[data-theme="dark"] .day-mon        { color: #94a3b8; }

[data-theme="dark"] .cell-empty-hint {
  border-color: rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.04);
  color: #94a3b8;
}
[data-theme="dark"] .cell-empty-hint svg { opacity: 0.6; }
[data-theme="dark"] .slot-name      { color: #e2e8f0; }
[data-theme="dark"] .slot-servings  { color: #94a3b8; }

[data-theme="dark"] .legend-item    { color: #94a3b8; }
[data-theme="dark"] .week-rel-badge { color: #94a3b8; border-color: rgba(255,255,255,0.12); }
[data-theme="dark"] .plan-dates     { color: #64748b; }
[data-theme="dark"] .chevron svg    { color: #64748b; }
</style>
