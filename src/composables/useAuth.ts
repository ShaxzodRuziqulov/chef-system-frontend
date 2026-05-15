import { ref, computed, type Ref } from 'vue'
import { useRouter }               from 'vue-router'
import { authApi }                 from '@/api/auth'
import { tokenStorage }            from '@/api/axios'
import type {
  AuthUserResponse,
  LoginRequest,
  RegisterRequest,
} from '@/types'
import type { AxiosError } from 'axios'

// Singleton: butun app uchun bitta holat
const currentUser: Ref<AuthUserResponse | null> = ref(null)
const authLoading: Ref<boolean>                  = ref(false)

export function useAuth() {
  const router = useRouter()

  const isLoggedIn = computed(() => !!tokenStorage.getAccess())
  const isAdmin    = computed(() => currentUser.value?.roles === 'ADMIN')

  // ── Login ───────────────────────────────────────────────────────
  async function login(credentials: LoginRequest): Promise<string | null> {
    authLoading.value = true
    try {
      const res     = await authApi.login(credentials)
      const payload = res.data.data
      tokenStorage.setTokens(payload.access_token, payload.refresh_token)
      currentUser.value = payload.user
      localStorage.setItem('user', JSON.stringify(payload.user))
      await router.push('/')
      return null
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      return err.response?.data?.message ?? "Username yoki parol noto'g'ri"
    } finally {
      authLoading.value = false
    }
  }

  // ── Register ────────────────────────────────────────────────────
  async function register(data: RegisterRequest): Promise<string | null> {
    authLoading.value = true
    try {
      const res     = await authApi.register(data)
      const payload = res.data.data
      tokenStorage.setTokens(payload.accessToken, payload.refreshToken)
      localStorage.setItem('user', JSON.stringify(payload.user))
      await router.push('/')
      return null
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      return err.response?.data?.message ?? "Ro'yxatdan o'tishda xatolik"
    } finally {
      authLoading.value = false
    }
  }

  // ── Logout ──────────────────────────────────────────────────────
  async function logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefresh()
    if (refreshToken) {
      await authApi.logout(refreshToken).catch(() => {})
    }
    tokenStorage.clear()
    currentUser.value = null
    await router.push('/login')
  }

  // ── Foydalanuvchini yuklab olish ────────────────────────────────
  async function fetchMe(): Promise<void> {
    if (!tokenStorage.getAccess()) return
    try {
      const res = await authApi.me()
      currentUser.value = res.data.data
      localStorage.setItem('user', JSON.stringify(res.data.data))
    } catch {
      // token eskirgan — interceptor o'zi yo'naltiradi
    }
  }

  // Sahifa yuklanganda localStorage dan user ni tiklash
  function restoreUser(): void {
    const stored = localStorage.getItem('user')
    if (stored && !currentUser.value) {
      try { currentUser.value = JSON.parse(stored) as AuthUserResponse }
      catch { /* noto'g'ri JSON */ }
    }
  }

  return {
    currentUser,
    isLoggedIn,
    isAdmin,
    authLoading,
    login,
    register,
    logout,
    fetchMe,
    restoreUser,
  }
}
