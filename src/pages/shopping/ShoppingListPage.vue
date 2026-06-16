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

const CATEGORY_META = {
  MEAT:      { emoji: '🥩', uz: "Go'sht",          ru: 'Мясо',          en: 'Meat' },
  VEGETABLE: { emoji: '🥕', uz: 'Sabzavot',         ru: 'Овощи',         en: 'Vegetables' },
  FRUIT:     { emoji: '🍎', uz: 'Mevalar',           ru: 'Фрукты',        en: 'Fruits' },
  GRAIN:     { emoji: '🌾', uz: 'Don va un',         ru: 'Крупы и мука',  en: 'Grains & Flour' },
  DAIRY:     { emoji: '🥛', uz: 'Sut va tuxum',      ru: 'Молочные',      en: 'Dairy & Eggs' },
  SPICE:     { emoji: '🧂', uz: 'Ziravorlar',        ru: 'Специи',        en: 'Spices' },
  OIL:       { emoji: '🫙', uz: "Yog' va souslar",   ru: 'Масла и соусы', en: 'Oils & Sauces' },
  OTHER:     { emoji: '🛒', uz: 'Boshqa',            ru: 'Прочее',        en: 'Other' },
}

const CATEGORY_COLORS = {
  MEAT: '#ef4444', VEGETABLE: '#22c55e', FRUIT: '#f97316',
  GRAIN: '#eab308', DAIRY: '#60a5fa', SPICE: '#a855f7',
  OIL: '#f59e0b', OTHER: '#6b7280',
}

function categoryLabel(section) {
  const meta = CATEGORY_META[section] || CATEGORY_META.OTHER
  const l = lang.lang
  const name = l === 'ru' ? meta.ru : l === 'en' ? meta.en : meta.uz
  return `${meta.emoji} ${name}`
}

function categoryColor(section) {
  return CATEGORY_COLORS[section] || CATEGORY_COLORS.OTHER
}

function groupBySection(items) {
  const order = ['MEAT','VEGETABLE','FRUIT','GRAIN','DAIRY','SPICE','OIL','OTHER']
  const map = {}
  for (const item of items) {
    const key = item.grocerySection || 'OTHER'
    if (!map[key]) map[key] = []
    map[key].push(item)
  }
  return order.filter(k => map[k]).map(k => ({ section: k, items: map[k] }))
}

const lists      = ref([])
const plans      = ref([])
const loading    = ref(true)
const generating = ref(false)
const deleting   = ref(null)
const sharing    = ref(null)
const selectedPlanId = ref('')
const expanded   = ref(null)
const confirmDel = ref({ show: false, id: null })
const genCardRef = ref(null)

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
    const existingIdx = lists.value.findIndex(l => l.mealPlanId === Number(selectedPlanId.value))
    if (existingIdx !== -1) {
      lists.value[existingIdx] = created
      toast.success(lang.t('shop.updated'))
    } else {
      lists.value.unshift(created)
      toast.success(lang.t('shop.created'))
    }
    selectedPlanId.value = ''
    expanded.value = created.id
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
  if (plan?.weekStartDate) return formatWeekRange(plan.weekStartDate)
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

function scrollToGen() {
  genCardRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => {
    genCardRef.value?.querySelector('.plan-select')?.focus()
  }, 400)
}

const totalItems = computed(() => lists.value.reduce((s, l) => s + (l.items?.length || 0), 0))
const totalDone  = computed(() => lists.value.reduce((s, l) => s + purchasedCount(l), 0))
</script>

<template>
  <div class="page">

    <!-- ── Header ── -->
    <div class="page-header">
      <div class="header-main">
        <div>
          <h1 class="page-title">{{ lang.t('shop.title') }}</h1>
          <p class="page-sub">{{ lang.t('shop.sub') }}</p>
        </div>
        <div v-if="lists.length && !loading" class="header-stats">
          <div class="hstat">
            <span class="hstat-val">{{ lists.length }}</span>
            <span class="hstat-lbl">ro'yxat</span>
          </div>
          <div class="hstat-divider" />
          <div class="hstat">
            <span class="hstat-val">{{ totalDone }}/{{ totalItems }}</span>
            <span class="hstat-lbl">mahsulot</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Generate card ── -->
    <div ref="genCardRef" class="gen-card" :class="{ 'gen-card--active': !!selectedPlanId }">
      <div class="gen-card__inner">
        <div class="gen-left">
          <div class="gen-icon-wrap">
            <span class="gen-icon">🛒</span>
          </div>
          <div class="gen-text">
            <div class="gen-title">{{ lang.t('shop.panel_title') }}</div>
            <div class="gen-sub">{{ lang.t('shop.panel_sub') }}</div>
          </div>
        </div>

        <div class="gen-right">
          <div class="gen-select-wrap">
            <select v-model="selectedPlanId" class="plan-select" :disabled="!plans.length || generating">
              <option value="">{{ lang.t('shop.select_plan') }}</option>
              <option v-for="p in plans" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </div>

          <button
            @click="generate"
            :disabled="!selectedPlanId || generating"
            class="btn-gen"
            :class="{ 'btn-gen--update': isRegenerating }"
          >
            <span v-if="generating" class="spinner" />
            <template v-else>
              <svg v-if="isRegenerating" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
              </svg>
            </template>
            {{ generating
                ? (isRegenerating ? lang.t('shop.updating') : lang.t('shop.creating'))
                : isRegenerating ? lang.t('shop.regenerate') : lang.t('shop.generate') }}
          </button>
        </div>
      </div>

      <!-- Plan preview pill -->
      <Transition name="slide-down">
        <div v-if="selectedPlanId && selectedPlanName" class="gen-preview">
          <span class="gen-preview__dot" />
          <span class="gen-preview__name">{{ selectedPlanName }}</span>
          <span v-if="isRegenerating" class="gen-preview__badge gen-preview__badge--update">Yangilanadi</span>
          <span v-else class="gen-preview__badge gen-preview__badge--new">Yangi ro'yxat</span>
        </div>
      </Transition>

      <div v-if="!plans.length && !loading" class="gen-no-plans">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        Avval <RouterLink to="/app/meal-plan" class="gen-plan-link">haftalik reja</RouterLink> yarating
      </div>
    </div>

    <!-- ── Skeleton ── -->
    <div v-if="loading" class="skel-list">
      <div v-for="i in 3" :key="i" class="skel-card">
        <div class="skel-circle" />
        <div class="skel-lines">
          <div class="skel-line skel-line--w60" />
          <div class="skel-line skel-line--w40" />
          <div class="skel-line skel-line--bar" />
        </div>
      </div>
    </div>

    <!-- ── List cards ── -->
    <TransitionGroup v-else-if="lists.length" name="list-item" tag="div" class="lists">
      <div
        v-for="list in lists"
        :key="list.id"
        class="list-card"
        :class="{
          'list-card--done':  progress(list) === 100,
          'list-card--open':  expanded === list.id,
          'list-card--stale': isStale(list),
        }"
      >
        <!-- Card header -->
        <div class="list-header" @click="expanded = expanded === list.id ? null : list.id">
          <div class="lh-left">

            <!-- Circular progress -->
            <div class="cp-wrap" :class="{ 'cp-wrap--done': progress(list) === 100, 'cp-wrap--empty': !list.items?.length }">
              <template v-if="!list.items?.length">
                <span class="cp-emoji">🛒</span>
              </template>
              <template v-else-if="progress(list) === 100">
                <span class="cp-emoji cp-emoji--done">✓</span>
              </template>
              <template v-else>
                <svg viewBox="0 0 40 40" class="cp-svg">
                  <circle class="cp-track" cx="20" cy="20" r="17" />
                  <circle
                    class="cp-arc"
                    cx="20" cy="20" r="17"
                    :style="`stroke-dashoffset: ${107 - 107 * progress(list) / 100}`"
                  />
                </svg>
                <span class="cp-pct">{{ progress(list) }}%</span>
              </template>
            </div>

            <div class="lh-info">
              <div class="lh-name-row">
                <span class="lh-name">{{ listDisplayName(list) }}</span>
                <span v-if="weekRelativeLabel(list)" class="badge badge--week">{{ weekRelativeLabel(list) }}</span>
                <span v-if="progress(list) === 100" class="badge badge--done">✓ Tugadi</span>
                <span v-if="isStale(list)" class="badge badge--stale">Yangilanishi kerak</span>
              </div>
              <div class="lh-meta">
                <span :class="['lh-count', purchasedCount(list) > 0 && progress(list) < 100 ? 'lh-count--partial' : '']">
                  {{ purchasedCount(list) }} / {{ list.items?.length || 0 }} {{ lang.t('shop.items') }}
                </span>
              </div>
              <div v-if="list.items?.length" class="progress-bar">
                <div class="progress-fill" :style="{ width: progress(list) + '%' }" />
              </div>
            </div>
          </div>

          <div class="lh-actions" @click.stop>
            <button
              v-if="isStale(list)"
              @click="regenerateForList(list)"
              :disabled="generating"
              class="lh-btn lh-btn--refresh"
              title="Yangilash"
            >
              <span v-if="generating" class="spinner spinner--dark" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
            </button>

            <button
              v-if="list.items?.length"
              @click="shareList(list)"
              class="lh-btn lh-btn--share"
              :class="{ 'lh-btn--shared': sharing === list.id }"
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

            <button
              @click="askDeleteList(list.id)"
              class="lh-btn lh-btn--del"
              :disabled="deleting === list.id"
            >
              <span v-if="deleting === list.id" class="spinner spinner--red" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
              </svg>
            </button>

            <div class="chevron" :class="{ 'chevron--up': expanded === list.id }">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </div>
          </div>
        </div>

        <!-- Items panel -->
        <Transition name="expand">
          <div v-if="expanded === list.id" class="items-panel">

            <div v-if="!list.items?.length" class="items-empty">
              <span>🥗</span> {{ lang.t('shop.empty_list') }}
            </div>

            <!-- Kerakli -->
            <template v-if="list.items?.filter(i => i.status !== 'PURCHASED').length">
              <div class="section-header">
                <span class="section-label">{{ lang.t('shop.needed') }}</span>
                <span class="section-count">{{ list.items.filter(i => i.status !== 'PURCHASED').length }}</span>
              </div>

              <template v-for="group in groupBySection(list.items.filter(i => i.status !== 'PURCHASED'))" :key="group.section">
                <div class="cat-row" :style="`--cat-color: ${categoryColor(group.section)}`">
                  <span class="cat-dot" />
                  <span class="cat-label">{{ categoryLabel(group.section) }}</span>
                  <span class="cat-count">{{ group.items.length }}</span>
                </div>
                <div
                  v-for="item in group.items"
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
            </template>

            <!-- Sotib olingan -->
            <template v-if="list.items?.filter(i => i.status === 'PURCHASED').length">
              <div class="section-header section-header--done">
                <span class="section-label">{{ lang.t('shop.purchased') }}</span>
                <span class="section-count">{{ list.items.filter(i => i.status === 'PURCHASED').length }}</span>
              </div>
              <div
                v-for="item in list.items.filter(i => i.status === 'PURCHASED')"
                :key="item.id"
                class="item-row item-row--done"
                @click="toggleItem(list.id, item.id, item.status)"
              >
                <div class="item-check item-check--done">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                  </svg>
                </div>
                <span class="item-name item-name--done">{{ lang.ingName(item) || item.ingredientNameUz || item.ingredientNameRu }}</span>
                <span class="item-amount item-amount--done">{{ units.formatAmount(item.amount, item.unit) }}</span>
              </div>
            </template>

          </div>
        </Transition>
      </div>
    </TransitionGroup>

    <!-- ── Empty state ── -->
    <div v-else-if="!loading" class="empty-state">
      <!-- Visual -->
      <div class="empty-visual">
        <div class="empty-blob" />
        <div class="empty-rings">
          <div class="empty-ring empty-ring--1" />
          <div class="empty-ring empty-ring--2" />
        </div>
        <span class="empty-emoji">🛒</span>
      </div>

      <h2 class="empty-title">Hali ro'yxat yo'q</h2>
      <p class="empty-sub">Haftalik reja asosida bir zumda yarating va do'konga boring</p>

      <!-- Steps guide -->
      <div class="steps-guide">
        <div class="step-item">
          <div class="step-num">1</div>
          <div class="step-content">
            <div class="step-title">Haftalik reja tanlang</div>
            <div class="step-hint">Yuqoridagi ochiladigan ro'yxatdan</div>
          </div>
        </div>
        <div class="step-connector">
          <svg viewBox="0 0 24 6" fill="none">
            <path d="M0 3 Q6 0 12 3 Q18 6 24 3" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
          </svg>
        </div>
        <div class="step-item">
          <div class="step-num">2</div>
          <div class="step-content">
            <div class="step-title">Ro'yxat yarating</div>
            <div class="step-hint">Ingredientlar avtomatik qo'shiladi</div>
          </div>
        </div>
        <div class="step-connector">
          <svg viewBox="0 0 24 6" fill="none">
            <path d="M0 3 Q6 0 12 3 Q18 6 24 3" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>
          </svg>
        </div>
        <div class="step-item">
          <div class="step-num">3</div>
          <div class="step-content">
            <div class="step-title">Do'konga boring!</div>
            <div class="step-hint">Birma-bir belgilab chiqing</div>
          </div>
        </div>
      </div>

      <button class="btn-start" @click="scrollToGen">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/>
        </svg>
        Ro'yxat yaratishni boshlash
      </button>
    </div>

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
/* ── Base ── */
.page { display: flex; flex-direction: column; gap: 20px; flex: 1; }

/* ── Header ── */
.header-main  { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.page-title   { font-size: 24px; font-weight: 900; color: var(--tx-1); letter-spacing: -0.5px; }
.page-sub     { font-size: 13px; color: var(--tx-5); margin-top: 4px; }

.header-stats {
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 14px;
  padding: 10px 18px;
}
.hstat       { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.hstat-val   { font-size: 18px; font-weight: 900; color: var(--tx-1); line-height: 1; }
.hstat-lbl   { font-size: 10px; font-weight: 700; color: var(--tx-6); text-transform: uppercase; letter-spacing: 0.06em; }
.hstat-divider { width: 1px; height: 28px; background: var(--bd); }

/* ── Generate card ── */
.gen-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  padding: 20px 24px;
  transition: border-color 0.3s, box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}
.gen-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #D85A30, #E8713E);
  border-radius: 4px 0 0 4px;
  opacity: 0;
  transition: opacity 0.3s;
}
.gen-card--active { border-color: rgba(216,90,48,0.3); box-shadow: 0 0 0 3px rgba(216,90,48,0.06); }
.gen-card--active::before { opacity: 1; }

.gen-card__inner {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.gen-left {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
  min-width: 200px;
}
.gen-icon-wrap {
  width: 48px; height: 48px; flex-shrink: 0;
  background: rgba(216,90,48,0.1);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
}
.gen-icon  { font-size: 22px; }
.gen-title { font-size: 14px; font-weight: 800; color: var(--tx-2); }
.gen-sub   { font-size: 12px; color: var(--tx-5); margin-top: 3px; }

.gen-right {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.gen-select-wrap { position: relative; }
.plan-select {
  height: 42px;
  padding: 0 36px 0 14px;
  background: var(--bg-input);
  border: 1.5px solid var(--bd-lg);
  border-radius: 12px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 600;
  outline: none;
  cursor: pointer;
  min-width: 210px;
  appearance: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.plan-select:focus  { border-color: rgba(216,90,48,0.6); box-shadow: 0 0 0 3px rgba(216,90,48,0.08); }
.plan-select option { background: var(--bg-surface); }
.plan-select:disabled { opacity: 0.5; cursor: not-allowed; }
.select-chevron {
  position: absolute;
  right: 10px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px;
  color: var(--tx-5);
  pointer-events: none;
}

.btn-gen {
  display: inline-flex; align-items: center; gap: 8px;
  height: 42px; padding: 0 20px;
  background: linear-gradient(135deg, #D85A30 0%, #E8713E 100%);
  color: #fff;
  font-size: 13px; font-weight: 800;
  border: none; border-radius: 12px; cursor: pointer;
  box-shadow: 0 4px 14px rgba(216,90,48,0.35);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  white-space: nowrap;
}
.btn-gen svg   { width: 15px; height: 15px; }
.btn-gen:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(216,90,48,0.45); }
.btn-gen:active:not(:disabled) { transform: translateY(0); }
.btn-gen:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.btn-gen--update {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  box-shadow: 0 4px 14px rgba(59,130,246,0.35);
}
.btn-gen--update:hover:not(:disabled) { box-shadow: 0 8px 20px rgba(59,130,246,0.45); }

/* Plan preview */
.gen-preview {
  display: inline-flex; align-items: center; gap: 8px;
  margin-top: 12px;
  padding: 6px 12px;
  background: rgba(216,90,48,0.06);
  border: 1px solid rgba(216,90,48,0.15);
  border-radius: 20px;
  font-size: 12px; font-weight: 600; color: var(--tx-3);
}
.gen-preview__dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #E8713E;
  animation: pulse-dot 1.5s ease infinite;
}
.gen-preview__badge {
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800;
}
.gen-preview__badge--new    { background: rgba(216,90,48,0.12); color: #E8713E; }
.gen-preview__badge--update { background: rgba(59,130,246,0.12); color: #60a5fa; }

.gen-no-plans {
  display: flex; align-items: center; gap: 6px;
  margin-top: 10px; font-size: 12px; font-weight: 600; color: #f59e0b;
}
.gen-no-plans svg { width: 14px; height: 14px; flex-shrink: 0; }
.gen-plan-link { color: #E8713E; text-decoration: underline; }

/* ── Skeleton ── */
.skel-list { display: flex; flex-direction: column; gap: 10px; }
.skel-card {
  display: flex; align-items: center; gap: 16px;
  padding: 18px 22px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
}
.skel-circle {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--bg-card-md);
  flex-shrink: 0;
  animation: shimmer 1.6s ease infinite;
}
.skel-lines { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.skel-line {
  height: 10px; border-radius: 6px;
  background: var(--bg-card-md);
  animation: shimmer 1.6s ease infinite;
}
.skel-line--w60  { width: 60%; }
.skel-line--w40  { width: 40%; }
.skel-line--bar  { width: 90%; height: 4px; margin-top: 4px; }

/* ── List cards ── */
.lists { display: flex; flex-direction: column; gap: 10px; }
.list-card {
  background: var(--bg-card);
  border: 1.5px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  transition: border-color 0.25s, box-shadow 0.25s;
}
.list-card:hover          { border-color: var(--bd-lg); }
.list-card--done          { border-color: rgba(34,197,94,0.25); box-shadow: 0 0 0 3px rgba(34,197,94,0.04); }
.list-card--stale         { border-color: rgba(251,191,36,0.3); }

.list-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; padding: 16px 20px;
  cursor: pointer; user-select: none;
  transition: background 0.15s;
}
.list-header:hover { background: var(--bg-card-md); }

.lh-left { display: flex; align-items: center; gap: 14px; flex: 1; min-width: 0; }

/* Circular progress */
.cp-wrap {
  position: relative; width: 52px; height: 52px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.cp-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.cp-track { fill: none; stroke: var(--bd); stroke-width: 3.5; }
.cp-arc   {
  fill: none; stroke: #E8713E; stroke-width: 3.5;
  stroke-linecap: round; stroke-dasharray: 107;
  transition: stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1);
}
.cp-wrap--done .cp-arc { stroke: #22c55e; }
.cp-pct {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 900; color: #E8713E;
}
.cp-wrap--done .cp-pct { color: #22c55e; }
.cp-emoji {
  font-size: 22px; line-height: 1;
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
}
.cp-emoji--done { font-size: 20px; font-style: normal; font-weight: 900; color: #22c55e; }

.lh-info { flex: 1; min-width: 0; }
.lh-name-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-bottom: 4px; }
.lh-name  { font-size: 15px; font-weight: 800; color: var(--tx-1); }

.badge {
  display: inline-flex; align-items: center;
  padding: 2px 8px; border-radius: 8px;
  font-size: 10px; font-weight: 800; line-height: 1.4;
}
.badge--week  { background: var(--bg-input); color: var(--tx-5); border: 1px solid var(--bd); }
.badge--done  { background: rgba(34,197,94,0.12); color: #4ade80; }
.badge--stale { background: rgba(251,191,36,0.12); color: #fbbf24; }

.lh-meta { font-size: 12px; color: var(--tx-5); font-weight: 600; }
.lh-count--partial { color: #E8713E; font-weight: 700; }

.progress-bar {
  height: 3px; background: var(--bd); border-radius: 3px;
  overflow: hidden; margin-top: 8px;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #D85A30, #E8713E, #fb923c);
  background-size: 200% 100%;
  border-radius: 3px;
  transition: width 0.6s cubic-bezier(0.4,0,0.2,1);
  animation: shimmer-bar 2s linear infinite;
}
.list-card--done .progress-fill { background: linear-gradient(90deg, #16a34a, #22c55e); animation: none; }

.lh-actions { display: flex; align-items: center; gap: 5px; flex-shrink: 0; }
.lh-btn {
  width: 32px; height: 32px; border-radius: 9px; border: 1px solid transparent;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.18s;
}
.lh-btn svg    { width: 15px; height: 15px; }
.lh-btn--refresh {
  background: rgba(59,130,246,0.08); border-color: rgba(59,130,246,0.2); color: #60a5fa;
}
.lh-btn--refresh:hover:not(:disabled) { background: rgba(59,130,246,0.16); border-color: rgba(59,130,246,0.5); }
.lh-btn--refresh:disabled { opacity: 0.4; cursor: not-allowed; }
.lh-btn--share {
  background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.2); color: #10b981;
}
.lh-btn--share:hover   { background: rgba(16,185,129,0.16); border-color: rgba(16,185,129,0.5); }
.lh-btn--shared { background: rgba(16,185,129,0.2); }
.lh-btn--del {
  background: rgba(239,68,68,0.08); border-color: rgba(239,68,68,0.15); color: #ef4444;
}
.lh-btn--del:hover:not(:disabled) { background: rgba(239,68,68,0.16); border-color: rgba(239,68,68,0.4); }
.lh-btn--del:disabled { opacity: 0.4; cursor: not-allowed; }

.chevron svg { width: 17px; height: 17px; color: var(--tx-5); transition: transform 0.3s cubic-bezier(0.4,0,0.2,1); }
.chevron--up svg { transform: rotate(180deg); }

/* ── Items panel ── */
.items-panel { border-top: 1px solid var(--bd); }
.items-empty {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 24px; font-size: 13px; color: var(--tx-6);
}

.section-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 20px 7px;
  background: var(--bg-input);
  border-bottom: 1px solid var(--bd);
}
.section-header--done { border-top: 1px solid var(--bd); }
.section-label {
  font-size: 9px; font-weight: 900; text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--tx-5);
}
.section-count {
  font-size: 10px; font-weight: 800; color: var(--tx-6);
  background: var(--bg-card-md); padding: 1px 6px; border-radius: 6px;
}

.cat-row {
  display: flex; align-items: center; gap: 7px;
  padding: 5px 20px 4px;
  background: var(--bg-card-md);
  border-bottom: 1px solid var(--bd);
}
.cat-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: var(--cat-color, #6b7280);
}
.cat-label { font-size: 11px; font-weight: 700; color: var(--tx-3); }
.cat-count { margin-left: auto; font-size: 10px; font-weight: 600; color: var(--tx-6); }

.item-row {
  display: flex; align-items: center; gap: 13px;
  padding: 12px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--bd);
  transition: background 0.12s;
}
.item-row:last-child { border-bottom: none; }
.item-row:hover { background: var(--bg-card-md); }
.item-row:hover .item-check { border-color: rgba(216,90,48,0.6); }
.item-row:hover .item-check svg { opacity: 0.4; color: #E8713E; }

.item-check {
  width: 22px; height: 22px; border-radius: 50%;
  border: 2px solid var(--bd-xl);
  flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.item-check svg { width: 11px; height: 11px; color: transparent; transition: all 0.2s; }
.item-check--done {
  background: #22c55e; border-color: #22c55e;
  transform: scale(1.05);
}
.item-check--done svg { color: #fff; opacity: 1 !important; }

.item-name   { flex: 1; font-size: 14px; font-weight: 600; color: var(--tx-2); }
.item-name--done { text-decoration: line-through; color: var(--tx-6); font-weight: 500; }
.item-amount     { font-size: 13px; font-weight: 700; color: var(--tx-5); }
.item-amount--done { color: var(--tx-6); font-weight: 500; }
.item-row--done { opacity: 0.65; }

/* ── Empty state ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1;
  padding: 40px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 28px;
  text-align: center;
  gap: 0;
}

.empty-visual {
  position: relative; width: 100px; height: 100px;
  margin-bottom: 18px;
  display: flex; align-items: center; justify-content: center;
}
.empty-blob {
  position: absolute; inset: 10px;
  background: radial-gradient(circle, rgba(216,90,48,0.15) 0%, transparent 70%);
  border-radius: 50%;
  animation: breathe 3s ease-in-out infinite;
}
.empty-ring {
  position: absolute; border-radius: 50%;
  border: 1.5px solid rgba(216,90,48,0.12);
  animation: ripple 3s ease-out infinite;
}
.empty-ring--1 { inset: 0; animation-delay: 0s; }
.empty-ring--2 { inset: -14px; animation-delay: 0.8s; }
.empty-emoji { font-size: 52px; position: relative; z-index: 1; filter: drop-shadow(0 4px 12px rgba(216,90,48,0.2)); }

.empty-title { font-size: 20px; font-weight: 900; color: var(--tx-2); margin-bottom: 6px; }
.empty-sub   { font-size: 14px; color: var(--tx-5); max-width: 340px; line-height: 1.5; margin-bottom: 24px; }

/* Steps guide */
.steps-guide {
  display: flex; align-items: center; gap: 0;
  margin-bottom: 24px; flex-wrap: wrap; justify-content: center;
}
.step-item {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--bd);
  border-radius: 16px;
  min-width: 140px; max-width: 160px;
  text-align: left;
}
.step-num {
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: #fff;
  font-size: 13px; font-weight: 900;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 3px 8px rgba(216,90,48,0.35);
}
.step-title { font-size: 12px; font-weight: 800; color: var(--tx-2); }
.step-hint  { font-size: 10px; color: var(--tx-5); margin-top: 2px; }
.step-connector {
  color: var(--tx-6); padding: 0 6px;
  display: flex; align-items: center;
  width: 40px; flex-shrink: 0;
}
.step-connector svg { width: 100%; }

.btn-start {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 13px 28px;
  background: linear-gradient(135deg, #D85A30 0%, #E8713E 100%);
  color: #fff;
  font-size: 14px; font-weight: 800;
  border: none; border-radius: 14px; cursor: pointer;
  box-shadow: 0 6px 20px rgba(216,90,48,0.4);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-start svg { width: 16px; height: 16px; }
.btn-start:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(216,90,48,0.5); }
.btn-start:active { transform: translateY(0); }

/* ── Transitions ── */
.expand-enter-active { transition: all 0.28s cubic-bezier(0.4,0,0.2,1); }
.expand-leave-active { transition: all 0.2s cubic-bezier(0.4,0,0.2,1); }
.expand-enter-from, .expand-leave-to { opacity: 0; transform: translateY(-8px); }

.slide-down-enter-active { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
.slide-down-leave-active { transition: all 0.18s cubic-bezier(0.4,0,0.2,1); }
.slide-down-enter-from, .slide-down-leave-to { opacity: 0; transform: translateY(-6px); }

.list-item-enter-active { transition: all 0.35s cubic-bezier(0.4,0,0.2,1); }
.list-item-leave-active { transition: all 0.25s cubic-bezier(0.4,0,0.2,1); }
.list-item-enter-from   { opacity: 0; transform: translateY(12px); }
.list-item-leave-to     { opacity: 0; transform: scale(0.97); }

/* ── Spinner ── */
.spinner {
  width: 15px; height: 15px;
  border: 2px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.65s linear infinite;
  display: inline-block; flex-shrink: 0;
}
.spinner--dark { border-color: rgba(0,0,0,0.1); border-top-color: #60a5fa; }
.spinner--red  { border-color: rgba(239,68,68,0.15); border-top-color: #ef4444; }

/* ── Keyframes ── */
@keyframes spin      { to { transform: rotate(360deg); } }
@keyframes shimmer   { 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
@keyframes shimmer-bar {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
@keyframes breathe {
  0%,100% { transform: scale(1); opacity: 0.8; }
  50%      { transform: scale(1.15); opacity: 1; }
}
@keyframes ripple {
  0%   { opacity: 0.5; transform: scale(0.9); }
  100% { opacity: 0;   transform: scale(1.25); }
}
@keyframes pulse-dot {
  0%,100% { transform: scale(1); opacity: 1; }
  50%      { transform: scale(1.4); opacity: 0.7; }
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .gen-card__inner { flex-direction: column; align-items: stretch; }
  .gen-right       { flex-direction: column; }
  .plan-select     { min-width: unset; width: 100%; }
  .btn-gen         { width: 100%; justify-content: center; }
  .steps-guide     { flex-direction: column; align-items: stretch; gap: 8px; }
  .step-connector  { display: none; }
  .step-item       { min-width: unset; max-width: unset; }
  .header-stats    { display: none; }

  /* List cards */
  .list-card-header { flex-wrap: wrap; gap: 8px; }
  .lc-actions       { flex-shrink: 0; }
  .cat-row-header   { font-size: 10px; }
  .cat-item-name    { font-size: 13px; }
  .cat-item-qty     { font-size: 12px; white-space: nowrap; }

  /* Gen card */
  .gen-card { border-radius: 16px; }
  .gen-label { font-size: 14px; }
}
</style>
