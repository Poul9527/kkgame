<template>
  <header class="navbar-wrapper glass-panel">
    <div class="navbar-container">
      <!-- 品牌标识 -->
      <router-link to="/" class="brand" @click="sound.click()">
        <div class="logo-box">
          <Gamepad2 class="w-6 h-6 text-cyan-400" />
        </div>
        <div class="brand-text">
          <span class="brand-title font-arcade">KK ARCADE</span>
          <span class="brand-tag">极客游戏大厅</span>
        </div>
      </router-link>

      <!-- 导航标签 -->
      <nav class="nav-links">
        <router-link to="/" class="nav-item" active-class="active" @click="sound.click()">
          <LayoutGrid class="icon" />
          <span>游戏大厅</span>
        </router-link>
        <router-link to="/leaderboard" class="nav-item" active-class="active" @click="sound.click()">
          <Trophy class="icon" />
          <span>名人堂</span>
        </router-link>
        <router-link to="/shop" class="nav-item" active-class="active" @click="sound.click()">
          <ShoppingBag class="icon" />
          <span>主题商城</span>
        </router-link>
        <router-link to="/profile" class="nav-item" active-class="active" @click="sound.click()">
          <User class="icon" />
          <span>个人战绩</span>
        </router-link>
      </nav>

      <!-- 玩家状态与控制开关 -->
      <div class="action-group">
        <!-- 金币卡 (可点击领福利) -->
        <div class="coin-badge clickable" @click="handleCoinBonus" title="点击免费领取每日金币补给 (+200)">
          <Coins class="coin-icon" />
          <span class="coin-text font-arcade">{{ userStore.coins }}</span>
          <span class="bonus-plus font-arcade">+</span>
        </div>

        <!-- 等级徽章 -->
        <div class="level-badge" :title="`等级: Lv.${userStore.getLevel()} (Exp: ${userStore.exp})`">
          <span class="font-arcade">Lv.{{ userStore.getLevel() }}</span>
        </div>

        <!-- 音效开关 -->
        <button 
          class="icon-btn" 
          :class="{ active: userStore.soundEnabled }" 
          @click="toggleSound" 
          :title="userStore.soundEnabled ? '点击静音' : '开启音效'"
        >
          <Volume2 v-if="userStore.soundEnabled" class="w-5 h-5" />
          <VolumeX v-else class="w-5 h-5" />
        </button>

        <!-- 背景音乐开关 -->
        <button 
          class="icon-btn" 
          :class="{ active: userStore.musicEnabled }" 
          @click="toggleMusic" 
          :title="userStore.musicEnabled ? '关闭背景音乐' : '开启 8-bit 背景音乐'"
        >
          <Music class="w-5 h-5" />
        </button>

        <!-- 全屏切换 -->
        <button class="icon-btn" @click="toggleFullscreen" title="切换全屏">
          <Maximize2 v-if="!isFullscreen" class="w-5 h-5" />
          <Minimize2 v-else class="w-5 h-5" />
        </button>

        <!-- 登录 / 注册 / 用户态 -->
        <div v-if="!authStore.isLoggedIn" class="auth-buttons">
          <button class="btn-arcade btn-primary nav-auth-btn" @click="authStore.openAuthModal('login')">
            <LogIn class="w-4 h-4" />
            <span>登录</span>
          </button>
        </div>

        <div v-else class="user-profile-group">
          <!-- 头像跳转 -->
          <router-link to="/profile" class="avatar-box" :title="`玩家: ${authStore.currentUser?.nickname} (点击进入个人档案)`">
            <span>{{ authStore.currentUser?.avatar || userStore.avatar }}</span>
          </router-link>
          <button class="icon-btn logout-btn" @click="authStore.logout" title="退出登录">
            <LogOut class="w-4 h-4 text-slate-400 hover:text-rose-400" />
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  Gamepad2, LayoutGrid, Trophy, ShoppingBag, User, Coins, 
  Volume2, VolumeX, Music, Maximize2, Minimize2, LogIn, LogOut 
} from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { sound } from '@/utils/soundEngine'
import confetti from 'canvas-confetti'

const userStore = useUserStore()
const authStore = useAuthStore()
const isFullscreen = ref(false)

const handleCoinBonus = (e: MouseEvent) => {
  userStore.addCoins(200)
  sound.coin()
  const x = e.clientX / window.innerWidth
  const y = e.clientY / window.innerHeight
  confetti({
    particleCount: 25,
    spread: 50,
    origin: { x, y },
    colors: ['#fbbf24', '#f59e0b', '#38bdf8']
  })
}

const toggleSound = () => {
  userStore.toggleSound()
  if (userStore.soundEnabled) sound.click()
}

const toggleMusic = () => {
  userStore.toggleMusic()
  sound.click()
}

const toggleFullscreen = () => {
  sound.click()
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
    isFullscreen.value = true
  } else {
    document.exitFullscreen().catch(() => {})
    isFullscreen.value = false
  }
}
</script>

<style scoped>
.navbar-wrapper {
  position: sticky;
  top: 12px;
  z-index: 50;
  margin: 0 auto;
  max-width: 1400px;
  width: calc(100% - 24px);
  padding: 8px 18px;
  border-radius: 18px;
}

.navbar-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}

.logo-box {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.4);
  color: white;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  font-size: 1.15rem;
  font-weight: 800;
  background: linear-gradient(90deg, #38bdf8, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.brand-tag {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-muted);
  text-decoration: none;
  transition: all 0.2s ease;
}

.nav-item .icon {
  width: 17px;
  height: 17px;
}

.nav-item:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.25);
}

.action-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.coin-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 5px 12px;
  border-radius: 20px;
  transition: all 0.2s ease;
  user-select: none;
}

.coin-badge.clickable {
  cursor: pointer;
}

.coin-badge.clickable:hover {
  background: rgba(245, 158, 11, 0.22);
  border-color: #f59e0b;
  transform: scale(1.05);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.3);
}

.bonus-plus {
  font-size: 0.75rem;
  font-weight: 800;
  color: #10b981;
  background: rgba(16, 185, 129, 0.2);
  border-radius: 6px;
  padding: 0 4px;
}

.coin-icon {
  width: 16px;
  height: 16px;
  color: #f59e0b;
}

.coin-text {
  font-weight: 700;
  color: #fbbf24;
  font-size: 0.9rem;
}

.level-badge {
  padding: 4px 10px;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 12px;
  color: #c084fc;
  font-size: 0.8rem;
  font-weight: 700;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.icon-btn.active {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
}

.avatar-box {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid var(--accent-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  text-decoration: none;
  cursor: pointer;
  transition: transform 0.2s;
}

.avatar-box:hover {
  transform: scale(1.08);
}

.user-profile-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-auth-btn {
  padding: 6px 14px;
  font-size: 0.85rem;
  border-radius: 10px;
  gap: 4px;
}

.logout-btn:hover {
  border-color: #f43f5e;
}

@media (max-width: 900px) {
  .brand-text, .nav-item span {
    display: none;
  }
  .navbar-wrapper {
    width: calc(100% - 16px);
    padding: 6px 12px;
  }
}
</style>
