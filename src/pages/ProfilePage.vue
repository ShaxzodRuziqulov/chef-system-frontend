<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }             from '@/stores/authStore'
import { useLangStore }             from '@/stores/langStore'
import { useFavoritesStore }        from '@/stores/favoritesStore'
import { recipesApi }               from '@/api/recipes'
import { uploadApi }                from '@/api/upload'
import { mealPlansApi }             from '@/api/mealPlans'
import { authApi }                  from '@/api/auth'
import { usersApi }                 from '@/api/users'
import { bloggerApplicationApi }    from '@/api/bloggerApplications'
import RecipeCard                   from '@/components/recipe/RecipeCard.vue'
import RecipeFormModal              from '@/components/recipe/RecipeFormModal.vue'
import ConfirmModal                 from '@/components/ui/ConfirmModal.vue'
import { resolveImageUrl }          from '@/utils/imageUrl'
import { formatDate }              from '@/utils/formatDate'
import { useToast }                from '@/composables/useToast'

const auth      = useAuthStore()
const lang      = useLangStore()
const favorites = useFavoritesStore()
const toast     = useToast()

const recipes       = ref([])
const mealPlanCount = ref(0)
const loading       = ref(true)
const deletingId      = ref(null)
const showDeleteModal = ref(false)
const deleteTargetId  = ref(null)

// ── Recipe form ───────────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)

// ── Edit profile modal ────────────────────────────────────────────
const showEdit        = ref(false)
const editForm        = ref({ fullName: '', avatarUrl: '' })
const saveError       = ref('')
const saveSuccess     = ref(false)
const saving          = ref(false)
const avatarPreview      = ref('')
const avatarUploading    = ref(false)
const avatarInput        = ref(null)
const quickAvatarInput   = ref(null)
const showAvatarLightbox = ref(false)

// ── Password ──────────────────────────────────────────────────────
const showPwForm = ref(false)
const pwForm     = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwError    = ref('')
const pwSuccess  = ref(false)
const pwSaving   = ref(false)

// ── Blogger ariza modal ───────────────────────────────────────────
const showBloggerModal  = ref(false)
const bloggerLoading    = ref(false)
const bloggerError      = ref('')
const bloggerSuccess    = ref(false)
const myApplication     = ref(null)   // null = tekshirilmagan, false = yo'q, object = bor

// ── Computed ──────────────────────────────────────────────────────
const roleLabel = computed(() => {
  if (auth.isAdmin)   return { text: 'Admin',          icon: '👑', cls: 'role-admin' }
  if (auth.isBlogger) return { text: 'Oshpaz',          icon: '👨‍🍳', cls: 'role-blogger' }
  return               { text: 'Foydalanuvchi',        icon: '👤', cls: 'role-user' }
})

const memberSince = computed(() => formatDate(auth.user?.createdAt, 'month-year', lang.lang))

const statsData = computed(() => [
  { icon: '📝', val: recipes.value.length,    lbl: lang.t('profile.stat_recipes') },
  { icon: '❤️',  val: favorites.count,         lbl: lang.t('profile.stat_saved')   },
  { icon: '📅', val: mealPlanCount.value,     lbl: lang.t('profile.stat_meal')    },
])

// ── Lifecycle ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await auth.fetchUser()
    const ps = [loadMealPlanCount()]
    if (auth.isBlogger) ps.push(loadMyRecipes())
    if (!favorites.loaded) ps.push(favorites.loadIds())
    if (!auth.isBlogger && !auth.isAdmin) ps.push(loadMyApplication())
    await Promise.all(ps)
  } finally {
    loading.value = false
  }
})

async function loadMyApplication() {
  try {
    const res = await bloggerApplicationApi.getMyApplication()
    myApplication.value = (res.data?.data ?? res.data) ?? false
  } catch {
    myApplication.value = false
  }
}

async function loadMyRecipes() {
  try {
    const r = await recipesApi.getMy({ page: 0, size: 20 })
    recipes.value = (r.data?.data ?? r.data)?.content ?? []
  } catch { recipes.value = [] }
}

async function loadMealPlanCount() {
  try {
    const res = await mealPlansApi.getMy({ page: 0, size: 1 })
    mealPlanCount.value = (res.data?.data ?? res.data)?.totalElements ?? 0
  } catch { mealPlanCount.value = 0 }
}

// ── Profile edit ──────────────────────────────────────────────────
function openEdit() {
  editForm.value   = { fullName: auth.user?.fullName ?? '', avatarUrl: auth.avatarUrl ?? '' }
  avatarPreview.value = auth.avatarUrl ?? ''
  saveError.value  = ''
  saveSuccess.value = false
  showPwForm.value = false
  pwForm.value     = { currentPassword: '', newPassword: '', confirmPassword: '' }
  pwError.value    = ''
  pwSuccess.value  = false
  showEdit.value   = true
}

async function onQuickAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  avatarUploading.value = true
  try {
    const res = await uploadApi.image(file)
    const url = res.data?.data?.url ?? res.data?.url
    editForm.value.avatarUrl = url
    await auth.updateProfile({ avatarUrl: url })
    await auth.fetchUser()
  } catch {
    // upload yoki saqlash xatosi — jimgina o'tkazib yuborish
  } finally {
    avatarUploading.value = false
    e.target.value = ''
  }
}

async function onAvatarFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  avatarPreview.value = URL.createObjectURL(file)
  avatarUploading.value = true
  saveError.value = ''
  try {
    const res = await uploadApi.image(file)
    editForm.value.avatarUrl = res.data?.data?.url ?? res.data?.url
  } catch {
    saveError.value = 'Rasm yuklanmadi'
    avatarPreview.value = editForm.value.avatarUrl
  } finally {
    avatarUploading.value = false
  }
}

async function saveProfile() {
  saving.value = true; saveError.value = ''; saveSuccess.value = false
  const err = await auth.updateProfile({
    fullName:  editForm.value.fullName  || undefined,
    avatarUrl: editForm.value.avatarUrl || undefined,
  })
  saving.value = false
  if (err) { saveError.value = err }
  else {
    saveSuccess.value = true
    await auth.fetchUser()
    setTimeout(() => { showEdit.value = false; saveSuccess.value = false }, 1000)
  }
}

async function savePassword() {
  pwError.value = ''; pwSuccess.value = false
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) { pwError.value = lang.t('profile.pw_mismatch'); return }
  if (pwForm.value.newPassword.length < 4) { pwError.value = lang.t('profile.pw_short'); return }
  pwSaving.value = true
  try {
    await authApi.changePassword({ currentPassword: pwForm.value.currentPassword, newPassword: pwForm.value.newPassword })
    pwSuccess.value = true
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => { pwSuccess.value = false }, 2000)
  } catch (e) {
    pwError.value = e?.response?.data?.message || 'Parol o\'zgartirishda xatolik'
  } finally { pwSaving.value = false }
}

// ── Recipes ───────────────────────────────────────────────────────
function openCreateRecipe() { editingRecipe.value = null; showRecipeModal.value = true }
function openEditRecipe(r)  { editingRecipe.value = r;    showRecipeModal.value = true }

// ── Excel import (BLOGGER) ────────────────────────────────────────
const importModal     = ref(false)
const importFile      = ref(null)
const importFileName  = ref('')
const importUploading = ref(false)
const importResult    = ref(null)

function openImportModal() {
  importFile.value     = null
  importFileName.value = ''
  importResult.value   = null
  importModal.value    = true
}

function onImportFileChange(e) {
  const f = e.target.files?.[0]
  if (!f) return
  importFile.value     = f
  importFileName.value = f.name
  importResult.value   = null
}

function onImportDrop(e) {
  const f = e.dataTransfer.files?.[0]
  if (!f) return
  importFile.value     = f
  importFileName.value = f.name
  importResult.value   = null
}

async function submitImport() {
  if (!importFile.value) return
  importUploading.value = true
  importResult.value    = null
  try {
    const res = await recipesApi.userImport(importFile.value, 'SKIP')
    importResult.value = res.data?.data ?? res.data
    const r = importResult.value
    if (r?.successCount > 0) {
      await loadMyRecipes()
      toast.success(`${r.successCount} ta yangi retsept qo'shildi!`)
    }
    if (r?.skippedCount > 0) toast.info(`${r.skippedCount} ta retsept allaqachon mavjud — o'tkazib yuborildi`)
    if (r?.failedCount  > 0) toast.error(`${r.failedCount} ta qatorda xatolik`)
  } catch (e) {
    toast.error(e?.response?.data?.message ?? 'Yuklashda xatolik')
  } finally {
    importUploading.value = false
  }
}

async function downloadImportTemplate() {
  try {
    const res = await recipesApi.userImportTemplate(lang.lang)
    const url = URL.createObjectURL(new Blob([res.data]))
    const a   = document.createElement('a')
    a.href     = url
    a.download = 'retsept_shablon.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    toast.error('Shablonni yuklab bo\'lmadi')
  }
}

function handleRecipeSaved(saved) {
  showRecipeModal.value = false
  const idx = recipes.value.findIndex(r => r.id === saved.id)
  if (idx !== -1) recipes.value[idx] = saved
  else recipes.value.unshift(saved)
  editingRecipe.value = null
}

function askDeleteRecipe(id) {
  deleteTargetId.value  = id
  showDeleteModal.value = true
}

async function confirmDeleteRecipe() {
  const id = deleteTargetId.value
  showDeleteModal.value = false
  deletingId.value = id
  try {
    await recipesApi.delete(id)
    recipes.value = recipes.value.filter(r => r.id !== id)
  } catch { /* toast not imported here, silent */ }
  finally  { deletingId.value = null }
}

// ── Oshpaz ariza ──────────────────────────────────────────────────
function openBloggerModal() {
  bloggerError.value = ''; bloggerSuccess.value = false
  showBloggerModal.value = true
}

async function confirmBecomeBlogger() {
  bloggerLoading.value = true; bloggerError.value = ''
  try {
    const res = await bloggerApplicationApi.apply()
    myApplication.value = res.data?.data ?? res.data
    bloggerSuccess.value = true
    setTimeout(() => { showBloggerModal.value = false; bloggerSuccess.value = false }, 1800)
  } catch (e) {
    bloggerError.value = e?.response?.data?.message ?? 'Xatolik yuz berdi'
  } finally {
    bloggerLoading.value = false
  }
}

// Oshpazlikdan chiqish
const showLeaveModal  = ref(false)
const leaveLoading    = ref(false)
const leaveError      = ref('')

async function confirmLeaveOshpaz() {
  leaveLoading.value = true; leaveError.value = ''
  try {
    await usersApi.leaveOshpaz()
    showLeaveModal.value = false
    await auth.fetchUser()
  } catch (e) {
    leaveError.value = e?.response?.data?.message || "Xatolik yuz berdi. Admin bilan bog'laning."
  } finally {
    leaveLoading.value = false
  }
}
</script>

<template>
  <div class="page">

    <!-- ══════════════ SKELETON ══════════════ -->
    <div v-if="loading" class="skel-page">
      <div class="skel-hero" />
      <div class="skel-info">
        <div class="skel-ava" />
        <div class="skel-lines">
          <div class="skel-line w180" />
          <div class="skel-line w120" />
        </div>
      </div>
      <div class="skel-grid">
        <div v-for="i in 3" :key="i" class="skel-stat" />
      </div>
      <div class="skel-grid">
        <div v-for="i in 6" :key="i" class="skel-card" />
      </div>
    </div>

    <!-- ══════════════ MAIN ══════════════ -->
    <template v-else-if="auth.user">

      <!-- ── HERO CARD ── -->
      <div class="hero-card">
        <!-- Cover gradient -->
        <div class="hero-cover">
          <div class="cover-pattern" />
          <div class="cover-glow g1" />
          <div class="cover-glow g2" />
        </div>

        <!-- Avatar zone -->
        <div class="hero-body">
          <div class="ava-zone">
            <div class="ava-ring" :class="[roleLabel.cls, { 'ava-uploading': avatarUploading }]"
                 @click="showAvatarLightbox = true">
              <div class="ava-inner">
                <img v-if="auth.avatarUrl" :src="resolveImageUrl(auth.avatarUrl)" alt="avatar"
                  @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }" />
                <span :style="auth.avatarUrl ? 'display:none' : ''">{{ auth.initials }}</span>
                <div class="ava-hover-overlay">
                  <span v-if="avatarUploading" class="spin spin-white" />
                  <template v-else>
                    <!-- ko'rish ikonka -->
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="ava-cam-icon">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"
                        d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" cx="12" cy="12" r="3"/>
                    </svg>
                    <span class="ava-overlay-text">{{ lang.t('profile.view_avatar') }}</span>
                  </template>
                </div>
              </div>
            </div>
            <input ref="quickAvatarInput" type="file" accept="image/*" style="display:none" @change="onQuickAvatarChange" />
            <div class="role-pill" :class="roleLabel.cls">
              {{ roleLabel.icon }} {{ roleLabel.text }}
            </div>
          </div>

          <!-- Name & meta -->
          <div class="hero-meta">
            <h1 class="hero-name">{{ auth.user.fullName || auth.user.username || lang.t('profile.user') }}</h1>
            <div v-if="auth.user.username || memberSince" class="hero-sub-row">
              <span v-if="auth.user.username" class="meta-chip">@{{ auth.user.username }}</span>
              <span v-if="memberSince" class="meta-chip">📅 {{ memberSince }}</span>
            </div>
          </div>

          <!-- Stats -->
          <div class="stats-bar">
            <div v-for="s in statsData" :key="s.lbl" class="stat-box">
              <div class="stat-num">{{ s.val }}</div>
              <div class="stat-lbl">{{ s.lbl }}</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="hero-actions">
            <button @click="openEdit" class="btn-action btn-primary">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              {{ lang.t('profile.edit') }}
            </button>
            <button @click="auth.logout()" class="btn-action btn-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              {{ lang.t('profile.logout') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── INFO CARD ── -->
      <div class="info-card">
        <div v-if="auth.user.email" class="info-row">
          <div class="info-icon">✉️</div>
          <div class="info-body">
            <div class="info-lbl">Email</div>
            <div class="info-val">{{ auth.user.email }}</div>
          </div>
        </div>
        <div v-if="auth.user.username" class="info-row">
          <div class="info-icon">🔖</div>
          <div class="info-body">
            <div class="info-lbl">Username</div>
            <div class="info-val">@{{ auth.user.username }}</div>
          </div>
        </div>
        <div class="info-row">
          <div class="info-icon">🛡️</div>
          <div class="info-body">
            <div class="info-lbl">{{ lang.t('profile.role') }}</div>
            <div class="info-val">
              <span class="role-badge" :class="roleLabel.cls">{{ roleLabel.icon }} {{ roleLabel.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── OSHPAZ BANNER (USER uchun) ── -->
      <template v-if="!auth.isBlogger && !auth.isAdmin">
        <!-- Ariza yo'q — tugma ko'rsatiladi -->
        <div v-if="!myApplication || myApplication.status === 'REJECTED'"
             class="blogger-cta" @click="openBloggerModal">
          <div class="bcta-left">
            <div class="bcta-emoji">👨‍🍳</div>
            <div>
              <div class="bcta-title">{{ lang.t('profile.become_chef') }}</div>
              <div class="bcta-sub" v-if="myApplication?.status === 'REJECTED'">
                {{ lang.t('profile.rejected_sub') }}
              </div>
              <div class="bcta-sub" v-else>{{ lang.t('profile.chef_sub') }}</div>
            </div>
          </div>
          <div class="bcta-arrow">›</div>
        </div>

        <!-- Ariza kutilmoqda -->
        <div v-else-if="myApplication?.status === 'PENDING'" class="blogger-pending">
          <span class="bp-icon">⏳</span>
          <div>
            <div class="bp-title">{{ lang.t('profile.pending_title') }}</div>
            <div class="bp-sub">{{ lang.t('profile.pending_sub') }}</div>
          </div>
        </div>
      </template>

      <!-- ── OSHPAZ ACTIVE (BLOGGER uchun) ── -->
      <div v-else-if="auth.role === 'BLOGGER'" class="blogger-active">
        <span class="ba-icon">✅</span>
        <div>
          <div class="ba-title">{{ lang.t('profile.active_chef') }}</div>
          <div class="ba-sub">{{ lang.t('profile.active_sub') }}</div>
        </div>
        <button class="ba-leave-btn" @click.stop="showLeaveModal = true" :title="lang.t('profile.leave_title')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
          </svg>
          {{ lang.t('profile.logout') }}
        </button>
      </div>

      <!-- ── BLOGGER RETSEPTLARI ── -->
      <div v-if="auth.isBlogger" class="section">
        <div class="section-head">
          <h2 class="section-title">{{ lang.t('profile.my_recipes') }}</h2>
          <div class="section-actions">
            <button @click="openImportModal" class="btn-import">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Excel
            </button>
            <button @click="openCreateRecipe" class="btn-add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/></svg>
              {{ lang.t('common.add') }}
            </button>
          </div>
        </div>

        <div v-if="recipes.length" class="recipe-grid">
          <div v-for="r in recipes" :key="r.id" class="card-wrap">
            <RecipeCard :recipe="r" />
            <div class="card-overlay">
              <button @click.prevent="openEditRecipe(r)" class="ov-btn ov-edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click.prevent="askDeleteRecipe(r.id)" :disabled="deletingId === r.id" class="ov-btn ov-del">
                <span v-if="deletingId === r.id" class="spin" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-box">
          <div class="empty-emoji">📝</div>
          <div class="empty-title">{{ lang.t('profile.no_recipes_title') }}</div>
          <div class="empty-sub">{{ lang.t('profile.no_recipes_sub') }}</div>
          <button @click="openCreateRecipe" class="btn-empty">{{ lang.t('profile.add_recipe') }}</button>
        </div>
      </div>

      <!-- ── USER EMPTY STATE ── -->
      <div v-else class="section">
        <div class="section-head">
          <h2 class="section-title">💾 {{ lang.t('home.saved') }}</h2>
        </div>
        <div class="upgrade-box">
          <div class="ub-emoji">🍳</div>
          <div class="ub-title">{{ lang.t('profile.share_cta') }}</div>
          <div class="ub-sub">{{ lang.t('profile.share_sub') }}</div>
          <button @click="openBloggerModal" class="btn-upgrade">{{ lang.t('profile.become_btn') }}</button>
        </div>
      </div>

    </template>

    <!-- ══════════════ MODALS ══════════════ -->

    <!-- ── EXCEL IMPORT MODAL ── -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="importModal" class="modal-overlay" @click.self="importModal = false">
          <div class="import-modal">

            <!-- Head -->
            <div class="im-head">
              <div class="im-icon">📥</div>
              <div>
                <h3 class="im-title">Excel orqali retsept yuklash</h3>
                <p class="im-sub">3 varaqli shablon: Retseptlar · Ingredientlar · Bosqichlar</p>
              </div>
              <button class="im-close" @click="importModal = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div class="im-body">
              <!-- Template download -->
              <button class="im-template-btn" @click="downloadImportTemplate">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:14px;height:14px;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Shablonni yuklab olish (.xlsx)
              </button>

              <!-- Dropzone -->
              <div
                class="im-dropzone"
                :class="{ 'im-dz-active': importFileName }"
                @dragover.prevent
                @drop.prevent="onImportDrop"
                @click="$refs.importFileInput.click()"
              >
                <input ref="importFileInput" type="file" accept=".xlsx" style="display:none" @change="onImportFileChange" />
                <div v-if="!importFileName" class="im-dz-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="im-dz-icon"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  <span class="im-dz-text">Excel faylni bu yerga tashlang yoki bosing</span>
                  <span class="im-dz-sub">.xlsx formati</span>
                </div>
                <div v-else class="im-dz-chosen">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:20px;height:20px;color:#4ade80;flex-shrink:0"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span class="im-dz-fname">{{ importFileName }}</span>
                  <button class="im-dz-clear" @click.stop="importFile=null; importFileName=''; importResult=null">✕</button>
                </div>
              </div>

              <!-- Result -->
              <div v-if="importResult" class="im-result">
                <div class="im-result-summary">
                  <span class="irs-total">Jami: {{ importResult.totalRows }} qator</span>
                  <span class="irs-ok">✅ {{ importResult.successCount }} yangi</span>
                  <span v-if="importResult.skippedCount" class="irs-skip">⚠️ {{ importResult.skippedCount }} allaqachon mavjud</span>
                  <span v-if="importResult.failedCount"  class="irs-err">❌ {{ importResult.failedCount }} xatolik</span>
                </div>
                <div class="im-result-table">
                  <div class="irt-head"><span>Qator</span><span>Retsept</span><span>Holat</span><span>Izoh</span></div>
                  <div
                    v-for="row in importResult.results" :key="row.row"
                    class="irt-row"
                    :class="row.status === 'SUCCESS' ? 'irt-ok' : row.status === 'SKIPPED' ? 'irt-skip' : 'irt-fail'"
                  >
                    <span class="irt-num">#{{ row.row }}</span>
                    <span class="irt-title">{{ row.titleUz || '—' }}</span>
                    <span class="irt-status">{{ row.status === 'SUCCESS' ? '✅' : row.status === 'SKIPPED' ? '⚠️' : '❌' }}</span>
                    <span class="irt-error">{{ row.error || '' }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="im-footer">
              <button class="im-cancel" @click="importModal = false">Yopish</button>
              <button class="im-save" @click="submitImport" :disabled="importUploading || !importFile">
                <span v-if="importUploading" class="spinner sm" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:16px;height:16px"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                {{ importUploading ? 'Yuklanmoqda...' : 'Yuklash' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Recipe form -->
    <RecipeFormModal :recipe="editingRecipe" :visible="showRecipeModal"
      @close="showRecipeModal = false" @saved="handleRecipeSaved" />

    <!-- Delete confirm -->
    <ConfirmModal
      :show="showDeleteModal"
      :message="lang.t('common.confirm_delete')"
      :confirm-label="lang.t('profile.confirm_del')"
      :danger="true"
      @confirm="confirmDeleteRecipe"
      @cancel="showDeleteModal = false"
    />

    <!-- Oshpaz bo'lish modal -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="showBloggerModal" class="modal-overlay" @click.self="showBloggerModal = false">
          <div class="modal-box">
            <div class="modal-head">
              <div class="mh-icon">👨‍🍳</div>
              <div>
                <div class="mh-title">{{ lang.t('profile.become_chef') }}</div>
                <div class="mh-sub">{{ lang.t('profile.blogger_sub') }}</div>
              </div>
              <button class="modal-x" @click="showBloggerModal = false">✕</button>
            </div>

            <div class="blogger-perks">
              <div class="perk">{{ lang.t('profile.perk1') }}</div>
              <div class="perk">{{ lang.t('profile.perk2') }}</div>
              <div class="perk">{{ lang.t('profile.perk3') }}</div>
              <div class="perk">{{ lang.t('profile.perk4') }}</div>
            </div>

            <div class="apply-note">
              {{ lang.t('profile.apply_note') }}
            </div>

            <div v-if="bloggerError" class="msg-error">{{ bloggerError }}</div>
            <div v-if="bloggerSuccess" class="msg-ok">{{ lang.t('profile.apply_success') }}</div>

            <div class="modal-foot">
              <button @click="showBloggerModal = false" class="btn-ghost" :disabled="bloggerLoading">{{ lang.t('common.cancel') }}</button>
              <button @click="confirmBecomeBlogger" class="btn-confirm" :disabled="bloggerLoading">
                <span v-if="bloggerLoading" class="spin" />
                {{ bloggerLoading ? lang.t('profile.applying') : lang.t('profile.apply_btn') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Oshpazlikdan chiqish modal -->
      <Transition name="mfade">
        <div v-if="showLeaveModal" class="modal-overlay" @click.self="showLeaveModal = false">
          <div class="modal-box modal-box-sm">
            <div class="modal-head">
              <div class="mh-icon mh-icon-warn">⚠️</div>
              <div>
                <div class="mh-title">{{ lang.t('profile.leave_title') }}</div>
                <div class="mh-sub">{{ lang.t('profile.leave_confirm') }}</div>
              </div>
              <button class="modal-x" @click="showLeaveModal = false">✕</button>
            </div>

            <div class="leave-info">
              <p>{{ lang.t('profile.leave_info') }}</p>
              <ul>
                <li>{{ lang.t('profile.leave_li1') }}</li>
                <li>{{ lang.t('profile.leave_li2') }}</li>
                <li>{{ lang.t('profile.leave_li3') }}</li>
              </ul>
            </div>

            <div v-if="leaveError" class="msg-error">{{ leaveError }}</div>

            <div class="modal-foot">
              <button @click="showLeaveModal = false" class="btn-ghost" :disabled="leaveLoading">{{ lang.t('common.cancel') }}</button>
              <button @click="confirmLeaveOshpaz" class="btn-leave" :disabled="leaveLoading">
                <span v-if="leaveLoading" class="spin" />
                {{ leaveLoading ? lang.t('profile.leaving') : lang.t('profile.leave_btn') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Avatar lightbox -->
    <Teleport to="body">
      <Transition name="lb-fade">
        <div v-if="showAvatarLightbox" class="lb-overlay" @click.self="showAvatarLightbox = false">
          <div class="lb-box">
            <button class="lb-close" @click="showAvatarLightbox = false">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            <div class="lb-avatar" :class="roleLabel.cls">
              <img v-if="auth.avatarUrl" :src="resolveImageUrl(auth.avatarUrl)" alt="avatar"
                @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }" />
              <span v-else class="lb-initials">{{ auth.initials }}</span>
            </div>
            <div class="lb-name">{{ auth.user?.fullName || auth.user?.username }}</div>
            <button class="lb-change-btn"
                    :disabled="avatarUploading"
                    @click="showAvatarLightbox = false; quickAvatarInput?.click()">
              <span v-if="avatarUploading" class="spin" />
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:15px;height:15px">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                <circle stroke-linecap="round" stroke-linejoin="round" stroke-width="2" cx="12" cy="13" r="4"/>
              </svg>
              {{ lang.t('profile.change_photo') }}
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Profile edit modal -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
          <div class="modal-box">
            <div class="modal-head">
              <div class="mh-icon">✏️</div>
              <div class="mh-title">{{ lang.t('profile.edit') }}</div>
              <button class="modal-x" @click="showEdit = false">✕</button>
            </div>

            <div class="modal-body">
              <!-- Avatar upload -->
              <div class="ava-upload" @click="avatarInput?.click()" :class="{ loading: avatarUploading }">
                <img v-if="avatarPreview" :src="resolveImageUrl(avatarPreview)" class="au-img" />
                <span v-else class="au-letter">{{ auth.initials }}</span>
                <div class="au-overlay">
                  <span v-if="avatarUploading" class="spin" />
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width:22px;height:22px;color:#fff"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12"/></svg>
                </div>
              </div>
              <div class="au-hint">{{ lang.t('profile.avatar_sub') }}</div>
              <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarFileChange" />

              <div class="form-group">
                <label class="form-lbl">{{ lang.t('profile.full_name') }}</label>
                <input v-model="editForm.fullName" type="text" class="form-inp" :placeholder="lang.t('profile.name_ph')" />
              </div>

              <div v-if="saveError" class="msg-error">{{ saveError }}</div>
              <div v-if="saveSuccess" class="msg-ok">{{ lang.t('profile.saved_msg') }}</div>

              <!-- Password toggle -->
              <div class="pw-section">
                <button class="pw-toggle" @click="showPwForm = !showPwForm" type="button">
                  {{ lang.t('profile.pw_change') }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :style="`width:16px;height:16px;transition:.2s;transform:rotate(${showPwForm?180:0}deg)`"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div v-if="showPwForm" class="pw-fields">
                  <input v-model="pwForm.currentPassword" type="password" class="form-inp" :placeholder="lang.t('profile.pw_current')" />
                  <input v-model="pwForm.newPassword"     type="password" class="form-inp" :placeholder="lang.t('profile.pw_new')" />
                  <input v-model="pwForm.confirmPassword" type="password" class="form-inp" :placeholder="lang.t('profile.pw_confirm')" />
                  <div v-if="pwError"   class="msg-error">{{ pwError }}</div>
                  <div v-if="pwSuccess" class="msg-ok">{{ lang.t('profile.pw_saved_msg') }}</div>
                  <button @click="savePassword" :disabled="pwSaving" class="btn-pw-save">
                    <span v-if="pwSaving" class="spin" /> {{ lang.t('profile.pw_save') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-foot">
              <button @click="showEdit = false" class="btn-ghost" :disabled="saving">{{ lang.t('common.cancel') }}</button>
              <button @click="saveProfile" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spin" />{{ saving ? lang.t('common.saving') : lang.t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; width: 100%; max-width: 720px; margin: 0 auto; padding-bottom: 40px; }

/* ── SKELETON ── */
.skel-page  { display: flex; flex-direction: column; gap: 14px; }
.skel-hero  { height: 150px; border-radius: 24px; background: var(--bd-md); animation: pulse 1.5s ease-in-out infinite; }
.skel-info  { display: flex; align-items: center; gap: 16px; padding: 0 4px; }
.skel-ava   { width: 72px; height: 72px; border-radius: 18px; background: var(--bd-md); animation: pulse 1.5s ease-in-out infinite; flex-shrink: 0; }
.skel-lines { display: flex; flex-direction: column; gap: 8px; }
.skel-line  { height: 14px; border-radius: 6px; background: var(--bd); animation: pulse 1.5s ease-in-out infinite; }
.w180 { width: 180px; } .w120 { width: 120px; }
.skel-grid  { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.skel-stat  { height: 70px;  border-radius: 14px; background: var(--bg-input); animation: pulse 1.5s ease-in-out infinite; }
.skel-card  { height: 180px; border-radius: 18px; background: var(--bg-input); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }

/* ── HERO CARD ── */
.hero-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  /* overflow: hidden — olib tashlandi, avatar to'liq ko'rinsin */
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  position: relative;
}
.hero-cover {
  position: relative;
  height: 110px;
  background: linear-gradient(135deg, #0d1f14 0%, #1a3020 35%, #162030 70%, #0b1520 100%);
  overflow: hidden;
  border-radius: 24px 24px 0 0; /* faqat yuqori burchaklar */
}
.cover-pattern {
  position: absolute; inset: 0;
  background-image:
    radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px),
    linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.3) 100%);
  background-size: 22px 22px, 100% 100%;
}
.cover-glow {
  position: absolute; border-radius: 50%; filter: blur(55px);
}
.g1 { width: 220px; height: 220px; background: rgba(216,90,48,0.35); top: -80px; right: -40px; }
.g2 { width: 180px; height: 180px; background: rgba(59,130,246,0.2);  bottom: -70px; left: -30px; }

.hero-body { padding: 0 24px 24px; }

/* Avatar */
.ava-zone {
  display: flex; align-items: flex-end; gap: 16px;
  margin-top: -48px; /* avatarning yarmi yuqorida, yarmi pastda */
  margin-bottom: 14px;
  position: relative;
  z-index: 10; /* cover ustida ko'rinsin */
}
.ava-ring {
  width: 96px; height: 96px; border-radius: 24px;
  padding: 3px;
  border: 4px solid var(--bg-card);
  box-shadow: 0 8px 28px rgba(0,0,0,0.45);
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.ava-ring:hover { transform: scale(1.05); box-shadow: 0 14px 36px rgba(0,0,0,0.6); }
.ava-ring.role-admin   { background: linear-gradient(135deg, #fbbf24, #d97706); }
.ava-ring.role-blogger { background: linear-gradient(135deg, #D85A30, #f97316); }
.ava-ring.role-user    { background: linear-gradient(135deg, #3b82f6, #6366f1); }

.ava-inner {
  width: 100%; height: 100%; border-radius: 19px;
  background: linear-gradient(135deg, #1a2a1a, #0f1e2a);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
  font-size: 30px; font-weight: 900; color: #fff;
  position: relative;
}
.ava-inner img { width: 100%; height: 100%; object-fit: cover; }

.ava-hover-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.52);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: inherit;
}
.ava-ring:hover .ava-hover-overlay,
.ava-ring.ava-uploading .ava-hover-overlay { opacity: 1; }

.ava-cam-icon { width: 22px; height: 22px; color: #fff; }
.ava-overlay-text {
  font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.9);
  letter-spacing: 0.04em; text-transform: uppercase;
}
.spin-white {
  display: inline-block;
  width: 22px; height: 22px;
  border: 2.5px solid rgba(255,255,255,0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: rot .7s linear infinite;
}

.role-pill {
  padding: 5px 13px; border-radius: 20px;
  font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  margin-bottom: 6px;
}
.role-pill.role-admin   { background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }
.role-pill.role-blogger { background: rgba(216,90,48,0.15);  color: #E8713E; border: 1px solid rgba(216,90,48,0.3); }
.role-pill.role-user    { background: rgba(59,130,246,0.12); color: #60a5fa; border: 1px solid rgba(59,130,246,0.25); }

/* Name */
.hero-name { font-size: 23px; font-weight: 900; color: var(--tx-1); margin: 0 0 6px; }
.hero-sub-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
.meta-chip {
  padding: 4px 11px; border-radius: 8px;
  background: var(--bg-input); border: 1px solid var(--bd);
  font-size: 12px; font-weight: 600; color: var(--tx-5);
}

/* Stats */
.stats-bar {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; margin-bottom: 20px;
}
.stat-box {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 16px 8px;
  background: var(--bg-input); border: 1px solid var(--bd);
  border-radius: 16px;
  transition: all 0.2s;
  cursor: default;
}
.stat-box:hover {
  border-color: rgba(216,90,48,0.4);
  background: rgba(216,90,48,0.04);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(216,90,48,0.1);
}
.stat-num { font-size: 24px; font-weight: 900; color: var(--tx-1); line-height: 1; }
.stat-lbl { font-size: 9px; font-weight: 800; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.07em; margin-top: 2px; }

/* Actions */
.hero-actions { display: flex; gap: 10px; }
.btn-action {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 16px; border-radius: 14px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
}
.btn-action svg { width: 16px; height: 16px; }
.btn-primary {
  background: var(--bg-input); border: 1px solid var(--bd-md); color: var(--tx-3);
}
.btn-primary:hover { background: var(--bd-md); color: var(--tx-1); }
.btn-danger {
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #f87171;
  flex: 0 0 auto; padding: 11px 18px;
}
.btn-danger:hover { background: rgba(239,68,68,0.15); }

/* ── INFO CARD ── */
.info-card {
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 1px 6px rgba(0,0,0,0.05);
}
.info-row {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 20px; border-bottom: 1px solid var(--bd);
}
.info-row:last-child { border-bottom: none; }
.info-icon {
  width: 38px; height: 38px; border-radius: 11px;
  background: var(--bg-input); display: flex; align-items: center; justify-content: center;
  font-size: 18px; flex-shrink: 0;
}
.info-lbl { font-size: 10px; font-weight: 800; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.info-val { font-size: 14px; font-weight: 600; color: var(--tx-2); }

.role-badge { padding: 3px 10px; border-radius: 8px; font-size: 12px; font-weight: 800; }
.role-badge.role-admin   { background: rgba(245,158,11,0.15); color: #f59e0b; }
.role-badge.role-blogger { background: rgba(216,90,48,0.15);  color: #E8713E; }
.role-badge.role-user    { background: rgba(59,130,246,0.12); color: #60a5fa; }

/* ── BLOGGER CTA ── */
.blogger-cta {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px; gap: 14px;
  background: linear-gradient(135deg, rgba(216,90,48,0.1), rgba(232,113,62,0.05));
  border: 1px solid rgba(216,90,48,0.25); border-radius: 20px;
  cursor: pointer; transition: all 0.2s;
}
.blogger-cta:hover { background: linear-gradient(135deg,rgba(216,90,48,0.18),rgba(232,113,62,0.1)); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(216,90,48,0.15); }
.bcta-left  { display: flex; align-items: center; gap: 14px; }
.bcta-emoji { font-size: 36px; }
.bcta-title { font-size: 15px; font-weight: 900; color: #E8713E; }
.bcta-sub   { font-size: 12px; color: var(--tx-5); margin-top: 3px; }
.bcta-arrow { font-size: 24px; color: #E8713E; font-weight: 700; }

/* ── BLOGGER PENDING ── */
.blogger-pending {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(251,191,36,0.08), rgba(245,158,11,0.04));
  border: 1px solid rgba(251,191,36,0.25); border-radius: 20px;
}
.bp-icon  { font-size: 28px; flex-shrink: 0; }
.bp-title { font-size: 14px; font-weight: 800; color: #fbbf24; }
.bp-sub   { font-size: 12px; color: var(--tx-5); margin-top: 2px; }

/* ── APPLY NOTE ── */
.apply-note {
  margin: 0 24px 4px;
  padding: 12px 14px;
  background: var(--bg-input);
  border-radius: 12px;
  font-size: 13px;
  color: var(--tx-3);
  line-height: 1.5;
}

/* ── BLOGGER ACTIVE ── */
.blogger-active {
  display: flex; align-items: center; gap: 14px;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(34,197,94,0.08), rgba(22,163,74,0.04));
  border: 1px solid rgba(34,197,94,0.2); border-radius: 20px;
}
.ba-icon  { font-size: 28px; flex-shrink: 0; }
.ba-title { font-size: 14px; font-weight: 800; color: #4ade80; }
.ba-sub   { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.ba-leave-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1px solid rgba(239,68,68,0.25);
  background: rgba(239,68,68,0.07);
  color: #f87171;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.ba-leave-btn svg { width: 13px; height: 13px; }
.ba-leave-btn:hover { background: rgba(239,68,68,0.15); }

/* Leave modal */
.modal-box-sm { max-width: 380px; }
.mh-icon-warn { background: rgba(245,158,11,0.12) !important; }
.leave-info {
  padding: 0 24px 4px;
  font-size: 13px;
  color: var(--tx-4);
  line-height: 1.6;
}
.leave-info ul { margin: 8px 0 0 16px; display: flex; flex-direction: column; gap: 4px; }
.btn-leave {
  flex: 1;
  padding: 11px 16px;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
  border-radius: 12px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: background 0.2s;
}
.btn-leave:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
.btn-leave:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── SECTION ── */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 17px; font-weight: 900; color: var(--tx-1); }

.section-actions { display: flex; align-items: center; gap: 8px; }

.btn-import {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.25); border-radius: 10px;
  color: #4ade80; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.btn-import svg { width: 14px; height: 14px; }
.btn-import:hover { background: rgba(34,197,94,0.18); transform: translateY(-1px); }

.btn-add {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: rgba(216,90,48,0.12); border: 1px solid rgba(216,90,48,0.25); border-radius: 10px;
  color: #E8713E; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}

/* ── Import Modal ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; padding: 20px;
}
.import-modal {
  width: 100%; max-width: 560px;
  background: var(--bg-surface); border: 1px solid var(--bd-md);
  border-radius: 20px; box-shadow: 0 24px 64px rgba(0,0,0,0.6); overflow: hidden;
}
.im-head {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px; border-bottom: 1px solid var(--bd);
}
.im-icon  { font-size: 28px; flex-shrink: 0; }
.im-title { font-size: 16px; font-weight: 900; color: var(--tx-1); }
.im-sub   { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.im-close {
  margin-left: auto; flex-shrink: 0; width: 32px; height: 32px; border-radius: 8px;
  background: var(--bg-input); border: none; color: var(--tx-4); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background 0.2s;
}
.im-close:hover { background: var(--bg-input-f); color: var(--tx-2); }
.im-close svg { width: 16px; height: 16px; }

.im-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }

.im-template-btn {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 10px; width: fit-content;
  background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.3);
  color: #818cf8; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.im-template-btn:hover { background: rgba(99,102,241,0.2); }

.im-dropzone {
  border: 2px dashed var(--bd-md); border-radius: 14px; min-height: 110px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: border-color 0.2s, background 0.2s;
  background: var(--bg-input); padding: 20px;
}
.im-dropzone:hover, .im-dz-active { border-color: rgba(216,90,48,0.5); background: rgba(216,90,48,0.04); }
.im-dz-hint { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; pointer-events: none; }
.im-dz-icon { width: 32px; height: 32px; color: var(--tx-5); }
.im-dz-text { font-size: 14px; font-weight: 700; color: var(--tx-3); }
.im-dz-sub  { font-size: 12px; color: var(--tx-6); }
.im-dz-chosen { display: flex; align-items: center; gap: 10px; width: 100%; }
.im-dz-fname  { flex: 1; font-size: 14px; font-weight: 700; color: var(--tx-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.im-dz-clear  { width: 24px; height: 24px; border-radius: 6px; border: none; background: var(--bd-lg); color: var(--tx-4); font-size: 11px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }

.im-result { }
.im-result-summary { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 10px; font-size: 13px; font-weight: 700; }
.irs-total { color: var(--tx-4); } .irs-ok { color: #4ade80; } .irs-skip { color: #fbbf24; } .irs-err { color: #f87171; }
.im-result-table { border: 1px solid var(--bd); border-radius: 12px; overflow: hidden; }
.irt-head { display: grid; grid-template-columns: 50px 1fr 60px 1fr; padding: 8px 12px; background: var(--bg-input); font-size: 10px; font-weight: 800; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.05em; gap: 8px; }
.irt-row  { display: grid; grid-template-columns: 50px 1fr 60px 1fr; padding: 9px 12px; border-top: 1px solid var(--bd); font-size: 12px; gap: 8px; align-items: center; }
.irt-ok   { background: rgba(34,197,94,0.03); }
.irt-skip { background: rgba(251,191,36,0.04); }
.irt-fail { background: rgba(239,68,68,0.04); }
.irt-num   { font-weight: 700; color: var(--tx-5); }
.irt-title { font-weight: 600; color: var(--tx-2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.irt-status { text-align: center; }
.irt-error  { font-size: 11px; color: #f87171; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.im-footer { display: flex; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--bd); }
.im-cancel {
  flex: 1; height: 42px; border-radius: 11px;
  background: var(--bg-input); border: 1px solid var(--bd-md);
  color: var(--tx-4); font-size: 14px; font-weight: 700; cursor: pointer; transition: background 0.2s;
}
.im-cancel:hover { background: var(--bg-input-f); }
.im-save {
  flex: 2; height: 42px; border-radius: 11px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none; color: white; font-size: 14px; font-weight: 800;
  cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
  box-shadow: 0 4px 14px rgba(216,90,48,0.35); transition: opacity 0.2s, transform 0.2s;
}
.im-save:hover:not(:disabled) { transform: translateY(-1px); }
.im-save:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.2s ease; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.modal-fade-enter-from .import-modal, .modal-fade-leave-to .import-modal { transform: scale(0.95) translateY(10px); }
.btn-add svg { width: 14px; height: 14px; }
.btn-add:hover { background: rgba(216,90,48,0.2); transform: translateY(-1px); }

/* Recipe grid */
.recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 640px) { .recipe-grid { grid-template-columns: repeat(2, 1fr); } }

.card-wrap    { position: relative; }
.card-overlay {
  position: absolute; top: 8px; left: 8px;
  display: flex; gap: 5px;
  opacity: 0; transition: opacity 0.2s; z-index: 2;
}
.card-wrap:hover .card-overlay { opacity: 1; }
.ov-btn {
  width: 30px; height: 30px; border-radius: 8px; border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px); transition: all 0.15s;
}
.ov-btn svg { width: 14px; height: 14px; }
.ov-edit { background: rgba(216,90,48,0.85); color: #fff; }
.ov-edit:hover { background: rgba(216,90,48,1); }
.ov-del  { background: rgba(239,68,68,0.85); color: #fff; }
.ov-del:hover  { background: rgba(239,68,68,1); }
.ov-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Empty state */
.empty-box {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 56px 24px;
  background: var(--bg-card); border: 1px solid var(--bd); border-radius: 20px;
  text-align: center;
}
.empty-emoji { font-size: 44px; }
.empty-title { font-size: 15px; font-weight: 800; color: var(--tx-4); }
.empty-sub   { font-size: 12px; color: var(--tx-6); }
.btn-empty {
  margin-top: 4px; padding: 10px 20px;
  background: rgba(216,90,48,0.12); border: 1px solid rgba(216,90,48,0.25); border-radius: 12px;
  color: #E8713E; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.btn-empty:hover { background: rgba(216,90,48,0.2); transform: translateY(-1px); }

/* Upgrade box */
.upgrade-box {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 40px 24px;
  background: var(--bg-card); border: 1px dashed rgba(216,90,48,0.3); border-radius: 20px;
  text-align: center;
}
.ub-emoji { font-size: 44px; }
.ub-title { font-size: 15px; font-weight: 800; color: var(--tx-2); }
.ub-sub   { font-size: 12px; color: var(--tx-5); }
.btn-upgrade {
  margin-top: 6px; padding: 10px 22px;
  background: linear-gradient(135deg, #D85A30, #E8713E); border: none; border-radius: 12px;
  color: #fff; font-size: 13px; font-weight: 800; cursor: pointer;
  box-shadow: 0 4px 14px rgba(216,90,48,0.3); transition: all 0.2s;
}
.btn-upgrade:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216,90,48,0.4); }

/* ── MODALS ── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(6px);
  z-index: 200; display: flex; align-items: center; justify-content: center; padding: 20px;
}
.modal-box {
  background: var(--bg-surface); border: 1px solid var(--bd-md);
  border-radius: 24px; width: 100%; max-width: 440px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.5); overflow: hidden;
}
.modal-head {
  display: flex; align-items: center; gap: 12px;
  padding: 20px 24px 0;
}
.mh-icon  { font-size: 28px; flex-shrink: 0; }
.mh-title { font-size: 17px; font-weight: 900; color: var(--tx-1); }
.mh-sub   { font-size: 12px; color: var(--tx-5); margin-top: 2px; }
.modal-x  {
  margin-left: auto; width: 32px; height: 32px;
  border: none; background: var(--bg-input); border-radius: 8px;
  color: var(--tx-4); cursor: pointer; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.2s;
  flex-shrink: 0;
}
.modal-x:hover { background: var(--bd-md); color: var(--tx-1); }

.modal-body { padding: 16px 24px; display: flex; flex-direction: column; gap: 14px; }

.modal-foot {
  display: flex; gap: 10px; padding: 0 24px 24px;
}
.modal-foot > * { flex: 1; }

/* Blogger perks */
.blogger-perks { display: flex; flex-direction: column; gap: 6px; padding: 16px 24px 0; }
.perk {
  padding: 9px 12px;
  background: var(--bg-input); border-radius: 10px;
  font-size: 13px; font-weight: 600; color: var(--tx-2);
}

/* Terms */
.terms-scroll {
  margin: 12px 24px 0;
  max-height: 160px; overflow-y: auto;
  padding: 14px 16px;
  background: var(--bg-input); border: 1px solid var(--bd-md); border-radius: 12px;
  font-size: 12px; color: var(--tx-4); line-height: 1.7;
}
.terms-title { font-size: 13px; font-weight: 800; color: var(--tx-2); margin-bottom: 8px; }
.terms-list  { padding-left: 18px; display: flex; flex-direction: column; gap: 6px; margin: 0; }
.terms-hint  { text-align: center; color: var(--tx-6); font-size: 11px; margin-top: 10px; animation: pulse 1.5s ease-in-out infinite; }

/* Avatar upload */
.ava-upload {
  position: relative; width: 80px; height: 80px; margin: 0 auto;
  border-radius: 20px; overflow: hidden; cursor: pointer;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: 3px solid var(--bd-md);
}
.au-img    { width: 100%; height: 100%; object-fit: cover; }
.au-letter {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 900; color: #fff;
}
.au-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.ava-upload:hover .au-overlay,
.ava-upload.loading .au-overlay { opacity: 1; }
.au-hint { text-align: center; font-size: 11px; color: var(--tx-5); margin-top: 6px; }

/* Form inputs */
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-lbl   { font-size: 11px; font-weight: 800; color: var(--tx-4); text-transform: uppercase; letter-spacing: 0.07em; }
.form-inp   {
  padding: 10px 14px; background: var(--bg-input);
  border: 1px solid var(--bd-md); border-radius: 12px;
  color: var(--tx-2); font-size: 14px; outline: none; transition: border-color 0.2s;
  width: 100%; box-sizing: border-box;
}
.form-inp:focus { border-color: rgba(216,90,48,0.5); }

/* Password section */
.pw-section { border: 1px solid var(--bd-md); border-radius: 12px; overflow: hidden; }
.pw-toggle  {
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  padding: 11px 14px; background: var(--bg-input); border: none;
  color: var(--tx-3); font-size: 13px; font-weight: 700; cursor: pointer;
  transition: background 0.2s;
}
.pw-toggle:hover { background: var(--bd-md); color: var(--tx-1); }
.pw-fields  { display: flex; flex-direction: column; gap: 10px; padding: 14px; border-top: 1px solid var(--bd); }
.btn-pw-save {
  align-self: flex-start; display: flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  background: rgba(59,130,246,0.12); border: 1px solid rgba(59,130,246,0.25); border-radius: 10px;
  color: #60a5fa; font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
.btn-pw-save:hover { background: rgba(59,130,246,0.2); }
.btn-pw-save:disabled { opacity: 0.5; cursor: not-allowed; }

/* Buttons */
.btn-ghost {
  display: flex; align-items: center; justify-content: center;
  padding: 11px; background: var(--bg-input); border: 1px solid var(--bd-md);
  border-radius: 12px; color: var(--tx-3); font-size: 13px; font-weight: 700;
  cursor: pointer; transition: background 0.2s;
}
.btn-ghost:hover { background: var(--bd-md); }
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-save, .btn-confirm {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 11px;
  background: linear-gradient(135deg, #D85A30, #E8713E); border: none;
  border-radius: 12px; color: #fff; font-size: 13px; font-weight: 800;
  cursor: pointer; box-shadow: 0 4px 12px rgba(216,90,48,0.3);
  transition: all 0.2s;
}
.btn-save:hover:not(:disabled),
.btn-confirm:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216,90,48,0.4); }
.btn-save:disabled,
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

/* Messages */
.msg-error {
  padding: 10px 14px; border-radius: 10px; margin: 0 24px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: #f87171; font-size: 12px; font-weight: 700;
}
.msg-ok {
  padding: 10px 14px; border-radius: 10px; margin: 0 24px;
  background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2);
  color: #4ade80; font-size: 13px; font-weight: 700; text-align: center;
}

/* Spinner */
.spin {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: rot 0.7s linear infinite;
}
@keyframes rot { to { transform: rotate(360deg); } }

/* ── Avatar Lightbox ── */
.lb-overlay {
  position: fixed; inset: 0; z-index: 1100;
  background: rgba(0,0,0,0.78);
  backdrop-filter: blur(12px);
  display: flex; align-items: center; justify-content: center;
}
.lb-box {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 32px 28px 28px;
  position: relative;
}
.lb-close {
  position: absolute; top: 0; right: 0;
  width: 36px; height: 36px; border-radius: 50%;
  background: rgba(255,255,255,0.1);
  border: none; cursor: pointer; color: #fff;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.15s;
}
.lb-close:hover { background: rgba(255,255,255,0.2); }
.lb-close svg { width: 16px; height: 16px; }

.lb-avatar {
  width: 200px; height: 200px; border-radius: 40px;
  padding: 4px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  overflow: hidden;
}
.lb-avatar.role-admin   { background: linear-gradient(135deg, #fbbf24, #d97706); }
.lb-avatar.role-blogger { background: linear-gradient(135deg, #D85A30, #f97316); }
.lb-avatar.role-user    { background: linear-gradient(135deg, #3b82f6, #6366f1); }
.lb-avatar img {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: 36px;
}
.lb-initials {
  width: 100%; height: 100%; border-radius: 36px;
  background: linear-gradient(135deg, #1a2a1a, #0f1e2a);
  display: flex; align-items: center; justify-content: center;
  font-size: 64px; font-weight: 900; color: #fff;
}
.lb-name {
  font-size: 17px; font-weight: 800; color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,0.5);
}
.lb-change-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 10px 22px; border-radius: 24px;
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.2);
  color: #fff; font-size: 13px; font-weight: 700;
  cursor: pointer; transition: background 0.15s;
}
.lb-change-btn:hover:not(:disabled) { background: rgba(255,255,255,0.25); }
.lb-change-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Lightbox transition */
.lb-fade-enter-active { transition: all 0.22s ease; }
.lb-fade-leave-active { transition: all 0.18s ease; }
.lb-fade-enter-from, .lb-fade-leave-to { opacity: 0; }
.lb-fade-enter-from .lb-box, .lb-fade-leave-to .lb-box { transform: scale(0.92); }

/* Modal transition */
.mfade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.mfade-leave-active { transition: all 0.15s ease; }
.mfade-enter-from  { opacity: 0; transform: scale(0.95) translateY(10px); }
.mfade-leave-to    { opacity: 0; transform: scale(0.97); }
</style>
