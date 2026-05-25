<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authApi } from '@/api/auth'

const route  = useRoute()
const router = useRouter()

const token       = ref('')
const newPassword = ref('')
const confirm     = ref('')
const showPw      = ref(false)
const loading     = ref(false)
const error       = ref('')
const success     = ref(false)

onMounted(() => {
  token.value = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token.value) error.value = 'Token topilmadi. Havolani to\'g\'ri kiriting.'
})

async function submit() {
  error.value = ''
  if (newPassword.value.length < 4) { error.value = 'Parol kamida 4 ta belgidan iborat bo\'lishi kerak'; return }
  if (newPassword.value !== confirm.value)  { error.value = 'Parollar mos kelmadi'; return }

  loading.value = true
  try {
    await authApi.resetPassword({ token: token.value, newPassword: newPassword.value })
    success.value = true
    setTimeout(() => router.push('/login'), 3000)
  } catch (e: any) {
    error.value = e?.response?.data?.message || 'Token noto\'g\'ri yoki muddati o\'tgan'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="rp-page">
    <div class="rp-card">
      <div class="rp-logo">🔐</div>
      <h1 class="rp-title">Yangi parol o'rnatish</h1>

      <template v-if="success">
        <div class="rp-success">
          <div class="rp-ok">✅</div>
          <p>Parol muvaffaqiyatli yangilandi!</p>
          <p class="rp-sub">3 soniyada kirish sahifasiga yo'naltirilasiz...</p>
        </div>
      </template>

      <template v-else>
        <div class="rp-form">
          <div class="rp-field">
            <label class="rp-lbl">Yangi parol</label>
            <div class="rp-inp-wrap">
              <input
                v-model="newPassword"
                :type="showPw ? 'text' : 'password'"
                placeholder="Kamida 6 ta belgi"
                class="rp-inp"
              />
              <button type="button" class="rp-eye" @click="showPw = !showPw">
                {{ showPw ? '🙈' : '👁️' }}
              </button>
            </div>
          </div>

          <div class="rp-field">
            <label class="rp-lbl">Parolni tasdiqlang</label>
            <div class="rp-inp-wrap">
              <input
                v-model="confirm"
                :type="showPw ? 'text' : 'password'"
                placeholder="Parolni qayta kiriting"
                class="rp-inp"
                @keyup.enter="submit"
              />
            </div>
          </div>

          <p v-if="error" class="rp-error">{{ error }}</p>

          <button class="rp-btn" @click="submit" :disabled="loading || !token">
            <span v-if="loading" class="rp-spin" />
            {{ loading ? 'Saqlanmoqda...' : 'Parolni saqlash' }}
          </button>

          <RouterLink to="/login" class="rp-back">← Kirish sahifasiga qaytish</RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.rp-page {
  min-height: 100vh; display: flex; align-items: center; justify-content: center;
  padding: 24px; background: var(--bg-base);
}
.rp-card {
  width: 100%; max-width: 420px;
  background: var(--bg-card); border: 1px solid var(--bd);
  border-radius: 28px; padding: 40px 36px;
  box-shadow: 0 24px 56px rgba(0,0,0,0.15);
  display: flex; flex-direction: column; gap: 16px;
}
.rp-logo  { font-size: 48px; text-align: center; }
.rp-title { font-size: 22px; font-weight: 900; color: var(--tx-1); text-align: center; margin: 0; }

.rp-form  { display: flex; flex-direction: column; gap: 14px; }
.rp-field { display: flex; flex-direction: column; gap: 6px; }
.rp-lbl   { font-size: 11px; font-weight: 800; color: var(--tx-4); text-transform: uppercase; letter-spacing: 0.07em; }

.rp-inp-wrap {
  display: flex; align-items: center;
  background: var(--bg-input); border: 1.5px solid var(--bd-md); border-radius: 12px;
  padding: 0 14px; height: 48px;
  transition: border-color 0.2s;
}
.rp-inp-wrap:focus-within { border-color: rgba(216,90,48,0.6); }
.rp-inp {
  flex: 1; background: transparent; border: none; outline: none;
  font-size: 15px; color: var(--tx-1);
}
.rp-inp::placeholder { color: var(--tx-5); }
.rp-eye { background: none; border: none; cursor: pointer; font-size: 16px; }

.rp-error {
  padding: 10px 14px; border-radius: 10px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
  color: #f87171; font-size: 12px; font-weight: 700; margin: 0;
}

.rp-btn {
  padding: 13px; display: flex; align-items: center; justify-content: center; gap: 8px;
  background: linear-gradient(135deg, #D85A30, #E8713E); border: none; border-radius: 14px;
  color: #fff; font-size: 15px; font-weight: 800; cursor: pointer;
  box-shadow: 0 6px 18px rgba(216,90,48,0.3); transition: all 0.2s;
}
.rp-btn:hover:not(:disabled) { transform: translateY(-2px); }
.rp-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

.rp-spin {
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  border-radius: 50%; animation: rot 0.7s linear infinite;
}
@keyframes rot { to { transform: rotate(360deg); } }

.rp-back {
  text-align: center; font-size: 13px; font-weight: 600;
  color: var(--tx-5); text-decoration: none;
}
.rp-back:hover { color: #E8713E; }

.rp-success {
  text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center;
}
.rp-ok  { font-size: 56px; }
.rp-success p { font-size: 15px; font-weight: 700; color: var(--tx-1); margin: 0; }
.rp-sub { font-size: 12px; color: var(--tx-5) !important; font-weight: 500 !important; }
</style>
