import { ref, type Ref } from 'vue'
import type { AxiosError }   from 'axios'
import type { ApiError }     from '@/types'

/**
 * API so'rovlari uchun universal wrapper.
 * loading, error holatlarini avtomatik boshqaradi.
 *
 * @example
 * const { data, loading, error, execute } = useApi(recipesApi.getAll)
 * await execute({ page: 0, size: 12 })
 */
export function useApi<TData, TArgs extends unknown[] = []>(
  apiFn: (...args: TArgs) => Promise<{ data: { data: TData } }>,
) {
  const data:    Ref<TData | null> = ref(null)
  const loading: Ref<boolean>      = ref(false)
  const error:   Ref<string | null> = ref(null)

  async function execute(...args: TArgs): Promise<TData | null> {
    loading.value = true
    error.value   = null
    try {
      const res     = await apiFn(...args)
      data.value    = res.data.data
      return data.value
    } catch (e) {
      const axiosErr = e as AxiosError<ApiError>
      error.value    = axiosErr.response?.data?.message
                    ?? axiosErr.message
                    ?? 'Noma\'lum xatolik'
      return null
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    data.value    = null
    error.value   = null
    loading.value = false
  }

  return { data, loading, error, execute, reset }
}

/**
 * Sahifalangan (Page) API so'rovlari uchun wrapper.
 * content[], totalPages, totalElements ni alohida ref sifatida beradi.
 */
export function usePagedApi<TItem, TArgs extends unknown[] = []>(
  apiFn: (...args: TArgs) => Promise<{
    data: {
      data: {
        content: TItem[]
        totalPages: number
        totalElements: number
      }
    }
  }>,
) {
  const items:         Ref<TItem[]> = ref([])
  const totalPages:    Ref<number>  = ref(0)
  const totalElements: Ref<number>  = ref(0)
  const loading:       Ref<boolean> = ref(false)
  const error:         Ref<string | null> = ref(null)

  async function execute(...args: TArgs): Promise<void> {
    loading.value = true
    error.value   = null
    try {
      const res        = await apiFn(...args)
      const page       = res.data.data
      items.value         = page.content
      totalPages.value    = page.totalPages
      totalElements.value = page.totalElements
    } catch (e) {
      const axiosErr = e as AxiosError<ApiError>
      error.value    = axiosErr.response?.data?.message ?? axiosErr.message
      items.value    = []
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
    items.value         = []
    totalPages.value    = 0
    totalElements.value = 0
    error.value         = null
  }

  return { items, totalPages, totalElements, loading, error, execute, reset }
}
