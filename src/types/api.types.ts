// ─────────────────────────────────────────────────────────────────
// Backend ApiResponseWrapper tomonidan wrap qilingan umumiy javob
// ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success:   boolean
  status:    number
  message?:  string
  data:      T
  timestamp: string
}

// Spring Data Page ob'ekti
export interface Page<T> {
  content:          T[]
  totalPages:       number
  totalElements:    number
  size:             number
  number:           number       // joriy sahifa indeksi (0-based)
  first:            boolean
  last:             boolean
  empty:            boolean
}

// API xatolik javobi
export interface ApiError {
  success: false
  status:  number
  message: string
  data?:   Record<string, string>  // validation field errors
}
