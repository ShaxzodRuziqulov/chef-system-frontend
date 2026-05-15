import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

export const uploadApi = {
  /**
   * Rasm fayl yuklash
   * POST /api/upload/image
   * @returns { url: "http://localhost:8090/uploads/images/filename.jpg" }
   */
  image: (file: File): Promise<AxiosResponse<ApiResponse<{ url: string }>>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}
