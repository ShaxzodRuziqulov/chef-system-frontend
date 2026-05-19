import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

export interface MeasurementUnitDto {
  value:      string         // GRAM, KILOGRAM, ...
  nameUz:     string
  nameRu:     string
  nameEng:    string
  convertAt:  number | null  // 1000 for GRAM, null for others
  convertTo:  string | null  // "KILOGRAM" for GRAM, null for others
  showAmount: boolean        // false = only label, no number (e.g. TO_TASTE)
}

export const unitsApi = {
  getAll: (): Promise<AxiosResponse<ApiResponse<MeasurementUnitDto[]>>> =>
    api.get('/units'),
}
