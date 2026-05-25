<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore }             from '@/stores/authStore'
import { useLangStore }             from '@/stores/langStore'
import { useFavoritesStore }        from '@/stores/favoritesStore'
import { recipesApi }               from '@/api/recipes'
import { uploadApi }                from '@/api/upload'
import { mealPlansApi }             from '@/api/mealPlans'
import { authApi }                  from '@/api/auth'
import RecipeCard                   from '@/components/recipe/RecipeCard.vue'
import RecipeFormModal              from '@/components/recipe/RecipeFormModal.vue'
import { resolveImageUrl }          from '@/utils/imageUrl'

const auth      = useAuthStore()
const lang      = useLangStore()
const favorites = useFavoritesStore()

const recipes       = ref([])
const mealPlanCount = ref(0)
const loading       = ref(true)
const deletingId    = ref(null)

// ── Recipe form ───────────────────────────────────────────────────
const showRecipeModal = ref(false)
const editingRecipe   = ref(null)

// ── Edit profile modal ────────────────────────────────────────────
const showEdit        = ref(false)
const editForm        = ref({ fullName: '', avatarUrl: '' })
const saveError       = ref('')
const saveSuccess     = ref(false)
const saving          = ref(false)
const avatarPreview   = ref('')
const avatarUploading = ref(false)
const avatarInput     = ref(null)

// ── Password ──────────────────────────────────────────────────────
const showPwForm = ref(false)
const pwForm     = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwError    = ref('')
const pwSuccess  = ref(false)
const pwSaving   = ref(false)

// ── Blogger modal ─────────────────────────────────────────────────
const showBloggerModal = ref(false)
const termsScrolled    = ref(false)
const bloggerLoading   = ref(false)
const bloggerError     = ref('')
const bloggerSuccess   = ref(false)

// ── Computed ──────────────────────────────────────────────────────
const roleLabel = computed(() => {
  if (auth.isAdmin)   return { text: 'Admin',          icon: '👑', cls: 'role-admin' }
  if (auth.isBlogger) return { text: 'Blogger',        icon: '👨‍🍳', cls: 'role-blogger' }
  return               { text: 'Foydalanuvchi',        icon: '👤', cls: 'role-user' }
})

const memberSince = computed(() => {
  const d = auth.user?.createdAt
  if (!d) return ''
  return new Date(d).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long' })
})

const statsData = computed(() => [
  { icon: '📝', val: recipes.value.length,    lbl: 'Retseptlar'   },
  { icon: '❤️',  val: favorites.count,         lbl: 'Saqlangan'    },
  { icon: '📅', val: mealPlanCount.value,     lbl: 'Meal planlar' },
])

// ── Lifecycle ─────────────────────────────────────────────────────
onMounted(async () => {
  try {
    await auth.fetchUser()
    const ps = [loadMealPlanCount()]
    if (auth.isBlogger) ps.push(loadMyRecipes())
    if (!favorites.loaded) ps.push(favorites.loadIds())
    await Promise.all(ps)
  } finally {
    loading.value = false
  }
})

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
  if (pwForm.value.newPassword.length < 6) { pwError.value = lang.t('profile.pw_short'); return }
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

function handleRecipeSaved(saved) {
  showRecipeModal.value = false
  const idx = recipes.value.findIndex(r => r.id === saved.id)
  if (idx !== -1) recipes.value[idx] = saved
  else recipes.value.unshift(saved)
  editingRecipe.value = null
}

async function deleteRecipe(id) {
  if (!confirm(lang.t('common.confirm_delete'))) return
  deletingId.value = id
  try {
    await recipesApi.delete(id)
    recipes.value = recipes.value.filter(r => r.id !== id)
  } catch { alert(lang.t('common.error_delete')) }
  finally  { deletingId.value = null }
}

// ── Blogger ───────────────────────────────────────────────────────
function openBloggerModal() {
  termsScrolled.value = false; bloggerError.value = ''; bloggerSuccess.value = false
  showBloggerModal.value = true
}
function onTermsScroll(e) {
  const el = e.target
  termsScrolled.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 20
}
async function confirmBecomeBlogger() {
  bloggerLoading.value = true; bloggerError.value = ''
  const err = await auth.becomeBlogger()
  bloggerLoading.value = false
  if (err) { bloggerError.value = err }
  else {
    bloggerSuccess.value = true
    await auth.fetchUser()
    setTimeout(() => { showBloggerModal.value = false; bloggerSuccess.value = false }, 1800)
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
            <div class="ava-ring" :class="roleLabel.cls">
              <div class="ava-inner">
                <img v-if="auth.avatarUrl" :src="resolveImageUrl(auth.avatarUrl)" alt="avatar"
                  @error="e => { e.target.style.display='none'; e.target.nextElementSibling.style.display='flex' }" />
                <span :style="auth.avatarUrl ? 'display:none' : ''">{{ auth.initials }}</span>
              </div>
            </div>
            <div class="role-pill" :class="roleLabel.cls">
              {{ roleLabel.icon }} {{ roleLabel.text }}
            </div>
          </div>

          <!-- Name & meta -->
          <div class="hero-meta">
            <h1 class="hero-name">{{ auth.user.fullName || auth.user.username || 'Foydalanuvchi' }}</h1>
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
              Profilni tahrirlash
            </button>
            <button @click="auth.logout()" class="btn-action btn-danger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              Chiqish
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
            <div class="info-lbl">Rol</div>
            <div class="info-val">
              <span class="role-badge" :class="roleLabel.cls">{{ roleLabel.icon }} {{ roleLabel.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── BLOGGER BANNER (USER uchun) ── -->
      <div v-if="!auth.isBlogger" class="blogger-cta" @click="openBloggerModal">
        <div class="bcta-left">
          <div class="bcta-emoji">👨‍🍳</div>
          <div>
            <div class="bcta-title">Blogger bo'lish</div>
            <div class="bcta-sub">Retseptlaringizni ulashing, auditoriya to'plang</div>
          </div>
        </div>
        <div class="bcta-arrow">›</div>
      </div>

      <!-- ── BLOGGER ACTIVE (BLOGGER uchun) ── -->
      <div v-else-if="auth.role === 'BLOGGER'" class="blogger-active">
        <span class="ba-icon">✅</span>
        <div>
          <div class="ba-title">Tasdiqlangan Blogger</div>
          <div class="ba-sub">Retseptlaringizni qo'shing va barchaga ko'rsating</div>
        </div>
      </div>

      <!-- ── BLOGGER RETSEPTLARI ── -->
      <div v-if="auth.isBlogger" class="section">
        <div class="section-head">
          <h2 class="section-title">Mening retseptlarim</h2>
          <button @click="openCreateRecipe" class="btn-add">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 5v14M5 12h14"/></svg>
            Qo'shish
          </button>
        </div>

        <div v-if="recipes.length" class="recipe-grid">
          <div v-for="r in recipes" :key="r.id" class="card-wrap">
            <RecipeCard :recipe="r" />
            <div class="card-overlay">
              <button @click.prevent="openEditRecipe(r)" class="ov-btn ov-edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              </button>
              <button @click.prevent="deleteRecipe(r.id)" :disabled="deletingId === r.id" class="ov-btn ov-del">
                <span v-if="deletingId === r.id" class="spin" />
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        </div>

        <div v-else class="empty-box">
          <div class="empty-emoji">📝</div>
          <div class="empty-title">Hali retsept yo'q</div>
          <div class="empty-sub">Birinchi retseptingizni qo'shing!</div>
          <button @click="openCreateRecipe" class="btn-empty">+ Retsept qo'shish</button>
        </div>
      </div>

      <!-- ── USER EMPTY STATE ── -->
      <div v-else class="section">
        <div class="section-head">
          <h2 class="section-title">💾 Saqlangan retseptlar</h2>
        </div>
        <div class="upgrade-box">
          <div class="ub-emoji">🍳</div>
          <div class="ub-title">O'z retseptingizni ulashmoqchimisiz?</div>
          <div class="ub-sub">Blogger bo'ling — retseptlar qo'shing, auditoriya to'plang</div>
          <button @click="openBloggerModal" class="btn-upgrade">👨‍🍳 Blogger bo'lish</button>
        </div>
      </div>

    </template>

    <!-- ══════════════ MODALS ══════════════ -->

    <!-- Recipe form -->
    <RecipeFormModal :recipe="editingRecipe" :visible="showRecipeModal"
      @close="showRecipeModal = false" @saved="handleRecipeSaved" />

    <!-- Blogger modal -->
    <Teleport to="body">
      <Transition name="mfade">
        <div v-if="showBloggerModal" class="modal-overlay" @click.self="showBloggerModal = false">
          <div class="modal-box">
            <div class="modal-head">
              <div class="mh-icon">👨‍🍳</div>
              <div>
                <div class="mh-title">Blogger bo'lish</div>
                <div class="mh-sub">Shartlarni o'qib, tasdiqlang</div>
              </div>
              <button class="modal-x" @click="showBloggerModal = false">✕</button>
            </div>

            <div class="blogger-perks">
              <div class="perk">📝 Retsept qo'shish va tahrirlash</div>
              <div class="perk">🌍 Retseptlar barcha userlarga ko'rinadi</div>
              <div class="perk">📊 Ko'rishlar va baholarni kuzatish</div>
              <div class="perk">🏷️ Profilda "Blogger" belgisi</div>
            </div>

            <div class="terms-scroll" @scroll="onTermsScroll">
              <div class="terms-title">Foydalanish shartlari</div>
              <ol class="terms-list">
                <li>Yuklangan barcha kontent sizning mulkingiz — uni ulashishga huquqingiz bor.</li>
                <li>Boshqalarning mualliflik huquqini buzuvchi kontent yuklab bo'lmaydi.</li>
                <li>Retseptlar haqiqiy va sog'lom bo'lishi kerak.</li>
                <li>Spam, haqoratli yoki zararli kontent man etiladi.</li>
                <li>Qoidabuzarlik holatida blogger statusidan mahrum etilasiz.</li>
                <li>Maxfiylik siyosatimizga to'liq rozilik bildirasiz.</li>
              </ol>
              <div v-if="!termsScrolled" class="terms-hint">↓ O'qishni davom eting</div>
            </div>

            <div v-if="bloggerError" class="msg-error">{{ bloggerError }}</div>
            <div v-if="bloggerSuccess" class="msg-ok">🎉 Tabriklaymiz! Siz endi Bloggersiz!</div>

            <div class="modal-foot">
              <button @click="showBloggerModal = false" class="btn-ghost" :disabled="bloggerLoading">Bekor qilish</button>
              <button @click="confirmBecomeBlogger" class="btn-confirm" :disabled="!termsScrolled || bloggerLoading">
                <span v-if="bloggerLoading" class="spin" />
                {{ bloggerLoading ? 'Saqlanmoqda...' : 'Qabul qilaman ✓' }}
              </button>
            </div>
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
              <div class="mh-title">Profilni tahrirlash</div>
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
              <div class="au-hint">Rasm o'zgartirish · JPG, PNG, max 5MB</div>
              <input ref="avatarInput" type="file" accept="image/*" style="display:none" @change="onAvatarFileChange" />

              <div class="form-group">
                <label class="form-lbl">To'liq ism</label>
                <input v-model="editForm.fullName" type="text" class="form-inp" placeholder="Ismingizni kiriting" />
              </div>

              <div v-if="saveError" class="msg-error">{{ saveError }}</div>
              <div v-if="saveSuccess" class="msg-ok">✓ Saqlandi!</div>

              <!-- Password toggle -->
              <div class="pw-section">
                <button class="pw-toggle" @click="showPwForm = !showPwForm" type="button">
                  🔑 Parolni o'zgartirish
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" :style="`width:16px;height:16px;transition:.2s;transform:rotate(${showPwForm?180:0}deg)`"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                </button>
                <div v-if="showPwForm" class="pw-fields">
                  <input v-model="pwForm.currentPassword" type="password" class="form-inp" placeholder="Joriy parol" />
                  <input v-model="pwForm.newPassword"     type="password" class="form-inp" placeholder="Yangi parol" />
                  <input v-model="pwForm.confirmPassword" type="password" class="form-inp" placeholder="Yangi parolni tasdiqlang" />
                  <div v-if="pwError"   class="msg-error">{{ pwError }}</div>
                  <div v-if="pwSuccess" class="msg-ok">✓ Parol yangilandi!</div>
                  <button @click="savePassword" :disabled="pwSaving" class="btn-pw-save">
                    <span v-if="pwSaving" class="spin" /> Parolni saqlash
                  </button>
                </div>
              </div>
            </div>

            <div class="modal-foot">
              <button @click="showEdit = false" class="btn-ghost" :disabled="saving">Bekor qilish</button>
              <button @click="saveProfile" class="btn-save" :disabled="saving">
                <span v-if="saving" class="spin" />{{ saving ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; max-width: 720px; margin: 0 auto; padding-bottom: 40px; }

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
}
.ava-ring.role-admin   { background: linear-gradient(135deg, #fbbf24, #d97706); }
.ava-ring.role-blogger { background: linear-gradient(135deg, #D85A30, #f97316); }
.ava-ring.role-user    { background: linear-gradient(135deg, #3b82f6, #6366f1); }

.ava-inner {
  width: 100%; height: 100%; border-radius: 19px;
  background: linear-gradient(135deg, #1a2a1a, #0f1e2a);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
  font-size: 30px; font-weight: 900; color: #fff;
}
.ava-inner img { width: 100%; height: 100%; object-fit: cover; }

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

/* ── SECTION ── */
.section { display: flex; flex-direction: column; gap: 14px; }
.section-head { display: flex; align-items: center; justify-content: space-between; }
.section-title { font-size: 17px; font-weight: 900; color: var(--tx-1); }

.btn-add {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: rgba(216,90,48,0.12); border: 1px solid rgba(216,90,48,0.25); border-radius: 10px;
  color: #E8713E; font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.2s;
}
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

/* Modal transition */
.mfade-enter-active { transition: all 0.25s cubic-bezier(0.16,1,0.3,1); }
.mfade-leave-active { transition: all 0.15s ease; }
.mfade-enter-from  { opacity: 0; transform: scale(0.95) translateY(10px); }
.mfade-leave-to    { opacity: 0; transform: scale(0.97); }
</style>
