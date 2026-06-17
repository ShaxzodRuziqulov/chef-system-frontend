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
      <div class="head-icon">📋</div>
      <div>
        <h1 class="head-title">Foydalanish shartlari</h1>
        <p class="head-meta">Oxirgi yangilanish: 1-yanvar 2024</p>
      </div>
    </div>

    <div class="doc">
      <section class="section">
        <h2>1. Qabul qilish</h2>
        <p>
          OshPaz platformasidan foydalanib, siz ushbu foydalanish shartlarini to'liq qabul qilasiz.
          Agar shartlarga rozi bo'lmasangiz, iltimos platformadan foydalanmang.
        </p>
      </section>

      <section class="section">
        <h2>2. Hisob yaratish</h2>
        <p>Platformadan to'liq foydalanish uchun hisob yaratishingiz kerak. Siz:</p>
        <ul>
          <li>To'g'ri va to'liq ma'lumot kiritishingiz shart</li>
          <li>Hisob xavfsizligini ta'minlash uchun parolingizni sir saqlashingiz kerak</li>
          <li>Hisobingiz orqali amalga oshirilgan barcha harakatlar uchun javobgar siz hisoblanasiz</li>
          <li>Bir shaxs faqat bitta hisob ochishi mumkin</li>
        </ul>
      </section>

      <section class="section">
        <h2>3. Ruxsat etilmagan harakatlar</h2>
        <p>Quyidagi harakatlar qat'iyan taqiqlanadi:</p>
        <ul>
          <li>Boshqa foydalanuvchilarning shaxsiy ma'lumotlarini to'plash</li>
          <li>Platformani buzish yoki xavfsizlik tizimlarini chetlab o'tish</li>
          <li>Noto'g'ri, yolg'on yoki zararli kontent joylash</li>
          <li>Mualliflik huquqlarini buzgan holda kontent ko'chirish</li>
          <li>Reklama yoki spam tarqatish</li>
        </ul>
      </section>

      <section class="section">
        <h2>4. Kontent va mualliflik huquqi</h2>
        <p>
          Platformaga joylashtirilgan retseptlar va boshqa kontentning mualliflik huquqi
          tegishli bloggerlarga va OshPaz'ga tegishli. Platformadan olingan kontentni
          tijoriy maqsadlarda foydalanish taqiqlanadi.
        </p>
        <p>
          Siz joylashtiradigan kontent uchun to'liq javobgarlikni o'z zimmangizga olasiz.
          OshPaz ushbu kontentni moderatsiya qilish huquqini o'zida saqlab qoladi.
        </p>
      </section>

      <section class="section">
        <h2>5. Xizmat to'xtatilishi</h2>
        <p>
          OshPaz quyidagi hollarda hisobingizni to'xtatib qo'yish yoki o'chirish huquqini saqlab qoladi:
        </p>
        <ul>
          <li>Foydalanish shartlarini buzish</li>
          <li>Platformaga zarar yetkazish</li>
          <li>Uzoq muddat faoliyatsizlik (12 oydan ortiq)</li>
        </ul>
      </section>

      <section class="section">
        <h2>6. Mas'uliyat cheklovi</h2>
        <p>
          OshPaz platformasidagi retseptlar ma'lumot maqsadida taqdim etiladi.
          Retseptlardan foydalanish natijasida yuzaga kelishi mumkin bo'lgan salbiy oqibatlar
          uchun OshPaz mas'uliyat olmaydi. Allergiya yoki tibbiy holatingizni hisobga olgan holda
          mutaxassis maslahati olishni tavsiya etamiz.
        </p>
      </section>

      <section class="section">
        <h2>7. O'zgartirishlar</h2>
        <p>
          OshPaz ushbu shartlarni istalgan vaqtda o'zgartirish huquqini saqlab qoladi.
          Muhim o'zgarishlar haqida elektron pochta orqali xabardor qilinasiz.
          O'zgartirishlardan keyin platformadan foydalanishni davom ettirish yangi shartlarni
          qabul qilganingizni bildiradi.
        </p>
      </section>

      <section class="section">
        <h2>8. Bog'lanish</h2>
        <p>
          Savol va murojaat uchun:
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
  padding: 28px;
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
