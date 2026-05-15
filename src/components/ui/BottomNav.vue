<script setup>
const nav = [
  { icon: '🏠', label: 'Asosiy',   to: '/' },
  { icon: '🍽️', label: 'Retsept',  to: '/recipes' },
  { icon: '📅', label: 'Reja',     to: '/meal-plans' },
  { icon: '🛒', label: 'Xarid',    to: '/shopping-lists' },
  { icon: '👤', label: 'Profil',   to: '/profile' },
]
</script>

<template>
  <nav class="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 z-20
              flex items-stretch h-16 px-2">
    <RouterLink
      v-for="item in nav"
      :key="item.to"
      :to="item.to"
      class="flex-1 flex flex-col items-center justify-center gap-0.5 text-slate-500
             hover:text-primary-600 transition-colors rounded-xl"
      :class="{
        'text-primary-600':
          item.to === '/' ? $route.path === '/' : $route.path.startsWith(item.to)
      }"
    >
      <span class="text-xl leading-none">{{ item.icon }}</span>
      <span class="text-[10px] font-medium">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
