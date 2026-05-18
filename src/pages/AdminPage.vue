<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAuthStore }    from '@/stores/authStore'
import { useLangStore }    from '@/stores/langStore'
import { recipesApi }      from '@/api/recipes'
import { categoriesApi, tagsApi } from '@/api/categories'
import { useRouter }       from 'vue-router'
import RecipeFormModal     from '@/components/recipe/RecipeFormModal.vue'
import { useToast }        from '@/composables/useToast'

const router = useRouter()
const auth   = useAuthStore()
const lang   = useLangStore()
const toast  = useToast()

// ── Guard ─────────────────────────────────────────────────────────
onMounted(async () => {
  if (!auth.isAuthenticated) { router.push('/login'); return }
  if (!auth.isAdmin)         { router.push('/'); return }
  await Promise.all([loadRecipes(), loadCategories(), loadTags()])
})

// ── Tabs ──────────────────────────────────────────────────────────
const activeTab = ref('recipes')

// ── Data ──────────────────────────────────────────────────────────
const recipes    = ref([])
const categories = ref([])
const tags       = ref([])
const loading    = ref(true)
const deleting   = ref(null)

// ── Recipe Form Modal ─────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)

function openCreateRecipe() { editingRecipe.value = null; showRecipeModal.value = true }
function openEditRecipe(r)  { editingRecipe.value = r;    showRecipeModal.value = true }

function handleRecipeSaved(saved) {
  showRecipeModal.value = false
  const idx = recipes.value.findIndex(r => r.id === saved.id)
  if (idx !== -1) recipes.value[idx] = saved
  else recipes.value.unshift(saved)
  toast.success(lang.t('common.save') + '!')
  editingRecipe.value = null
}

// ── Search ────────────────────────────────────────────────────────
const search = ref('')
const filtered = computed(() => {
  const kw = search.value.toLowerCase()
  return recipes.value.filter(r =>
    r.titleUz?.toLowerCase().includes(kw) ||
    r.titleRu?.toLowerCase().includes(kw)
  )
})

// ── Stats ─────────────────────────────────────────────────────────
const stats = computed(() => ({
  total: recipes.value.length,
  cats:  categories.value.length,
  tags:  tags.value.length,
  easy:  recipes.value.filter(r => r.difficultyLevel === 'EASY').length,
}))

// ── API: Recipes ──────────────────────────────────────────────────
async function loadRecipes() {
  loading.value = true
  try {
    const res = await recipesApi.getAll({ page: 0, size: 100 })
    recipes.value = (res.data?.data ?? res.data)?.content ?? []
  } finally { loading.value = false }
}

async function deleteRecipe(id) {
  deleting.value = id
  try {
    await recipesApi.delete(id)
    recipes.value = recipes.value.filter(r => r.id !== id)
    toast.success(lang.t('admin.deleted'))
  } catch { toast.error(lang.t('admin.delete_error')) }
  finally  { deleting.value = null }
}

// ── API: Categories ───────────────────────────────────────────────
const catForm    = ref(emptyCatForm())
const catEditing = ref(null)
const catSaving  = ref(false)

function emptyCatForm() { return { nameUz: '', nameRu: '', nameEng: '', colorCode: '#E8713E', iconUrl: '' } }

async function loadCategories() {
  const res = await categoriesApi.getAll()
  categories.value = res.data?.data ?? res.data ?? []
}

function editCat(c) {
  catEditing.value = c
  catForm.value = { nameUz: c.nameUz || '', nameRu: c.nameRu || '', nameEng: c.nameEng || '', colorCode: c.colorCode || '#E8713E', iconUrl: c.iconUrl || '' }
}

function cancelCat() { catEditing.value = null; catForm.value = emptyCatForm() }

async function saveCat() {
  if (!catForm.value.nameUz.trim()) return
  catSaving.value = true
  try {
    if (catEditing.value) {
      const res = await categoriesApi.update(catEditing.value.id, catForm.value)
      const updated = res.data?.data ?? res.data
      const idx = categories.value.findIndex(c => c.id === catEditing.value.id)
      if (idx !== -1) categories.value[idx] = updated
      toast.success("Kategoriya yangilandi!")
    } else {
      const res = await categoriesApi.create(catForm.value)
      categories.value.push(res.data?.data ?? res.data)
      toast.success("Kategoriya qo'shildi!")
    }
    cancelCat()
  } catch (e) {
    toast.error(e?.response?.data?.message || "Xatolik")
  } finally { catSaving.value = false }
}

async function deleteCat(id) {
  deleting.value = 'cat-' + id
  try {
    await categoriesApi.delete(id)
    categories.value = categories.value.filter(c => c.id !== id)
    toast.success("Kategoriya o'chirildi!")
  } catch { toast.error("O'chirishda xato") }
  finally  { deleting.value = null }
}

// ── API: Tags ─────────────────────────────────────────────────────
const tagForm    = ref(emptyTagForm())
const tagEditing = ref(null)
const tagSaving  = ref(false)

function emptyTagForm() { return { nameUz: '', nameRu: '', nameEng: '' } }

async function loadTags() {
  const res = await tagsApi.getAll()
  tags.value = res.data?.data ?? res.data ?? []
}

function editTag(t) {
  tagEditing.value = t
  tagForm.value = { nameUz: t.nameUz || '', nameRu: t.nameRu || '', nameEng: t.nameEng || '' }
}

function cancelTag() { tagEditing.value = null; tagForm.value = emptyTagForm() }

async function saveTag() {
  if (!tagForm.value.nameUz.trim()) return
  tagSaving.value = true
  try {
    if (tagEditing.value) {
      const res = await tagsApi.update(tagEditing.value.id, tagForm.value)
      const updated = res.data?.data ?? res.data
      const idx = tags.value.findIndex(t => t.id === tagEditing.value.id)
      if (idx !== -1) tags.value[idx] = updated
      toast.success("Teg yangilandi!")
    } else {
      const res = await tagsApi.create(tagForm.value)
      tags.value.push(res.data?.data ?? res.data)
      toast.success("Teg qo'shildi!")
    }
    cancelTag()
  } catch (e) {
    toast.error(e?.response?.data?.message || "Xatolik")
  } finally { tagSaving.value = false }
}

async function deleteTag(id) {
  deleting.value = 'tag-' + id
  try {
    await tagsApi.delete(id)
    tags.value = tags.value.filter(t => t.id !== id)
    toast.success("Teg o'chirildi!")
  } catch { toast.error("O'chirishda xato") }
  finally  { deleting.value = null }
}

const diffLabel = computed(() => ({ EASY: lang.t('common.easy'), MEDIUM: lang.t('common.medium'), HARD: lang.t('common.hard') }))
const diffMap   = { EASY: 'dt-easy', MEDIUM: 'dt-mid', HARD: 'dt-hard' }
</script>

<template>
  <div class="page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title"><span class="title-badge">👑</span> {{ lang.t('admin.title') }}</h1>
        <p class="page-sub">{{ lang.t('admin.sub') }}</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="sc-icon">🍽️</div>
        <div class="sc-val">{{ stats.total }}</div>
        <div class="sc-lbl">{{ lang.t('admin.total_recipes') }}</div>
      </div>
      <div class="stat-card">
        <div class="sc-icon">🏷️</div>
        <div class="sc-val">{{ stats.cats }}</div>
        <div class="sc-lbl">{{ lang.t('admin.categories') }}</div>
      </div>
      <div class="stat-card">
        <div class="sc-icon">🔖</div>
        <div class="sc-val">{{ stats.tags }}</div>
        <div class="sc-lbl">Teglar</div>
      </div>
      <div class="stat-card">
        <div class="sc-icon">🟢</div>
        <div class="sc-val">{{ stats.easy }}</div>
        <div class="sc-lbl">{{ lang.t('admin.easy_level') }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
      <button @click="activeTab='recipes'"    class="adm-tab" :class="{ 'adm-active': activeTab==='recipes'    }">🍽️ Retseptlar</button>
      <button @click="activeTab='categories'" class="adm-tab" :class="{ 'adm-active': activeTab==='categories' }">🏷️ Kategoriyalar</button>
      <button @click="activeTab='tags'"       class="adm-tab" :class="{ 'adm-active': activeTab==='tags'       }">🔖 Teglar</button>
    </div>

    <!-- ══ RECIPES ══ -->
    <div v-show="activeTab === 'recipes'">
      <div class="list-toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="search" type="text" :placeholder="lang.t('admin.search')" />
          <button v-if="search" @click="search=''" class="clear-btn">✕</button>
        </div>
        <span class="result-count">{{ filtered.length }} ta</span>
        <button @click="openCreateRecipe" class="btn-add-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/></svg>
          {{ lang.t('admin.add_recipe') }}
        </button>
      </div>

      <div v-if="loading" class="recipe-table">
        <div v-for="i in 6" :key="i" class="recipe-row skel-row">
          <div class="skel-img" /><div class="skel-body"><div class="skel-line w70" /><div class="skel-line w40" /></div>
        </div>
      </div>

      <div v-else-if="filtered.length" class="recipe-table">
        <div v-for="r in filtered" :key="r.id" class="recipe-row">
          <div class="row-img">
            <img v-if="r.imageUrl" :src="r.imageUrl" :alt="r.titleUz" />
            <span v-else>🍽️</span>
          </div>
          <div class="row-info">
            <div class="row-title">{{ lang.recipeTitle(r) }}</div>
            <div class="row-meta">
              <span class="row-cat">{{ r.categoryNameUz || '—' }}</span>
              <span class="diff-tag" :class="diffMap[r.difficultyLevel]">{{ diffLabel[r.difficultyLevel] }}</span>
              <span class="row-time">⏱ {{ (r.prepTimeMinutes||0)+(r.cookTimeMinutes||0) }} {{ lang.t('common.min') }}</span>
            </div>
          </div>
          <div class="row-id">#{{ r.id }}</div>
          <div :class="r.visible ? 'vis-on' : 'vis-off'">{{ r.visible ? ('✓ ' + lang.t('common.visible')) : ('✗ ' + lang.t('common.hidden')) }}</div>
          <div class="row-actions">
            <RouterLink :to="`/recipes/${r.id}`" class="btn-view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </RouterLink>
            <button @click="openEditRecipe(r)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="deleteRecipe(r.id)" class="btn-delete" :disabled="deleting === r.id">
              <span v-if="deleting === r.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">{{ lang.t('recipes.not_found') }}</p>
        <button @click="search=''" class="empty-btn">Tozalash</button>
      </div>
    </div>

    <!-- ══ CATEGORIES ══ -->
    <div v-show="activeTab === 'categories'" class="crud-section">

      <!-- Form -->
      <div class="crud-form">
        <h3 class="crud-form-title">{{ catEditing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya' }}</h3>
        <div class="crud-fields">
          <input v-model="catForm.nameUz"    class="cf-input" placeholder="Nom (UZ) *" />
          <input v-model="catForm.nameRu"    class="cf-input" placeholder="Nom (RU)" />
          <input v-model="catForm.nameEng"   class="cf-input" placeholder="Nom (EN)" />
          <div class="cf-color-row">
            <label class="cf-color-label">Rang:</label>
            <input v-model="catForm.colorCode" type="color" class="cf-color-input" />
            <span class="cf-color-val">{{ catForm.colorCode }}</span>
          </div>
          <input v-model="catForm.iconUrl"   class="cf-input" placeholder="Ikonka URL (ixtiyoriy)" />
        </div>
        <div class="crud-form-actions">
          <button v-if="catEditing" @click="cancelCat" class="btn-cancel-sm">Bekor</button>
          <button @click="saveCat" :disabled="catSaving || !catForm.nameUz.trim()" class="btn-save-sm">
            <span v-if="catSaving" class="spinner sm" />
            {{ catEditing ? 'Saqlash' : "Qo'shish" }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="crud-list">
        <div v-if="!categories.length" class="crud-empty">Hali kategoriya yo'q</div>
        <div v-for="c in categories" :key="c.id" class="crud-row">
          <div class="crud-color-dot" :style="{ background: c.colorCode || '#E8713E' }" />
          <div class="crud-info">
            <span class="crud-name">{{ c.nameUz }}</span>
            <span v-if="c.nameRu" class="crud-sub">{{ c.nameRu }}</span>
          </div>
          <div class="crud-actions">
            <button @click="editCat(c)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="deleteCat(c.id)" class="btn-delete" :disabled="deleting === 'cat-'+c.id">
              <span v-if="deleting === 'cat-'+c.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ TAGS ══ -->
    <div v-show="activeTab === 'tags'" class="crud-section">

      <!-- Form -->
      <div class="crud-form">
        <h3 class="crud-form-title">{{ tagEditing ? 'Tegni tahrirlash' : 'Yangi teg' }}</h3>
        <div class="crud-fields">
          <input v-model="tagForm.nameUz"  class="cf-input" placeholder="Nom (UZ) *" />
          <input v-model="tagForm.nameRu"  class="cf-input" placeholder="Nom (RU)" />
          <input v-model="tagForm.nameEng" class="cf-input" placeholder="Nom (EN)" />
        </div>
        <div class="crud-form-actions">
          <button v-if="tagEditing" @click="cancelTag" class="btn-cancel-sm">Bekor</button>
          <button @click="saveTag" :disabled="tagSaving || !tagForm.nameUz.trim()" class="btn-save-sm">
            <span v-if="tagSaving" class="spinner sm" />
            {{ tagEditing ? 'Saqlash' : "Qo'shish" }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="crud-list">
        <div v-if="!tags.length" class="crud-empty">Hali teg yo'q</div>
        <div v-for="t in tags" :key="t.id" class="crud-row">
          <div class="tag-chip"># {{ t.nameUz }}</div>
          <div class="crud-info">
            <span v-if="t.nameRu" class="crud-sub">{{ t.nameRu }}</span>
          </div>
          <div class="crud-actions">
            <button @click="editTag(t)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="deleteTag(t.id)" class="btn-delete" :disabled="deleting === 'tag-'+t.id">
              <span v-if="deleting === 'tag-'+t.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <RecipeFormModal :recipe="editingRecipe" :visible="showRecipeModal" @close="showRecipeModal=false" @saved="handleRecipeSaved" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: #f1f5f9; }
.title-badge { font-size: 20px; }
.page-sub { font-size: 13px; color: #475569; margin-top: 3px; }

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.stat-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: border-color 0.2s; }
.stat-card:hover { border-color: rgba(216,90,48,0.2); }
.sc-icon { font-size: 24px; }
.sc-val  { font-size: 24px; font-weight: 900; color: #f1f5f9; }
.sc-lbl  { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }

/* Admin tabs */
.admin-tabs { display: flex; gap: 4px; border-bottom: 1px solid rgba(255,255,255,0.07); }
.adm-tab {
  padding: 10px 18px; background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  color: #475569; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; border-radius: 10px 10px 0 0;
}
.adm-tab:hover { color: #94a3b8; background: rgba(255,255,255,0.04); }
.adm-active { color: #E8713E; border-bottom-color: #E8713E; background: rgba(216,90,48,0.06); }

/* List toolbar */
.list-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.search-wrap { flex: 1; display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 0 14px; height: 42px; transition: border-color 0.2s; }
.search-wrap:focus-within { border-color: rgba(216,90,48,0.5); }
.search-wrap svg   { width: 16px; height: 16px; color: #475569; flex-shrink: 0; }
.search-wrap input { flex: 1; background: none; border: none; outline: none; font-size: 14px; color: #e2e8f0; }
.search-wrap input::placeholder { color: #334155; }
.clear-btn { background: none; border: none; color: #475569; cursor: pointer; font-size: 12px; }
.result-count { font-size: 12px; font-weight: 700; color: #475569; flex-shrink: 0; }

/* Recipe table */
.recipe-table { display: flex; flex-direction: column; gap: 6px; }
.recipe-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 14px; transition: border-color 0.2s; }
.recipe-row:hover { border-color: rgba(255,255,255,0.1); }
.row-img { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.row-img img { width: 100%; height: 100%; object-fit: cover; }
.row-info  { flex: 1; min-width: 0; }
.row-title { font-size: 14px; font-weight: 700; color: #e2e8f0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-meta  { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.row-cat   { font-size: 11px; color: #475569; font-weight: 600; }
.row-time  { font-size: 11px; color: #475569; }
.diff-tag  { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; }
.dt-easy   { background: rgba(34,197,94,0.12); color: #4ade80; }
.dt-mid    { background: rgba(234,179,8,0.12);  color: #fbbf24; }
.dt-hard   { background: rgba(239,68,68,0.12);  color: #f87171; }
.row-id    { font-size: 11px; font-weight: 700; color: #334155; flex-shrink: 0; }
.vis-on    { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(34,197,94,0.1); color: #4ade80; flex-shrink: 0; }
.vis-off   { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(100,116,139,0.1); color: #64748b; flex-shrink: 0; }
.row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* CRUD section */
.crud-section { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }

/* Form */
.crud-form { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; }
.crud-form-title { font-size: 14px; font-weight: 800; color: #e2e8f0; }
.crud-fields { display: flex; flex-direction: column; gap: 8px; }
.cf-input {
  height: 40px; padding: 0 12px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px; color: #e2e8f0; font-size: 14px; outline: none;
  transition: border-color 0.2s;
}
.cf-input:focus { border-color: rgba(216,90,48,0.5); }
.cf-input::placeholder { color: #334155; }
.cf-color-row { display: flex; align-items: center; gap: 10px; }
.cf-color-label { font-size: 12px; color: #475569; font-weight: 700; }
.cf-color-input { width: 40px; height: 32px; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; padding: 2px; background: none; }
.cf-color-val { font-size: 12px; color: #64748b; font-family: monospace; }
.crud-form-actions { display: flex; gap: 8px; }
.btn-save-sm {
  flex: 1; height: 38px; border-radius: 10px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none; color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px;
  transition: opacity 0.2s;
}
.btn-save-sm:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-cancel-sm {
  height: 38px; padding: 0 14px; border-radius: 10px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  color: #64748b; font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
}
.btn-cancel-sm:hover { background: rgba(255,255,255,0.1); }

/* CRUD list */
.crud-list { display: flex; flex-direction: column; gap: 6px; }
.crud-empty { padding: 32px; text-align: center; color: #334155; font-size: 13px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.06); border-radius: 14px; }
.crud-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; transition: border-color 0.2s; }
.crud-row:hover { border-color: rgba(255,255,255,0.1); }
.crud-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.crud-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.crud-name { font-size: 14px; font-weight: 700; color: #e2e8f0; }
.crud-sub  { font-size: 12px; color: #475569; }
.crud-actions { display: flex; gap: 6px; flex-shrink: 0; }
.tag-chip { padding: 3px 10px; border-radius: 20px; background: rgba(216,90,48,0.1); border: 1px solid rgba(216,90,48,0.2); color: #E8713E; font-size: 12px; font-weight: 700; white-space: nowrap; }

/* Buttons */
.btn-add-new { display: flex; align-items: center; gap: 6px; padding: 0 16px; height: 42px; background: linear-gradient(135deg, #D85A30, #E8713E); border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 12px rgba(216,90,48,0.35); transition: transform 0.2s, box-shadow 0.2s; }
.btn-add-new:hover { transform: translateY(-1px); }
.btn-add-new svg { width: 15px; height: 15px; }
.btn-edit-row { width: 32px; height: 32px; border-radius: 8px; background: rgba(216,90,48,0.08); border: none; display: flex; align-items: center; justify-content: center; color: #E8713E; cursor: pointer; transition: background 0.2s; }
.btn-edit-row:hover { background: rgba(216,90,48,0.2); }
.btn-edit-row svg { width: 15px; height: 15px; }
.btn-view { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.05); border: none; display: flex; align-items: center; justify-content: center; color: #64748b; text-decoration: none; transition: background 0.2s, color 0.2s; }
.btn-view:hover { background: rgba(216,90,48,0.12); color: #E8713E; }
.btn-view svg { width: 15px; height: 15px; }
.btn-delete { width: 32px; height: 32px; border-radius: 8px; background: rgba(239,68,68,0.08); border: none; display: flex; align-items: center; justify-content: center; color: #ef4444; cursor: pointer; transition: background 0.2s; }
.btn-delete:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-delete svg { width: 15px; height: 15px; }

/* Skeleton */
.skel-row { pointer-events: none; }
.skel-img  { width: 52px; height: 52px; border-radius: 12px; background: rgba(255,255,255,0.06); animation: pulse 1.4s ease-in-out infinite; }
.skel-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line { height: 12px; border-radius: 6px; background: rgba(255,255,255,0.05); animation: pulse 1.4s ease-in-out infinite; }
.w70 { width: 70%; } .w40 { width: 40%; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 20px; }
.empty-icon  { font-size: 48px; }
.empty-title { font-size: 15px; font-weight: 800; color: #64748b; }
.empty-btn   { padding: 8px 18px; border-radius: 10px; background: rgba(216,90,48,0.1); border: 1px solid rgba(216,90,48,0.2); color: #E8713E; font-size: 13px; font-weight: 700; cursor: pointer; }

/* Spinner */
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.25); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
.spinner.sm { width: 12px; height: 12px; }

@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes spin   { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
  .crud-section { grid-template-columns: 1fr; }
}
</style>
