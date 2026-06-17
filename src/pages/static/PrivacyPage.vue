<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="static-page">
    <button @click="router.back()" class="back-link">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 12H5m7-7l-7 7 7 7"/>
      </svg>
      Orqaga
    </button>

    <div class="page-head">
      <div class="head-icon">🔒</div>
      <div>
        <h1 class="head-title">Maxfiylik siyosati</h1>
        <p class="head-meta">Oxirgi yangilanish: 1-yanvar 2024</p>
      </div>
    </div>

    <div class="doc">
      <section class="section">
        <h2>1. Umumiy ma'lumot</h2>
        <p>
          OshPaz platformasi sizning shaxsiy ma'lumotlaringizni himoya qilishga katta e'tibor qaratadi.
          Ushbu maxfiylik siyosati platformamizdan foydalanganda qanday ma'lumotlarni to'plashimiz,
          ulardan qanday foydalanishimiz va qanday himoya qilishimiz haqida ma'lumot beradi.
        </p>
      </section>

      <section class="section">
        <h2>2. To'planadigan ma'lumotlar</h2>
        <p>Platformamiz quyidagi ma'lumotlarni to'playdi:</p>
        <ul>
          <li><strong>Ro'yxatdan o'tish ma'lumotlari:</strong> ism, familiya, elektron pochta manzili</li>
          <li><strong>Foydalanish ma'lumotlari:</strong> ko'rilgan retseptlar, saqlangan taomlar, reytinglar</li>
          <li><strong>Texnik ma'lumotlar:</strong> IP manzil, brauzer turi, qurilma ma'lumotlari</li>
        </ul>
      </section>

      <section class="section">
        <h2>3. Ma'lumotlardan foydalanish</h2>
        <p>Yig'ilgan ma'lumotlar quyidagi maqsadlarda ishlatiladi:</p>
        <ul>
          <li>Platformani ishlashini ta'minlash va takomillashtirish</li>
          <li>Shaxsiy tavsiyalar berish</li>
          <li>Xavfsizlikni ta'minlash va firibgarlikka qarshi kurashish</li>
          <li>Qonuniy majburiyatlarni bajarish</li>
        </ul>
      </section>

      <section class="section">
        <h2>4. Ma'lumotlarni uchinchi tomonlarga berish</h2>
        <p>
          Biz sizning shaxsiy ma'lumotlaringizni uchinchi tomonlarga sotmaymiz yoki ijaraga bermaymiz.
          Ma'lumotlar faqat quyidagi hollarda baham ko'rilishi mumkin:
        </p>
        <ul>
          <li>Sizning roziligingiz bilan</li>
          <li>Qonun talablariga binoan</li>
          <li>Platformani texnik xizmat ko'rsatuvchilar bilan (maxfiylik shartlari asosida)</li>
        </ul>
      </section>

      <section class="section">
        <h2>5. Cookielar</h2>
        <p>
          Platformamiz sessiyani saqlash va foydalanuvchi tajribasini yaxshilash maqsadida
          cookie fayllaridan foydalanadi. Brauzer sozlamalaridan cookie'larni o'chirib qo'yishingiz mumkin,
          biroq bu ba'zi funksiyalarning ishlashiga ta'sir qilishi mumkin.
        </p>
      </section>

      <section class="section">
        <h2>6. Ma'lumotlarni o'chirish</h2>
        <p>
          Siz istalgan vaqtda o'z hisobingizni va shaxsiy ma'lumotlaringizni o'chirishni talab qilishingiz mumkin.
          Buning uchun <a href="mailto:janobprizident@gmail.com" class="inline-link">janobprizident@gmail.com</a> manziliga murojaat qiling.
        </p>
      </section>

      <section class="section">
        <h2>7. Bog'lanish</h2>
        <p>
          Maxfiylik siyosatiga oid savollaringiz bo'lsa, bizga yozing:
          <a href="mailto:janobprizident@gmail.com" class="inline-link">janobprizident@gmail.com</a>
          yoki <a href="https://t.me/RuziqulovShaxzod" target="_blank" rel="noopener" class="inline-link">Telegram</a>
        </p>
      </section>
    </div>
  </div>
</template>

<style scoped>
.static-page {
  max-width: 760px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--tx-5);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  width: fit-content;
  transition: color 0.2s;
}
.back-link svg   { width: 16px; height: 16px; }
.back-link:hover { color: #E8713E; }

.page-head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 28px 28px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
}
.head-icon  { font-size: 40px; line-height: 1; flex-shrink: 0; }
.head-title { font-size: 26px; font-weight: 900; color: var(--tx-1); margin: 0; letter-spacing: -0.3px; }
.head-meta  { font-size: 12px; color: var(--tx-5); margin: 4px 0 0; font-weight: 600; }

.doc {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.section {
  padding: 24px 0;
  border-bottom: 1px solid var(--bd);
}
.section:first-child { padding-top: 0; }
.section:last-child  { padding-bottom: 0; border-bottom: none; }

.section h2 {
  font-size: 16px;
  font-weight: 800;
  color: var(--tx-1);
  margin: 0 0 12px;
  letter-spacing: -0.1px;
}
.section p {
  font-size: 14px;
  color: var(--tx-3);
  line-height: 1.75;
  margin: 0 0 10px;
}
.section p:last-child { margin-bottom: 0; }
.section ul {
  padding-left: 20px;
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.section li {
  font-size: 14px;
  color: var(--tx-3);
  line-height: 1.6;
}
.inline-link {
  color: #E8713E;
  text-decoration: none;
  font-weight: 600;
}
.inline-link:hover { text-decoration: underline; }

@media (max-width: 600px) {
  .static-page { padding: 24px 16px 60px; gap: 20px; }
  .doc         { padding: 20px; }
  .head-title  { font-size: 20px; }
  .page-head   { padding: 20px; gap: 14px; }
}
</style>
