<template>
  <div class="app-layout">
    <!-- 粒子交互背景 -->
    <ParticleCanvas />

    <!-- 顶部导航栏 -->
    <Navbar />

    <!-- 页面内容视图 -->
    <router-view v-slot="{ Component }">
      <transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>

    <!-- 浮动成就达成通知 -->
    <AchievementToast />
  </div>
</template>

<script setup lang="ts">
import ParticleCanvas from '@/components/common/ParticleCanvas.vue'
import Navbar from '@/components/common/Navbar.vue'
import AchievementToast from '@/components/common/AchievementToast.vue'
</script>

<style>
.app-layout {
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 页面切换动画 */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
