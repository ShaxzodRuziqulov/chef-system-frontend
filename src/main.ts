import { createApp }    from 'vue'
import { createPinia }  from 'pinia'
import App              from './App.vue'
import router           from './router'
import './style.css'

const app   = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// App yuklanishidan oldin tokenni tekshirib user ni tiklash
import { useAuthStore } from '@/stores/authStore'
const authStore = useAuthStore()

authStore.initialize().finally(() => {
  app.mount('#app')
})
