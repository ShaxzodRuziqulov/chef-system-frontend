import { defineStore }      from 'pinia'
import { ref, computed }    from 'vue'
import { useRouter }        from 'vue-router'
import { authApi }          from '@/api/auth'
import { usersApi }         from '@/api/users'
import { tokenStorage }     from '@/api/axios'
import type {
  AuthUserResponse,
  LoginRequest,
  RegisterRequest,
  Role,
} from '@/types'

// ─────────────────────────────────────────────────────────────────
// Tip: store ichidagi xato holati
// ─────────────────────────────────────────────────────────────────
interface AuthError {
  field?: string          // validation field (masalan "email")
  message: string
}

// ─────────────────────────────────────────────────────────────────
// localStorage kalit nomlari
// ─────────────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  ACCESS:  'access_token',
  REFRESH: 'refresh_token',
  USER:    'auth_user',
} as const

// ─────────────────────────────────────────────────────────────────
// localStorage yordamchi funksiyalar
// ─────────────────────────────────────────────────────────────────
const storage = {
  saveTokens(access: string, refresh: string): void {
    localStorage.setItem(STORAGE_KEYS.ACCESS,  access)
    localStorage.setItem(STORAGE_KEYS.REFRESH, refresh)
  },

  saveUser(user: AuthUserResponse): void {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
  },

  loadUser(): AuthUserResponse | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.USER)
      return raw ? (JSON.parse(raw) as AuthUserResponse) : null
    } catch {
      return null
    }
  },

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEYS.ACCESS)
    localStorage.removeItem(STORAGE_KEYS.REFRESH)
    localStorage.removeItem(STORAGE_KEYS.USER)
  },
}

// ─────────────────────────────────────────────────────────────────
// PINIA STORE  (Setup API — Composition API uslubida)
// ─────────────────────────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const router = useRouter()

  // ── State ─────────────────────────────────────────────────────

  /** Tizimga kirgan foydalanuvchi (null = kirish yo'q) */
  const user         = ref<AuthUserResponse | null>(storage.loadUser())

  /** JWT access token */
  const accessToken  = ref<string | null>(localStorage.getItem(STORAGE_KEYS.ACCESS))

  /** JWT refresh token */
  const refreshToken = ref<string | null>(localStorage.getItem(STORAGE_KEYS.REFRESH))

  /** So'rov bajarilayotgan holat */
  const loading      = ref<boolean>(false)

  /** Oxirgi xato */
  const error        = ref<AuthError | null>(null)

  // ── Getters (computed) ────────────────────────────────────────

  /** Foydalanuvchi tizimga kirganmi? */
  const isAuthenticated = computed<boolean>(
    () => !!accessToken.value && !!user.value,
  )

  /** Foydalanuvchi ADMIN rolida mi? */
  const isAdmin = computed<boolean>(
    () => user.value?.roles === 'ADMIN',
  )

  /** Foydalanuvchi BLOGGER rolida mi? */
  const isBlogger = computed<boolean>(
    () => user.value?.roles === 'BLOGGER' || user.value?.roles === 'ADMIN',
  )

  /** To'liq ism yoki "Foydalanuvchi" */
  const displayName = computed<string>(
    () => user.value?.fullName || 'Foydalanuvchi',
  )

  /** Avatar URL yoki null (backend snake_case yoki camelCase qaytarishi mumkin) */
  const avatarUrl = computed<string | null>(
    () => user.value?.avatar_url ?? (user.value as any)?.avatarUrl ?? null,
  )

  /** Initials (avatar yo'q bo'lsa ko'rsatish uchun) */
  const initials = computed<string>(() => {
    const name = user.value?.fullName ?? ''
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(w => w[0].toUpperCase())
      .join('')
      || '?'
  })

  /** Joriy foydalanuvchi roli */
  const role = computed<Role | null>(() => user.value?.roles ?? null)

  // ── Ichki yordamchi ───────────────────────────────────────────

  /**
   * State va localStorage ni bir vaqtda yangilash.
   * Barcha actionlar shu funksiyani ishlatadi.
   */
  function _persistTokens(access: string, refresh: string): void {
    accessToken.value  = access
    refreshToken.value = refresh
    storage.saveTokens(access, refresh)
    // tokenStorage (axios.ts interceptors uchun ham sync)
    tokenStorage.setTokens(access, refresh)
  }

  function _persistUser(u: AuthUserResponse): void {
    user.value = u
    storage.saveUser(u)
  }

  function _clearState(): void {
    user.value         = null
    accessToken.value  = null
    refreshToken.value = null
    error.value        = null
    storage.clearAll()
    tokenStorage.clear()
    // Sevimlilar holatini tozalash (import cycle oldini olish uchun dynamic import)
    import('@/stores/favoritesStore').then(({ useFavoritesStore }) => {
      useFavoritesStore().clear()
    })
  }

  // ── Actions ───────────────────────────────────────────────────

  /**
   * LOGIN
   * POST /api/auth/login
   * Backend: ApiResponse<AuthTokenResponse>
   *   → { access_token, refresh_token, user: AuthUserResponse }
   *
   * @returns null — muvaffaqiyatli, string — xato xabari
   */
  async function login(credentials: LoginRequest, redirectTo?: string): Promise<string | null> {
    loading.value = true
    error.value   = null

    try {
      const response = await authApi.login(credentials)

      // DEBUG: Backenddan kelayotgan javobni ko'rish uchun
      console.log('[authStore] login raw response:', response.data)

      // Backend javob strukturasini moslashuvchan o'qish:
      // 1) { data: { access_token, refresh_token, user } }  ← ApiResponse wrapper
      // 2) { access_token, refresh_token, user }             ← to'g'ridan-to'g'ri
      const rawData = response.data
      const payload = (rawData as any)?.data ?? rawData

      console.log('[authStore] parsed payload:', payload)

      if (!payload?.access_token) {
        throw new Error('access_token topilmadi')
      }

      // Tokenlarni state + localStorage ga saqlash
      _persistTokens(payload.access_token, payload.refresh_token)

      // Foydalanuvchi ma'lumotlarini state + localStorage ga saqlash
      _persistUser(payload.user)

      // Login muvaffaqiyatli — redirect yoki Home (dashboard) ga yo'naltirish
      await router.push(redirectTo && redirectTo !== '/' ? redirectTo : { name: 'Home' })
      return null

    } catch (err: unknown) {
      console.error('[authStore] login error:', err)
      const axiosErr = err as {
        response?: { data?: { message?: string; status?: number } }
      }
      const message  = axiosErr.response?.data?.message ?? "Username yoki parol noto'g'ri"
      error.value    = { message }
      return message

    } finally {
      loading.value = false
    }
  }

  /**
   * REGISTER
   * POST /api/auth/register
   * Backend: ApiResponse<AuthResponse>
   *   → { accessToken, refreshToken, expiresIn, user: UserDto }
   *   ⚠ Register javobida field nomlari camelCase (login snake_case emas!)
   *
   * @returns null — muvaffaqiyatli, string — xato xabari
   */
  async function register(data: RegisterRequest, redirectTo?: string): Promise<string | null> {
    loading.value = true
    error.value   = null

    try {
      const response = await authApi.register(data)

      // Backend ApiResponse<AuthResponse> yoki to'g'ridan-to'g'ri AuthResponse (camelCase)
      const payload  = (response.data as any)?.data ?? response.data

      // Register → AuthResponse.user bu UserDto (login dan farqi)
      // Uni AuthUserResponse formatiga moslashtirish
      const userPayload: AuthUserResponse = {
        id:         payload.user.id,
        fullName:   payload.user.fullName,
        roles:      payload.user.role,
        avatar_url: payload.user.avatarUrl,
      }

      _persistTokens(payload.accessToken, payload.refreshToken)
      _persistUser(userPayload)

      await router.push(redirectTo && redirectTo !== '/' ? redirectTo : { name: 'Home' })
      return null

    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; data?: Record<string, string> } }
      }
      const apiData  = axiosErr.response?.data
      const message  = apiData?.message ?? "Ro'yxatdan o'tishda xatolik"
      error.value    = { message }
      return message

    } finally {
      loading.value = false
    }
  }

  /**
   * FETCH USER  (profil ma'lumotlarini yangilash)
   * GET /api/auth/me
   * Backend: ApiResponse<AuthUserResponse>
   *
   * App yuklanayotganda yoki profil sahifasida chaqiriladi.
   */
  async function fetchUser(): Promise<void> {
    if (!accessToken.value) return

    loading.value = true
    error.value   = null

    try {
      const response = await authApi.me()

      // Backend ApiResponse<AuthUserResponse> yoki to'g'ridan-to'g'ri AuthUserResponse
      const userData = (response.data as any)?.data ?? response.data
      _persistUser(userData)

    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number } }
      // 401 bo'lsa axios interceptor o'zi handle qiladi (logout + redirect)
      // Boshqa xatolarda faqat log
      if (axiosErr.response?.status !== 401) {
        console.warn('[authStore] fetchUser xatosi:', err)
      }

    } finally {
      loading.value = false
    }
  }

  /**
   * UPDATE PROFILE
   * PATCH /api/auth/profile
   * @returns null — muvaffaqiyatli, string — xato xabari
   */
  async function updateProfile(data: { fullName?: string; avatarUrl?: string }): Promise<string | null> {
    loading.value = true
    error.value   = null

    try {
      const response = await authApi.updateProfile(data)
      const userData = (response.data as any)?.data ?? response.data
      _persistUser(userData)
      return null

    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message  = axiosErr.response?.data?.message ?? 'Saqlashda xatolik yuz berdi'
      error.value    = { message }
      return message

    } finally {
      loading.value = false
    }
  }

  /**
   * LOGOUT
   * POST /api/auth/logout  (serverga refresh token yuboriladi)
   * Keyin state + localStorage tozalanadi
   */
  async function logout(): Promise<void> {
    loading.value = true

    try {
      if (refreshToken.value) {
        // Server tarafda tokenni bekor qilish
        await authApi.logout(refreshToken.value).catch(() => {
          // Server o'chiq bo'lsa ham local state tozalansin
        })
      }
    } finally {
      _clearState()
      loading.value = false
      await router.push({ name: 'Landing' })
    }
  }

  /**
   * INITIALIZE  (app.mount() dan oldin chaqiriladi)
   * localStorage da token bo'lsa user ma'lumotlarini serverdan yangilaydi.
   * Bu route guard uchun isAuthenticated ni to'g'ri ko'rsatadi.
   */
  async function initialize(): Promise<void> {
    if (accessToken.value && !user.value) {
      await fetchUser()
    }
  }

  /**
   * BECOME BLOGGER — shartlarga rozilik berib, BLOGGER bo'lish
   * @returns null — muvaffaqiyatli, string — xato xabari
   */
  async function becomeBlogger(): Promise<string | null> {
    loading.value = true
    error.value   = null
    try {
      const response = await usersApi.becomeBlogger()
      const userData = (response.data as any)?.data ?? response.data
      // Rolni yangilash: UserDto formatidan AuthUserResponse ga moslashtirish
      const updated: AuthUserResponse = {
        ...user.value!,
        roles: userData.role ?? userData.roles ?? 'BLOGGER',
      }
      _persistUser(updated)
      return null
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      const message  = axiosErr.response?.data?.message ?? 'Xatolik yuz berdi'
      error.value    = { message }
      return message
    } finally {
      loading.value = false
    }
  }

  /**
   * Xatoni tozalash (form submit oldidan chaqirish mumkin)
   */
  function clearError(): void {
    error.value = null
  }

  // ── Eksport ───────────────────────────────────────────────────
  return {
    // State
    user,
    accessToken,
    refreshToken,
    loading,
    error,

    // Getters
    isAuthenticated,
    isAdmin,
    isBlogger,
    displayName,
    avatarUrl,
    initials,
    role,

    // Actions
    login,
    register,
    logout,
    fetchUser,
    updateProfile,
    becomeBlogger,
    initialize,
    clearError,
  }
})
