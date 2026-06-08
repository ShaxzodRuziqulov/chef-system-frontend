<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useAuthStore }    from '@/stores/authStore'
import { useLangStore }    from '@/stores/langStore'
import { useUnitsStore }   from '@/stores/unitsStore'
import { recipesApi }      from '@/api/recipes'
import { categoriesApi, tagsApi } from '@/api/categories'
import { ingredientsApi }  from '@/api/ingredients'
import { usersApi }        from '@/api/users'
import { bloggerApplicationApi } from '@/api/bloggerApplications'
import { uploadApi }       from '@/api/upload'
import { useRouter }       from 'vue-router'
import RecipeFormModal     from '@/components/recipe/RecipeFormModal.vue'
import ConfirmModal        from '@/components/ui/ConfirmModal.vue'
import ImgUpload           from '@/components/ui/ImgUpload.vue'
import { useToast }        from '@/composables/useToast'
import { resolveImageUrl } from '@/utils/imageUrl'
import { formatDate }      from '@/utils/formatDate'

const router = useRouter()
const auth   = useAuthStore()
const lang   = useLangStore()
const units  = useUnitsStore()
const toast  = useToast()

// ── Guard ─────────────────────────────────────────────────────────
onMounted(async () => {
  if (!auth.isAuthenticated) { router.push({ name: 'Login' }); return }
  if (!auth.isAdmin)         { router.push({ name: 'Home' }); return }
  await Promise.all([loadRecipes(), loadCategories(), loadTags(), units.load(), loadIngCount(), loadUserCount()])
})

// ── Tabs ──────────────────────────────────────────────────────────
const activeTab = ref('recipes')

// Lazy-load ingredients & users when tab is opened for the first time
const ingLoaded   = ref(false)
const usersLoaded = ref(false)
const appsLoaded  = ref(false)
watch(activeTab, (tab) => {
  if (tab === 'ingredients' && !ingLoaded.value) {
    loadIngredients()
    ingLoaded.value = true
  }
  if (tab === 'users' && !usersLoaded.value) {
    loadUsers()
    usersLoaded.value = true
  }
  if (tab === 'applications' && !appsLoaded.value) {
    loadApplications()
    appsLoaded.value = true
  }
})

// ── Data ──────────────────────────────────────────────────────────
const recipes    = ref([])
const categories = ref([])
const tags       = ref([])
const loading    = ref(true)
const deleting   = ref(null)

// ── Delete Confirm Modal ──────────────────────────────────────────
const confirmDel = ref({ show: false, id: null, type: '' })

function askDelete(type, id) {
  confirmDel.value = { show: true, id, type }
}

async function doDelete() {
  const { type, id } = confirmDel.value
  confirmDel.value.show = false
  deleting.value = type === 'recipe' ? id : `${type}-${id}`
  try {
    if (type === 'recipe') {
      await recipesApi.delete(id)
      recipes.value = recipes.value.filter(r => r.id !== id)
      toast.success(lang.t('admin.deleted'))
    } else if (type === 'cat') {
      await categoriesApi.delete(id)
      categories.value = categories.value.filter(c => c.id !== id)
      toast.success(lang.t('admin.cat_deleted'))
    } else if (type === 'tag') {
      await tagsApi.delete(id)
      tags.value = tags.value.filter(t => t.id !== id)
      toast.success(lang.t('admin.tag_deleted'))
    } else if (type === 'ing') {
      await ingredientsApi.delete(id)
      ingredients.value = ingredients.value.filter(i => i.id !== id)
      ingTotal.value = Math.max(0, ingTotal.value - 1)
      toast.success(lang.t('admin.ing_deleted'))
    }
  } catch { toast.error(lang.t('common.error_delete')) }
  finally  { deleting.value = null }
}

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
const userTotal = ref(0)

const stats = computed(() => ({
  total: recipes.value.length,
  cats:  categories.value.length,
  tags:  tags.value.length,
  easy:  recipes.value.filter(r => r.difficultyLevel === 'EASY').length,
  ings:  ingTotal.value,
  users: userTotal.value,
}))

// ── API: Recipes ──────────────────────────────────────────────────
async function loadRecipes() {
  loading.value = true
  try {
    const res = await recipesApi.getAll({ page: 0, size: 100 })
    recipes.value = (res.data?.data ?? res.data)?.content ?? []
  } finally { loading.value = false }
}


// ── API: Categories ───────────────────────────────────────────────
const catForm    = ref(emptyCatForm())
const catEditing = ref(null)
const catSaving  = ref(false)

function emptyCatForm() { return { nameUz: '', nameRu: '', nameEng: '', colorCode: '#E8713E' } }

async function loadCategories() {
  const res = await categoriesApi.getAll()
  categories.value = res.data?.data ?? res.data ?? []
}

function editCat(c) {
  catEditing.value = c
  catForm.value = { nameUz: c.nameUz || '', nameRu: c.nameRu || '', nameEng: c.nameEng || '', colorCode: c.colorCode || '#E8713E' }
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
      toast.success(lang.t('admin.cat_saved'))
    } else {
      const res = await categoriesApi.create(catForm.value)
      categories.value.push(res.data?.data ?? res.data)
      toast.success(lang.t('admin.cat_added'))
    }
    cancelCat()
  } catch (e) {
    toast.error(e?.response?.data?.message || lang.t('admin.error'))
  } finally { catSaving.value = false }
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
      toast.success(lang.t('admin.tag_saved'))
    } else {
      const res = await tagsApi.create(tagForm.value)
      tags.value.push(res.data?.data ?? res.data)
      toast.success(lang.t('admin.tag_added'))
    }
    cancelTag()
  } catch (e) {
    toast.error(e?.response?.data?.message || lang.t('admin.error'))
  } finally { tagSaving.value = false }
}


// ── API: Ingredients ──────────────────────────────────────────────
const ingredients    = ref([])
const ingTotal       = ref(0)
const ingPage        = ref(0)
const ingPageSize    = 20
const ingSearch      = ref('')
const ingForm        = ref(emptyIngForm())
const ingEditing     = ref(null)
const ingSaving      = ref(false)
const ingLoading     = ref(false)
const ingModalVisible = ref(false)

function emptyIngForm() {
  return { nameUz: '', nameRu: '', nameEng: '', imageUrl: '', defaultUnit: '', allergen: false }
}

function openAddIng() {
  ingEditing.value = null
  ingForm.value = emptyIngForm()
  ingModalVisible.value = true
}

async function loadIngCount() {
  try {
    const res = await ingredientsApi.getAll({ page: 0, size: 1 })
    const data = res.data?.data ?? res.data
    ingTotal.value = data?.totalElements ?? 0
  } catch { /* silent */ }
}

async function loadIngredients() {
  ingLoading.value = true
  try {
    const kw = ingSearch.value.trim()
    let res
    if (kw) {
      res = await ingredientsApi.search(kw, { page: ingPage.value, size: ingPageSize })
    } else {
      res = await ingredientsApi.getAll({ page: ingPage.value, size: ingPageSize })
    }
    const data = res.data?.data ?? res.data
    ingredients.value = data?.content ?? []
    ingTotal.value    = data?.totalElements ?? 0
  } finally { ingLoading.value = false }
}

function editIng(i) {
  ingEditing.value = i
  ingForm.value = { nameUz: i.nameUz || '', nameRu: i.nameRu || '', nameEng: i.nameEng || '', imageUrl: i.imageUrl || '', defaultUnit: i.defaultUnit || '', allergen: i.allergen || false }
  ingModalVisible.value = true
}

function cancelIng() {
  ingModalVisible.value = false
  ingEditing.value = null
  ingForm.value = emptyIngForm()
}

async function saveIng() {
  if (!ingForm.value.nameUz.trim()) return
  ingSaving.value = true
  const payload = {
    nameUz: ingForm.value.nameUz,
    nameRu: ingForm.value.nameRu || undefined,
    nameEng: ingForm.value.nameEng || undefined,
    imageUrl: ingForm.value.imageUrl || undefined,
    defaultUnit: ingForm.value.defaultUnit || undefined,
    allergen: ingForm.value.allergen,
  }
  try {
    if (ingEditing.value) {
      const res = await ingredientsApi.update(ingEditing.value.id, payload)
      const updated = res.data?.data ?? res.data
      const idx = ingredients.value.findIndex(i => i.id === ingEditing.value.id)
      if (idx !== -1) ingredients.value[idx] = updated
      toast.success(lang.t('admin.ing_saved'))
    } else {
      const res = await ingredientsApi.create(payload)
      const created = res.data?.data ?? res.data
      // Agar bir xil nomli ingredient allaqachon mavjud bo'lsa (find-or-create) — ro'yxatni yangilaymiz
      const existIdx = ingredients.value.findIndex(i => i.id === created.id)
      if (existIdx !== -1) {
        ingredients.value[existIdx] = created
        toast.success(lang.t('admin.ing_saved'))
      } else {
        ingredients.value.unshift(created)
        ingTotal.value++
        toast.success(lang.t('admin.ing_added'))
      }
    }
    cancelIng()
  } catch (e) {
    toast.error(e?.response?.data?.message || lang.t('admin.error_save'))
  } finally { ingSaving.value = false }
}


let ingSearchTimer = null
function onIngSearch() {
  clearTimeout(ingSearchTimer)
  ingSearchTimer = setTimeout(() => { ingPage.value = 0; loadIngredients() }, 350)
}

// ── API: Users ────────────────────────────────────────────────────
const users          = ref([])
const userPage       = ref(0)
const userPageSize   = 20
const userTotalPages = ref(0)
const userSearch     = ref('')
const userLoading    = ref(false)
const blockingUser   = ref(null)

async function loadUserCount() {
  try {
    const res = await usersApi.countActive()
    userTotal.value = res.data?.data ?? 0
  } catch { /* silent */ }
}

async function loadUsers() {
  userLoading.value = true
  try {
    const res  = await usersApi.getAll({ page: userPage.value, size: userPageSize, search: userSearch.value.trim() || undefined })
    const data = res.data?.data ?? res.data
    users.value          = data?.content ?? []
    userTotal.value      = data?.totalElements ?? 0
    userTotalPages.value = data?.totalPages ?? 0
  } finally { userLoading.value = false }
}

async function blockUser(user) {
  blockingUser.value = user.id
  try {
    const res     = await usersApi.deactivate(user.id)
    const updated = res.data?.data ?? res.data
    const idx = users.value.findIndex(u => u.id === user.id)
    if (idx !== -1) users.value[idx] = updated
    userTotal.value = Math.max(0, userTotal.value - 1)
    toast.success(lang.t('admin.user_block_ok'))
  } catch { toast.error(lang.t('admin.error')) }
  finally  { blockingUser.value = null }
}

async function unblockUser(user) {
  blockingUser.value = user.id
  try {
    const res     = await usersApi.activate(user.id)
    const updated = res.data?.data ?? res.data
    const idx = users.value.findIndex(u => u.id === user.id)
    if (idx !== -1) users.value[idx] = updated
    userTotal.value++
    toast.success(lang.t('admin.user_unblock_ok'))
  } catch { toast.error(lang.t('admin.error')) }
  finally  { blockingUser.value = null }
}

let userSearchTimer = null
function onUserSearch() {
  clearTimeout(userSearchTimer)
  userSearchTimer = setTimeout(() => { userPage.value = 0; loadUsers() }, 350)
}

function userAvatarLetter(u) {
  return (u.fullName || u.username || '?')[0].toUpperCase()
}

// ── User edit modal ───────────────────────────────────────────────
const userEditModal  = ref(false)
const editingUser    = ref(null)
const userForm       = ref({ fullName: '', username: '', email: '', role: 'USER', active: true, newPassword: '' })
const userSaving     = ref(false)
const pwError        = ref('')

function openEditUser(u) {
  editingUser.value = u
  userForm.value = {
    fullName:    u.fullName || '',
    username:    u.username || '',
    email:       u.email    || '',
    role:        u.role     || 'USER',
    active:      u.active,
    newPassword: '',
  }
  pwError.value = ''
  userEditModal.value = true
}

function cancelEditUser() {
  userEditModal.value = false
  editingUser.value   = null
  pwError.value       = ''
}

async function saveUser() {
  if (!userForm.value.username.trim() || !userForm.value.email.trim()) return
  // Parol validatsiyasi
  pwError.value = ''
  if (userForm.value.newPassword && userForm.value.newPassword.length < 4) {
    pwError.value = lang.t('admin.user_pw_short')
    return
  }
  userSaving.value = true
  try {
    const res     = await usersApi.update(editingUser.value.id, {
      fullName:    userForm.value.fullName    || undefined,
      username:    userForm.value.username,
      email:       userForm.value.email,
      role:        userForm.value.role,
      active:      userForm.value.active,
      newPassword: userForm.value.newPassword || undefined,
    })
    const updated = res.data?.data ?? res.data
    const idx = users.value.findIndex(u => u.id === editingUser.value.id)
    if (idx !== -1) users.value[idx] = updated
    toast.success(lang.t('admin.user_saved'))
    cancelEditUser()
  } catch (e) {
    toast.error(e?.response?.data?.message || lang.t('admin.user_save_err'))
  } finally { userSaving.value = false }
}

// Backenddan keladigan birliklar (til o'zgarganda reaktiv)
const UNITS     = computed(() => units.units.map(u => u.value))
const unitLabel = (key) => units.label(key)

const diffLabel = computed(() => ({ EASY: lang.t('common.easy'), MEDIUM: lang.t('common.medium'), HARD: lang.t('common.hard') }))
const diffMap   = { EASY: 'dt-easy', MEDIUM: 'dt-mid', HARD: 'dt-hard' }

// ── API: Blogger Arizalari ────────────────────────────────────────
const applications    = ref([])
const appPage         = ref(0)
const appTotalPages   = ref(0)
const appLoading      = ref(false)
const appFilter       = ref('PENDING')   // 'PENDING' | 'ALL'
const reviewingId     = ref(null)
const rejectModalApp  = ref(null)        // rad etish modal uchun
const rejectNote      = ref('')
const reviewLoading   = ref(false)

async function loadApplications() {
  appLoading.value = true
  try {
    const res = appFilter.value === 'PENDING'
      ? await bloggerApplicationApi.getPending(appPage.value, 20)
      : await bloggerApplicationApi.getAll(appPage.value, 20)
    const data = res.data?.data ?? res.data
    applications.value  = data?.content ?? []
    appTotalPages.value = data?.totalPages ?? 0
  } finally { appLoading.value = false }
}

async function approveApp(app) {
  reviewingId.value = app.id
  try {
    await bloggerApplicationApi.review(app.id, { approve: true })
    toast.success(`${app.user.fullName || app.user.username} tasdiqlandi ✅`)
    await loadApplications()
  } catch (e) {
    toast.error(e?.response?.data?.message ?? 'Xatolik')
  } finally { reviewingId.value = null }
}

function openRejectModal(app) {
  rejectModalApp.value = app
  rejectNote.value = ''
}

async function confirmReject() {
  if (!rejectModalApp.value) return
  reviewLoading.value = true
  try {
    await bloggerApplicationApi.review(rejectModalApp.value.id, {
      approve: false,
      adminNote: rejectNote.value.trim() || undefined
    })
    toast.success('Ariza rad etildi')
    rejectModalApp.value = null
    await loadApplications()
  } catch (e) {
    toast.error(e?.response?.data?.message ?? 'Xatolik')
  } finally { reviewLoading.value = false }
}

function appStatusLabel(status) {
  return status === 'PENDING'   ? '⏳ Kutilmoqda'
       : status === 'APPROVED'  ? '✅ Tasdiqlandi'
       : status === 'CANCELLED' ? '🚪 O\'zi chiqdi'
       : '❌ Rad etildi'
}

function appStatusClass(status) {
  return status === 'PENDING'   ? 'app-status-pending'
       : status === 'APPROVED'  ? 'app-status-approved'
       : status === 'CANCELLED' ? 'app-status-cancelled'
       : 'app-status-rejected'
}

// formatDate — src/utils/formatDate.ts dan import qilingan

// ── Bulk Import ───────────────────────────────────────────────────
const bulkModal       = ref(false)
const bulkFile        = ref(null)
const bulkFileName    = ref('')
const bulkUploading   = ref(false)
const bulkResult      = ref(null)   // BulkImportResultDto
const bulkMode        = ref('SKIP') // 'SKIP' | 'UPDATE'

function openBulkModal() {
  bulkFile.value     = null
  bulkFileName.value = ''
  bulkResult.value   = null
  bulkMode.value     = 'SKIP'
  bulkModal.value    = true
}

function onBulkFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  bulkFile.value     = f
  bulkFileName.value = f.name
  bulkResult.value   = null
}

function onBulkDrop(e) {
  const f = e.dataTransfer.files?.[0]
  if (!f) return
  bulkFile.value     = f
  bulkFileName.value = f.name
  bulkResult.value   = null
}

async function submitBulkImport() {
  if (!bulkFile.value) return
  bulkUploading.value = true
  bulkResult.value    = null
  try {
    const res = await recipesApi.bulkImport(bulkFile.value, bulkMode.value)
    bulkResult.value = res.data?.data ?? res.data
    const r = bulkResult.value
    if (r?.successCount > 0 || r?.updatedCount > 0) await loadRecipes()
    if (r?.successCount > 0)  toast.success(`${r.successCount} ta yangi retsept qo'shildi!`)
    if (r?.updatedCount > 0)  toast.success(`${r.updatedCount} ta retsept yangilandi!`)
    if (r?.skippedCount > 0)  toast.info(`${r.skippedCount} ta dublikat o'tkazib yuborildi`)
    if (r?.failedCount > 0)   toast.error(`${r.failedCount} ta qatorda xatolik`)
  } catch (e) {
    toast.error(e?.response?.data?.message ?? 'Yuklashda xatolik')
  } finally {
    bulkUploading.value = false
  }
}

async function downloadTemplate() {
  try {
    const res = await recipesApi.bulkImportTemplate()
    const url = URL.createObjectURL(new Blob([res.data]))
    const a = document.createElement('a')
    a.href = url
    a.download = 'retsept_shablon.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Shablonni yuklab bo\'lmadi')
  }
}
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
        <div class="sc-lbl">{{ lang.t('admin.tags') }}</div>
      </div>
      <div class="stat-card">
        <div class="sc-icon">🥕</div>
        <div class="sc-val">{{ stats.ings }}</div>
        <div class="sc-lbl">{{ lang.t('admin.ingredients') }}</div>
      </div>
      <div class="stat-card">
        <div class="sc-icon">👥</div>
        <div class="sc-val">{{ stats.users }}</div>
        <div class="sc-lbl">{{ lang.t('admin.total_users') }}</div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="admin-tabs">
      <button @click="activeTab='recipes'"     class="adm-tab" :class="{ 'adm-active': activeTab==='recipes'     }">{{ lang.t('admin.tab_recipes') }}</button>
      <button @click="activeTab='categories'"  class="adm-tab" :class="{ 'adm-active': activeTab==='categories'  }">{{ lang.t('admin.tab_categories') }}</button>
      <button @click="activeTab='tags'"        class="adm-tab" :class="{ 'adm-active': activeTab==='tags'        }">{{ lang.t('admin.tab_tags') }}</button>
      <button @click="activeTab='ingredients'" class="adm-tab" :class="{ 'adm-active': activeTab==='ingredients' }">{{ lang.t('admin.tab_ingredients') }}</button>
      <button @click="activeTab='users'"       class="adm-tab" :class="{ 'adm-active': activeTab==='users'       }">{{ lang.t('admin.tab_users') }}</button>
      <button @click="activeTab='applications'" class="adm-tab" :class="{ 'adm-active': activeTab==='applications' }">👨‍🍳 Arizalar</button>
    </div>

    <!-- ══ RECIPES ══ -->
    <div v-show="activeTab === 'recipes'">
      <div class="list-toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="search" type="text" :placeholder="lang.t('admin.search')" />
          <button v-if="search" @click="search=''" class="clear-btn">✕</button>
        </div>
        <span class="result-count">{{ filtered.length }} {{ lang.t('common.count') }}</span>
        <button @click="openBulkModal" class="btn-bulk-import">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
          Excel
        </button>
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
            <img v-if="r.imageUrl" :src="resolveImageUrl(r.imageUrl)" :alt="r.titleUz" />
            <span v-else>🍽️</span>
          </div>
          <div class="row-info">
            <div class="row-title">{{ lang.recipeTitle(r) }}</div>
            <div class="row-meta">
              <span class="row-cat">{{ lang.catName(r) || '—' }}</span>
              <span class="diff-tag" :class="diffMap[r.difficultyLevel]">{{ diffLabel[r.difficultyLevel] }}</span>
              <span class="row-time">⏱ {{ (r.prepTimeMinutes||0)+(r.cookTimeMinutes||0) }} {{ lang.t('common.min') }}</span>
            </div>
          </div>
          <div class="row-id">#{{ r.id }}</div>
          <div :class="r.visible ? 'vis-on' : 'vis-off'">{{ r.visible ? ('✓ ' + lang.t('common.visible')) : ('✗ ' + lang.t('common.hidden')) }}</div>
          <div class="row-actions">
            <RouterLink :to="`/app/recipes/${r.id}`" class="btn-view">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </RouterLink>
            <button @click="openEditRecipe(r)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="askDelete('recipe', r.id)" class="btn-delete" :disabled="deleting === r.id">
              <span v-if="deleting === r.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">🔍</div>
        <p class="empty-title">{{ lang.t('recipes.not_found') }}</p>
        <button @click="search=''" class="empty-btn">{{ lang.t('admin.clear') }}</button>
      </div>
    </div>

    <!-- ══ CATEGORIES ══ -->
    <div v-show="activeTab === 'categories'" class="crud-section">

      <!-- Form -->
      <div class="crud-form">
        <h3 class="crud-form-title">{{ catEditing ? lang.t('admin.cat_edit') : lang.t('admin.cat_new') }}</h3>
        <div class="crud-fields">
          <input v-model="catForm.nameUz"    class="cf-input" placeholder="Nom (UZ) *" />
          <input v-model="catForm.nameRu"    class="cf-input" placeholder="Nom (RU)" />
          <input v-model="catForm.nameEng"   class="cf-input" placeholder="Nom (EN)" />
          <div class="cf-color-row">
            <label class="cf-color-label">{{ lang.t('admin.cat_color') }}:</label>
            <input v-model="catForm.colorCode" type="color" class="cf-color-input" />
            <span class="cf-color-val">{{ catForm.colorCode }}</span>
          </div>
        </div>
        <div class="crud-form-actions">
          <button v-if="catEditing" @click="cancelCat" class="btn-cancel-sm">{{ lang.t('common.cancel') }}</button>
          <button @click="saveCat" :disabled="catSaving || !catForm.nameUz.trim()" class="btn-save-sm">
            <span v-if="catSaving" class="spinner sm" />
            {{ catEditing ? lang.t('common.save') : lang.t('common.add') }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="crud-list">
        <div v-if="!categories.length" class="crud-empty">{{ lang.t('admin.cat_empty') }}</div>
        <div v-for="c in categories" :key="c.id" class="crud-row">
          <div class="crud-color-dot" :style="{ background: c.colorCode || '#E8713E' }" />
          <div class="crud-info">
            <span class="crud-name">{{ lang.catName(c) }}</span>
            <span v-if="c.nameUz && lang.lang !== 'uz'" class="crud-sub">{{ c.nameUz }}</span>
          </div>
          <div class="crud-actions">
            <button @click="editCat(c)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="askDelete('cat', c.id)" class="btn-delete" :disabled="deleting === 'cat-'+c.id">
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
        <h3 class="crud-form-title">{{ tagEditing ? lang.t('admin.tag_edit') : lang.t('admin.tag_new') }}</h3>
        <div class="crud-fields">
          <input v-model="tagForm.nameUz"  class="cf-input" placeholder="Nom (UZ) *" />
          <input v-model="tagForm.nameRu"  class="cf-input" placeholder="Nom (RU)" />
          <input v-model="tagForm.nameEng" class="cf-input" placeholder="Nom (EN)" />
        </div>
        <div class="crud-form-actions">
          <button v-if="tagEditing" @click="cancelTag" class="btn-cancel-sm">{{ lang.t('common.cancel') }}</button>
          <button @click="saveTag" :disabled="tagSaving || !tagForm.nameUz.trim()" class="btn-save-sm">
            <span v-if="tagSaving" class="spinner sm" />
            {{ tagEditing ? lang.t('common.save') : lang.t('common.add') }}
          </button>
        </div>
      </div>

      <!-- List -->
      <div class="crud-list">
        <div v-if="!tags.length" class="crud-empty">{{ lang.t('admin.tag_empty') }}</div>
        <div v-for="t in tags" :key="t.id" class="crud-row">
          <div class="tag-chip"># {{ lang.catName(t) }}</div>
          <div class="crud-info">
            <span v-if="t.nameUz && lang.lang !== 'uz'" class="crud-sub">{{ t.nameUz }}</span>
          </div>
          <div class="crud-actions">
            <button @click="editTag(t)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="askDelete('tag', t.id)" class="btn-delete" :disabled="deleting === 'tag-'+t.id">
              <span v-if="deleting === 'tag-'+t.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ══ INGREDIENTS ══ -->
    <div v-show="activeTab === 'ingredients'">

      <!-- Toolbar: search + add button -->
      <div class="list-toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="ingSearch" @input="onIngSearch" type="text" :placeholder="lang.t('admin.ing_search')" />
          <button v-if="ingSearch" @click="ingSearch=''; ingPage=0; loadIngredients()" class="clear-btn">✕</button>
        </div>
        <span class="result-count">{{ ingTotal }} {{ lang.t('common.count') }}</span>
        <button @click="openAddIng" class="btn-add-new">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/></svg>
          {{ lang.t('admin.ing_add_btn') }}
        </button>
      </div>

      <!-- List -->
      <div v-if="ingLoading" class="recipe-table">
        <div v-for="i in 6" :key="i" class="crud-row skel-row">
          <div class="skel-img" style="width:40px;height:40px;border-radius:10px;flex-shrink:0" />
          <div class="skel-body"><div class="skel-line w70" /><div class="skel-line w40" /></div>
        </div>
      </div>
      <div v-else-if="ingredients.length" class="recipe-table">
        <div v-for="ing in ingredients" :key="ing.id" class="crud-row">
          <div class="ing-img-wrap">
            <img v-if="ing.imageUrl" :src="resolveImageUrl(ing.imageUrl)" :alt="ing.nameUz" />
            <span v-else>🥦</span>
          </div>
          <div class="crud-info">
            <span class="crud-name">{{ lang.ingName(ing) }}</span>
            <span v-if="ing.nameUz && lang.lang !== 'uz'" class="crud-sub">{{ ing.nameUz }}</span>
          </div>
          <div class="ing-badges">
            <span v-if="ing.defaultUnit" class="ing-unit-badge">{{ unitLabel(ing.defaultUnit) }}</span>
            <span v-if="ing.allergen" class="ing-allergen">{{ lang.t('admin.allergen') }}</span>
          </div>
          <div class="crud-actions">
            <button @click="editIng(ing)" class="btn-edit-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <button @click="askDelete('ing', ing.id)" class="btn-delete" :disabled="deleting === 'ing-'+ing.id">
              <span v-if="deleting === 'ing-'+ing.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🥕</div>
        <p class="empty-title">{{ ingSearch ? lang.t('admin.ing_not_found') : lang.t('admin.ing_empty') }}</p>
        <button v-if="ingSearch" @click="ingSearch=''; ingPage=0; loadIngredients()" class="empty-btn">{{ lang.t('admin.clear') }}</button>
      </div>

      <!-- Pagination -->
      <div v-if="ingTotal > ingPageSize" class="ing-pagination">
        <button :disabled="ingPage === 0" @click="ingPage--; loadIngredients()" class="pg-btn">{{ lang.t('admin.prev') }}</button>
        <span class="pg-info">{{ ingPage + 1 }} / {{ Math.ceil(ingTotal / ingPageSize) }}</span>
        <button :disabled="(ingPage + 1) * ingPageSize >= ingTotal" @click="ingPage++; loadIngredients()" class="pg-btn">{{ lang.t('admin.next') }}</button>
      </div>
    </div>

    <!-- ══ USERS ══ -->
    <div v-show="activeTab === 'users'">

      <!-- Toolbar -->
      <div class="list-toolbar">
        <div class="search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
          <input v-model="userSearch" @input="onUserSearch" type="text" :placeholder="lang.t('admin.user_search')" />
          <button v-if="userSearch" @click="userSearch=''; userPage=0; loadUsers()" class="clear-btn">✕</button>
        </div>
        <span class="result-count">{{ userTotal }} {{ lang.t('common.count') }}</span>
      </div>

      <!-- Skeleton -->
      <div v-if="userLoading" class="recipe-table">
        <div v-for="i in 6" :key="i" class="recipe-row skel-row">
          <div class="skel-img" />
          <div class="skel-body"><div class="skel-line w70" /><div class="skel-line w40" /></div>
        </div>
      </div>

      <!-- List -->
      <div v-else-if="users.length" class="recipe-table">
        <div v-for="u in users" :key="u.id" class="recipe-row">

          <!-- Avatar -->
          <div class="user-avatar">
            <img v-if="u.avatarUrl" :src="u.avatarUrl" :alt="u.username" />
            <span v-else class="user-avatar-letter">{{ userAvatarLetter(u) }}</span>
          </div>

          <!-- Info -->
          <div class="row-info">
            <div class="row-title">{{ u.fullName || u.username }}</div>
            <div class="row-meta">
              <span class="row-cat">@{{ u.username }}</span>
              <span class="row-cat">{{ u.email }}</span>
            </div>
          </div>

          <!-- Role badge -->
          <span :class="u.role === 'ADMIN' ? 'badge-admin' : u.role === 'BLOGGER' ? 'badge-blogger' : 'badge-user'">
            {{ u.role === 'ADMIN' ? '👑 Admin' : u.role === 'BLOGGER' ? '👨‍🍳 Oshpaz' : '👤 User' }}
          </span>

          <!-- Active badge -->
          <span :class="u.active ? 'vis-on' : 'vis-off'">
            {{ u.active ? ('✓ ' + lang.t('admin.user_active')) : ('✗ ' + lang.t('admin.user_blocked')) }}
          </span>

          <!-- Actions -->
          <div class="row-actions">
            <!-- Edit -->
            <button @click="openEditUser(u)" class="btn-edit-row" :title="lang.t('admin.user_edit')">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
            <!-- Block / Unblock -->
            <button
              v-if="u.active"
              @click="blockUser(u)"
              :disabled="blockingUser === u.id"
              class="btn-block"
              :title="lang.t('admin.user_block')"
            >
              <span v-if="blockingUser === u.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
            </button>
            <button
              v-else
              @click="unblockUser(u)"
              :disabled="blockingUser === u.id"
              class="btn-unblock"
              :title="lang.t('admin.user_unblock')"
            >
              <span v-if="blockingUser === u.id" class="spinner" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state">
        <div class="empty-icon">👥</div>
        <p class="empty-title">{{ userSearch ? lang.t('admin.user_not_found') : lang.t('admin.user_empty') }}</p>
        <button v-if="userSearch" @click="userSearch=''; userPage=0; loadUsers()" class="empty-btn">{{ lang.t('admin.clear') }}</button>
      </div>

      <!-- Pagination -->
      <div v-if="userTotalPages > 1" class="ing-pagination">
        <button :disabled="userPage === 0" @click="userPage--; loadUsers()" class="pg-btn">{{ lang.t('admin.prev') }}</button>
        <span class="pg-info">{{ userPage + 1 }} / {{ userTotalPages }}</span>
        <button :disabled="userPage + 1 >= userTotalPages" @click="userPage++; loadUsers()" class="pg-btn">{{ lang.t('admin.next') }}</button>
      </div>
    </div>

    <!-- ══ APPLICATIONS ══ -->
    <div v-show="activeTab === 'applications'">

      <!-- Filter toolbar -->
      <div class="list-toolbar">
        <div class="app-filter-btns">
          <button :class="['app-filter-btn', appFilter==='PENDING' ? 'active' : '']"
                  @click="appFilter='PENDING'; appPage=0; loadApplications()">
            ⏳ Kutilmoqda
          </button>
          <button :class="['app-filter-btn', appFilter==='ALL' ? 'active' : '']"
                  @click="appFilter='ALL'; appPage=0; loadApplications()">
            📋 Barchasi
          </button>
        </div>
        <span class="result-count">{{ applications.length }} ariza</span>
      </div>

      <!-- Skeleton -->
      <div v-if="appLoading" class="skel-list">
        <div v-for="i in 5" :key="i" class="skel-row" />
      </div>

      <!-- List -->
      <div v-else-if="applications.length" class="app-list">
        <div v-for="app in applications" :key="app.id" class="app-card">
          <!-- User info -->
          <div class="app-user">
            <div class="user-avatar" style="width:40px;height:40px;font-size:15px;flex-shrink:0">
              <img v-if="app.user?.avatarUrl" :src="app.user.avatarUrl" />
              <span v-else class="user-avatar-letter">
                {{ (app.user?.fullName || app.user?.username || '?')[0].toUpperCase() }}
              </span>
            </div>
            <div class="app-user-info">
              <div class="app-user-name">{{ app.user?.fullName || app.user?.username }}</div>
              <div class="app-user-sub">@{{ app.user?.username }} · {{ formatDate(app.createdAt, 'short', lang.lang) }}</div>
            </div>
          </div>

          <!-- Status -->
          <span :class="['app-status', appStatusClass(app.status)]">
            {{ appStatusLabel(app.status) }}
          </span>

          <!-- Admin note (agar bor bo'lsa) -->
          <div v-if="app.adminNote" class="app-note">💬 {{ app.adminNote }}</div>

          <!-- Reviewed by -->
          <div v-if="app.reviewedBy" class="app-reviewed-by">
            {{ formatDate(app.reviewedAt, 'short', lang.lang) }} — {{ app.reviewedBy.fullName || app.reviewedBy.username }} tomonidan ko'rildi
          </div>

          <!-- Actions (faqat PENDING uchun) -->
          <div v-if="app.status === 'PENDING'" class="app-actions">
            <button class="app-btn-approve" @click="approveApp(app)" :disabled="reviewingId === app.id">
              <span v-if="reviewingId === app.id" class="spinner sm" />
              <span v-else>✅ Tasdiqlash</span>
            </button>
            <button class="app-btn-reject" @click="openRejectModal(app)" :disabled="reviewingId === app.id">
              ❌ Rad etish
            </button>
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else class="empty-state">
        <div class="empty-icon">📭</div>
        <p class="empty-title">{{ appFilter === 'PENDING' ? 'Kutilayotgan ariza yo\'q' : 'Arizalar yo\'q' }}</p>
      </div>

      <!-- Pagination -->
      <div v-if="appTotalPages > 1" class="ing-pagination">
        <button :disabled="appPage === 0" @click="appPage--; loadApplications()" class="pg-btn">{{ lang.t('admin.prev') }}</button>
        <span class="pg-info">{{ appPage + 1 }} / {{ appTotalPages }}</span>
        <button :disabled="appPage + 1 >= appTotalPages" @click="appPage++; loadApplications()" class="pg-btn">{{ lang.t('admin.next') }}</button>
      </div>
    </div>

    <!-- Rad etish modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="rejectModalApp" class="ing-modal-overlay" @click.self="rejectModalApp = null">
          <div class="ing-modal" style="max-width:420px">
            <div class="ing-modal-head">
              <div class="ing-modal-icon">❌</div>
              <div>
                <h3 class="ing-modal-title">Arizani rad etish</h3>
                <p class="ing-modal-sub">{{ rejectModalApp?.user?.fullName }}</p>
              </div>
              <button class="ing-modal-close" @click="rejectModalApp = null">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div class="ing-modal-body">
              <div class="imf-group">
                <label class="imf-label">Sabab (ixtiyoriy)</label>
                <textarea v-model="rejectNote" class="imf-input" rows="3"
                  placeholder="Nima uchun rad etilayotganini yozing..." style="resize:vertical" />
              </div>
            </div>
            <div class="ing-modal-footer">
              <button class="ing-modal-cancel" @click="rejectModalApp = null">Bekor qilish</button>
              <button class="ing-modal-save" style="background:#ef4444" @click="confirmReject" :disabled="reviewLoading">
                <span v-if="reviewLoading" class="spinner sm" />
                <span v-else>❌ Rad etish</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ USER EDIT MODAL ══ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="userEditModal" class="ing-modal-overlay" @click.self="cancelEditUser">
          <div class="ing-modal">

            <!-- Head -->
            <div class="ing-modal-head">
              <div class="user-avatar" style="width:40px;height:40px;font-size:16px">
                <img v-if="editingUser?.avatarUrl" :src="editingUser.avatarUrl" />
                <span v-else class="user-avatar-letter">{{ userAvatarLetter(editingUser || {}) }}</span>
              </div>
              <div>
                <h3 class="ing-modal-title">{{ lang.t('admin.user_edit_title') }}</h3>
                <p class="ing-modal-sub">@{{ editingUser?.username }}</p>
              </div>
              <button class="ing-modal-close" @click="cancelEditUser">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <!-- Body -->
            <div class="ing-modal-body">
              <div class="ing-modal-fields">

                <!-- Full name -->
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.user_fullname') }}</label>
                  <input v-model="userForm.fullName" class="imf-input" :placeholder="lang.t('profile.name_ph')" />
                </div>

                <!-- Username -->
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.user_username') }} <span class="imf-req">*</span></label>
                  <input v-model="userForm.username" class="imf-input" placeholder="username" />
                </div>

                <!-- Email -->
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.user_email') }} <span class="imf-req">*</span></label>
                  <input v-model="userForm.email" class="imf-input" type="email" placeholder="email@example.com" />
                </div>

                <!-- Role -->
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.user_role') }}</label>
                  <div class="user-role-toggle">
                    <button
                      :class="['role-btn', userForm.role === 'USER' ? 'role-btn-active-user' : '']"
                      @click="userForm.role = 'USER'"
                      type="button"
                    >👤 User</button>
                    <button
                      :class="['role-btn', userForm.role === 'BLOGGER' ? 'role-btn-active-blogger' : '']"
                      @click="userForm.role = 'BLOGGER'"
                      type="button"
                    >👨‍🍳 Oshpaz</button>
                    <button
                      :class="['role-btn', userForm.role === 'ADMIN' ? 'role-btn-active-admin' : '']"
                      @click="userForm.role = 'ADMIN'"
                      type="button"
                    >👑 Admin</button>
                  </div>
                </div>

                <!-- Active toggle -->
                <label class="imf-check-row">
                  <div class="imf-toggle" :class="{ 'imf-toggle-on': userForm.active }" @click="userForm.active = !userForm.active">
                    <div class="imf-toggle-thumb" />
                  </div>
                  <span class="imf-check-label">
                    {{ userForm.active ? ('✓ ' + lang.t('admin.user_active')) : ('✗ ' + lang.t('admin.user_blocked')) }}
                  </span>
                </label>

                <!-- Divider -->
                <div class="user-pw-divider">🔑 {{ lang.t('admin.user_new_pw') }}</div>

                <!-- New password -->
                <div class="imf-group">
                  <input
                    v-model="userForm.newPassword"
                    class="imf-input"
                    :class="{ 'imf-input-err': pwError }"
                    type="password"
                    :placeholder="lang.t('admin.user_pw_hint')"
                    autocomplete="new-password"
                    @input="pwError = ''"
                  />
                  <span v-if="pwError" class="pw-err-msg">{{ pwError }}</span>
                </div>

              </div>
            </div>

            <!-- Footer -->
            <div class="ing-modal-footer">
              <button class="ing-modal-cancel" @click="cancelEditUser">{{ lang.t('common.cancel') }}</button>
              <button
                class="ing-modal-save"
                @click="saveUser"
                :disabled="userSaving || !userForm.username.trim() || !userForm.email.trim() || !!pwError"
              >
                <span v-if="userSaving" class="spinner sm" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ lang.t('common.save') }}
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ INGREDIENT MODAL ══ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="ingModalVisible" class="ing-modal-overlay" @click.self="cancelIng">
          <div class="ing-modal">
            <div class="ing-modal-head">
              <div class="ing-modal-icon">{{ ingEditing ? '✏️' : '🥕' }}</div>
              <div>
                <h3 class="ing-modal-title">{{ ingEditing ? lang.t('admin.ing_edit_title') : lang.t('admin.ing_add_title') }}</h3>
                <p class="ing-modal-sub">{{ ingEditing ? lang.ingName(ingEditing) : '' }}</p>
              </div>
              <button class="ing-modal-close" @click="cancelIng">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="ing-modal-body">
              <div class="ing-modal-fields">
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.ing_name_uz') }} <span class="imf-req">*</span></label>
                  <input v-model="ingForm.nameUz" class="imf-input" placeholder="Masalan: Sabzi" autofocus />
                </div>
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.ing_name_ru') }}</label>
                  <input v-model="ingForm.nameRu" class="imf-input" placeholder="Морковь" />
                </div>
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.ing_name_eng') }}</label>
                  <input v-model="ingForm.nameEng" class="imf-input" placeholder="Carrot" />
                </div>
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.ing_image') }}</label>
                  <ImgUpload v-model="ingForm.imageUrl" size="md" placeholder="Ingredient rasmini yuklash uchun bosing" />
                </div>
                <div class="imf-group">
                  <label class="imf-label">{{ lang.t('admin.ing_unit') }}</label>
                  <select v-model="ingForm.defaultUnit" class="imf-input imf-select">
                    <option value="">{{ lang.t('admin.ing_select_unit') }}</option>
                    <option v-for="u in UNITS" :key="u" :value="u">{{ unitLabel(u) }}</option>
                  </select>
                </div>
                <label class="imf-check-row">
                  <div class="imf-toggle" :class="{ 'imf-toggle-on': ingForm.allergen }" @click="ingForm.allergen = !ingForm.allergen">
                    <div class="imf-toggle-thumb" />
                  </div>
                  <span class="imf-check-label">{{ lang.t('admin.allergen') }}</span>
                </label>
              </div>
            </div>

            <div class="ing-modal-footer">
              <button class="ing-modal-cancel" @click="cancelIng">{{ lang.t('common.cancel') }}</button>
              <button class="ing-modal-save" @click="saveIng" :disabled="ingSaving || !ingForm.nameUz.trim()">
                <span v-if="ingSaving" class="spinner sm" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ ingEditing ? lang.t('common.save') : lang.t('common.add') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══ BULK IMPORT MODAL ══ -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="bulkModal" class="ing-modal-overlay" @click.self="bulkModal=false">
          <div class="ing-modal bulk-modal">

            <!-- Head -->
            <div class="ing-modal-head">
              <div class="ing-modal-icon">📥</div>
              <div>
                <h3 class="ing-modal-title">Excel orqali yuklash</h3>
                <p class="ing-modal-sub">30–50 ta retseptni bir vaqtda qo'shing</p>
              </div>
              <button class="ing-modal-close" @click="bulkModal=false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="ing-modal-body">

              <!-- Download template -->
              <button class="bulk-template-btn" @click="downloadTemplate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:14px;height:14px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Shablonni yuklab olish (.xlsx)
              </button>

              <!-- Mode toggle -->
              <div class="bulk-mode-row">
                <span class="bulk-mode-label">Dublikat bo'lsa:</span>
                <div class="bulk-mode-btns">
                  <button
                    :class="['bulk-mode-btn', bulkMode === 'SKIP' ? 'bulk-mode-active-skip' : '']"
                    @click="bulkMode = 'SKIP'"
                    type="button"
                  >⏭ O'tkazib yubor</button>
                  <button
                    :class="['bulk-mode-btn', bulkMode === 'UPDATE' ? 'bulk-mode-active-update' : '']"
                    @click="bulkMode = 'UPDATE'"
                    type="button"
                  >✏️ Yangilash</button>
                </div>
              </div>

              <!-- Drop zone -->
              <div
                class="bulk-dropzone"
                :class="{ 'bulk-dz-active': bulkFileName }"
                @dragover.prevent
                @drop.prevent="onBulkDrop"
                @click="$refs.bulkFileInput.click()"
              >
                <input ref="bulkFileInput" type="file" accept=".xlsx" style="display:none" @change="onBulkFileChange" />
                <div v-if="!bulkFileName" class="bulk-dz-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="bulk-dz-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span class="bulk-dz-text">Excel faylni bu yerga tashlang yoki bosing</span>
                  <span class="bulk-dz-sub">.xlsx formati, maksimal 5 MB</span>
                </div>
                <div v-else class="bulk-dz-chosen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:20px;height:20px;color:#4ade80;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span class="bulk-dz-fname">{{ bulkFileName }}</span>
                  <button class="bulk-dz-clear" @click.stop="bulkFile=null; bulkFileName=''; bulkResult=null">✕</button>
                </div>
              </div>

              <!-- Result table -->
              <div v-if="bulkResult" class="bulk-result">
                <div class="bulk-result-summary">
                  <span class="brs-total">Jami: {{ bulkResult.totalRows }} qator</span>
                  <span class="brs-ok">✅ {{ bulkResult.successCount }} yangi</span>
                  <span v-if="bulkResult.updatedCount" class="brs-upd">✏️ {{ bulkResult.updatedCount }} yangilandi</span>
                  <span v-if="bulkResult.skippedCount" class="brs-skip">⏭ {{ bulkResult.skippedCount }} dublikat</span>
                  <span v-if="bulkResult.failedCount" class="brs-err">❌ {{ bulkResult.failedCount }} xatolik</span>
                </div>
                <div class="bulk-result-table">
                  <div class="brt-head">
                    <span>Qator</span>
                    <span>Retsept</span>
                    <span>Holat</span>
                    <span>Izoh</span>
                  </div>
                  <div
                    v-for="row in bulkResult.results"
                    :key="row.row"
                    class="brt-row"
                    :class="row.status === 'SUCCESS' ? 'brt-ok' : row.status === 'UPDATED' ? 'brt-upd' : row.status === 'SKIPPED' ? 'brt-skip' : 'brt-fail'"
                  >
                    <span class="brt-num">#{{ row.row }}</span>
                    <span class="brt-title">{{ row.titleUz || '—' }}</span>
                    <span class="brt-status">
                      {{ row.status === 'SUCCESS' ? '✅' : row.status === 'UPDATED' ? '✏️' : row.status === 'SKIPPED' ? '⏭' : '❌' }}
                    </span>
                    <span class="brt-error">{{ row.error || '' }}</span>
                  </div>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div class="ing-modal-footer">
              <button class="ing-modal-cancel" @click="bulkModal=false">Yopish</button>
              <button
                class="ing-modal-save"
                @click="submitBulkImport"
                :disabled="bulkUploading || !bulkFile"
              >
                <span v-if="bulkUploading" class="spinner sm" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                {{ bulkUploading ? 'Yuklanmoqda...' : 'Yuklash' }}
              </button>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>

    <RecipeFormModal :recipe="editingRecipe" :visible="showRecipeModal" @close="showRecipeModal=false" @saved="handleRecipeSaved" />

    <ConfirmModal
      :show="confirmDel.show"
      :message="lang.t('common.confirm_delete')"
      confirm-label="Ha, o'chirish"
      :danger="true"
      @confirm="doDelete"
      @cancel="confirmDel.show = false"
    />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; }
.page-title { display: flex; align-items: center; gap: 10px; font-size: 22px; font-weight: 900; color: var(--tx-1); }
.title-badge { font-size: 20px; }
.page-sub { font-size: 13px; color: var(--tx-5); margin-top: 3px; }

/* Stats */
.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.stat-card { background: var(--bg-card); border: 1px solid var(--bd); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: border-color 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); min-width: 0; overflow: hidden; }
.stat-card:hover { border-color: rgba(216,90,48,0.2); }
.sc-icon { font-size: 24px; }
.sc-val  { font-size: 24px; font-weight: 900; color: var(--tx-1); }
.sc-lbl  { font-size: 11px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.06em; text-align: center; word-break: break-word; line-height: 1.2; }

/* Admin tabs */
.admin-tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--bd); }
.adm-tab {
  padding: 10px 18px; background: none; border: none;
  border-bottom: 2px solid transparent; margin-bottom: -1px;
  color: var(--tx-5); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; border-radius: 10px 10px 0 0;
}
.adm-tab:hover { color: var(--tx-3); background: var(--bg-card-md); }
.adm-active { color: #E8713E; border-bottom-color: #E8713E; background: rgba(216,90,48,0.06); }

/* List toolbar */
.list-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.search-wrap { flex: 1; display: flex; align-items: center; gap: 8px; background: var(--bg-input); border: 1px solid var(--bd-md); border-radius: 12px; padding: 0 14px; height: 42px; transition: border-color 0.2s; }
.search-wrap:focus-within { border-color: rgba(216,90,48,0.5); }
.search-wrap svg   { width: 16px; height: 16px; color: var(--tx-5); flex-shrink: 0; }
.search-wrap input { flex: 1; background: none; border: none; outline: none; font-size: 14px; color: var(--tx-2); }
.search-wrap input::placeholder { color: var(--tx-6); }
.clear-btn { background: none; border: none; color: var(--tx-5); cursor: pointer; font-size: 12px; }
.result-count { font-size: 12px; font-weight: 700; color: var(--tx-5); flex-shrink: 0; }

/* Recipe table */
.recipe-table { display: flex; flex-direction: column; gap: 6px; }
.recipe-row { display: flex; align-items: center; gap: 14px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--bd); border-radius: 14px; transition: border-color 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.recipe-row:hover { border-color: var(--bd-lg); }
.row-img { width: 52px; height: 52px; border-radius: 12px; overflow: hidden; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 24px; flex-shrink: 0; }
.row-img img { width: 100%; height: 100%; object-fit: cover; }
.row-info  { flex: 1; min-width: 0; }
.row-title { font-size: 14px; font-weight: 700; color: var(--tx-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.row-meta  { display: flex; align-items: center; gap: 8px; margin-top: 4px; flex-wrap: wrap; }
.row-cat   { font-size: 11px; color: var(--tx-5); font-weight: 600; }
.row-time  { font-size: 11px; color: var(--tx-5); }
.diff-tag  { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; }
.dt-easy   { background: rgba(34,197,94,0.12); color: #4ade80; }
.dt-mid    { background: rgba(234,179,8,0.12);  color: #fbbf24; }
.dt-hard   { background: rgba(239,68,68,0.12);  color: #f87171; }
.row-id    { font-size: 11px; font-weight: 700; color: var(--tx-6); flex-shrink: 0; }
.vis-on    { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(34,197,94,0.1); color: #4ade80; flex-shrink: 0; }
.vis-off   { padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; background: rgba(100,116,139,0.1); color: var(--tx-4); flex-shrink: 0; }
.row-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

/* CRUD section (categories / tags still use split layout) */
.crud-section { display: grid; grid-template-columns: 340px 1fr; gap: 20px; align-items: start; }

/* Form panel */
.crud-form { background: var(--bg-card); border: 1px solid var(--bd); border-radius: 16px; padding: 20px; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.crud-form-title { font-size: 14px; font-weight: 800; color: var(--tx-2); }
.crud-fields { display: flex; flex-direction: column; gap: 8px; }
.cf-input {
  height: 40px; padding: 0 12px;
  background: var(--bg-input); border: 1px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2); font-size: 14px; outline: none;
  transition: border-color 0.2s; width: 100%;
}
.cf-input:focus { border-color: rgba(216,90,48,0.5); }
.cf-input::placeholder { color: var(--tx-6); }
.cf-color-row { display: flex; align-items: center; gap: 10px; }
.cf-color-label { font-size: 12px; color: var(--tx-5); font-weight: 700; }
.cf-color-input { width: 40px; height: 32px; border: 1px solid var(--bd-lg); border-radius: 8px; cursor: pointer; padding: 2px; background: none; }
.cf-color-val { font-size: 12px; color: var(--tx-4); font-family: monospace; }
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
  background: var(--bg-input); border: 1px solid var(--bd-md);
  color: var(--tx-4); font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
}
.btn-cancel-sm:hover { background: var(--bg-input-f); }

/* CRUD list */
.crud-list { display: flex; flex-direction: column; gap: 6px; }
.crud-empty { padding: 32px; text-align: center; color: var(--tx-6); font-size: 13px; background: var(--bg-card); border: 1px dashed var(--bd); border-radius: 14px; }
.crud-row { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--bd); border-radius: 12px; transition: border-color 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.crud-row:hover { border-color: var(--bd-lg); }
.crud-color-dot { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.crud-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.crud-name { font-size: 14px; font-weight: 700; color: var(--tx-2); }
.crud-sub  { font-size: 12px; color: var(--tx-5); }
.crud-actions { display: flex; gap: 6px; flex-shrink: 0; }
.tag-chip { padding: 3px 10px; border-radius: 20px; background: rgba(216,90,48,0.1); border: 1px solid rgba(216,90,48,0.2); color: #E8713E; font-size: 12px; font-weight: 700; white-space: nowrap; }

/* Buttons */
.btn-add-new { display: flex; align-items: center; gap: 6px; padding: 0 16px; height: 42px; background: linear-gradient(135deg, #D85A30, #E8713E); border: none; border-radius: 12px; color: #fff; font-size: 13px; font-weight: 700; cursor: pointer; flex-shrink: 0; box-shadow: 0 4px 12px rgba(216,90,48,0.35); transition: transform 0.2s, box-shadow 0.2s; }
.btn-add-new:hover { transform: translateY(-1px); }
.btn-add-new svg { width: 15px; height: 15px; }
.btn-edit-row { width: 32px; height: 32px; border-radius: 8px; background: rgba(216,90,48,0.08); border: none; display: flex; align-items: center; justify-content: center; color: #E8713E; cursor: pointer; transition: background 0.2s; }
.btn-edit-row:hover { background: rgba(216,90,48,0.2); }
.btn-edit-row svg { width: 15px; height: 15px; }
.btn-view { width: 32px; height: 32px; border-radius: 8px; background: var(--bg-input); border: none; display: flex; align-items: center; justify-content: center; color: var(--tx-4); text-decoration: none; transition: background 0.2s, color 0.2s; }
.btn-view:hover { background: rgba(216,90,48,0.12); color: #E8713E; }
.btn-view svg { width: 15px; height: 15px; }
.btn-delete { width: 32px; height: 32px; border-radius: 8px; background: rgba(239,68,68,0.08); border: none; display: flex; align-items: center; justify-content: center; color: #ef4444; cursor: pointer; transition: background 0.2s; }
.btn-delete:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.btn-delete:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-delete svg { width: 15px; height: 15px; }

/* Skeleton */
.skel-row { pointer-events: none; }
.skel-img  { width: 52px; height: 52px; border-radius: 12px; background: var(--bd); animation: pulse 1.4s ease-in-out infinite; }
.skel-body { flex: 1; display: flex; flex-direction: column; gap: 6px; }
.skel-line { height: 12px; border-radius: 6px; background: var(--bg-input); animation: pulse 1.4s ease-in-out infinite; }
.w70 { width: 70%; } .w40 { width: 40%; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 24px; background: var(--bg-card); border: 1px solid var(--bd); border-radius: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.empty-icon  { font-size: 48px; }
.empty-title { font-size: 15px; font-weight: 800; color: var(--tx-4); }
.empty-btn   { padding: 8px 18px; border-radius: 10px; background: rgba(216,90,48,0.1); border: 1px solid rgba(216,90,48,0.2); color: #E8713E; font-size: 13px; font-weight: 700; cursor: pointer; }

/* Ingredient list extras */
.ing-img-wrap { width: 40px; height: 40px; border-radius: 10px; background: var(--bg-input); display: flex; align-items: center; justify-content: center; font-size: 20px; overflow: hidden; flex-shrink: 0; }
.ing-img-wrap img { width: 100%; height: 100%; object-fit: cover; }
.ing-badges { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.ing-unit-badge { padding: 2px 8px; border-radius: 6px; background: rgba(99,102,241,0.12); color: #818cf8; font-size: 10px; font-weight: 800; }
.ing-allergen { font-size: 11px; color: #fbbf24; font-weight: 700; }
.ing-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.pg-btn { padding: 6px 14px; background: var(--bg-input); border: 1px solid var(--bd-md); border-radius: 8px; color: var(--tx-3); font-size: 13px; font-weight: 700; cursor: pointer; transition: background 0.2s; }
.pg-btn:hover:not(:disabled) { background: var(--bg-input-f); color: var(--tx-2); }
.pg-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pg-info { font-size: 12px; color: var(--tx-5); font-weight: 700; }

/* ── Ingredient Modal ── */
.ing-modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
}
.ing-modal {
  width: 100%; max-width: 480px;
  background: var(--bg-surface);
  border: 1px solid var(--bd-md);
  border-radius: 20px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
  overflow: hidden;
}
.ing-modal-head {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px;
  border-bottom: 1px solid var(--bd);
}
.ing-modal-icon { font-size: 28px; flex-shrink: 0; }
.ing-modal-title { font-size: 16px; font-weight: 900; color: var(--tx-1); }
.ing-modal-sub { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.ing-modal-close {
  margin-left: auto; flex-shrink: 0;
  width: 32px; height: 32px; border-radius: 8px;
  background: var(--bg-input); border: none;
  color: var(--tx-4); cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.ing-modal-close:hover { background: var(--bg-input-f); color: var(--tx-2); }
.ing-modal-close svg { width: 16px; height: 16px; }

.ing-modal-body { padding: 20px 24px; }
.ing-modal-fields { display: flex; flex-direction: column; gap: 12px; }
.imf-group { display: flex; flex-direction: column; gap: 5px; }
.imf-label { font-size: 11px; font-weight: 800; color: var(--tx-4); text-transform: uppercase; letter-spacing: 0.05em; }
.imf-req { color: #ef4444; }
.imf-input {
  height: 42px; padding: 0 14px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 10px; color: var(--tx-2); font-size: 14px; outline: none;
  transition: border-color 0.2s, background 0.2s;
}
.imf-input:focus { border-color: rgba(216,90,48,0.5); background: var(--bg-input-f); }
.imf-input::placeholder { color: var(--tx-6); }
.imf-select { cursor: pointer; color-scheme: dark; }
.imf-select option { background: var(--bg-surface); color: var(--tx-2); }
.imf-check-row {
  display: flex; align-items: center; gap: 10px;
  cursor: pointer; padding: 4px 0;
}
.imf-toggle {
  width: 36px; height: 20px; border-radius: 10px;
  background: var(--bd-lg); position: relative;
  transition: background 0.2s; flex-shrink: 0; cursor: pointer;
}
.imf-toggle-on { background: #E8713E; }
.imf-toggle-thumb {
  position: absolute; top: 2px; left: 2px;
  width: 16px; height: 16px; border-radius: 50%; background: white;
  transition: transform 0.2s;
}
.imf-toggle-on .imf-toggle-thumb { transform: translateX(16px); }
.imf-check-label { font-size: 13px; color: var(--tx-3); font-weight: 600; }

.ing-modal-footer {
  display: flex; gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid var(--bd);
}
.ing-modal-cancel {
  flex: 1; height: 42px; border-radius: 11px;
  background: var(--bg-input); border: 1px solid var(--bd-md);
  color: var(--tx-4); font-size: 14px; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
}
.ing-modal-cancel:hover { background: var(--bg-input-f); color: var(--tx-3); }
.ing-modal-save {
  flex: 2; height: 42px; border-radius: 11px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none; color: white; font-size: 14px; font-weight: 800;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 4px 14px rgba(216,90,48,0.35);
  transition: opacity 0.2s, transform 0.2s;
}
.ing-modal-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(216,90,48,0.45); }
.ing-modal-save:disabled { opacity: 0.5; cursor: not-allowed; }
.ing-modal-save svg { width: 16px; height: 16px; }

/* modal-fade transition */
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.2s ease; }
.modal-fade-enter-from  { opacity: 0; }
.modal-fade-leave-to    { opacity: 0; }
.modal-fade-enter-from .ing-modal { transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to   .ing-modal { transform: scale(0.95) translateY(10px); }

/* ── User tab ── */
.user-avatar {
  width: 44px; height: 44px; border-radius: 50%; overflow: hidden;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-avatar img { width: 100%; height: 100%; object-fit: cover; }
.user-avatar-letter { font-size: 18px; font-weight: 900; color: #fff; }

.badge-admin {
  padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
  background: rgba(139,92,246,0.15); color: #a78bfa; flex-shrink: 0;
}
.badge-user {
  padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 800;
  background: rgba(99,102,241,0.12); color: #818cf8; flex-shrink: 0;
}

.btn-block {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(239,68,68,0.08); border: none;
  display: flex; align-items: center; justify-content: center;
  color: #ef4444; cursor: pointer; transition: background 0.2s;
}
.btn-block:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.btn-block:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-block svg { width: 15px; height: 15px; }

.btn-unblock {
  width: 32px; height: 32px; border-radius: 8px;
  background: rgba(34,197,94,0.1); border: none;
  display: flex; align-items: center; justify-content: center;
  color: #4ade80; cursor: pointer; transition: background 0.2s;
}
.btn-unblock:hover:not(:disabled) { background: rgba(34,197,94,0.2); }
.btn-unblock:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-unblock svg { width: 15px; height: 15px; }

/* ── User role toggle ── */
.user-role-toggle {
  display: flex; gap: 6px;
}
.role-btn {
  flex: 1; height: 38px; border-radius: 10px;
  background: var(--bg-input); border: 1px solid var(--bd-md);
  color: var(--tx-4); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s;
}
.role-btn-active-user {
  background: rgba(99,102,241,0.15);
  border-color: rgba(99,102,241,0.4);
  color: #818cf8;
}
.role-btn-active-blogger {
  background: rgba(216,90,48,0.15);
  border-color: rgba(216,90,48,0.4);
  color: #E8713E;
}
.role-btn-active-admin {
  background: rgba(139,92,246,0.15);
  border-color: rgba(139,92,246,0.4);
  color: #a78bfa;
}
.badge-blogger {
  display: inline-block;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  background: rgba(216,90,48,0.15);
  color: #E8713E;
}

/* Password section */
.user-pw-divider {
  font-size: 11px; font-weight: 800; color: var(--tx-5);
  text-transform: uppercase; letter-spacing: 0.05em;
  padding: 4px 0 2px;
  border-top: 1px solid var(--bd);
  margin-top: 4px;
}
.imf-input-err { border-color: rgba(239,68,68,0.6) !important; }
.pw-err-msg { font-size: 11px; color: #ef4444; font-weight: 600; margin-top: 2px; }

/* Spinner */
.spinner { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.25); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; flex-shrink: 0; }
.spinner.sm { width: 12px; height: 12px; }

@keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
@keyframes spin   { to { transform: rotate(360deg); } }

@media (max-width: 768px) {
  /* Stats — 3 kolonna */
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card  { padding: 12px 6px; border-radius: 12px; }
  .sc-icon    { font-size: 20px; }
  .sc-val     { font-size: 20px; }
  .sc-lbl     { font-size: 9px; letter-spacing: 0.02em; }

  /* Tabs — gorizontal scroll */
  .admin-tabs { overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none; flex-wrap: nowrap; }
  .admin-tabs::-webkit-scrollbar { display: none; }
  .adm-tab { white-space: nowrap; flex-shrink: 0; padding: 9px 13px; font-size: 12px; }

  /* Toolbar — grid: search+count top row, button below */
  .list-toolbar {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 8px;
    margin-bottom: 12px;
  }
  .search-wrap  { grid-column: 1; grid-row: 1; min-width: 0; }
  .result-count { grid-column: 2; grid-row: 1; align-self: center; white-space: nowrap; }
  .btn-add-new  { grid-column: 1 / -1; grid-row: 2; width: 100%; justify-content: center; }

  /* Recipe row */
  .row-id            { display: none; }
  .vis-on, .vis-off  { display: none; }
  .recipe-row { padding: 10px 12px; gap: 10px; }
  .row-img    { width: 44px; height: 44px; }

  /* CRUD form full-width */
  .crud-section { grid-template-columns: 1fr; }

  /* Modal bottom sheet */
  .ing-modal { max-width: 100%; border-radius: 20px 20px 0 0; max-height: 90vh; overflow-y: auto; }
  .ing-modal-overlay { align-items: flex-end; padding: 0; }

  /* Users row */
  .badge-admin, .badge-user { display: none; }
  .user-avatar { width: 38px; height: 38px; }
}

@media (max-width: 480px) {
  /* Stats — 2 ta kolonna kichik ekranlarda */
  .stats-row { grid-template-columns: repeat(2, 1fr); }

  /* Page header */
  .page-title { font-size: 18px; }

  /* Tabs kichikroq */
  .adm-tab { padding: 8px 11px; font-size: 11px; }
}

/* ── APPLICATIONS ── */
.app-filter-btns { display: flex; gap: 8px; }
.app-filter-btn {
  padding: 7px 16px; border-radius: 20px; font-size: 13px; font-weight: 700;
  border: 1px solid var(--border); background: var(--bg-card); color: var(--tx-3);
  cursor: pointer; transition: all 0.15s;
}
.app-filter-btn.active {
  background: rgba(216,90,48,0.15); border-color: rgba(216,90,48,0.4); color: #E8713E;
}

.app-list { display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }

.app-card {
  background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px;
  padding: 16px 18px; display: flex; flex-direction: column; gap: 10px;
}

.app-user { display: flex; align-items: center; gap: 12px; }
.app-user-name { font-size: 14px; font-weight: 800; color: var(--tx-1); }
.app-user-sub  { font-size: 12px; color: var(--tx-5); margin-top: 2px; }

.app-status {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 12px; font-weight: 700; width: fit-content;
}
.app-status-pending   { background: rgba(251,191,36,0.12); color: #fbbf24; border: 1px solid rgba(251,191,36,0.3); }
.app-status-approved  { background: rgba(34,197,94,0.12);  color: #4ade80; border: 1px solid rgba(34,197,94,0.3); }
.app-status-rejected  { background: rgba(239,68,68,0.1);   color: #f87171; border: 1px solid rgba(239,68,68,0.25); }
.app-status-cancelled { background: rgba(148,163,184,0.1); color: #94a3b8; border: 1px solid rgba(148,163,184,0.25); }

.app-note { font-size: 12px; color: var(--tx-4); font-style: italic; }
.app-reviewed-by { font-size: 11px; color: var(--tx-5); }

.app-actions { display: flex; gap: 8px; margin-top: 4px; }
.app-btn-approve {
  flex: 1; padding: 9px; border-radius: 10px; font-size: 13px; font-weight: 700;
  background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); color: #4ade80;
  cursor: pointer; transition: all 0.15s;
}
.app-btn-approve:hover:not(:disabled) { background: rgba(34,197,94,0.22); }
.app-btn-reject {
  flex: 1; padding: 9px; border-radius: 10px; font-size: 13px; font-weight: 700;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); color: #f87171;
  cursor: pointer; transition: all 0.15s;
}
.app-btn-reject:hover:not(:disabled) { background: rgba(239,68,68,0.18); }
.app-btn-approve:disabled, .app-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Bulk Import ── */
.btn-bulk-import {
  display: flex; align-items: center; gap: 6px;
  padding: 0 14px; height: 42px;
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3);
  border-radius: 12px; color: #4ade80; font-size: 13px; font-weight: 700;
  cursor: pointer; flex-shrink: 0; transition: all 0.2s;
}
.btn-bulk-import:hover { background: rgba(34,197,94,0.18); }
.btn-bulk-import svg { width: 15px; height: 15px; }

.bulk-modal { max-width: 600px; }

.bulk-template-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 10px;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3);
  color: #818cf8; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; width: fit-content; margin-bottom: 14px;
}
.bulk-template-btn:hover { background: rgba(99,102,241,0.2); }

.bulk-dropzone {
  border: 2px dashed var(--bd-md); border-radius: 14px;
  min-height: 120px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  background: var(--bg-input); padding: 20px;
}
.bulk-dropzone:hover, .bulk-dz-active { border-color: rgba(216,90,48,0.5); background: rgba(216,90,48,0.04); }

.bulk-dz-hint { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; pointer-events: none; }
.bulk-dz-icon { width: 36px; height: 36px; color: var(--tx-5); }
.bulk-dz-text { font-size: 14px; font-weight: 700; color: var(--tx-3); }
.bulk-dz-sub  { font-size: 12px; color: var(--tx-6); }

.bulk-dz-chosen { display: flex; align-items: center; gap: 10px; width: 100%; }
.bulk-dz-fname  { flex: 1; font-size: 14px; font-weight: 700; color: var(--tx-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bulk-dz-clear  {
  width: 24px; height: 24px; border-radius: 6px; border: none;
  background: var(--bd-lg); color: var(--tx-4); font-size: 11px;
  cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
}

.bulk-result { margin-top: 16px; }
.bulk-result-summary {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  margin-bottom: 10px; font-size: 13px; font-weight: 700;
}
.brs-total { color: var(--tx-4); }
.brs-ok    { color: #4ade80; }
.brs-upd   { color: #60a5fa; }
.brs-skip  { color: #fbbf24; }
.brs-err   { color: #f87171; }

.bulk-result-table { border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; }
.brt-head {
  display: grid; grid-template-columns: 50px 1fr 60px 1fr;
  padding: 8px 12px; background: var(--bg-input);
  font-size: 10px; font-weight: 800; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.05em;
  gap: 8px;
}
.brt-row {
  display: grid; grid-template-columns: 50px 1fr 60px 1fr;
  padding: 9px 12px; border-top: 1px solid var(--bd);
  font-size: 12px; gap: 8px; align-items: center;
}
.brt-ok   { background: rgba(34,197,94,0.03); }
.brt-upd  { background: rgba(96,165,250,0.04); }
.brt-skip { background: rgba(251,191,36,0.04); }
.brt-fail { background: rgba(239,68,68,0.04); }

/* Mode toggle */
.bulk-mode-row { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.bulk-mode-label { font-size: 12px; font-weight: 700; color: var(--tx-4); white-space: nowrap; }
.bulk-mode-btns { display: flex; gap: 6px; }
.bulk-mode-btn {
  padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700;
  border: 1px solid var(--bd-md); background: var(--bg-input); color: var(--tx-4);
  cursor: pointer; transition: all 0.15s;
}
.bulk-mode-active-skip {
  background: rgba(251,191,36,0.12); border-color: rgba(251,191,36,0.4); color: #fbbf24;
}
.bulk-mode-active-update {
  background: rgba(96,165,250,0.12); border-color: rgba(96,165,250,0.4); color: #60a5fa;
}
.brt-num    { font-weight: 700; color: var(--tx-5); }
.brt-title  { font-weight: 600; color: var(--tx-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.brt-status { text-align: center; }
.brt-error  { font-size: 11px; color: #f87171; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

@media (max-width: 480px) {
  .btn-bulk-import { padding: 0 10px; font-size: 12px; }
  .brt-head, .brt-row { grid-template-columns: 40px 1fr 44px 1fr; }
}
</style>
