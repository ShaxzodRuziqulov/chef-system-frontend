import { defineStore } from 'pinia'
import { ref } from 'vue'

const THEME_KEY = 'oshpaz_theme'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem(THEME_KEY) !== 'light')

  function apply() {
    document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light')
  }

  function toggle() {
    isDark.value = !isDark.value
    localStorage.setItem(THEME_KEY, isDark.value ? 'dark' : 'light')
    apply()
  }

  apply()

  return { isDark, toggle }
})
