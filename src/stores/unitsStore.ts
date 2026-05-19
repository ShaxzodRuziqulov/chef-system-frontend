import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { unitsApi, type MeasurementUnitDto } from '@/api/units'
import { useLangStore } from './langStore'

export const useUnitsStore = defineStore('units', () => {
  const units  = ref<MeasurementUnitDto[]>([])
  const loaded = ref(false)

  /** Bir marta yuklab oladi */
  async function load() {
    if (loaded.value) return
    try {
      const res  = await unitsApi.getAll()
      units.value = res.data?.data ?? res.data ?? []
      loaded.value = true
    } catch {
      // Fallback: bo'sh qoldirsa ham app ishlaydi
    }
  }

  /** Map: value → dto (tezkor qidirish uchun) */
  const unitMap = computed<Record<string, MeasurementUnitDto>>(() => {
    const m: Record<string, MeasurementUnitDto> = {}
    units.value.forEach(u => { m[u.value] = u })
    return m
  })

  /** Birlik labelini joriy tilda qaytaradi */
  function label(value: string): string {
    const lang = useLangStore()
    const u = unitMap.value[value]
    if (!u) return value
    if (lang.lang === 'ru') return u.nameRu
    if (lang.lang === 'en') return u.nameEng
    return u.nameUz
  }

  /**
   * Miqdor + birlikni chiroyli ko'rsatadi.
   * Konvertatsiya backend meta'dan o'qiladi:
   *   600 GRAM → "600 g"
   *  1000 GRAM → "1 kg"
   *  1500 GRAM → "1.5 kg"
   *    40 MILLILITER → "40 ml"
   *  1000 MILLILITER → "1 l"
   */
  function formatAmount(amount: number | null | undefined, unitValue: string): string {
    const u = unitMap.value[unitValue]

    // showAmount=false bo'lsa son ko'rsatilmaydi (masalan TO_TASTE)
    if (u && !u.showAmount) return label(unitValue)

    if (amount == null) return label(unitValue)

    let val = Number(amount)
    let key = unitValue

    // Konvertatsiya meta'sini backenddan o'qiymiz
    if (u?.convertAt != null && u.convertTo && val >= u.convertAt) {
      val = val / u.convertAt
      key = u.convertTo
    }

    // Soni formatlash: 1.50 → 1.5, 1.00 → 1
    const numStr = val % 1 === 0
      ? val.toFixed(0)
      : parseFloat(val.toFixed(2)).toString()

    return `${numStr} ${label(key)}`
  }

  /** Select uchun { value, label } ro'yxati */
  const selectOptions = computed(() =>
    units.value.map(u => ({ value: u.value, label: label(u.value) }))
  )

  return { units, loaded, load, label, formatAmount, selectOptions, unitMap }
})
