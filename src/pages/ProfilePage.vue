<script setup>
import { ref, onMounted }  from 'vue'
import { useAuthStore }    from '@/stores/authStore'
import { useLangStore }    from '@/stores/langStore'
import { recipesApi }      from '@/api/recipes'
import { uploadApi }       from '@/api/upload'
import { mealPlansApi }    from '@/api/mealPlans'
import { authApi }         from '@/api/auth'
import RecipeCard          from '@/components/recipe/RecipeCard.vue'
import RecipeFormModal     from '@/components/recipe/RecipeFormModal.vue'

const auth          = useAuthStore()
const lang          = useLangStore()
const recipes       = ref([])
const mealPlanCount = ref(0)
const loading       = ref(true)

// ── Profile edit modal ────────────────────────────────────────────
const showEdit       = ref(false)
const editForm       = ref({ fullName: '', avatarUrl: '' })
const saveError      = ref('')
const saveSuccess    = ref(false)
const saving         = ref(false)
const avatarPreview   = ref('')       // yangi tanlangan rasm preview URL
const avatarUploading = ref(false)   // rasm yuklanmoqda
const avatarInput     = ref(null)    // hidden file input

// ── Password change ───────────────────────────────────────────────
const pwForm      = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwError     = ref('')
const pwSuccess   = ref(false)
const pwSaving    = ref(false)
const showPwForm  = ref(false)

// ── Recipe form modal ─────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)
const deletingId      = ref(null)

onMounted(async () => {
  try {
    await auth.fetchUser()
    await Promise.all([loadMyRecipes(), loadMealPlanCount()])
  } finally {
    loading.value = false
  }
})

async function loadMyRecipes() {
  const r = await recipesApi.getMy({ page: 0, size: 20 })
  recipes.value = (r.data?.data ?? r.data)?.content ?? []
}

async function loadMealPlanCount() {
  try {
    const res = await mealPlansApi.getMy({ page: 0, size: 1 })
    const data = res.data?.data ?? res.data
    mealPlanCount.value = data?.totalElements ?? 0
  } catch { mealPlanCount.value = 0 }
}

function openEdit() {
  editForm.value    = {
    fullName:  auth.user?.fullName  ?? '',
    avatarUrl: auth.avatarUrl       ?? '',
  }
  avatarPreview.value  = auth.avatarUrl ?? ''
  saveError.value      = ''
  saveSuccess.value    = false
  showPwForm.value     = false
  pwForm.value         = { currentPassword: '', newPassword: '', confirmPassword: '' }
  pwError.value        = ''
  pwSuccess.value      = false
  showEdit.value       = true
}

async function onAvatarFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return

  // Local preview
  avatarPreview.value = URL.createObjectURL(file)
  avatarUploading.value = true
  saveError.value = ''
  try {
    const res = await uploadApi.image(file)
    const url = res.data?.data?.url ?? res.data?.url
    editForm.value.avatarUrl = url
  } catch {
    saveError.value = 'Rasm yuklanmadi. Qaytadan urinib ko\'ring.'
    avatarPreview.value = editForm.value.avatarUrl
  } finally {
    avatarUploading.value = false
  }
}

async function saveProfile() {
  saving.value      = true
  saveError.value   = ''
  saveSuccess.value = false
  const err = await auth.updateProfile({
    fullName:  editForm.value.fullName  || undefined,
    avatarUrl: editForm.value.avatarUrl || undefined,
  })
  saving.value = false
  if (err) {
    saveError.value = err
  } else {
    saveSuccess.value = true
    setTimeout(() => { showEdit.value = false; saveSuccess.value = false }, 1000)
  }
}

async function savePassword() {
  pwError.value   = ''
  pwSuccess.value = false
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) {
    pwError.value = 'Yangi parollar mos kelmadi'
    return
  }
  if (pwForm.value.newPassword.length < 6) {
    pwError.value = 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak'
    return
  }
  pwSaving.value = true
  try {
    await authApi.changePassword({
      currentPassword: pwForm.value.currentPassword,
      newPassword:     pwForm.value.newPassword,
    })
    pwSuccess.value = true
    pwForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
    setTimeout(() => { pwSuccess.value = false }, 2000)
  } catch (e) {
    pwError.value = e?.response?.data?.message || 'Parol o\'zgartirishda xatolik'
  } finally {
    pwSaving.value = false
  }
}

function openCreateRecipe() {
  editingRecipe.value   = null
  showRecipeModal.value = true
}

function openEditRecipe(recipe) {
  editingRecipe.value   = recipe
  showRecipeModal.value = true
}

function handleRecipeSaved(saved) {
  showRecipeModal.value = false
  if (editingRecipe.value) {
    // update in-place
    const idx = recipes.value.findIndex(r => r.id === saved.id)
    if (idx !== -1) recipes.value[idx] = saved
    else recipes.value.unshift(saved)
  } else {
    recipes.value.unshift(saved)
  }
  editingRecipe.value = null
}

async function deleteRecipe(id) {
  if (!confirm(lang.t('common.confirm_delete'))) return
  deletingId.value = id
  try {
    await recipesApi.delete(id)
    recipes.value = recipes.value.filter(r => r.id !== id)
  } catch {
    alert(lang.t('common.error_delete'))
  } finally {
    deletingId.value = null
  }
}

const stats = [
  { icon: '📝', label: () => lang.t('profile.stat_recipes'), val: () => recipes.value.length },
  { icon: '📅', label: () => lang.t('profile.stat_meal'),    val: () => mealPlanCount.value },
]
</script>

<template>
  <div class="page">

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-wrap">
      <div class="skel-cover" />
      <div class="skel-body">
        <div class="skel-avatar" />
        <div class="skel-name" />
        <div class="skel-sub" />
      </div>
      <div class="recipe-grid skel-grid">
        <div v-for="i in 6" :key="i" class="skel-recipe" />
      </div>
    </div>

    <template v-else-if="auth.user">

      <!-- ── Profile card ── -->
      <div class="profile-card">
        <!-- Cover -->
        <div class="cover">
          <div class="cover-blob" />
        </div>

        <!-- Avatar + info -->
        <div class="profile-body">
          <div class="avatar-wrap">
            <div class="avatar">
              <img v-if="auth.avatarUrl" :src="auth.avatarUrl" alt="avatar" />
              <span v-else>{{ auth.initials }}</span>
            </div>
            <div class="avatar-badge" :class="auth.isAdmin ? 'badge-admin' : 'badge-user'">
              {{ auth.isAdmin ? '👑' : '🧑' }}
            </div>
          </div>

          <div class="profile-info">
            <h1 class="profile-name">{{ auth.displayName }}</h1>
            <p class="profile-role">{{ auth.isAdmin ? lang.t('profile.admin') : lang.t('profile.user') }}</p>
          </div>

          <!-- Stats -->
          <div class="stats-row">
            <div v-for="s in stats" :key="s.label" class="stat-item">
              <div class="stat-icon">{{ s.icon }}</div>
              <div class="stat-val">{{ s.val() }}</div>
              <div class="stat-lbl">{{ s.label() }}</div>
            </div>
          </div>

          <!-- Actions -->
          <div class="profile-actions">
            <button @click="openEdit" class="btn-edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
              {{ lang.t('profile.edit') }}
            </button>
            <button @click="auth.logout()" class="btn-logout">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              {{ lang.t('profile.logout') }}
            </button>
          </div>
        </div>
      </div>

      <!-- ── Info rows ── -->
      <div class="info-card">
        <div class="info-row">
          <div class="ir-icon">👤</div>
          <div class="ir-body">
            <div class="ir-label">{{ lang.t('profile.full_name') }}</div>
            <div class="ir-val">{{ auth.user.fullName || '—' }}</div>
          </div>
        </div>
        <div class="info-row">
          <div class="ir-icon">🔑</div>
          <div class="ir-body">
            <div class="ir-label">{{ lang.t('profile.role') }}</div>
            <div class="ir-val">
              <span class="role-badge" :class="auth.isAdmin ? 'badge-admin' : 'badge-user'">
                {{ auth.role }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── My recipes ── -->
      <div class="section">
        <div class="section-header">
          <h2 class="section-title">{{ lang.t('profile.my_recipes') }}</h2>
          <button @click="openCreateRecipe" class="btn-add-recipe">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14"/>
            </svg>
            {{ lang.t('common.add') }}
          </button>
        </div>

        <div v-if="recipes.length" class="recipe-grid">
          <div v-for="r in recipes" :key="r.id" class="card-wrap">
            <RecipeCard :recipe="r" />
            <div class="card-actions">
              <button @click.prevent="openEditRecipe(r)" class="ca-btn ca-edit" title="Tahrirlash">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                </svg>
              </button>
              <button @click.prevent="deleteRecipe(r.id)" :disabled="deletingId === r.id"
                class="ca-btn ca-delete" title="O'chirish">
                <span v-if="deletingId === r.id" class="ca-spin" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="empty-recipes">
          <div class="er-icon">📝</div>
          <p class="er-title">{{ lang.t('profile.no_recipes') }}</p>
          <p class="er-sub">{{ lang.t('profile.no_recipes_sub') }}</p>
          <button @click="openCreateRecipe" class="btn-create-recipe">
            {{ lang.t('profile.add_recipe') }}
          </button>
        </div>
      </div>

    </template>

    <!-- Recipe Form Modal -->
    <RecipeFormModal
      :recipe="editingRecipe"
      :visible="showRecipeModal"
      @close="showRecipeModal = false"
      @saved="handleRecipeSaved"
    />

    <!-- Profile Edit Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
          <div class="modal-box">
            <div class="modal-header">
              <h2 class="modal-title">{{ lang.t('profile.edit') }}</h2>
              <button class="modal-close" @click="showEdit = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">

              <!-- Avatar upload -->
              <div class="avatar-upload-wrap">
                <div class="avatar-upload" @click="avatarInput?.click()" :class="{ 'au-loading': avatarUploading }">
                  <img v-if="avatarPreview" :src="avatarPreview" class="au-img" alt="avatar" />
                  <span v-else class="au-initials">{{ auth.initials }}</span>
                  <div class="au-overlay">
                    <span v-if="avatarUploading" class="au-spinner" />
                    <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2M16 10l-4-4m0 0L8 10m4-4v12"/>
                    </svg>
                  </div>
                </div>
                <div class="au-hint">
                  <span v-if="avatarUploading">Yuklanmoqda...</span>
                  <span v-else>Rasm o'zgartirish uchun bosing</span>
                  <span class="au-size">JPG, PNG, WEBP · max 5 MB</span>
                </div>
                <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  style="display:none" @change="onAvatarFileChange" />
              </div>

              <!-- Full name -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('profile.full_name') }}</label>
                <input v-model="editForm.fullName" type="text" class="form-input"
                  :placeholder="auth.user?.fullName || 'Ism familiya'" />
              </div>

              <div v-if="saveError" class="modal-error">{{ saveError }}</div>
              <div v-if="saveSuccess" class="modal-success">✅ Muvaffaqiyatli saqlandi!</div>

              <!-- Password change section -->
              <div class="pw-section">
                <button class="pw-toggle" @click="showPwForm = !showPwForm" type="button">
                  🔒 Parolni o'zgartirish
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :style="{ transform: showPwForm ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                <div v-if="showPwForm" class="pw-form">
                  <div class="form-group">
                    <label class="form-label">Joriy parol</label>
                    <input v-model="pwForm.currentPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Yangi parol</label>
                    <input v-model="pwForm.newPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Yangi parolni tasdiqlang</label>
                    <input v-model="pwForm.confirmPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div v-if="pwError" class="modal-error">{{ pwError }}</div>
                  <div v-if="pwSuccess" class="modal-success">✅ Parol muvaffaqiyatli o'zgartirildi!</div>
                  <button @click="savePassword" class="btn-save-pw" :disabled="pwSaving" type="button">
                    <span v-if="pwSaving" class="btn-spinner"></span>
                    <span>{{ pwSaving ? 'Saqlanmoqda...' : 'Parolni saqlash' }}</span>
                  </button>
                </div>
              </div>
            </div>
              <div class="modal-footer">
                <button @click="showEdit = false" class="btn-ghost" :disabled="saving">
                  {{ lang.t('common.cancel') }}
                </button>
                <button @click="saveProfile" class="btn-save" :disabled="saving">
                  <span v-if="saving" class="btn-spinner"></span>
                  <span>{{ saving ? lang.t('common.saving') : lang.t('common.save') }}</span>
                </button>
              </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 20px; max-width: 720px; margin: 0 auto; }

/* ── Profile card ── */
.profile-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 24px;
  overflow: hidden;
}

.cover {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, #0a2a16 0%, #0f2d1f 50%, #0d1526 100%);
  overflow: hidden;
}
.cover-blob {
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: rgba(216, 90, 48, 0.2);
  filter: blur(60px);
  top: -80px;
  right: -40px;
}

.profile-body { padding: 0 28px 28px; }

.avatar-wrap {
  position: relative;
  width: 84px;
  margin-top: -42px;
  margin-bottom: 16px;
}
.avatar {
  width: 84px;
  height: 84px;
  border-radius: 20px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: 4px solid #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.4);
}
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.avatar-badge {
  position: absolute;
  bottom: -4px;
  right: -4px;
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 3px solid #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.badge-admin { background: linear-gradient(135deg, #f59e0b, #d97706); }
.badge-user  { background: linear-gradient(135deg, #3b82f6, #6366f1); }

.profile-name { font-size: 22px; font-weight: 900; color: #f1f5f9; }
.profile-role { font-size: 13px; color: #E8713E; font-weight: 700; margin-top: 3px; }

/* Stats */
.stats-row {
  display: flex;
  gap: 0;
  margin-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-right: 1px solid rgba(255,255,255,0.06);
}
.stat-item:last-child { border-right: none; }
.stat-icon { font-size: 20px; }
.stat-val  { font-size: 18px; font-weight: 900; color: #f1f5f9; }
.stat-lbl  { font-size: 10px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; }

/* Actions */
.profile-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-edit {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-edit:hover { background: rgba(255,255,255,0.09); color: #e2e8f0; }
.btn-edit svg { width: 16px; height: 16px; }

.btn-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px 18px;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.18);
  border-radius: 14px;
  color: #f87171;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-logout:hover { background: rgba(239,68,68,0.16); }
.btn-logout svg { width: 16px; height: 16px; }

/* ── Info card ── */
.info-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  overflow: hidden;
}
.info-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.info-row:last-child { border-bottom: none; }
.ir-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255,255,255,0.05);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.ir-body   { flex: 1; }
.ir-label  { font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.ir-val    { font-size: 14px; font-weight: 700; color: #e2e8f0; }

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}
.role-badge.badge-admin { background: rgba(245,158,11,0.15); color: #f59e0b; }
.role-badge.badge-user  { background: rgba(59,130,246,0.15);  color: #60a5fa; }

/* ── Recipes section ── */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title  { font-size: 17px; font-weight: 900; color: #e2e8f0; }
.section-link   { font-size: 13px; font-weight: 700; color: #E8713E; text-decoration: none; }
.section-link:hover { color: #F0997B; }

.recipe-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
@media (max-width: 640px) { .recipe-grid { grid-template-columns: repeat(2, 1fr); } }

/* Add recipe button in header */
.btn-add-recipe {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.25);
  border-radius: 10px;
  color: #E8713E;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-add-recipe:hover { background: rgba(216,90,48,0.2); transform: translateY(-1px); }
.btn-add-recipe svg { width: 14px; height: 14px; }

/* Card wrapper with action overlay */
.card-wrap {
  position: relative;
}
.card-actions {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 5px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 2;
}
.card-wrap:hover .card-actions { opacity: 1; }

.ca-btn {
  width: 30px; height: 30px;
  border-radius: 8px;
  border: none;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: transform 0.2s, background 0.2s;
}
.ca-btn svg { width: 14px; height: 14px; }
.ca-btn:hover { transform: scale(1.1); }
.ca-edit  { background: rgba(216,90,48,0.85); color: #fff; }
.ca-edit:hover { background: rgba(216,90,48,1); }
.ca-delete { background: rgba(239,68,68,0.85); color: #fff; }
.ca-delete:hover { background: rgba(239,68,68,1); }
.ca-delete:disabled { opacity: 0.5; cursor: not-allowed; }
.ca-spin {
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}
@keyframes spin { to { transform: rotate(360deg); } }

.empty-recipes {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 56px 24px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 20px;
}
.er-icon  { font-size: 44px; margin-bottom: 4px; }
.er-title { font-size: 15px; font-weight: 800; color: #64748b; }
.er-sub   { font-size: 12px; color: #334155; }
.btn-create-recipe {
  margin-top: 6px;
  padding: 10px 20px;
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.25);
  border-radius: 12px;
  color: #E8713E;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-create-recipe:hover { background: rgba(216,90,48,0.2); transform: translateY(-1px); }

/* ── Skeleton ── */
.skeleton-wrap { display: flex; flex-direction: column; gap: 16px; }
.skel-cover   { height: 120px; border-radius: 24px 24px 0 0; background: rgba(255,255,255,0.06); animation: pulse 1.5s ease-in-out infinite; }
.skel-body    { padding: 0 28px; display: flex; flex-direction: column; gap: 8px; }
.skel-avatar  { width: 84px; height: 84px; border-radius: 20px; background: rgba(255,255,255,0.06); margin-top: -42px; animation: pulse 1.5s ease-in-out infinite; }
.skel-name    { height: 24px; width: 200px; border-radius: 8px; background: rgba(255,255,255,0.05); animation: pulse 1.5s ease-in-out infinite; }
.skel-sub     { height: 16px; width: 120px; border-radius: 6px; background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; }
.skel-grid    { }
.skel-recipe  { height: 200px; border-radius: 20px; background: rgba(255,255,255,0.04); animation: pulse 1.5s ease-in-out infinite; }

/* ── Avatar Upload ── */
.avatar-upload-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
}
.avatar-upload {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  cursor: pointer;
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid rgba(255,255,255,0.1);
  transition: border-color 0.2s;
}
.avatar-upload:hover { border-color: rgba(216,90,48,0.5); }
.au-img      { width: 100%; height: 100%; object-fit: cover; display: block; }
.au-initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  color: #fff;
}
.au-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
}
.au-overlay svg { width: 22px; height: 22px; color: #fff; }
.avatar-upload:hover .au-overlay,
.au-loading .au-overlay { opacity: 1; }

.au-spinner {
  width: 20px; height: 20px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
}

.au-hint {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
}
.au-size { font-size: 11px; color: #475569; font-weight: 500; }

/* ── Modal ── */
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
  max-width: 420px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title { font-size: 17px; font-weight: 900; color: #f1f5f9; }
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
  gap: 14px;
}
.modal-footer {
  display: flex;
  gap: 10px;
  padding: 0 24px 24px;
}
.modal-footer > * { flex: 1; justify-content: center; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
.form-input {
  width: 100%;
  padding: 11px 14px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-input:focus { border-color: rgba(216,90,48,0.5); }

/* Password section */
.pw-section {
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px;
  overflow: hidden;
}
.pw-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 14px;
  background: rgba(255,255,255,0.03);
  border: none;
  color: #94a3b8;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-align: left;
}
.pw-toggle:hover { background: rgba(255,255,255,0.06); color: #e2e8f0; }
.pw-toggle svg { width: 16px; height: 16px; flex-shrink: 0; }
.pw-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.btn-save-pw {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 16px;
  background: rgba(59,130,246,0.15);
  border: 1px solid rgba(59,130,246,0.3);
  border-radius: 12px;
  color: #60a5fa;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
  align-self: flex-start;
}
.btn-save-pw:hover:not(:disabled) { background: rgba(59,130,246,0.25); }
.btn-save-pw:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-error {
  font-size: 12px;
  font-weight: 700;
  color: #f87171;
  background: rgba(239,68,68,0.08);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 10px;
  padding: 10px 12px;
}

.modal-success {
  font-size: 13px;
  font-weight: 700;
  color: #4ade80;
  background: rgba(22,163,74,0.08);
  border: 1px solid rgba(22,163,74,0.2);
  border-radius: 10px;
  padding: 10px 12px;
  text-align: center;
}

.btn-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  display: inline-block;
  vertical-align: middle;
  margin-right: 4px;
}

.btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
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

.btn-save {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 18px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(216,90,48,0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-save:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216,90,48,0.4); }

/* Modal transition */
.modal-fade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.modal-fade-leave-active { transition: all 0.15s ease; }
.modal-fade-enter-from  { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-fade-leave-to    { opacity: 0; transform: scale(0.97); }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50%       { opacity: 1; }
}
</style>
