<template>
  <transition name="slide-up">
    <div v-if="achievementStore.activeToast" class="toast-wrapper glass-panel">
      <div class="toast-icon">
        <span>{{ achievementStore.activeToast.icon }}</span>
      </div>
      <div class="toast-content">
        <div class="toast-tag">
          <Award class="w-3.5 h-3.5 text-amber-400" />
          <span>达成新成就！</span>
        </div>
        <h4 class="toast-title">{{ achievementStore.activeToast.title }}</h4>
        <p class="toast-desc">{{ achievementStore.activeToast.description }}</p>
      </div>
      <div class="toast-reward">
        <span class="coin-plus">+{{ achievementStore.activeToast.rewardCoins }}</span>
        <Coins class="w-4 h-4 text-amber-400" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { Award, Coins } from 'lucide-vue-next'
import { useAchievementStore } from '@/stores/achievementStore'

const achievementStore = useAchievementStore()
</script>

<style scoped>
.toast-wrapper {
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.92);
  border: 1.5px solid #f59e0b;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(245, 158, 11, 0.35);
  max-width: 380px;
}

.toast-icon {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: rgba(245, 158, 11, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.6rem;
  flex-shrink: 0;
}

.toast-content {
  flex: 1;
}

.toast-tag {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: #fbbf24;
  font-weight: 700;
  margin-bottom: 2px;
}

.toast-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 2px;
}

.toast-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.toast-reward {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 158, 11, 0.2);
  padding: 4px 8px;
  border-radius: 8px;
  font-weight: 800;
  color: #fbbf24;
  font-size: 0.85rem;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px) scale(0.92);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
</style>
