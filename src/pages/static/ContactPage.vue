<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="contact-page">

    <button @click="router.back()" class="back-btn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      Orqaga
    </button>

    <div class="hero">
      <div class="hero-emoji">💬</div>
      <h1 class="hero-title">Bog'lanish</h1>
      <p class="hero-sub">Savol yoki taklifingiz bo'lsa — bemalol yozing</p>
    </div>

    <div class="cards">

      <a href="mailto:janobprizident@gmail.com" class="card">
        <div class="card-icon-wrap card-icon-wrap--email">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
        <div class="card-body">
          <span class="card-label">Elektron pochta</span>
          <span class="card-value">janobprizident@gmail.com</span>
          <span class="card-hint">Istalgan vaqt yozing — 24 soat ichida javob</span>
        </div>
        <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </a>

      <a href="https://t.me/RuziqulovShaxzod" target="_blank" rel="noopener" class="card">
        <div class="card-icon-wrap card-icon-wrap--tg">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.26 13.617l-2.969-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.897.942z"/>
          </svg>
        </div>
        <div class="card-body">
          <span class="card-label">Telegram</span>
          <span class="card-value">@RuziqulovShaxzod</span>
          <span class="card-hint">Tezroq javob olish uchun telegramga yozing</span>
        </div>
        <svg class="card-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
        </svg>
      </a>

    </div>

    <p class="note">Ish vaqti: Dushanba–Juma, 09:00–18:00 (Toshkent vaqti)</p>

  </div>
</template>

<style scoped>
.contact-page {
  max-width: 600px;
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

.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 44px 24px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  text-align: center;
}
.hero-emoji { font-size: 48px; line-height: 1; }
.hero-title { font-size: 28px; font-weight: 900; color: var(--tx-1); margin: 0; letter-spacing: -0.4px; }
.hero-sub   { font-size: 14px; color: var(--tx-4); margin: 0; line-height: 1.6; }

.cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 22px;
  background: var(--bg-card);
  border: 1.5px solid var(--bd);
  border-radius: 20px;
  text-decoration: none;
  transition: border-color 0.2s, transform 0.18s, box-shadow 0.2s;
  cursor: pointer;
}
.card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

.card-icon-wrap {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.card-icon-wrap svg { width: 24px; height: 24px; }

.card-icon-wrap--email {
  background: rgba(216,90,48,0.12);
  border: 1px solid rgba(216,90,48,0.2);
  color: #E8713E;
}
.card:hover .card-icon-wrap--email {
  background: rgba(216,90,48,0.18);
}

.card-icon-wrap--tg {
  background: rgba(41,182,246,0.12);
  border: 1px solid rgba(41,182,246,0.2);
  color: #29b6f6;
}
.card:hover .card-icon-wrap--tg {
  background: rgba(41,182,246,0.18);
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.card-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--tx-5);
  text-transform: uppercase;
  letter-spacing: 0.07em;
}
.card-value {
  font-size: 15px;
  font-weight: 800;
  color: var(--tx-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-hint {
  font-size: 12px;
  color: var(--tx-5);
  line-height: 1.4;
}

.card-arrow {
  width: 18px;
  height: 18px;
  color: var(--tx-6);
  flex-shrink: 0;
  transition: color 0.18s, transform 0.18s;
}
.card:hover .card-arrow {
  color: var(--tx-3);
  transform: translateX(3px);
}

.note {
  text-align: center;
  font-size: 12px;
  color: var(--tx-6);
  margin: 0;
  padding: 4px;
}

@media (max-width: 480px) {
  .hero       { padding: 32px 16px; }
  .hero-title { font-size: 22px; }
  .card       { padding: 16px; gap: 12px; }
  .card-icon-wrap { width: 42px; height: 42px; border-radius: 12px; }
  .card-value { font-size: 13px; }
}
</style>
