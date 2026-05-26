import api from './axios'
import type { AxiosResponse } from 'axios'
import type { ApiResponse } from '@/types'

export const uploadApi = {
  image: (file: File): Promise<AxiosResponse<ApiResponse<{ url: string }>>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/image', formData, {
      headers: { 'Content-Type': undefined },
    })
  },

  video: (file: File, onProgress?: (pct: number) => void): Promise<AxiosResponse<ApiResponse<{ url: string }>>> => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/upload/video', formData, {
      headers: { 'Content-Type': undefined },
      onUploadProgress: onProgress
        ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total ?? e.loaded)))
        : undefined,
    })
  },
}
