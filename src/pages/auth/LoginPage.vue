<script setup lang="ts">
import {computed, onMounted, ref} from 'vue'
import {useField, useForm} from 'vee-validate'
import * as yup from 'yup'
import {useAuthStore} from '@/stores/authStore'
import {useRoute, useRouter} from 'vue-router'
import {useLangStore} from '@/stores/langStore'
import {authApi} from '@/api/auth'

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const lang = useLangStore()

function goBack() {
  router.push('/')
}

const redirectPath = computed(() =>
    typeof route.query.redirect === 'string' ? route.query.redirect : '/'
)

// Redirect sababi: foydalanuvchi himoyalangan sahifaga kirishga urindi
const redirectReason = computed(() =>
    typeof route.query.page === 'string' && route.query.page
      ? route.query.page
      : null
)

const schema = yup.object({
  username: yup.string().required("Username kiritilishi shart").min(3, 'Kamida 3 ta belgi'),
  password: yup.string().required("Parol kiritilishi shart").min(4, 'Kamida 4 ta belgi'),
})

const {handleSubmit, meta} = useForm({validationSchema: schema})

const {value: username, errorMessage: usernameError, meta: usernameMeta} = useField<string>('username')
const {value: password, errorMessage: passwordError, meta: passwordMeta} = useField<string>('password')

const showPassword = ref(false)
const serverError = ref<string | null>(null)
const rememberMe = ref(true)  // default: eslab qolish yoqilgan

// ── Login ─────────────────────────────────────────────────────────────────
const onSubmit = handleSubmit(async (values) => {
  serverError.value = null
  const error = await auth.login(
      {username: values.username, password: values.password},
      redirectPath.value,
      rememberMe.value,   // ← remember me
  )
  if (error) serverError.value = error
})

// ── Forgot Password ────────────────────────────────────────────────────────
const showForgot    = ref(false)
const forgotUser    = ref('')
const forgotPw      = ref('')
const forgotShowPw  = ref(false)
const forgotLoading = ref(false)
const forgotError   = ref('')
const forgotSuccess = ref(false)

function openForgot() {
  forgotUser.value    = ''
  forgotPw.value      = ''
  forgotShowPw.value  = false
  forgotError.value   = ''
  forgotSuccess.value = false
  showForgot.value    = true
}

async function submitForgot() {
  if (!forgotUser.value.trim()) {
    forgotError.value = 'Username kiritilishi shart'
    return
  }
  if (forgotPw.value.length < 4) {
    forgotError.value = 'Yangi parol kamida 4 ta belgidan iborat bo\'lishi kerak'
    return
  }
  forgotLoading.value = true
  forgotError.value   = ''
  try {
    await authApi.forgotPassword({ username: forgotUser.value.trim(), newPassword: forgotPw.value })
    forgotSuccess.value = true
  } catch (e: any) {
    forgotError.value = e?.response?.data?.message || 'Xatolik yuz berdi'
  } finally {
    forgotLoading.value = false
  }
}

onMounted(() => {
  auth.clearError();
  serverError.value = null
})
</script>

<template>
  <div class="login-page">
    <!-- Background blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>

    <!-- Card -->
    <div class="card">
      <!-- Logo -->
      <div class="card-lang">
        <button class="back-btn" @click="goBack" :title="lang.t('common.back') || 'Orqaga'">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
          </svg>
          <span>{{ lang.t('common.back') || 'Orqaga' }}</span>
        </button>
      </div>
      <div class="logo-wrap">
        <div class="logo-icon">👨‍🍳</div>
      </div>
      <h1 class="title">OshPaz</h1>
      <p class="subtitle">{{ lang.t('auth.login_sub') }}</p>

      <!-- Redirect sababi banner -->
      <div v-if="redirectReason" class="redirect-notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        <div>
          <span class="redirect-notice-title">Kirish talab qilinadi</span>
          <span class="redirect-notice-sub">
            <strong>{{ redirectReason }}</strong> sahifasiga o'tish uchun tizimga kiring
          </span>
        </div>
      </div>

      <!-- Form -->
      <form @submit.prevent="onSubmit" novalidate class="form">

        <!-- Username -->
        <div class="field-group">
          <label class="field-label">{{ lang.t('auth.username') }}</label>
          <div class="input-wrap"
               :class="{ 'is-error': usernameError && usernameMeta.dirty, 'is-valid': usernameMeta.valid && username }">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <input
                v-model="username"
                type="text"
                :placeholder="lang.t('auth.username')"
                class="field-input"
            />
            <svg v-if="usernameMeta.valid && username" class="valid-icon" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <span v-if="usernameError && usernameMeta.dirty" class="error-msg">{{ usernameError }}</span>
        </div>

        <!-- Password -->
        <div class="field-group">
          <label class="field-label">{{ lang.t('auth.password') }}</label>
          <div class="input-wrap" :class="{ 'is-error': passwordError && passwordMeta.dirty }">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <input
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                placeholder="••••••••"
                class="field-input"
            />
            <button type="button" class="toggle-btn" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>
          <span v-if="passwordError && passwordMeta.dirty" class="error-msg">{{ passwordError }}</span>
        </div>

        <!-- Options -->
        <div class="options-row">
          <label class="remember-label">
            <div class="checkbox-wrap">
              <input type="checkbox" v-model="rememberMe" class="checkbox-input"/>
              <div class="checkbox-box">
                <svg v-if="rememberMe" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
            <span>{{ lang.t('auth.remember') || 'Eslab qolish' }}</span>
          </label>
          <button type="button" class="forgot-link" @click="openForgot">
            {{ lang.t('auth.forgot') || 'Parolni unutdingizmi?' }}
          </button>
        </div>

        <!-- Server Error -->
        <div v-if="serverError" class="server-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>{{ serverError }}</span>
        </div>

        <!-- Submit -->
        <button type="submit" class="submit-btn" :disabled="auth.loading">
          <span v-if="auth.loading" class="spinner"></span>
          <span>{{ auth.loading ? lang.t('common.loading') : lang.t('auth.login_btn') }}</span>
          <svg v-if="!auth.loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" class="arrow-icon">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
          </svg>
        </button>

      </form>

      <!-- Footer -->
      <div class="card-footer">
        <p>{{ lang.t('auth.no_account') }}
          <RouterLink to="/register">{{ lang.t('auth.register_link') }}</RouterLink>
        </p>
        <span>© {{ new Date().getFullYear() }} OshPaz</span>
      </div>
    </div>
  </div>

  <!-- ── Forgot Password Modal ── -->
  <Teleport to="body">
    <Transition name="mfade">
      <div v-if="showForgot" class="fp-overlay" @click.self="showForgot = false">
        <div class="fp-box">
          <div class="fp-head">
            <div class="fp-icon">🔑</div>
            <div>
              <div class="fp-title">Parolni tiklash</div>
              <div class="fp-sub">Username va yangi parolni kiriting</div>
            </div>
            <button class="fp-close" @click="showForgot = false">✕</button>
          </div>

          <template v-if="!forgotSuccess">
            <div class="fp-body">
              <!-- Username -->
              <div class="fp-input-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="fp-inp-icon">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                </svg>
                <input
                    v-model="forgotUser"
                    type="text"
                    placeholder="Username"
                    class="fp-input"
                    autocomplete="username"
                />
              </div>
              <!-- Yangi parol -->
              <div class="fp-input-wrap" style="margin-top:10px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="fp-inp-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
                <input
                    v-model="forgotPw"
                    :type="forgotShowPw ? 'text' : 'password'"
                    placeholder="Yangi parol"
                    class="fp-input"
                    autocomplete="new-password"
                    @keyup.enter="submitForgot"
                />
                <button type="button" class="fp-eye" @click="forgotShowPw = !forgotShowPw" tabindex="-1">
                  <svg v-if="forgotShowPw" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                  <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </button>
              </div>
              <p v-if="forgotError" class="fp-error">{{ forgotError }}</p>
            </div>
            <div class="fp-foot">
              <button class="fp-cancel" @click="showForgot = false" :disabled="forgotLoading">Bekor qilish</button>
              <button class="fp-submit" @click="submitForgot" :disabled="forgotLoading">
                <span v-if="forgotLoading" class="fp-spin"/>
                {{ forgotLoading ? 'Saqlanmoqda...' : 'Saqlash' }}
              </button>
            </div>
          </template>

          <template v-else>
            <div class="fp-success">
              <div class="fp-ok-icon">✅</div>
              <div class="fp-ok-title">Parol yangilandi!</div>
              <p class="fp-ok-text"><strong>{{ forgotUser }}</strong> uchun parol muvaffaqiyatli o'zgartirildi.</p>
              <button class="fp-submit" @click="showForgot = false">Yopish</button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* ── Page ── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: var(--bg-base);
  position: relative;
  overflow: hidden;
}

/* ── Background blobs ── */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  pointer-events: none;
  animation: blobMove 8s ease-in-out infinite alternate;
}

.blob-1 {
  width: 400px;
  height: 400px;
  top: -100px;
  left: -100px;
  background: rgba(216, 90, 48, 0.2);
  animation-delay: 0s;
}

.blob-2 {
  width: 350px;
  height: 350px;
  bottom: -80px;
  right: -80px;
  background: rgba(16, 185, 129, 0.15);
  animation-delay: 2s;
}

.blob-3 {
  width: 280px;
  height: 280px;
  top: 40%;
  right: 15%;
  background: rgba(139, 92, 246, 0.1);
  animation-delay: 4s;
}

@keyframes blobMove {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(30px, -40px) scale(1.1);
  }
}

/* ── Card ── */
.card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 460px;
  background: var(--bg-card-md);
  border: 1px solid var(--bd-md);
  border-radius: 32px;
  padding: 36px 44px 48px;
  backdrop-filter: blur(40px);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
  animation: cardIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.card-lang {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1.5px solid var(--bd-xl);
  border-radius: 10px;
  background: transparent;
  color: var(--tx-4);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}

.back-btn:hover {
  border-color: rgba(216, 90, 48, 0.4);
  color: #E8713E;
  background: rgba(216, 90, 48, 0.06);
}

.back-btn svg {
  width: 15px;
  height: 15px;
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(24px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ── Logo ── */
.logo-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.logo-icon {
  width: 76px;
  height: 76px;
  border-radius: 22px;
  background: linear-gradient(135deg, #D85A30, #10b981);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  box-shadow: 0 12px 32px rgba(216, 90, 48, 0.35);
}

/* ── Title ── */
.title {
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  color: var(--tx-1);
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}

.subtitle {
  text-align: center;
  font-size: 15px;
  color: var(--tx-3);
  margin-bottom: 36px;
}

/* ── Form ── */
.form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Field ── */
.field-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--tx-4);
}

/* ── Input Wrap ── */
.input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--bg-input);
  border: 1.5px solid var(--bd-md);
  border-radius: 14px;
  padding: 0 16px;
  height: 56px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.input-wrap:focus-within {
  background: var(--bg-input-f);
  border-color: rgba(216, 90, 48, 0.6);
  box-shadow: 0 0 0 4px rgba(216, 90, 48, 0.1);
}

.input-wrap.is-error {
  border-color: rgba(239, 68, 68, 0.5);
  background: rgba(239, 68, 68, 0.05);
}

.input-wrap.is-valid {
  border-color: rgba(16, 185, 129, 0.5);
}

.input-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: var(--tx-5);
  transition: color 0.2s;
}

.input-wrap:focus-within .input-icon {
  color: #E8713E;
}

.field-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 15px;
  color: var(--tx-1);
  min-width: 0;
}

.field-input::placeholder {
  color: var(--tx-5);
}

.valid-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: #10b981;
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  color: var(--tx-5);
  transition: color 0.2s;
  flex-shrink: 0;
}

.toggle-btn:hover {
  color: var(--tx-1);
}

.toggle-btn svg {
  width: 20px;
  height: 20px;
}

/* ── Error msg ── */
.error-msg {
  font-size: 12px;
  font-weight: 600;
  color: #f87171;
  padding-left: 4px;
}

/* ── Options Row ── */
.options-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.remember-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
  font-size: 14px;
  font-weight: 600;
  color: var(--tx-4);
}

.remember-label:hover {
  color: var(--tx-3);
}

.checkbox-wrap {
  position: relative;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.checkbox-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

.checkbox-box {
  width: 20px;
  height: 20px;
  border-radius: 6px;
  border: 1.5px solid var(--bd-xl);
  background: var(--bg-input);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  pointer-events: none;
}

.checkbox-input:checked + .checkbox-box {
  background: #D85A30;
  border-color: #D85A30;
}

.checkbox-box svg {
  width: 12px;
  height: 12px;
  color: white;
}

.forgot-link {
  font-size: 14px;
  font-weight: 700;
  color: #E8713E;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  transition: color 0.2s;
}

.forgot-link:hover {
  color: #F0997B;
}

/* ── Forgot Password Modal ── */
.fp-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.fp-box {
  background: var(--bg-surface, #1a1a1a);
  border: 1px solid var(--bd-md);
  border-radius: 24px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.5);
  overflow: hidden;
}

.fp-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 20px 0;
}

.fp-icon {
  font-size: 28px;
  flex-shrink: 0;
}

.fp-title {
  font-size: 16px;
  font-weight: 900;
  color: var(--tx-1);
}

.fp-sub {
  font-size: 12px;
  color: var(--tx-5);
  margin-top: 2px;
}

.fp-close {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-input);
  border-radius: 8px;
  color: var(--tx-4);
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fp-close:hover {
  background: var(--bd-md);
  color: var(--tx-1);
}

.fp-body {
  padding: 20px;
}

.fp-input-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-input);
  border: 1.5px solid var(--bd-md);
  border-radius: 12px;
  padding: 0 14px;
  height: 48px;
  transition: border-color 0.2s;
}

.fp-input-wrap:focus-within {
  border-color: rgba(216, 90, 48, 0.6);
}

.fp-inp-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--tx-5);
}

.fp-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--tx-1);
}

.fp-input::placeholder {
  color: var(--tx-5);
}

.fp-eye {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--tx-5);
  padding: 4px;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.fp-eye:hover { color: var(--tx-3); }
.fp-eye svg { width: 16px; height: 16px; }

.fp-error {
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #f87171;
  padding-left: 2px;
}

.fp-foot {
  display: flex;
  gap: 10px;
  padding: 0 20px 20px;
}

.fp-cancel {
  flex: 1;
  padding: 11px;
  background: var(--bg-input);
  border: 1px solid var(--bd-md);
  border-radius: 12px;
  color: var(--tx-3);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}

.fp-cancel:hover {
  background: var(--bd-md);
}

.fp-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.fp-submit {
  flex: 1;
  padding: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.3);
  transition: all 0.2s;
}

.fp-submit:hover:not(:disabled) {
  transform: translateY(-1px);
}

.fp-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.fp-success {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 24px 20px;
  text-align: center;
}

.fp-ok-icon {
  font-size: 48px;
}

.fp-ok-title {
  font-size: 18px;
  font-weight: 900;
  color: var(--tx-1);
}

.fp-ok-text {
  font-size: 13px;
  color: var(--tx-4);
  line-height: 1.6;
  margin-bottom: 8px;
}

.fp-ok-text strong {
  color: var(--tx-2);
}

.fp-spin {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: fp-rot 0.7s linear infinite;
}

@keyframes fp-rot {
  to {
    transform: rotate(360deg);
  }
}

/* ── Redirect notice ── */
.redirect-notice {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(216, 90, 48, 0.08);
  border: 1.5px solid rgba(216, 90, 48, 0.25);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 8px;
  animation: cardIn 0.4s ease both;
}

.redirect-notice svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #E8713E;
  margin-top: 1px;
}

.redirect-notice > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.redirect-notice-title {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #E8713E;
}

.redirect-notice-sub {
  font-size: 13px;
  font-weight: 500;
  color: var(--tx-3);
  line-height: 1.4;
}

.redirect-notice-sub strong {
  color: var(--tx-1);
  font-weight: 700;
}

/* ── Server Error ── */
.server-error {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 14px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  color: #fca5a5;
}

.server-error svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: #ef4444;
}

/* ── Submit ── */
.submit-btn {
  height: 56px;
  width: 100%;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: white;
  font-size: 16px;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  box-shadow: 0 8px 24px rgba(216, 90, 48, 0.3);
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
  margin-top: 4px;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(216, 90, 48, 0.45);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.arrow-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s;
}

.submit-btn:hover .arrow-icon {
  transform: translateX(4px);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ── Footer ── */
.card-footer {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-top: 1px solid var(--bd);
  padding-top: 24px;
}

.card-footer p {
  font-size: 14px;
  color: var(--tx-4);
  font-weight: 500;
}

.card-footer p a {
  color: #E8713E;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s;
}

.card-footer p a:hover {
  color: #F0997B;
}

.card-footer span {
  font-size: 11px;
  color: var(--tx-6);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}

@media (max-width: 480px) {
  .login-page { padding: 12px; }
  .card { padding: 24px 20px 32px; border-radius: 20px; }
  .fp-overlay { padding: 0; align-items: flex-end; }
  .fp-box { border-radius: 24px 24px 0 0; max-width: 100%; max-height: 82vh; overflow-y: auto; }
}
</style>
