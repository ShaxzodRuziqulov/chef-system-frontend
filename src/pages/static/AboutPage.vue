<script setup>
import { ref, onMounted } from 'vue'
import { useRouter }      from 'vue-router'
import { platformApi }    from '@/api/platform'

const router = useRouter()
const stats  = ref({ totalRecipes: 0, totalUsers: 0, totalCategories: 0 })

onMounted(async () => {
  try {
    const res  = await platformApi.getStats()
    const data = res.data?.data ?? res.data
    if (data) stats.value = data
  } catch { /* ignore */ }
})

function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K+'
  return n > 0 ? n + '+' : '—'
}
</script>

<template>
  <div class="about">

    <button @click="router.back()" class="back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      Orqaga
    </button>

    <!-- Hero -->
    <div class="hero">
      <div class="hero-emoji">👨‍🍳</div>
      <h1 class="hero-title">Biz haqimizda</h1>
      <p class="hero-sub">OshPaz — oilangiz uchun pishirishning eng oson yo'li</p>
    </div>

    <!-- Cards -->
    <div class="cards">
      <div class="card">
        <span class="card-icon">🎯</span>
        <h2 class="card-title">Maqsadimiz</h2>
        <p class="card-text">
          OshPaz O'zbekiston va dunyo bo'ylab barcha oshpazlar uchun yaratilgan.
          An'anaviy milliy taomlardan zamonaviy xalqaro retseptlargacha — barchasini
          bir joyda topasiz.
        </p>
      </div>

      <div class="card">
        <span class="card-icon">🌱</span>
        <h2 class="card-title">Tariximiz</h2>
        <p class="card-text">
          2024-yilda tashkil etilgan OshPaz loyihasi ishtiyoqli jamoa tomonidan
          ishga tushirildi. Bugun yuzlab retseptlar va minglab foydalanuvchilar
          bilan o'sib bormoqdamiz.
        </p>
      </div>

      <div class="card">
        <span class="card-icon">🤝</span>
        <h2 class="card-title">Jamoamiz</h2>
        <p class="card-text">
          Kichik lekin ishtiyoqli jamoadamiz. Har birimiz taom pishirishni sevamiz
          va bu sevgimizni texnologiya orqali boshqalarga yetkazishga harakat qilamiz.
        </p>
      </div>

      <div class="card">
        <span class="card-icon">📍</span>
        <h2 class="card-title">Manzilimiz</h2>
        <p class="card-text">
          O'zbekiston, Toshkent shahri.<br/>
          Bog'lanish uchun:
          <a href="mailto:janobprizident@gmail.com" class="ilink">janobprizident@gmail.com</a>
        </p>
      </div>
    </div>

    <!-- Real stats -->
    <div class="stats">
      <div class="stat">
        <span class="stat-num">{{ fmt(stats.totalRecipes) }}</span>
        <span class="stat-lbl">Retseptlar</span>
      </div>
      <div class="stat-div"/>
      <div class="stat">
        <span class="stat-num">{{ fmt(stats.totalUsers) }}</span>
        <span class="stat-lbl">Foydalanuvchilar</span>
      </div>
      <div class="stat-div"/>
      <div class="stat">
        <span class="stat-num">{{ stats.totalCategories || '—' }}</span>
        <span class="stat-lbl">Kategoriyalar</span>
      </div>
      <div class="stat-div"/>
      <div class="stat">
        <span class="stat-num">3</span>
        <span class="stat-lbl">Til</span>
      </div>
    </div>

  </div>
</template>

<style scoped>
.about {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.back-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx-5);
  cursor: pointer;
  padding: 0;
  width: fit-content;
  transition: color 0.18s;
}
.back-btn svg   { width: 16px; height: 16px; }
.back-btn:hover { color: #E8713E; }

/* Hero */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 48px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  text-align: center;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
}
.hero-emoji { font-size: 52px; line-height: 1; }
.hero-title {
  font-size: 30px;
  font-weight: 900;
  color: var(--tx-1);
  margin: 0;
  letter-spacing: -0.5px;
}
.hero-sub {
  font-size: 15px;
  color: var(--tx-4);
  margin: 0;
  max-width: 400px;
  line-height: 1.65;
}

/* Cards */
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: border-color 0.2s, transform 0.2s;
}
.card:hover { border-color: rgba(216,90,48,0.25); transform: translateY(-2px); }
.card-icon  { font-size: 26px; line-height: 1; }
.card-title { font-size: 15px; font-weight: 800; color: var(--tx-1); margin: 0; }
.card-text  { font-size: 14px; color: var(--tx-4); line-height: 1.7; margin: 0; }
.ilink      { color: #E8713E; text-decoration: none; font-weight: 600; }
.ilink:hover { text-decoration: underline; }

/* Stats */
.stats {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 28px 32px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.05);
  flex-wrap: wrap;
  gap: 20px;
}
.stat      { display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; min-width: 80px; }
.stat-num  { font-size: 28px; font-weight: 900; color: #E8713E; letter-spacing: -1px; line-height: 1; }
.stat-lbl  { font-size: 12px; font-weight: 600; color: var(--tx-5); }
.stat-div  { width: 1px; height: 40px; background: var(--bd); flex-shrink: 0; }

@media (max-width: 600px) {
  .cards    { grid-template-columns: 1fr; }
  .hero     { padding: 36px 20px; }
  .hero-title { font-size: 24px; }
  .stats    { gap: 16px; padding: 20px; }
  .stat-div { display: none; }
}
</style>
