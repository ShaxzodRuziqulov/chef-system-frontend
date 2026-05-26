<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { platformApi } from '@/api/platform'
import { useLangStore, type Lang } from '@/stores/langStore'
import { useThemeStore } from '@/stores/themeStore'

const lang  = useLangStore()
const theme = useThemeStore()

const langFlags: { code: Lang; label: string }[] = [
  { code: 'uz', label: 'UZ' },
  { code: 'ru', label: 'RU' },
  { code: 'en', label: 'EN' },
]

const navLinks = computed(() => [
  { id: 'features', label: lang.t('landing.nav_features') },
  { id: 'how',      label: lang.t('landing.nav_how') },
  { id: 'faq',      label: lang.t('landing.nav_faq') },
])

const features = computed(() => [
  { icon: '🍽️', title: lang.t('landing.f1_title'), desc: lang.t('landing.f1_desc') },
  { icon: '📅', title: lang.t('landing.f2_title'), desc: lang.t('landing.f2_desc') },
  { icon: '🛒', title: lang.t('landing.f3_title'), desc: lang.t('landing.f3_desc') },
  { icon: '🔍', title: lang.t('landing.f4_title'), desc: lang.t('landing.f4_desc') },
])

const steps = computed(() => [
  { num: '01', title: lang.t('landing.s1_title'), desc: lang.t('landing.s1_desc') },
  { num: '02', title: lang.t('landing.s2_title'), desc: lang.t('landing.s2_desc') },
  { num: '03', title: lang.t('landing.s3_title'), desc: lang.t('landing.s3_desc') },
])

const accessLevels = computed(() => [
  {
    icon: '👁️',
    badge: lang.t('landing.lv1_badge'),
    badgeClass: 'badge-public',
    title: lang.t('landing.lv1_title'),
    items: [
      lang.t('landing.lv1_i1'),
      lang.t('landing.lv1_i2'),
      lang.t('landing.lv1_i3'),
      lang.t('landing.lv1_i4'),
    ],
    cta: null,
    featured: false,
  },
  {
    icon: '⭐',
    badge: lang.t('landing.lv2_badge'),
    badgeClass: 'badge-member',
    title: lang.t('landing.lv2_title'),
    items: [
      lang.t('landing.lv2_i1'),
      lang.t('landing.lv2_i2'),
      lang.t('landing.lv2_i3'),
      lang.t('landing.lv2_i4'),
      lang.t('landing.lv2_i5'),
    ],
    cta: { label: lang.t('landing.lv2_cta'), to: '/register' },
    featured: true,
  },
  {
    icon: '✍️',
    badge: lang.t('landing.lv3_badge'),
    badgeClass: 'badge-blogger',
    title: lang.t('landing.lv3_title'),
    items: [
      lang.t('landing.lv3_i1'),
      lang.t('landing.lv3_i2'),
      lang.t('landing.lv3_i3'),
      lang.t('landing.lv3_i4'),
    ],
    cta: { label: lang.t('landing.lv3_cta'), to: '/register' },
    featured: false,
  },
])

const faqs = computed(() =>
  [1, 2, 3, 4, 5].map((i) => ({
    q: lang.t(`landing.faq_q${i}`),
    a: lang.t(`landing.faq_a${i}`),
  })),
)
const openFaq = ref<number | null>(0)
function toggleFaq(i: number) {
  openFaq.value = openFaq.value === i ? null : i
}

const stats = ref([
  { value: '…', labelKey: 'landing.stat_recipes' },
  { value: '…', labelKey: 'landing.stat_users' },
  { value: '…', labelKey: 'landing.stat_categories' },
  { value: '100%', labelKey: 'landing.stat_free' },
])

const mobileMenuOpen = ref(false)
const showScrollTop = ref(false)

function scrollTo(id: string) {
  mobileMenuOpen.value = false
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 72
  window.scrollTo({ top, behavior: 'smooth' })
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onScroll() {
  showScrollTop.value = window.scrollY > 600
}

let io: IntersectionObserver | null = null

onMounted(async () => {
  window.addEventListener('scroll', onScroll, { passive: true })

  // Reveal-on-scroll
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io?.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    document.querySelectorAll('.reveal').forEach((el) => io!.observe(el))
  }

  try {
    const res = await platformApi.getStats()
    const d = res.data?.data
    if (d) {
      stats.value[0].value = d.totalRecipes.toLocaleString() + '+'
      stats.value[1].value = d.totalUsers.toLocaleString() + '+'
      stats.value[2].value = d.totalCategories.toLocaleString() + '+'
    }
  } catch {
    // server javob bermasa — "…" ko'rinishida qoladi
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  io?.disconnect()
})
</script>

<template>
  <div class="landing">

    <!-- ── Navbar ─────────────────────────────────────────────── -->
    <nav class="navbar">
      <div class="nav-inner">
        <a href="#top" class="nav-logo" @click.prevent="scrollToTop">
          <span class="logo-icon">👨‍🍳</span>
          <span class="logo-text">OshPaz</span>
        </a>

        <div class="nav-center">
          <a
            v-for="l in navLinks"
            :key="l.id"
            href="#"
            class="nav-link"
            @click.prevent="scrollTo(l.id)"
          >{{ l.label }}</a>
        </div>

        <div class="nav-actions">
          <div class="lang-flags">
            <button
              v-for="l in langFlags"
              :key="l.code"
              class="lang-flag-btn"
              :class="{ 'flag-active': lang.lang === l.code }"
              @click="lang.setLang(l.code)"
            >{{ l.label }}</button>
          </div>

          <button class="icon-btn" @click="theme.toggle()" :aria-label="theme.isDark ? 'Light mode' : 'Dark mode'">
            <svg v-if="theme.isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </button>

          <RouterLink to="/login"    class="btn-outline">{{ lang.t('landing.login') }}</RouterLink>
          <RouterLink to="/register" class="btn-fill">{{ lang.t('landing.register') }}</RouterLink>

          <button
            class="icon-btn nav-burger"
            :aria-label="lang.t('landing.menu_open')"
            :aria-expanded="mobileMenuOpen"
            @click="mobileMenuOpen = !mobileMenuOpen"
          >
            <svg v-if="!mobileMenuOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="3" y1="6"  x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <line x1="6" y1="6"  x2="18" y2="18"/>
              <line x1="6" y1="18" x2="18" y2="6"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile menu -->
      <div v-show="mobileMenuOpen" class="mobile-menu">
        <a
          v-for="l in navLinks"
          :key="l.id"
          href="#"
          class="mobile-link"
          @click.prevent="scrollTo(l.id)"
        >{{ l.label }}</a>
        <div class="mobile-actions">
          <RouterLink to="/login"    class="btn-outline">{{ lang.t('landing.login') }}</RouterLink>
          <RouterLink to="/register" class="btn-fill">{{ lang.t('landing.register') }}</RouterLink>
        </div>
      </div>
    </nav>

    <!-- ── Hero ──────────────────────────────────────────────── -->
    <section id="top" class="hero">
      <div class="hero-bg-grid" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-1" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-2" aria-hidden="true"></div>
      <div class="hero-glow hero-glow-3" aria-hidden="true"></div>

      <div class="hero-grid">
        <div class="hero-inner reveal">
          <span class="hero-badge">{{ lang.t('landing.badge') }}</span>

          <h1 class="hero-title">
            {{ lang.t('landing.hero_title_1') }}<br>
            <span class="gradient-text">{{ lang.t('landing.hero_title_2') }}</span>
          </h1>

          <p class="hero-sub">{{ lang.t('landing.hero_sub') }}</p>

          <div class="hero-btns">
            <RouterLink to="/app/recipes" class="btn-hero-primary">
              {{ lang.t('landing.btn_browse') }}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </RouterLink>
            <RouterLink to="/register" class="btn-hero-ghost">
              {{ lang.t('landing.btn_register') }}
            </RouterLink>
          </div>

          <div class="hero-stats">
            <div v-for="s in stats" :key="s.labelKey" class="hero-stat">
              <span class="hero-stat-val">{{ s.value }}</span>
              <span class="hero-stat-lbl">{{ lang.t(s.labelKey) }}</span>
            </div>
          </div>
        </div>

        <div class="hero-visual reveal" aria-hidden="true">
          <div class="visual-card visual-card-main">
            <div class="vc-header">
              <span class="vc-dot red"></span>
              <span class="vc-dot yellow"></span>
              <span class="vc-dot green"></span>
            </div>
            <div class="vc-recipe">
              <div class="vc-img">🥘</div>
              <div class="vc-info">
                <div class="vc-title">{{ lang.t('landing.hv_recipe_title') }}</div>
                <div class="vc-meta">
                  <span>⏱ {{ lang.t('landing.hv_recipe_time') }}</span>
                  <span>👥 {{ lang.t('landing.hv_recipe_ppl') }}</span>
                  <span class="vc-badge">{{ lang.t('landing.hv_recipe_diff') }}</span>
                </div>
              </div>
            </div>
            <div class="vc-ingredients">
              <div class="vc-ing-title">{{ lang.t('landing.hv_ing_label') }}</div>
              <div class="vc-ing-list">
                <span>🌾 {{ lang.t('landing.hv_ing1') }}</span>
                <span>🥕 {{ lang.t('landing.hv_ing2') }}</span>
                <span>🧅 {{ lang.t('landing.hv_ing3') }}</span>
                <span>🥩 {{ lang.t('landing.hv_ing4') }}</span>
              </div>
            </div>
          </div>

          <div class="visual-card visual-card-plan">
            <div class="vcp-title">📅 {{ lang.t('landing.hv_plan_title') }}</div>
            <div class="vcp-item"><span class="vcp-dot"></span>{{ lang.t('landing.hv_meal1') }}</div>
            <div class="vcp-item"><span class="vcp-dot"></span>{{ lang.t('landing.hv_meal2') }}</div>
            <div class="vcp-item"><span class="vcp-dot"></span>{{ lang.t('landing.hv_meal3') }}</div>
          </div>

          <div class="visual-card visual-card-shop">
            <div class="vcs-title">🛒 {{ lang.t('landing.hv_shop_title') }}</div>
            <div class="vcs-item"><span class="vcs-check">✓</span>{{ lang.t('landing.hv_shop1') }}</div>
            <div class="vcs-item"><span class="vcs-check">✓</span>{{ lang.t('landing.hv_shop2') }}</div>
            <div class="vcs-item"><span class="vcs-check">✓</span>{{ lang.t('landing.hv_shop3') }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Features ───────────────────────────────────────────── -->
    <section id="features" class="section features-section">
      <div class="section-inner">
        <div class="section-head reveal">
          <div class="section-label">{{ lang.t('landing.features_label') }}</div>
          <h2 class="section-title">{{ lang.t('landing.features_title') }}</h2>
          <p class="section-sub">{{ lang.t('landing.features_sub') }}</p>
        </div>

        <div class="features-grid">
          <div
            v-for="(f, i) in features"
            :key="f.title"
            class="feature-card reveal"
            :style="{ transitionDelay: i * 80 + 'ms' }"
          >
            <div class="feature-icon">{{ f.icon }}</div>
            <h3 class="feature-title">{{ f.title }}</h3>
            <p class="feature-desc">{{ f.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Access levels ─────────────────────────────────────── -->
    <section class="section access-section">
      <div class="section-inner">
        <div class="section-head reveal">
          <div class="section-label">{{ lang.t('landing.access_label') }}</div>
          <h2 class="section-title">{{ lang.t('landing.access_title') }}</h2>
          <p class="section-sub">{{ lang.t('landing.access_sub') }}</p>
        </div>

        <div class="access-grid">
          <div
            v-for="(level, i) in accessLevels"
            :key="level.badge"
            class="access-card reveal"
            :class="{ 'is-featured': level.featured }"
            :style="{ transitionDelay: i * 80 + 'ms' }"
          >
            <div v-if="level.featured" class="access-ribbon">★</div>
            <div class="access-top">
              <span class="access-icon">{{ level.icon }}</span>
              <span class="access-badge" :class="level.badgeClass">{{ level.badge }}</span>
            </div>
            <h3 class="access-title">{{ level.title }}</h3>
            <ul class="access-list">
              <li v-for="item in level.items" :key="item">
                <span class="access-check">✓</span>{{ item }}
              </li>
            </ul>
            <RouterLink v-if="level.cta" :to="level.cta.to" class="access-btn">
              {{ level.cta.label }}
            </RouterLink>
          </div>
        </div>
      </div>
    </section>

    <!-- ── How it works ───────────────────────────────────────── -->
    <section id="how" class="section steps-section">
      <div class="section-inner">
        <div class="section-head reveal">
          <div class="section-label">{{ lang.t('landing.steps_label') }}</div>
          <h2 class="section-title">{{ lang.t('landing.steps_title') }}</h2>
        </div>

        <div class="steps-row">
          <div
            v-for="(s, i) in steps"
            :key="s.num"
            class="step-card reveal"
            :style="{ transitionDelay: i * 100 + 'ms' }"
          >
            <div class="step-num">{{ s.num }}</div>
            <h3 class="step-title">{{ s.title }}</h3>
            <p class="step-desc">{{ s.desc }}</p>
            <svg v-if="i < steps.length - 1" class="step-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6"/>
            </svg>
          </div>
        </div>
      </div>
    </section>

    <!-- ── FAQ ────────────────────────────────────────────────── -->
    <section id="faq" class="section faq-section">
      <div class="section-inner faq-inner">
        <div class="section-head reveal">
          <div class="section-label">{{ lang.t('landing.faq_label') }}</div>
          <h2 class="section-title">{{ lang.t('landing.faq_title') }}</h2>
          <p class="section-sub">{{ lang.t('landing.faq_sub') }}</p>
        </div>

        <div class="faq-list reveal">
          <div
            v-for="(f, i) in faqs"
            :key="i"
            class="faq-item"
            :class="{ 'is-open': openFaq === i }"
          >
            <button class="faq-q" :aria-expanded="openFaq === i" @click="toggleFaq(i)">
              <span>{{ f.q }}</span>
              <svg class="faq-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 9l6 6 6-6"/>
              </svg>
            </button>
            <div class="faq-a-wrap">
              <div class="faq-a">{{ f.a }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── CTA ────────────────────────────────────────────────── -->
    <section class="cta-section">
      <div class="cta-glow" aria-hidden="true"></div>
      <div class="cta-inner reveal">
        <h2 class="cta-title">{{ lang.t('landing.cta_title') }}</h2>
        <p class="cta-sub">{{ lang.t('landing.cta_sub') }}</p>
        <div class="cta-btns">
          <RouterLink to="/register" class="btn-hero-primary">
            {{ lang.t('landing.cta_start') }}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
            </svg>
          </RouterLink>
          <RouterLink to="/login" class="btn-hero-ghost">{{ lang.t('landing.login') }}</RouterLink>
        </div>
      </div>
    </section>

    <!-- ── Footer ────────────────────────────────────────────── -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="footer-logo">
            <span class="logo-icon">👨‍🍳</span>
            <span class="logo-text">OshPaz</span>
          </div>
          <p class="footer-tagline">{{ lang.t('landing.footer_tagline') }}</p>
        </div>

        <div class="footer-cols">
          <div class="footer-col">
            <div class="footer-col-title">{{ lang.t('landing.footer_product') }}</div>
            <a href="#" @click.prevent="scrollTo('features')">{{ lang.t('landing.nav_features') }}</a>
            <a href="#" @click.prevent="scrollTo('how')">{{ lang.t('landing.nav_how') }}</a>
            <a href="#" @click.prevent="scrollTo('faq')">{{ lang.t('landing.nav_faq') }}</a>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">{{ lang.t('landing.footer_company') }}</div>
            <a href="#">{{ lang.t('landing.footer_about') }}</a>
            <a href="mailto:info@oshpaz.uz">{{ lang.t('landing.footer_contact') }}</a>
          </div>
          <div class="footer-col">
            <div class="footer-col-title">{{ lang.t('landing.footer_legal') }}</div>
            <a href="#">{{ lang.t('landing.footer_privacy') }}</a>
            <a href="#">{{ lang.t('landing.footer_terms') }}</a>
          </div>
        </div>
      </div>
      <div class="footer-bottom">
        <p class="footer-copy">© {{ new Date().getFullYear() }} OshPaz. {{ lang.t('landing.footer_rights') }}</p>
      </div>
    </footer>

    <!-- ── Scroll-to-top ─────────────────────────────────────── -->
    <button
      class="scroll-top"
      :class="{ 'is-visible': showScrollTop }"
      :aria-label="lang.t('landing.footer_top')"
      @click="scrollToTop"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 15l-6-6-6 6"/>
      </svg>
    </button>

  </div>
</template>

<style scoped>
/* ── Base ── */
.landing {
  min-height: 100vh;
  background: var(--bg-base);
  color: var(--tx-1);
  overflow-x: hidden;
  scroll-behavior: smooth;
}

/* ── Reveal-on-scroll ── */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}
.reveal.is-visible {
  opacity: 1;
  transform: translateY(0);
}

/* ── Navbar ── */
.navbar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--bg-surface) 85%, transparent);
  backdrop-filter: blur(20px) saturate(140%);
  -webkit-backdrop-filter: blur(20px) saturate(140%);
  border-bottom: 1px solid var(--bd);
}
.nav-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  height: 64px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  cursor: pointer;
}
.logo-icon { font-size: 28px; line-height: 1; }
.logo-text {
  font-size: 20px;
  font-weight: 900;
  color: var(--tx-1);
  letter-spacing: -0.5px;
}

.nav-center {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}
.nav-link {
  padding: 8px 14px;
  border-radius: 8px;
  color: var(--tx-3);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s, background 0.2s;
}
.nav-link:hover { color: #E8713E; background: rgba(216, 90, 48, 0.08); }

.nav-actions { display: flex; align-items: center; gap: 10px; justify-content: flex-end; }

.btn-outline {
  padding: 8px 18px;
  border: 1.5px solid var(--bd-xl);
  border-radius: 10px;
  color: var(--tx-3);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s, background 0.2s;
  white-space: nowrap;
}
.btn-outline:hover { border-color: rgba(216, 90, 48, 0.5); color: #E8713E; background: rgba(216, 90, 48, 0.04); }
.btn-fill {
  padding: 8px 18px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-radius: 10px;
  color: white;
  font-size: 14px;
  font-weight: 800;
  text-decoration: none;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.3);
  transition: transform 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}
.btn-fill:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(216, 90, 48, 0.45); }

.icon-btn {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  border: 1px solid var(--bd-md);
  background: var(--bg-card-md);
  color: var(--tx-3);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.icon-btn:hover { background: var(--bd-md); color: var(--tx-1); border-color: var(--bd-xl); }
.icon-btn svg { width: 16px; height: 16px; }
.nav-burger { display: none; }

/* ── Lang flags ── */
.lang-flags {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--bg-card-md);
  border: 1px solid var(--bd-md);
  border-radius: 10px;
}
.lang-flag-btn {
  padding: 4px 8px;
  border: none;
  background: none;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
  cursor: pointer;
  border-radius: 6px;
  color: var(--tx-5);
  transition: color 0.15s, background 0.15s;
}
.lang-flag-btn:hover { color: var(--tx-3); }
.lang-flag-btn.flag-active { color: #E8713E; background: rgba(216, 90, 48, 0.15); }

/* ── Mobile menu ── */
.mobile-menu {
  display: none;
  padding: 12px 20px 20px;
  border-top: 1px solid var(--bd);
  background: var(--bg-surface);
  flex-direction: column;
  gap: 4px;
}
.mobile-link {
  padding: 12px 14px;
  border-radius: 10px;
  color: var(--tx-2);
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s;
}
.mobile-link:hover { background: var(--bd); }
.mobile-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.mobile-actions .btn-outline,
.mobile-actions .btn-fill {
  flex: 1;
  text-align: center;
  padding: 12px 18px;
}

/* ── Hero ── */
.hero {
  position: relative;
  padding: 80px 24px 100px;
  overflow: hidden;
}
.hero-grid {
  position: relative;
  z-index: 1;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}
.hero-bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--bd) 1px, transparent 1px),
    linear-gradient(to bottom, var(--bd) 1px, transparent 1px);
  background-size: 56px 56px;
  mask-image: radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse at 50% 30%, black 30%, transparent 75%);
  opacity: 0.35;
  pointer-events: none;
}
.hero-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  pointer-events: none;
  z-index: 0;
}
.hero-glow-1 { width: 500px; height: 500px; top: -120px; left: -150px; background: rgba(216, 90, 48, 0.18); }
.hero-glow-2 { width: 400px; height: 400px; bottom: -80px; right: -100px; background: rgba(16, 185, 129, 0.10); }
.hero-glow-3 { width: 300px; height: 300px; top: 40%; left: 40%; background: rgba(139, 92, 246, 0.08); }

.hero-inner { max-width: 560px; }
.hero-badge {
  display: inline-flex;
  align-items: center;
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
  font-size: clamp(34px, 5vw, 56px);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -1.5px;
  color: var(--tx-1);
  margin-bottom: 20px;
}
.gradient-text {
  background: linear-gradient(135deg, #D85A30, #F0997B, #E8713E);
  background-size: 200% 200%;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: gradient-shift 8s ease-in-out infinite;
}
@keyframes gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.hero-sub {
  font-size: 17px;
  color: var(--tx-4);
  line-height: 1.65;
  margin-bottom: 36px;
  max-width: 520px;
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
  transition: border-color 0.2s, color 0.2s, background 0.2s;
}
.btn-hero-ghost:hover { border-color: rgba(216, 90, 48, 0.4); color: #E8713E; background: rgba(216, 90, 48, 0.04); }

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
  min-height: 440px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.visual-card {
  position: absolute;
  background: color-mix(in srgb, var(--bg-card-md) 92%, transparent);
  border: 1px solid var(--bd-md);
  border-radius: 20px;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
}
.visual-card-main {
  width: 300px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 3;
  box-shadow: 0 32px 64px rgba(0,0,0,0.4);
  animation: floatMain 6s ease-in-out infinite;
}
@keyframes floatMain {
  0%, 100% { transform: translate(-50%, -50%); }
  50%      { transform: translate(-50%, calc(-50% - 6px)); }
}
.vc-header { display: flex; gap: 6px; margin-bottom: 16px; }
.vc-dot { width: 10px; height: 10px; border-radius: 50%; }
.vc-dot.red    { background: #ef4444; }
.vc-dot.yellow { background: #f59e0b; }
.vc-dot.green  { background: #10b981; }
.vc-recipe { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px; }
.vc-img { font-size: 40px; }
.vc-info { flex: 1; min-width: 0; }
.vc-title { font-size: 14px; font-weight: 700; color: var(--tx-2); margin-bottom: 8px; }
.vc-meta { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; font-size: 11px; color: var(--tx-4); }
.vc-badge { background: rgba(16,185,129,0.15); color: #34d399; padding: 2px 8px; border-radius: 100px; font-weight: 700; }
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
  50%      { transform: translateY(-8px); }
}

/* ── Sections ── */
.section { padding: 100px 24px; position: relative; }
.section-inner { max-width: 1200px; margin: 0 auto; }
.section-head { text-align: left; margin-bottom: 56px; max-width: 720px; }
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
  font-size: clamp(26px, 3.4vw, 38px);
  font-weight: 900;
  color: var(--tx-1);
  letter-spacing: -0.5px;
  margin-bottom: 12px;
  line-height: 1.15;
}
.section-sub {
  font-size: 16px;
  color: var(--tx-4);
  line-height: 1.6;
}

/* ── Features ── */
.features-section {
  background: var(--bg-card);
  border-top: 1px solid var(--bd);
  border-bottom: 1px solid var(--bd);
}
.features-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}
.feature-card {
  position: relative;
  background: var(--bg-base);
  border: 1px solid var(--bd);
  border-radius: 20px;
  padding: 28px 24px;
  transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
  overflow: hidden;
}
.feature-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(216, 90, 48, 0.06), transparent 60%);
  opacity: 0;
  transition: opacity 0.25s;
  pointer-events: none;
}
.feature-card:hover {
  border-color: rgba(216, 90, 48, 0.35);
  transform: translateY(-4px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.12);
}
.feature-card:hover::before { opacity: 1; }
.feature-icon {
  font-size: 32px;
  margin-bottom: 16px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  background: rgba(216, 90, 48, 0.10);
  border: 1px solid rgba(216, 90, 48, 0.18);
}
.feature-title { font-size: 16px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; position: relative; }
.feature-desc { font-size: 14px; color: var(--tx-4); line-height: 1.6; position: relative; }

/* ── Access levels ── */
.access-section { background: var(--bg-base); }
.access-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  align-items: stretch;
}
.access-card {
  position: relative;
  background: var(--bg-card);
  border: 1px solid var(--bd);
  border-radius: 20px;
  padding: 28px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
}
.access-card:hover { border-color: rgba(216, 90, 48, 0.35); transform: translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,0.10); }
.access-card.is-featured {
  border-color: rgba(216, 90, 48, 0.45);
  box-shadow: 0 12px 36px rgba(216, 90, 48, 0.15);
  transform: scale(1.02);
}
.access-card.is-featured:hover { transform: scale(1.02) translateY(-3px); }
.access-ribbon {
  position: absolute;
  top: -10px;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: white;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.4);
}
.access-top { display: flex; align-items: center; gap: 12px; }
.access-icon { font-size: 28px; line-height: 1; }
.access-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.badge-public  { background: rgba(100,116,139,0.15); color: #94a3b8; }
.badge-member  { background: rgba(16,185,129,0.15);  color: #34d399; }
.badge-blogger { background: rgba(216,90,48,0.15);   color: #E8713E; }
.access-title { font-size: 17px; font-weight: 800; color: var(--tx-2); }
.access-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px; flex: 1; }
.access-list li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: var(--tx-4); line-height: 1.5; }
.access-check {
  color: #10b981;
  font-weight: 900;
  font-size: 13px;
  flex-shrink: 0;
  margin-top: 1px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.access-btn {
  display: block;
  text-align: center;
  padding: 12px 20px;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  border-radius: 12px;
  color: white;
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
  transition: transform 0.2s, box-shadow 0.2s;
  margin-top: auto;
  box-shadow: 0 4px 12px rgba(216, 90, 48, 0.25);
}
.access-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(216, 90, 48, 0.4); }

/* ── Steps ── */
.steps-section { background: var(--bg-card); border-top: 1px solid var(--bd); border-bottom: 1px solid var(--bd); }
.steps-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  position: relative;
}
.step-card {
  position: relative;
  padding: 32px 28px;
  background: var(--bg-base);
  border: 1px solid var(--bd);
  border-radius: 20px;
  transition: border-color 0.25s, transform 0.25s;
}
.step-card:hover { border-color: rgba(216, 90, 48, 0.35); transform: translateY(-3px); }
.step-num {
  font-size: 48px;
  font-weight: 900;
  background: linear-gradient(135deg, #D85A30, #F0997B);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  margin-bottom: 16px;
  letter-spacing: -2px;
  opacity: 0.85;
}
.step-title { font-size: 18px; font-weight: 800; color: var(--tx-2); margin-bottom: 10px; }
.step-desc { font-size: 14px; color: var(--tx-4); line-height: 1.6; }
.step-arrow {
  position: absolute;
  top: 50%;
  right: -20px;
  width: 24px;
  height: 24px;
  color: rgba(216, 90, 48, 0.5);
  transform: translateY(-50%);
  z-index: 2;
  background: var(--bg-card);
  padding: 2px;
  border-radius: 50%;
}

/* ── FAQ ── */
.faq-section { background: var(--bg-base); }
.faq-inner { max-width: 820px; }
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.faq-item {
  border: 1px solid var(--bd);
  border-radius: 16px;
  background: var(--bg-card);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.faq-item.is-open { border-color: rgba(216, 90, 48, 0.35); box-shadow: 0 8px 24px rgba(0,0,0,0.06); }
.faq-q {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  font-size: 15px;
  font-weight: 700;
  color: var(--tx-2);
  transition: color 0.2s;
}
.faq-q:hover { color: #E8713E; }
.faq-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--tx-5);
  transition: transform 0.3s, color 0.2s;
}
.faq-item.is-open .faq-icon { transform: rotate(180deg); color: #E8713E; }
.faq-a-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.faq-item.is-open .faq-a-wrap { grid-template-rows: 1fr; }
.faq-a {
  overflow: hidden;
  font-size: 14.5px;
  color: var(--tx-4);
  line-height: 1.65;
  padding: 0 22px;
}
.faq-item.is-open .faq-a { padding: 0 22px 18px; }

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
  background: rgba(216, 90, 48, 0.12);
  filter: blur(120px);
  pointer-events: none;
}
.cta-inner {
  position: relative;
  z-index: 1;
  max-width: 640px;
  margin: 0 auto;
  text-align: center;
}
.cta-title { font-size: clamp(28px, 4vw, 44px); font-weight: 900; color: var(--tx-1); letter-spacing: -1px; margin-bottom: 16px; line-height: 1.15; }
.cta-sub { font-size: 16px; color: var(--tx-4); margin-bottom: 36px; line-height: 1.6; }
.cta-btns { display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap; }

/* ── Footer ── */
.footer {
  padding: 60px 24px 0;
  border-top: 1px solid var(--bd);
  background: var(--bg-surface);
}
.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.4fr 2fr;
  gap: 48px;
  padding-bottom: 40px;
}
.footer-brand { max-width: 320px; }
.footer-logo { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.footer-tagline { font-size: 14px; color: var(--tx-5); line-height: 1.6; }
.footer-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}
.footer-col { display: flex; flex-direction: column; gap: 10px; }
.footer-col-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--tx-3);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.footer-col a {
  font-size: 14px;
  color: var(--tx-5);
  text-decoration: none;
  transition: color 0.2s;
}
.footer-col a:hover { color: #E8713E; }
.footer-bottom {
  border-top: 1px solid var(--bd);
  padding: 20px 0;
  max-width: 1200px;
  margin: 0 auto;
}
.footer-copy { font-size: 13px; color: var(--tx-6); text-align: center; }

/* ── Scroll to top ── */
.scroll-top {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #D85A30, #E8713E);
  color: white;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(216, 90, 48, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px) scale(0.9);
  transition: opacity 0.25s, transform 0.25s;
  z-index: 60;
}
.scroll-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}
.scroll-top:hover { transform: translateY(-2px) scale(1); box-shadow: 0 12px 32px rgba(216, 90, 48, 0.55); }
.scroll-top svg { width: 18px; height: 18px; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .features-grid { grid-template-columns: repeat(2, 1fr); }
  .access-grid { grid-template-columns: 1fr; }
  .access-card.is-featured { transform: none; }
  .access-card.is-featured:hover { transform: translateY(-3px); }
  .hero-grid { grid-template-columns: 1fr; gap: 48px; }
  .hero-visual { max-width: 460px; margin: 0 auto; min-height: 380px; }
  .nav-center { display: none; }
  .nav-burger { display: inline-flex; }
  .navbar .nav-actions .btn-outline,
  .navbar .nav-actions .btn-fill { display: none; }
  .mobile-menu { display: flex; }
  .steps-row { grid-template-columns: 1fr; }
  .step-arrow { display: none; }
  .footer-inner { grid-template-columns: 1fr; gap: 32px; }
}
@media (max-width: 768px) {
  .section { padding: 72px 20px; }
  .hero { padding: 56px 20px 72px; }
  .features-grid { grid-template-columns: 1fr; }
  .hero-visual { display: none; }
  .footer-cols { grid-template-columns: 1fr 1fr; }
  .nav-inner { padding: 0 16px; gap: 8px; }
  .lang-flags { display: none; }
}
@media (max-width: 480px) {
  .hero-stats { gap: 20px; }
  .hero-stat-val { font-size: 22px; }
  .footer { padding: 48px 20px 0; }
  .scroll-top { bottom: 16px; right: 16px; }
}

/* ── Reduced motion ── */
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition: none; }
  .visual-card-main,
  .visual-card-plan,
  .visual-card-shop,
  .gradient-text { animation: none; }
  .landing, .faq-a-wrap, .faq-icon { transition: none !important; }
}
</style>
