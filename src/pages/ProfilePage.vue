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
import { resolveImageUrl } from '@/utils/imageUrl'

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
    await auth.fetchUser()   // serverdan yangilangan ma'lumotni qayta yuklaymiz
    setTimeout(() => { showEdit.value = false; saveSuccess.value = false }, 1000)
  }
}

async function savePassword() {
  pwError.value   = ''
  pwSuccess.value = false
  if (pwForm.value.newPassword !== pwForm.value.confirmPassword) {
    pwError.value = lang.t('profile.pw_mismatch')
    return
  }
  if (pwForm.value.newPassword.length < 6) {
    pwError.value = lang.t('profile.pw_short')
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

// ── Blogger modal ─────────────────────────────────────────────────
const showBloggerModal  = ref(false)
const termsScrolled     = ref(false)
const bloggerLoading    = ref(false)
const bloggerError      = ref('')
const bloggerSuccess    = ref(false)

function openBloggerModal() {
  termsScrolled.value  = false
  bloggerError.value   = ''
  bloggerSuccess.value = false
  showBloggerModal.value = true
}

function onTermsScroll(e) {
  const el = e.target
  termsScrolled.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
}

async function confirmBecomeBlogger() {
  bloggerLoading.value = true
  bloggerError.value   = ''
  const err = await auth.becomeBlogger()
  bloggerLoading.value = false
  if (err) {
    bloggerError.value = err
  } else {
    bloggerSuccess.value = true
    await auth.fetchUser()
    setTimeout(() => { showBloggerModal.value = false; bloggerSuccess.value = false }, 1800)
  }
}
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
              <img
                v-if="auth.avatarUrl"
                :src="resolveImageUrl(auth.avatarUrl)"
                alt="avatar"
                @error="(e) => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }"
              />
              <span :style="auth.avatarUrl ? 'display:none' : ''">{{ auth.initials }}</span>
            </div>
            <div class="avatar-badge"
              :class="auth.isAdmin ? 'badge-admin' : auth.isBlogger ? 'badge-blogger' : 'badge-user'">
              {{ auth.isAdmin ? '👑' : auth.isBlogger ? '👨‍🍳' : '🧑' }}
            </div>
          </div>

          <div class="profile-info">
            <h1 class="profile-name">{{ auth.displayName }}</h1>
            <p class="profile-role">
            {{ auth.isAdmin ? lang.t('profile.admin') : auth.isBlogger ? '👨‍🍳 Blogger' : lang.t('profile.user') }}
          </p>
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
              <span class="role-badge"
                :class="auth.isAdmin ? 'badge-admin' : auth.isBlogger ? 'badge-blogger' : 'badge-user'">
                {{ auth.isAdmin ? '👑 Admin' : auth.isBlogger ? '👨‍🍳 Blogger' : '👤 Foydalanuvchi' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Blogger bo'lish banneri (faqat USER uchun) ── -->
      <div v-if="!auth.isBlogger" class="blogger-banner" @click="openBloggerModal">
        <div class="bb-left">
          <div class="bb-icon">👨‍🍳</div>
          <div class="bb-text">
            <div class="bb-title">Blogger bo'lish</div>
            <div class="bb-sub">Retseptlaringizni hammaga ulashing va o'z auditoriyangizni to'plang</div>
          </div>
        </div>
        <div class="bb-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>

      <!-- ── Blogger badge (faqat BLOGGER uchun) ── -->
      <div v-else-if="auth.role === 'BLOGGER'" class="blogger-active-card">
        <div class="bac-icon">✅</div>
        <div class="bac-text">
          <div class="bac-title">Siz Bloggersi!</div>
          <div class="bac-sub">Endi retseptlaringizni qo'shishingiz va barchaga ko'rsatishingiz mumkin</div>
        </div>
      </div>

      <!-- ── My recipes (faqat BLOGGER va ADMIN) ── -->
      <div v-if="auth.isBlogger" class="section">
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

      <!-- ── USER uchun: Saqlangan retseptlar + Blogger taklifi ── -->
      <div v-else class="section">
        <div class="section-header">
          <h2 class="section-title">💾 Saqlangan retseptlar</h2>
        </div>
        <div class="user-upgrade-hint">
          <div class="uuh-icon">🍳</div>
          <div class="uuh-body">
            <div class="uuh-title">O'z retseptingizni ulashmoqchimisiz?</div>
            <div class="uuh-sub">Blogger bo'ling — retseptlaringizni qo'shing va barchaga ko'rsating</div>
            <button @click="openBloggerModal" class="uuh-btn">
              👨‍🍳 Blogger bo'lish
            </button>
          </div>
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

    <!-- Blogger bo'lish Modal -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showBloggerModal" class="modal-overlay" @click.self="showBloggerModal = false">
          <div class="modal-box blogger-modal">
            <div class="modal-header">
              <div class="blogger-modal-icon">👨‍🍳</div>
              <div>
                <h2 class="modal-title">Blogger bo'lish</h2>
                <p class="blogger-modal-sub">Foydalanish shartlarini o'qib, tasdiqlang</p>
              </div>
              <button class="modal-close" @click="showBloggerModal = false">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <!-- Blogger imkoniyatlari -->
            <div class="blogger-perks">
              <div class="perk-item">
                <span class="perk-icon">📝</span>
                <span>Retsept qo'shish va tahrirlash</span>
              </div>
              <div class="perk-item">
                <span class="perk-icon">🌍</span>
                <span>Retseptlaringiz barcha foydalanuvchilarga ko'rinadi</span>
              </div>
              <div class="perk-item">
                <span class="perk-icon">📊</span>
                <span>Ko'rishlar, baholar va izohlarni kuzatish</span>
              </div>
              <div class="perk-item">
                <span class="perk-icon">🏷️</span>
                <span>Profil sahifangizda "Blogger" belgisi</span>
              </div>
            </div>

            <!-- Shartlar matni -->
            <div class="terms-box" @scroll="onTermsScroll">
              <h4 class="terms-title">Foydalanish shartlari</h4>
              <p>Ushbu platformaga blogger sifatida ro'yxatdan o'tar ekansiz, quyidagi shartlarga rozilik bildirasiz:</p>
              <ol class="terms-list">
                <li>Siz tomonidan yuklangan barcha retseptlar va rasmlar sizning intellektual mulkingiz hisoblanadi va ularni ulashishga huquqingiz bor.</li>
                <li>Boshqalarning mualliflik huquqini buzuvchi kontent yuklab bo'lmaydi.</li>
                <li>Retseptlar haqiqiy, ishonchli va sog'lom bo'lishi kerak — zararli yoki noto'g'ri ma'lumot joylashtirib bo'lmaydi.</li>
                <li>Noo'rin, haqoratli yoki spam xarakteri tashuvchi kontent joylashtirib bo'lmaydi.</li>
                <li>Platforma ma'muriyati qoidabuzarlik holatida hisobingizni blogger statusidan mahrum qilish huquqiga ega.</li>
                <li>Siz platformaning maxfiylik siyosatiga va foydalanish qoidalariga to'liq rozilik bildirasiz.</li>
              </ol>
              <p class="terms-scroll-hint" v-if="!termsScrolled">↓ Davom etish uchun pastga aylantiring</p>
            </div>

            <div v-if="bloggerError" class="modal-error">{{ bloggerError }}</div>
            <div v-if="bloggerSuccess" class="modal-success">🎉 Tabriklaymiz! Siz endi Bloggersiz!</div>

            <div class="modal-footer">
              <button @click="showBloggerModal = false" class="btn-ghost" :disabled="bloggerLoading">
                Bekor qilish
              </button>
              <button
                @click="confirmBecomeBlogger"
                class="btn-blogger-confirm"
                :disabled="!termsScrolled || bloggerLoading"
              >
                <span v-if="bloggerLoading" class="btn-spinner"></span>
                <span>{{ bloggerLoading ? 'Saqlanmoqda...' : 'Qabul qilaman va Blogger bo\'laman' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

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
                  <img v-if="avatarPreview" :src="resolveImageUrl(avatarPreview)" class="au-img" alt="avatar" />
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
                  <span v-else>{{ lang.t('profile.avatar_hint') }}</span>
                  <span class="au-size">JPG, PNG, WEBP · max 5 MB</span>
                </div>
                <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                  style="display:none" @change="onAvatarFileChange" />
              </div>

              <!-- Full name -->
              <div class="form-group">
                <label class="form-label">{{ lang.t('profile.full_name') }}</label>
                <input v-model="editForm.fullName" type="text" class="form-input"
                  :placeholder="auth.user?.fullName || lang.t('profile.name_ph')" />
              </div>

              <div v-if="saveError" class="modal-error">{{ saveError }}</div>
              <div v-if="saveSuccess" class="modal-success">{{ lang.t('profile.saved_ok') }}</div>

              <!-- Password change section -->
              <div class="pw-section">
                <button class="pw-toggle" @click="showPwForm = !showPwForm" type="button">
                  {{ lang.t('profile.pw_change') }}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :style="{ transform: showPwForm ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                  </svg>
                </button>
                <div v-if="showPwForm" class="pw-form">
                  <div class="form-group">
                    <label class="form-label">{{ lang.t('profile.pw_current') }}</label>
                    <input v-model="pwForm.currentPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ lang.t('profile.pw_new') }}</label>
                    <input v-model="pwForm.newPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ lang.t('profile.pw_confirm') }}</label>
                    <input v-model="pwForm.confirmPassword" type="password" class="form-input" placeholder="••••••" />
                  </div>
                  <div v-if="pwError" class="modal-error">{{ pwError }}</div>
                  <div v-if="pwSuccess" class="modal-success">{{ lang.t('profile.pw_saved') }}</div>
                  <button @click="savePassword" class="btn-save-pw" :disabled="pwSaving" type="button">
                    <span v-if="pwSaving" class="btn-spinner"></span>
                    <span>{{ pwSaving ? lang.t('profile.pw_saving') : lang.t('profile.pw_save') }}</span>
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
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0,0,0,0.08);
}

.cover {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, #0a2a16 0%, #0f2d1f 50%, #112032 100%);
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
  border: 4px solid var(--bg-base);
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
  border: 3px solid var(--bg-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}
.badge-admin   { background: linear-gradient(135deg, #f59e0b, #d97706); }
.badge-blogger { background: linear-gradient(135deg, #D85A30, #E8713E); }
.badge-user    { background: linear-gradient(135deg, #3b82f6, #6366f1); }

.profile-name { font-size: 22px; font-weight: 900; color: var(--tx-1); }
.profile-role { font-size: 13px; color: #E8713E; font-weight: 700; margin-top: 3px; }

/* Stats */
.stats-row {
  display: flex;
  gap: 0;
  margin-top: 20px;
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}
.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px 8px;
  border-right: 1px solid var(--bd);
}
.stat-item:last-child { border-right: none; }
.stat-icon { font-size: 20px; }
.stat-val  { font-size: 18px; font-weight: 900; color: var(--tx-1); }
.stat-lbl  { font-size: 10px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.06em; }

/* Actions */
.profile-actions { display: flex; gap: 10px; margin-top: 20px; }
.btn-edit {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 11px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 14px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-edit:hover { background: var(--bd-md); color: var(--tx-1); }
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
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 1px 6px rgba(0,0,0,0.06);
}
.info-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--bd);
}
.info-row:last-child { border-bottom: none; }
.ir-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.ir-body   { flex: 1; }
.ir-label  { font-size: 11px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px; }
.ir-val    { font-size: 14px; font-weight: 700; color: var(--tx-2); }

.role-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
}
.role-badge.badge-admin   { background: rgba(245,158,11,0.15); color: #f59e0b; }
.role-badge.badge-blogger { background: rgba(216,90,48,0.15);  color: #E8713E; }
.role-badge.badge-user    { background: rgba(59,130,246,0.15);  color: #60a5fa; }

/* ── Recipes section ── */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-header { display: flex; align-items: center; justify-content: space-between; }
.section-title  { font-size: 17px; font-weight: 900; color: var(--tx-1); }
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
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
}
.er-icon  { font-size: 44px; margin-bottom: 4px; }
.er-title { font-size: 15px; font-weight: 800; color: var(--tx-4); }
.er-sub   { font-size: 12px; color: var(--tx-6); }
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
.skel-cover   { height: 120px; border-radius: 24px 24px 0 0; background: var(--bd-md); animation: pulse 1.5s ease-in-out infinite; }
.skel-body    { padding: 0 28px; display: flex; flex-direction: column; gap: 8px; }
.skel-avatar  { width: 84px; height: 84px; border-radius: 20px; background: var(--bd-md); margin-top: -42px; animation: pulse 1.5s ease-in-out infinite; }
.skel-name    { height: 24px; width: 200px; border-radius: 8px; background: var(--bd); animation: pulse 1.5s ease-in-out infinite; }
.skel-sub     { height: 16px; width: 120px; border-radius: 6px; background: var(--bg-input); animation: pulse 1.5s ease-in-out infinite; }
.skel-grid    { }
.skel-recipe  { height: 200px; border-radius: 20px; background: var(--bg-input); animation: pulse 1.5s ease-in-out infinite; }

/* ── Avatar Upload ── */
.avatar-upload-wrap {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
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
  color: var(--tx-3);
}
.au-size { font-size: 11px; color: var(--tx-5); font-weight: 500; }

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
  background: var(--bg-surface);
  border: 1px solid var(--bd-md);
  border-radius: 24px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.4);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}
.modal-title { font-size: 17px; font-weight: 900; color: var(--tx-1); }
.modal-close {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: var(--bg-input);
  color: var(--tx-4);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.modal-close:hover { background: var(--bd-md); color: var(--tx-1); }
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
.form-label { font-size: 11px; font-weight: 800; color: var(--tx-4); text-transform: uppercase; letter-spacing: 0.08em; }
.form-input {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 12px;
  color: var(--tx-2);
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.form-input:focus { border-color: rgba(216,90,48,0.5); }

/* Password section */
.pw-section {
  border: 1px solid var(--bd-md);
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
  background: var(--bg-input);
  border: none;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  text-align: left;
}
.pw-toggle:hover { background: var(--bd-md); color: var(--tx-1); }
.pw-toggle svg { width: 16px; height: 16px; flex-shrink: 0; }
.pw-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border-top: 1px solid var(--bd);
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
  background: var(--bg-input);
  border: 1px solid var(--bd-xl);
  border-radius: 12px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-ghost:hover { background: var(--bd); }

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

/* ── USER upgrade hint (retsept section da) ── */
.user-upgrade-hint {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 20px;
  background: var(--bg-card);
  border: 1px dashed rgba(216,90,48,0.3);
  border-radius: 20px;
}
.uuh-icon  { font-size: 40px; flex-shrink: 0; }
.uuh-body  { display: flex; flex-direction: column; gap: 6px; }
.uuh-title { font-size: 14px; font-weight: 800; color: var(--tx-2); }
.uuh-sub   { font-size: 12px; color: var(--tx-5); line-height: 1.4; }
.uuh-btn {
  margin-top: 4px;
  align-self: flex-start;
  padding: 8px 16px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 3px 10px rgba(216,90,48,0.3);
}
.uuh-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(216,90,48,0.4); }

/* ── Blogger banner ── */
.blogger-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(216,90,48,0.12), rgba(232,113,62,0.06));
  border: 1px solid rgba(216,90,48,0.3);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  gap: 14px;
}
.blogger-banner:hover {
  background: linear-gradient(135deg, rgba(216,90,48,0.2), rgba(232,113,62,0.12));
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(216,90,48,0.15);
}
.bb-left { display: flex; align-items: center; gap: 14px; flex: 1; }
.bb-icon { font-size: 36px; flex-shrink: 0; }
.bb-text  { display: flex; flex-direction: column; gap: 3px; }
.bb-title { font-size: 15px; font-weight: 900; color: #E8713E; }
.bb-sub   { font-size: 12px; color: var(--tx-5); line-height: 1.4; }
.bb-arrow svg { width: 20px; height: 20px; color: #E8713E; flex-shrink: 0; }

/* ── Blogger active card ── */
.blogger-active-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(22,163,74,0.05));
  border: 1px solid rgba(34,197,94,0.25);
  border-radius: 20px;
}
.bac-icon  { font-size: 32px; flex-shrink: 0; }
.bac-title { font-size: 15px; font-weight: 900; color: #4ade80; }
.bac-sub   { font-size: 12px; color: var(--tx-5); margin-top: 3px; }

/* ── Blogger Modal ── */
.blogger-modal { max-width: 480px; }
.blogger-modal .modal-header { align-items: flex-start; gap: 12px; }
.blogger-modal-icon { font-size: 32px; flex-shrink: 0; }
.blogger-modal-sub  { font-size: 12px; color: var(--tx-5); margin-top: 2px; }

.blogger-perks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 24px;
  margin-bottom: 4px;
}
.perk-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: var(--bg-input);
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx-2);
}
.perk-icon { font-size: 18px; flex-shrink: 0; }

.terms-box {
  margin: 0 24px;
  max-height: 180px;
  overflow-y: auto;
  padding: 14px 16px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 12px;
  font-size: 12px;
  color: var(--tx-4);
  line-height: 1.6;
  scroll-behavior: smooth;
}
.terms-title { font-size: 13px; font-weight: 800; color: var(--tx-2); margin: 0 0 8px; }
.terms-list  { padding-left: 16px; margin: 8px 0; display: flex; flex-direction: column; gap: 6px; }
.terms-scroll-hint {
  text-align: center;
  color: var(--tx-5);
  font-size: 11px;
  margin-top: 8px;
  animation: pulse 1.5s ease-in-out infinite;
}

.btn-blogger-confirm {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 11px 16px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(216,90,48,0.3);
  transition: all 0.2s;
}
.btn-blogger-confirm:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(216,90,48,0.4);
}
.btn-blogger-confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
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
</style>
