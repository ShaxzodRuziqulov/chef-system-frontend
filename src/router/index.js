import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // Auth sahifalari
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { guest: true },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta: { guest: true },
  },

  // Asosiy sahifalar (layout ichida)
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/pages/HomePage.vue'),
      },
      {
        path: 'recipes',
        name: 'Recipes',
        component: () => import('@/pages/recipes/RecipesPage.vue'),
      },
      {
        path: 'recipes/:id',
        name: 'RecipeDetail',
        component: () => import('@/pages/recipes/RecipeDetailPage.vue'),
      },
      {
        path: 'meal-plans',
        name: 'MealPlans',
        component: () => import('@/pages/meal/MealPlanPage.vue'),
        meta: { auth: true },
      },
      {
        path: 'shopping-lists',
        name: 'ShoppingLists',
        component: () => import('@/pages/shopping/ShoppingListPage.vue'),
        meta: { auth: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/ProfilePage.vue'),
        meta: { auth: true },
      },
    ],
  },

  // 404
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Navigation guard
router.beforeEach((to) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.auth && !token) return { name: 'Login' }
  if (to.meta.guest && token)  return { name: 'Home' }
})

export default router
