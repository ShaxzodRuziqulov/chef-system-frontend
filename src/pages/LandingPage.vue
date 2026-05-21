<script setup lang="ts">
import { RouterLink } from 'vue-router'

const features = [
  {
    icon: '🍽️',
    title: 'Minglab retseptlar',
    desc: 'O\'zbek, rus va xalqaro oshxona retseptlari — barchasi bir joyda.',
  },
  {
    icon: '📅',
    title: 'Haftalik ovqat rejasi',
    desc: 'Har kun nima pishirishni oldindan rejalashtiring. Sog\'lom va tartibli turmush.',
  },
  {
    icon: '🛒',
    title: 'Avtomatik xarid ro\'yxati',
    desc: 'Reja asosida kerakli mahsulotlar ro\'yxati bir tugma bilan tayyor.',
  },
  {
    icon: '🔍',
    title: 'Aqlli qidiruv',
    desc: 'O\'zbek, rus yoki ingliz tilida qidiring — tez va aniq natija.',
  },
]

const steps = [
  { num: '01', title: 'Ro\'yxatdan o\'ting', desc: 'Bepul akkaunt yarating, bir daqiqa vaqt oladi.' },
  { num: '02', title: 'Retsept tanlang',    desc: 'Minglab retseptlar orasidan o\'zingizga ma\'qulini toping.' },
  { num: '03', title: 'Reja tuzing',        desc: 'Haftalik ovqat rejangizni tuzing va xarid ro\'yxatini oling.' },
]

const stats = [
  { value: '500+',  label: 'Retsept' },
  { value: '50+',   label: 'Kategoriya' },
  { value: '7',     label: 'Kunlik reja' },
  { value: '100%',  label: 'Bepul' },
]
</script>

<template>
  <div class="landing">

    <!-- ── Navbar ─────────────────────────────────────────────── -->
    <nav class="navbar">
      <div class="nav-inner">
        <div class="nav-logo">
          <span class="logo-icon">👨‍🍳</span>
          <span class="logo-text">OshPaz</span>
        </div>
        <div class="nav-actions">
          <RouterLink to="/login"    class="btn-outline">Kirish</RouterLink>
          <RouterLink to="/register" class="btn-fill">Ro'yxatdan o'tish</RouterLink>
        </div>
      </div>
    </nav>

    <!-- ── Hero ──────────────────────────────────────────────── -->
    <section class="hero">
      <div class="hero-glow hero-glow-1"></div>
      <div class="hero-glow hero-glow-2"></div>
      <div class="hero-glow hero-glow-3"></div>

      <div class="hero-inner">
        <span class="hero-badge">🇺🇿 O'zbek oshxonasi va undan ham ko'p</span>

        <h1 class="hero-title">
          Har kuni yangi<br>
          <span class="gradient-text">mazali ovqat</span>
        </h1>

        <p class="hero-sub">
          Retseptlar, haftalik reja va xarid ro'yxati — hammasi bir tizimda.
          Oilangiz uchun pishirish endi oson va qiziqarli.
        </p>

        <div class="hero-btns">
          <RouterLink to="/register" class="btn-hero-primary">
            Bepul boshlash
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          </RouterLink>
          <RouterLink to="/login" class="btn-hero-ghost">
            Tizimga kirish
          </RouterLink>
        </div>

        <div class="hero-stats">
          <div v-for="s in stats" :key="s.label" class="hero-stat">
            <span class="hero-stat-val">{{ s.value }}</span>
            <span class="hero-stat-lbl">{{ s.label }}</span>
          </div>
        </div>
      </div>

      <div class="hero-visual">
        <div class="visual-card visual-card-main">
          <div class="vc-header">
            <span class="vc-dot red"></span>
            <span class="vc-dot yellow"></span>
            <span class="vc-dot green"></span>
          </div>
          <div class="vc-recipe">
            <div class="vc-img">🥘</div>
            <div class="vc-info">
              <div class="vc-title">Osh — O'zbek pilovi</div>
              <div class="vc-meta">
                <span>⏱ 60 daqiqa</span>
                <span>👥 4 kishi</span>
                <span class="vc-badge">Oson</span>
              </div>
            </div>
          </div>
          <div class="vc-ingredients">
            <div class="vc-ing-title">Tarkib</div>
            <div class="vc-ing-list">
              <span>🌾 Guruch</span>
              <span>🥕 Sabzi</span>
              <span>🧅 Piyoz</span>
              <span>🥩 Go'sht</span>
            </div>
          </div>
        </div>

        <div class="visual-card visual-card-plan">
          <div class="vcp-title">📅 Bugungi reja</div>
          <div v-for="(meal, i) in ['Nonushta: Tuxum', 'Tushlik: Mastava', 'Kechki: Lag\'mon']" :key="i" class="vcp-item">
            <span class="vcp-dot"></span>{{ meal }}
          </div>
        </div>

        <div class="visual-card visual-card-shop">
          <div class="vcs-title">🛒 Xarid ro'yxati</div>
          <div v-for="(item, i) in ['Guruch — 1 kg', 'Sabzi — 500 g', 'Piyoz — 3 dona']" :key="i" class="vcs-item">
            <span class="vcs-check">✓</span>{{ item }}
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ───────────────────────────────────────────── -->
    <section class="section features-section">
      <div class="section-inner">
        <div class="section-label">Imkoniyatlar</div>
        <h2 class="section-title">Nima uchun OshPaz?</h2>
        <p class="section-sub">Bitta platforma — barcha ovqat ehtiyojlaringiz uchun</p>

        <div class="features-grid">
          <div v-for="f in features" :key="f.title" class="feature-card">
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ───────────────────────────────────────── -->
    <section class="section steps-section">
      <div class="section-inner">
        <div class="section-label">Qanday ishlaydi</div>
        <h2 class="section-title">3 qadamda boshlang</h2>

        <div class="steps-row">
          <div v-for="(s, i) in steps" :key="s.num" class="step-card">
            <div class="step-num">{{ s.num }}</div>
            <h3 class="step-title">{{ s.title }}</h3>
            <p class="step-desc">{{ s.desc }}</p>
            <div v-if="i < steps.length - 1" class="step-arrow">→</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ────────────────────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-glow"></div>
      <div class="cta-inner">
        <h2 class="cta-title">Bugun boshlaymizmi?</h2>
        <p class="cta-sub">Ro'yxatdan o'tish bepul va atigi bir daqiqa vaqt oladi.</p>
        <div class="cta-btns">
          <RouterLink to="/register" class="btn-hero-primary">
            Hoziroq boshlash
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          </RouterLink>
          <RouterLink to="/login" class="btn-hero-ghost">Kirish</RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────── -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-logo">
          <span class="logo-icon">👨‍🍳</span>
          <span class="logo-text">OshPaz</span>
        </div>
        <p class="footer-copy">© {{ new Date().getFullYear() }} OshPaz. Barcha huquqlar himoyalangan.</p>
      </div>
    </footer>

  </div>
</template>

<style scoped>
/* ── Base ── */
.landing {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--tx-1);
  overflow-x: hidden;
}

/* ── Navbar ── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--bg-surface);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--bd);
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-icon { font-size: 28px; }
.logo-text {
  font-size: 20px;
  font-weight: 900;
  color: var(--tx-1);
  letter-spacing: -0.5px;
}
.nav-actions { display: flex; align-items: center; gap: 12px; }
.btn-outline {
  padding: 8px 20px;
  border: 1.5px solid var(--bd-xl);
  border-radius: 10px;
  color: var(--tx-3);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.btn-outline:hover { border-color: rgba(216, 90, 48, 0.5); color: #E8713E; }
.btn-fill {
  padding: 8px 20px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-fill:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(216, 90, 48, 0.45); }

/* ── Hero ── */
.hero {
  position: relative;
  min-height: calc(100vh - 64px);
  display: flex;
  align-items: center;
  gap: 60px;
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
}
.hero-glow {
  position: fixed;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}
.hero-glow-1 { width: 500px; height: 500px; top: -100px; left: -150px; background: rgba(216, 90, 48, 0.12); }
.hero-glow-2 { width: 400px; height: 400px; bottom: 0; right: -100px; background: rgba(16, 185, 129, 0.08); }
.hero-glow-3 { width: 300px; height: 300px; top: 40%; left: 40%; background: rgba(139, 92, 246, 0.06); }

.hero-inner {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 560px;
}
.hero-badge {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(216, 90, 48, 0.12);
  border: 1px solid rgba(216, 90, 48, 0.25);
  border-radius: 100px;
  color: #F0997B;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 24px;
}
.hero-title {
  font-size: 56px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -1.5px;
  color: var(--tx-1);
  margin-bottom: 20px;
}
.gradient-text {
  background: linear-gradient(135deg, #D85A30, #F0997B, #E8713E);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.hero-sub {
  font-size: 17px;
  color: var(--tx-4);
  line-height: 1.7;
  margin-bottom: 36px;
  max-width: 480px;
}
.hero-btns { display: flex; align-items: center; gap: 14px; margin-bottom: 48px; flex-wrap: wrap; }
.btn-hero-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 14px 28px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-radius: 14px;
  color: white;
  font-size: 16px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 8px 24px rgba(216, 90, 48, 0.35);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-hero-primary svg { width: 18px; height: 18px; transition: transform 0.2s; }
.btn-hero-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(216, 90, 48, 0.5); }
.btn-hero-primary:hover svg { transform: translateX(4px); }
.btn-hero-ghost {
  display: inline-flex;
  align-items: center;
  padding: 14px 28px;
  border: 1.5px solid var(--bd-xl);
  border-radius: 14px;
  color: var(--tx-3);
  font-size: 16px;
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.btn-hero-ghost:hover { border-color: rgba(216, 90, 48, 0.4); color: #E8713E; }

.hero-stats {
  display: flex;
  gap: 32px;
  padding-top: 32px;
  border-top: 1px solid var(--bd);
  flex-wrap: wrap;
}
.hero-stat { display: flex; flex-direction: column; gap: 2px; }
.hero-stat-val { font-size: 26px; font-weight: 900; color: var(--tx-1); }
.hero-stat-lbl { font-size: 12px; font-weight: 600; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.08em; }

/* ── Hero visual ── */
.hero-visual {
  position: relative;
  z-index: 1;
  flex: 1;
  max-width: 480px;
  min-height: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.visual-card {
  position: absolute;
  background: var(--bg-card-md);
  border: 1px solid var(--bd-md);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  padding: 20px;
}
.visual-card-main {
  width: 300px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  box-shadow: 0 32px 64px rgba(0,0,0,0.4);
}
.vc-header { display: flex; gap: 6px; margin-bottom: 16px; }
.vc-dot { width: 10px; height: 10px; border-radius: 50%; }
.vc-dot.red    { background: #ef4444; }
.vc-dot.yellow { background: #f59e0b; }
.vc-dot.green  { background: #10b981; }
.vc-recipe { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
.vc-img { font-size: 40px; }
.vc-info { flex: 1; }
.vc-title { font-size: 14px; font-weight: 700; color: var(--tx-2); margin-bottom: 8px; }
.vc-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 11px; color: var(--tx-4); }
.vc-badge { background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 100px; font-weight: 700; }
.vc-ingredients { }
.vc-ing-title { font-size: 11px; font-weight: 700; color: var(--tx-5); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
.vc-ing-list { display: flex; gap: 8px; flex-wrap: wrap; }
.vc-ing-list span { background: var(--bg-input); border: 1px solid var(--bd); border-radius: 8px; padding: 4px 10px; font-size: 12px; color: var(--tx-3); }

.visual-card-plan {
  width: 180px;
  top: 10px;
  right: -10px;
  z-index: 2;
  padding: 14px 16px;
  animation: float 4s ease-in-out infinite;
}
.vcp-title { font-size: 12px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; }
.vcp-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--tx-4); margin-bottom: 6px; }
.vcp-dot { width: 6px; height: 6px; border-radius: 50%; background: #D85A30; flex-shrink: 0; }

.visual-card-shop {
  width: 180px;
  bottom: 20px;
  left: -10px;
  z-index: 2;
  padding: 14px 16px;
  animation: float 4s ease-in-out infinite 2s;
}
.vcs-title { font-size: 12px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; }
.vcs-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--tx-4); margin-bottom: 6px; }
.vcs-check { color: #10b981; font-weight: 900; font-size: 12px; }

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50%       { transform: translateY(-8px); }
}

/* ── Section ── */
.section { padding: 100px 24px; }
.section-inner { max-width: 1200px; margin: 0 auto; }
.section-label {
  display: inline-block;
  padding: 6px 14px;
  background: rgba(216, 90, 48, 0.1);
  border: 1px solid rgba(216, 90, 48, 0.2);
  border-radius: 100px;
  color: #E8713E;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 16px;
}
.section-title {
  font-size: 36px;
  font-weight: 900;
  color: var(--tx-1);
  letter-spacing: -0.5px;
  margin-bottom: 12px;
}
.section-sub {
  font-size: 16px;
  color: var(--tx-4);
  margin-bottom: 56px;
}

/* ── Features ── */
.features-section { background: var(--bg-card); border-top: 1px solid var(--bd); border-bottom: 1px solid var(--bd); }
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  padding: 28px 24px;
  transition: border-color 0.2s, background 0.2s, transform 0.2s;
}
.feature-card:hover {
  border-color: rgba(216, 90, 48, 0.3);
  background: rgba(216, 90, 48, 0.04);
  transform: translateY(-4px);
}
.feature-icon { font-size: 36px; margin-bottom: 16px; line-height: 1; }
.feature-title { font-size: 16px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; }
.feature-desc { font-size: 14px; color: var(--tx-4); line-height: 1.6; }

/* ── Steps ── */
.steps-row {
  display: flex;
  gap: 0;
  align-items: flex-start;
  position: relative;
}
.step-card {
  flex: 1;
  position: relative;
  padding: 32px 28px;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  margin-right: 16px;
}
.step-card:last-child { margin-right: 0; }
.step-num {
  font-size: 48px;
  font-weight: 900;
  color: rgba(216, 90, 48, 0.2);
  line-height: 1;
  margin-bottom: 16px;
  letter-spacing: -2px;
}
.step-title { font-size: 18px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; }
.step-desc { font-size: 14px; color: var(--tx-4); line-height: 1.6; }
.step-arrow {
  position: absolute;
  top: 40px;
  right: -14px;
  font-size: 20px;
  color: rgba(216, 90, 48, 0.4);
  z-index: 2;
  font-weight: 900;
  background: var(--bg-base);
  padding: 4px;
}

/* ── CTA ── */
.cta-section {
  position: relative;
  padding: 100px 24px;
  overflow: hidden;
  border-top: 1px solid var(--bd);
}
.cta-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(216, 90, 48, 0.1);
  filter: blur(120px);
  pointer-events: none;
}
.cta-inner {
  position: relative;
  z-index: 1;
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}
.cta-title { font-size: 44px; font-weight: 900; color: var(--tx-1); letter-spacing: -1px; margin-bottom: 16px; }
.cta-sub { font-size: 16px; color: var(--tx-4); margin-bottom: 36px; }
.cta-btns { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }

/* ── Footer ── */
.footer {
  padding: 32px 24px;
  border-top: 1px solid var(--bd);
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.footer-logo { display: flex; align-items: center; gap: 8px; }
.footer-copy { font-size: 13px; color: var(--tx-6); }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .hero { flex-direction: column; padding: 60px 24px; min-height: auto; gap: 48px; }
  .hero-inner { max-width: 100%; }
  .hero-visual { display: none; }
  .hero-title { font-size: 44px; }
}
@media (max-width: 768px) {
  .features-grid { grid-template-columns: 1fr; }
  .steps-row { flex-direction: column; }
  .step-card { margin-right: 0; margin-bottom: 12px; }
  .step-arrow { display: none; }
  .hero-title { font-size: 36px; }
  .section-title { font-size: 28px; }
  .cta-title { font-size: 32px; }
}
@media (max-width: 480px) {
  .hero-title { font-size: 30px; }
  .hero-badge { font-size: 11px; }
  .nav-actions .btn-outline { display: none; }
}
</style>
