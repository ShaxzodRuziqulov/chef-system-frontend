import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'

// Route meta tiplarini kengaytirish
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?:  boolean   // true → faqat login qilganlar
    requiresAdmin?: boolean   // true → faqat adminlar
    guestOnly?:     boolean   // true → faqat login qilmaganlar (login/register)
    title?:         string    // <title> uchun
  }
}

const routes: RouteRecordRaw[] = [
  // ── Landing (public) ────────────────────────────────────────────
  {
    path:      '/',
    name:      'Landing',
    component: () => import('@/pages/LandingPage.vue'),
    meta:      { guestOnly: true, title: 'OshPaz — Ovqatlar dunyosi' },
  },

  // ── Auth ────────────────────────────────────────────────────────
  {
    path:      '/login',
    name:      'Login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta:      { guestOnly: true, title: 'Kirish' },
  },
  {
    path:      '/register',
    name:      'Register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta:      { guestOnly: true, title: "Ro'yxatdan o'tish" },
  },

  // ── Asosiy sahifalar (MainLayout ichida) ────────────────────────
  {
    path:      '/app',
    component: () => import('@/layouts/MainLayout.vue'),
    children:  [
      {
        path:      '',
        name:      'Home',
        component: () => import('@/pages/HomePage.vue'),
        meta:      { requiresAuth: true, title: 'Asosiy' },
      },
      {
        path:      'recipes',
        name:      'Recipes',
        component: () => import('@/pages/recipes/RecipesPage.vue'),
        meta:      { requiresAuth: true, title: 'Retseptlar' },
      },
      {
        path:      'recipes/:id',
        name:      'RecipeDetail',
        component: () => import('@/pages/recipes/RecipeDetailPage.vue'),
        meta:      { requiresAuth: true, title: 'Retsept' },
      },
      {
        path:         'meal-plans',
        name:         'MealPlans',
        component:    () => import('@/pages/meal/MealPlanPage.vue'),
        meta:         { requiresAuth: true, title: 'Haftalik reja' },
      },
      {
        path:         'shopping-lists',
        name:         'ShoppingLists',
        component:    () => import('@/pages/shopping/ShoppingListPage.vue'),
        meta:         { requiresAuth: true, title: 'Xarid ro\'yxati' },
      },
      {
        path:         'saved',
        name:         'Saved',
        component:    () => import('@/pages/SavedPage.vue'),
        meta:         { requiresAuth: true, title: 'Sevimlilar' },
      },
      {
        path:         'profile',
        name:         'Profile',
        component:    () => import('@/pages/ProfilePage.vue'),
        meta:         { requiresAuth: true, title: 'Profil' },
      },
      {
        path:         'admin',
        name:         'Admin',
        component:    () => import('@/pages/AdminPage.vue'),
        meta:         { requiresAuth: true, requiresAdmin: true, title: 'Admin Panel' },
      },
    ],
  },

  // ── 404 ─────────────────────────────────────────────────────────
  { path: '/:pathMatch(.*)*', redirect: { name: 'Landing' } },
]

const router = createRouter({
  history:       createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0, behavior: 'smooth' }),
})

// ── Navigation Guard ────────────────────────────────────────────
router.beforeEach((to) => {
  const auth = useAuthStore()

  // Himoyalangan sahifa → login talab qilinadi
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }

  // Admin sahifasi → faqat adminlar kirishi mumkin
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'Home' }
  }

  // Login/Register sahifasi → allaqachon kirgan foydalanuvchini yubormaslik
  if (to.meta.guestOnly && auth.isAuthenticated) {
    return { name: 'Home' }
  }
})

// ── Sahifa sarlavhasi ───────────────────────────────────────────
router.afterEach((to) => {
  const appTitle = import.meta.env.VITE_APP_TITLE ?? 'Oshpaz'
  document.title  = to.meta.title
    ? `${to.meta.title} | ${appTitle}`
    : appTitle
})

export default router
