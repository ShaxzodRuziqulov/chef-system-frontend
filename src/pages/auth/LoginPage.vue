<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useForm, useField }        from 'vee-validate'
import * as yup                     from 'yup'
import { useAuthStore }             from '@/stores/authStore'
import { useRoute }                 from 'vue-router'
import { useLangStore }             from '@/stores/langStore'
import LangSwitcher                 from '@/components/ui/LangSwitcher.vue'

const auth  = useAuthStore()
const route = useRoute()
const lang  = useLangStore()

const redirectPath = computed(() =>
  typeof route.query.redirect === 'string' ? route.query.redirect : '/'
)

const schema = yup.object({
  username: yup.string().required("Username kiritilishi shart").min(3, 'Kamida 3 ta belgi'),
  password: yup.string().required("Parol kiritilishi shart").min(4, 'Kamida 4 ta belgi'),
})

const { handleSubmit, meta } = useForm({ validationSchema: schema })

const { value: username, errorMessage: usernameError, meta: usernameMeta } = useField<string>('username')
const { value: password, errorMessage: passwordError, meta: passwordMeta } = useField<string>('password')

const showPassword = ref(false)
const serverError  = ref<string | null>(null)
const rememberMe   = ref(false)

const onSubmit = handleSubmit(async (values) => {
  serverError.value = null
  const error = await auth.login({ username: values.username, password: values.password }, redirectPath.value)
  if (error) serverError.value = error
})

onMounted(() => { auth.clearError(); serverError.value = null })
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
        <LangSwitcher />
      </div>
      <div class="logo-wrap">
        <div class="logo-icon">👨‍🍳</div>
      </div>
      <h1 class="title">OshPaz</h1>
      <p class="subtitle">{{ lang.t('auth.login_sub') }}</p>

      <!-- Form -->
      <form @submit.prevent="onSubmit" novalidate class="form">

        <!-- Username -->
        <div class="field-group">
          <label class="field-label">{{ lang.t('auth.username') }}</label>
          <div class="input-wrap" :class="{ 'is-error': usernameError && usernameMeta.dirty, 'is-valid': usernameMeta.valid && username }">
            <svg class="input-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <input
              v-model="username"
              type="text"
              :placeholder="lang.t('auth.username')"
              class="field-input"
            />
            <svg v-if="usernameMeta.valid && username" class="valid-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
            </svg>
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="••••••••"
              class="field-input"
            />
            <button type="button" class="toggle-btn" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
              </svg>
            </button>
          </div>
          <span v-if="passwordError && passwordMeta.dirty" class="error-msg">{{ passwordError }}</span>
        </div>

        <!-- Options -->
        <div class="options-row">
          <label class="remember-label">
            <div class="checkbox-wrap">
              <input type="checkbox" v-model="rememberMe" class="checkbox-input" />
              <div class="checkbox-box">
                <svg v-if="rememberMe" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                </svg>
              </div>
            </div>
            <span>{{ lang.t('auth.remember') || 'Eslab qolish' }}</span>
          </label>
          <a href="#" class="forgot-link">{{ lang.t('auth.forgot') || 'Parolni unutdingizmi?' }}</a>
        </div>

        <!-- Server Error -->
        <div v-if="serverError" class="server-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
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
        <p>{{ lang.t('auth.no_account') }} <RouterLink to="/register">{{ lang.t('auth.register_link') }}</RouterLink></p>
        <span>© {{ new Date().getFullYear() }} OshPaz</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Page ── */
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background-color: #0f172a;
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
.blob-1 { width: 400px; height: 400px; top: -100px; left: -100px; background: rgba(216, 90, 48, 0.2); animation-delay: 0s; }
.blob-2 { width: 350px; height: 350px; bottom: -80px; right: -80px; background: rgba(16, 185, 129, 0.15); animation-delay: 2s; }
.blob-3 { width: 280px; height: 280px; top: 40%; right: 15%; background: rgba(139, 92, 246, 0.1); animation-delay: 4s; }

@keyframes blobMove {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, -40px) scale(1.1); }
}

/* ── Card ── */
.card {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 460px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 32px;
  padding: 36px 44px 48px;
  backdrop-filter: blur(40px);
  box-shadow: 0 32px 64px rgba(0, 0, 0, 0.4);
  animation: cardIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.card-lang {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
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
  color: #ffffff;
  letter-spacing: -0.5px;
  margin-bottom: 8px;
}
.subtitle {
  text-align: center;
  font-size: 15px;
  color: #94a3b8;
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
  color: #64748b;
}

/* ── Input Wrap ── */
.input-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0 16px;
  height: 56px;
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.input-wrap:focus-within {
  background: rgba(255, 255, 255, 0.08);
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
  color: #475569;
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
  color: #f1f5f9;
  min-width: 0;
}
.field-input::placeholder {
  color: #475569;
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
  color: #475569;
  transition: color 0.2s;
  flex-shrink: 0;
}
.toggle-btn:hover { color: #f1f5f9; }
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
  color: #64748b;
}
.remember-label:hover { color: #94a3b8; }

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
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(255,255,255,0.05);
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
  text-decoration: none;
  transition: color 0.2s;
}
.forgot-link:hover { color: #F0997B; }

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
.submit-btn:active:not(:disabled) { transform: translateY(0); }
.submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.arrow-icon {
  width: 20px;
  height: 20px;
  transition: transform 0.2s;
}
.submit-btn:hover .arrow-icon { transform: translateX(4px); }
.spinner {
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Footer ── */
.card-footer {
  margin-top: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-top: 1px solid rgba(255,255,255,0.06);
  padding-top: 24px;
}
.card-footer p {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
}
.card-footer p a {
  color: #E8713E;
  font-weight: 700;
  text-decoration: none;
  transition: color 0.2s;
}
.card-footer p a:hover { color: #F0997B; }
.card-footer span {
  font-size: 11px;
  color: #334155;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  font-weight: 700;
}
</style>
