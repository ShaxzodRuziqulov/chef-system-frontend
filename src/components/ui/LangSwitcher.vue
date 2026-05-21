<script setup lang="ts">
import { useLangStore, type Lang } from '@/stores/langStore'

const lang = useLangStore()

const langs: { code: Lang; label: string; flag: string }[] = [
  { code: 'uz', label: "O'z", flag: '🇺🇿' },
  { code: 'ru', label: 'Рус', flag: '🇷🇺' },
  { code: 'en', label: 'Eng', flag: '🇬🇧' },
]
</script>

<template>
  <div class="lang-switcher">
    <button
      v-for="l in langs"
      :key="l.code"
      class="lang-btn"
      :class="{ active: lang.lang === l.code }"
      @click="lang.setLang(l.code)"
      :title="l.label"
    >
      <span class="flag">{{ l.flag }}</span>
      <span class="label">{{ l.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-card-md);
  border: 1px solid var(--bd);
  border-radius: 10px;
  padding: 3px;
}

.lang-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--tx-5);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.lang-btn:hover {
  background: var(--bd);
  color: var(--tx-3);
}

.lang-btn.active {
  background: rgba(216, 90, 48, 0.15);
  color: #E8713E;
}

.flag { font-size: 14px; line-height: 1; }
.label { letter-spacing: 0.03em; }
</style>
