import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
  type AxiosError,
} from 'axios'
import type { ApiResponse, ApiError, TokenPairResponse } from '@/types'

// ─────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────

const TOKEN_KEY   = 'access_token'
const REFRESH_KEY = 'refresh_token'

export const tokenStorage = {
  getAccess:     (): string | null => localStorage.getItem(TOKEN_KEY),
  getRefresh:    (): string | null => localStorage.getItem(REFRESH_KEY),
  setAccess:     (t: string): void  => localStorage.setItem(TOKEN_KEY, t),
  setRefresh:    (t: string): void  => localStorage.setItem(REFRESH_KEY, t),
  setTokens:     (access: string, refresh: string): void => {
    localStorage.setItem(TOKEN_KEY,   access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: (): void => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    localStorage.removeItem('user')
  },
}

// ─────────────────────────────────────────────────────────────────
// Axios instance
// ─────────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  // .env dan olinadi: VITE_API_BASE_URL=http://localhost:8090/api
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  },
})

// ─────────────────────────────────────────────────────────────────
// REQUEST interceptor — har so'rovga Bearer token qo'shish
// ─────────────────────────────────────────────────────────────────

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccess()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error: AxiosError) => Promise.reject(error),
)

// ─────────────────────────────────────────────────────────────────
// Token yangilash uchun navbat (race condition oldini olish)
// Bir vaqtda bir nechta so'rov 401 kelsa, bittasi refresh qiladi,
// qolganlari navbatda kutadi.
// ─────────────────────────────────────────────────────────────────

let isRefreshing  = false
let pendingQueue: Array<{
  resolve: (token: string) => void
  reject:  (err: unknown)  => void
}> = []

function processPendingQueue(error: unknown, token: string | null): void {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token!)
  )
  pendingQueue = []
}

// ─────────────────────────────────────────────────────────────────
// RESPONSE interceptor — xatolarni markaziy boshqarish
// ─────────────────────────────────────────────────────────────────

api.interceptors.response.use(
  // ── Muvaffaqiyatli javob ─────────────────────────────────────
  (response: AxiosResponse) => response,

  // ── Xatolik ─────────────────────────────────────────────────
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean
    }

    // ── 401 Unauthorized: token yangilash ──────────────────────
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = tokenStorage.getRefresh()

      // Refresh token ham yo'q → loginga yo'naltir
      if (!refreshToken) {
        redirectToLogin()
        return Promise.reject(error)
      }

      // Boshqa so'rov allaqachon refresh qilyapti → navbatga qo'sh
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          pendingQueue.push({
            resolve: (newToken: string) => {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
              resolve(api(originalRequest))
            },
            reject,
          })
        })
      }

      // Bu so'rov refresh qiladi
      originalRequest._retry = true
      isRefreshing = true

      try {
        const { data } = await axios.post<ApiResponse<TokenPairResponse>>(
          `${import.meta.env.VITE_API_BASE_URL ?? '/api'}/auth/refresh`,
          { refresh_token: refreshToken },
        )

        const tokens = data.data
        tokenStorage.setTokens(tokens.access_token, tokens.refresh_token)

        // Navbatdagi so'rovlarga yangi tokenni ber
        processPendingQueue(null, tokens.access_token)

        // Asl so'rovni qayta yubor
        originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`
        return api(originalRequest)

      } catch (refreshError) {
        processPendingQueue(refreshError, null)
        tokenStorage.clear()
        redirectToLogin()
        return Promise.reject(refreshError)

      } finally {
        isRefreshing = false
      }
    }

    // ── 403 Forbidden ──────────────────────────────────────────
    if (error.response?.status === 403) {
      console.warn('[API] 403 Forbidden:', originalRequest.url)
    }

    // ── 404 Not Found ──────────────────────────────────────────
    if (error.response?.status === 404) {
      console.warn('[API] 404 Not Found:', originalRequest.url)
    }

    // ── 422 / 400 Validation ───────────────────────────────────
    if (error.response?.status === 400 || error.response?.status === 422) {
      const msg = error.response.data?.message
      console.warn('[API] Validation error:', msg, error.response.data?.data)
    }

    // ── 409 Conflict ───────────────────────────────────────────
    if (error.response?.status === 409) {
      console.warn('[API] Conflict:', error.response.data?.message)
    }

    // ── 5xx Server error ───────────────────────────────────────
    if ((error.response?.status ?? 0) >= 500) {
      console.error('[API] Server error:', error.response?.status, originalRequest.url)
    }

    // ── Network error (backend o'chiq) ─────────────────────────
    if (!error.response) {
      console.error('[API] Network error — backend ishlamayapti yoki CORS:', error.message)
    }

    return Promise.reject(error)
  },
)

// ─────────────────────────────────────────────────────────────────
// Loginga yo'naltirish (import qilib router ishlatmaslik uchun)
// ─────────────────────────────────────────────────────────────────

function redirectToLogin(): void {
  const currentPath = window.location.pathname
  if (currentPath !== '/login' && currentPath !== '/register') {
    window.location.replace('/login')
  }
}

export default api
