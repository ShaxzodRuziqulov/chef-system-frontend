import { ref } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  type: ToastType
}

// Module-level singleton — shared across all components
const toasts = ref<Toast[]>([])
let _id = 0

export function useToast() {
  function show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = ++_id
    toasts.value.push({ id, message, type })
    if (duration > 0) setTimeout(() => remove(id), duration)
    return id
  }

  function remove(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  const success = (msg: string, duration?: number) => show(msg, 'success', duration)
  const error   = (msg: string, duration?: number) => show(msg, 'error', duration)
  const warning = (msg: string, duration?: number) => show(msg, 'warning', duration)
  const info    = (msg: string, duration?: number) => show(msg, 'info', duration)

  return { toasts, show, remove, success, error, warning, info }
}
