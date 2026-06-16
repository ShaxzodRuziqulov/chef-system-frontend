import api from './axios'
import type { AxiosResponse, AxiosProgressEvent } from 'axios'
import type { ApiResponse } from '@/types'

const MAX_IMG_BYTES   = 5  * 1024 * 1024  // 5 MB
const MAX_VIDEO_BYTES = 200 * 1024 * 1024 // 200 MB

const ALLOWED_IMG   = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const ALLOWED_VIDEO = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'])

// FormData so'rov uchun Content-Type ni olib tashlash kerak —
// brauzer o'zi multipart/form-data; boundary=... qo'yadi.
function formDataConfig(onProgress?: (pct: number) => void) {
  return {
    headers: { 'Content-Type': undefined as any },
    timeout: 120_000,
    onUploadProgress: onProgress
      ? (e: AxiosProgressEvent) => {
          const pct = e.total ? Math.round((e.loaded * 100) / e.total) : 0
          onProgress(pct)
        }
      : undefined,
  }
}

export class UploadError extends Error {
  constructor(message: string) { super(message); this.name = 'UploadError' }
}

export const uploadApi = {
  image: (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<AxiosResponse<ApiResponse<{ url: string }>>> => {
    if (!ALLOWED_IMG.has(file.type))
      return Promise.reject(new UploadError('Faqat JPEG, PNG, WEBP, GIF formatlari qabul qilinadi'))
    if (file.size > MAX_IMG_BYTES)
      return Promise.reject(new UploadError(`Rasm hajmi ${Math.round(file.size / 1024 / 1024 * 10) / 10} MB — 5 MB dan oshmasligi kerak`))

    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/image', form, formDataConfig(onProgress))
  },

  video: (
    file: File,
    onProgress?: (pct: number) => void,
  ): Promise<AxiosResponse<ApiResponse<{ url: string }>>> => {
    if (!ALLOWED_VIDEO.has(file.type))
      return Promise.reject(new UploadError('Faqat MP4, WebM, MOV, AVI formatlari qabul qilinadi'))
    if (file.size > MAX_VIDEO_BYTES)
      return Promise.reject(new UploadError('Video hajmi 200 MB dan oshmasligi kerak'))

    const form = new FormData()
    form.append('file', file)
    return api.post('/upload/video', form, formDataConfig(onProgress))
  },
}
