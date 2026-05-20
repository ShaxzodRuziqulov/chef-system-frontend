import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { favoritesApi }  from '@/api/favorites'
import { useToast }      from '@/composables/useToast'

export const useFavoritesStore = defineStore('favorites', () => {
  // ── State ─────────────────────────────────────────────────────────
  const ids        = ref<Set<number>>(new Set())
  const loaded     = ref(false)
  const loading    = ref(false)

  const toast = useToast()

  // ── Getters ───────────────────────────────────────────────────────
  const isFavorited = computed(() => (id: number) => ids.value.has(id))
  const count       = computed(() => ids.value.size)

  // ── Actions ───────────────────────────────────────────────────────

  /** Login bo'lgandan so'ng bir marta chaqiriladi */
  async function loadIds() {
    if (loading.value) return
    loading.value = true
    try {
      const res = await favoritesApi.getIds()
      const list = res.data?.data ?? []
      ids.value = new Set(list)
      loaded.value = true
    } catch {
      // tarmoq xatosi — jimgina o'tkazib yuborish
    } finally {
      loading.value = false
    }
  }

  /** Sevimlilarga qo'shish / o'chirish — optimistik yangilanish */
  async function toggle(recipeId: number) {
    const wasFav = ids.value.has(recipeId)

    // Optimistik yangilanish (server javobini kutmay UI ni o'zgartirish)
    if (wasFav) {
      ids.value.delete(recipeId)
    } else {
      ids.value.add(recipeId)
    }

    try {
      const res     = await favoritesApi.toggle(recipeId)
      const newState = res.data?.data?.favorited ?? !wasFav

      // Server javobi bilan sinxronlash
      if (newState) {
        ids.value.add(recipeId)
        toast.success("Sevimlilarga qo'shildi ❤️")
      } else {
        ids.value.delete(recipeId)
        toast.success('Sevimlilardan o\'chirildi')
      }
    } catch {
      // Xato bo'lsa optimistik o'zgarishni qaytarish
      if (wasFav) ids.value.add(recipeId)
      else        ids.value.delete(recipeId)
      toast.error('Xatolik yuz berdi, qayta urining')
    }
  }

  /** Logout bo'lganda tozalash */
  function clear() {
    ids.value  = new Set()
    loaded.value = false
  }

  return { ids, loaded, loading, isFavorited, count, loadIds, toggle, clear }
})
