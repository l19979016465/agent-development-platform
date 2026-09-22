<template>
  <div class="brand-logo" :class="`brand-logo--${size}`">
    <svg viewBox="0 0 64 64" class="brand-logo__icon" aria-hidden="true">
      <defs>
        <linearGradient :id="gradId" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#818cf8" />
          <stop offset="1" stop-color="#c084fc" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="56" height="56" rx="14" :fill="`url(#${gradId})`" />
      <circle cx="24" cy="24" r="6" fill="#fff" />
      <circle cx="40" cy="24" r="6" fill="#fff" />
      <path d="M20 40 q12 8 24 0" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" />
      <line x1="32" y1="10" x2="32" y2="4" stroke="#fff" stroke-width="3" stroke-linecap="round" />
      <circle cx="32" cy="5" r="2.5" fill="#67e8f9" />
    </svg>
    <span v-if="showText" class="brand-logo__text">智能体开发平台</span>
  </div>
</template>

<script setup>
import { useId } from 'vue'

defineProps({
  /** 图标尺寸：small / large */
  size: { type: String, default: 'small' },
  showText: { type: Boolean, default: false },
})

const gradId = useId()
</script>

<style scoped>
.brand-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.brand-logo__icon {
  display: block;
  width: 36px;
  height: 36px;
}

.brand-logo--large .brand-logo__icon {
  width: 56px;
  height: 56px;
}

.brand-logo--large .brand-logo__text {
  font-size: 26px;
}

.brand-logo__text {
  font-size: 18px;
  font-weight: 600;
  color: inherit;
}
</style>
