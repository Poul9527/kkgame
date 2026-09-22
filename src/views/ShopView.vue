<template>
  <div class="shop-view">
    <!-- 头部横幅 -->
    <div class="header-section glass-panel">
      <div class="title-box">
        <ShoppingBag class="w-8 h-8 text-cyan-400" />
        <div>
          <h1 class="page-title">街机主题商城</h1>
          <span class="page-desc">消耗在游戏中赚取的金币，解锁个性化视觉主题与专属玩家头像！</span>
        </div>
      </div>

      <div class="coin-display glass-panel font-arcade">
        <Coins class="w-5 h-5 text-amber-400" />
        <span class="coins-amount">{{ userStore.coins }}</span>
        <span class="coins-unit">金币</span>
      </div>
    </div>

    <!-- 主题风格专区 -->
    <section class="section-container">
      <div class="section-title">
        <Palette class="w-5 h-5 text-purple-400" />
        <h2>大厅视觉主题</h2>
      </div>

      <div class="items-grid">
        <div 
          v-for="theme in themes" 
          :key="theme.id" 
          class="shop-card glass-panel"
          :class="{ 'is-current': userStore.currentTheme === theme.id }"
        >
          <div class="theme-preview" :style="{ background: theme.previewBg }">
            <div class="preview-palette">
              <span 
                v-for="color in theme.colors" 
                :key="color" 
                class="color-dot" 
                :style="{ background: color }"
              ></span>
            </div>
            <span v-if="userStore.currentTheme === theme.id" class="active-badge">
              <Check class="w-3.5 h-3.5" /> 使用中
            </span>
          </div>

          <div class="card-content">
            <h3 class="item-name">{{ theme.name }}</h3>
            <p class="item-desc">{{ theme.description }}</p>

            <div class="card-action">
              <!-- 已装配 -->
              <button 
                v-if="userStore.currentTheme === theme.id" 
                class="btn-arcade btn-secondary" 
                disabled
              >
                当前使用中
              </button>

              <!-- 已拥有，点击装配 -->
              <button 
                v-else-if="userStore.unlockedThemes.includes(theme.id)" 
                class="btn-arcade btn-primary" 
                @click="applyTheme(theme.id)"
              >
                立即切换
              </button>

              <!-- 未拥有，点击购买 -->
              <button 
                v-else 
                class="btn-arcade btn-buy" 
                :disabled="userStore.coins < theme.price"
                @click="buyTheme(theme)"
              >
                <Coins class="w-4 h-4 text-amber-400" />
                <span>{{ theme.price }} 购买</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 头像装扮专区 -->
    <section class="section-container">
      <div class="section-title">
        <Smile class="w-5 h-5 text-amber-400" />
        <h2>玩家专属头像</h2>
      </div>

      <div class="avatars-grid glass-panel">
        <div 
          v-for="item in avatarItems" 
          :key="item.id" 
          class="avatar-item"
          :class="{ 
            'is-selected': userStore.avatar === item.avatar,
            'is-locked': !item.unlocked 
          }"
          @click="selectAvatar(item)"
        >
          <span class="avatar-emoji">{{ item.avatar }}</span>
          <span class="avatar-name">{{ item.name }}</span>
          
          <div class="avatar-status">
            <span v-if="userStore.avatar === item.avatar" class="tag active">佩戴中</span>
            <span v-else-if="item.unlocked" class="tag owned">已拥有</span>
            <span v-else class="tag price font-arcade">{{ item.price }} 🪙</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ShoppingBag, Coins, Palette, Smile, Check } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'
import { sound } from '@/utils/soundEngine'
import { storage } from '@/utils/storage'
import confetti from 'canvas-confetti'

const userStore = useUserStore()

const themes = [
  {
    id: 'neon',
    name: '赛博霓虹 (Cyberpunk)',
    description: '经典的科技冷蓝与霓虹青光，大厅默认初始风格。',
    price: 0,
    previewBg: 'linear-gradient(135deg, #0b0f19, #1e293b)',
    colors: ['#06b6d4', '#3b82f6', '#8b5cf6']
  },
  {
    id: 'matrix',
    name: '矩阵代码 (Emerald Matrix)',
    description: '极客黑客帝国的翡翠绿光微影，沉浸代码美学。',
    price: 150,
    previewBg: 'linear-gradient(135deg, #04120a, #0c331d)',
    colors: ['#10b981', '#34d399', '#059669']
  },
  {
    id: 'space',
    name: '深邃暗夜 (Deep Space)',
    description: '浩瀚星系幽暗深邃之紫，静谧的极简电竞氛围。',
    price: 200,
    previewBg: 'linear-gradient(135deg, #05070e, #1e1b4b)',
    colors: ['#8b5cf6', '#a855f7', '#6366f1']
  },
  {
    id: 'arcade',
    name: '复古街机 (Retro Arcade)',
    description: '重回 90 年代街机厅的热血桃红与紫罗兰碰撞。',
    price: 250,
    previewBg: 'linear-gradient(135deg, #180d28, #4c0519)',
    colors: ['#f43f5e', '#ec4899', '#fb7185']
  }
]

interface AvatarItem {
  id: string
  name: string
  avatar: string
  price: number
  unlocked: boolean
}

const unlockedAvatars = ref<string[]>(storage.get('unlocked_avatars', ['🎮', '🤖', '🐱']))

const avatarItems = ref<AvatarItem[]>([
  { id: 'av-1', name: '手柄玩家', avatar: '🎮', price: 0, unlocked: true },
  { id: 'av-2', name: '智械核心', avatar: '🤖', price: 0, unlocked: true },
  { id: 'av-3', name: '招财灵猫', avatar: '🐱', price: 0, unlocked: true },
  { id: 'av-4', name: '灵狐刺客', avatar: '🦊', price: 60, unlocked: false },
  { id: 'av-5', name: '奥术法师', avatar: '🧙‍♂️', price: 80, unlocked: false },
  { id: 'av-6', name: '外星访客', avatar: '👾', price: 100, unlocked: false },
  { id: 'av-7', name: '穿梭飞船', avatar: '🛸', price: 120, unlocked: false },
  { id: 'av-8', name: '街机帝王', avatar: '👑', price: 180, unlocked: false }
])

// 恢复已解锁头像
avatarItems.value.forEach(item => {
  if (unlockedAvatars.value.includes(item.avatar)) {
    item.unlocked = true
  }
})

const applyTheme = (themeId: string) => {
  sound.click()
  userStore.setTheme(themeId)
}

const buyTheme = (theme: typeof themes[0]) => {
  if (userStore.spendCoins(theme.price)) {
    userStore.unlockTheme(theme.id)
    userStore.setTheme(theme.id)
    sound.victory()
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } })
  } else {
    sound.gameover()
  }
}

const selectAvatar = (item: AvatarItem) => {
  if (item.unlocked) {
    sound.click()
    userStore.setAvatar(item.avatar)
  } else {
    // 购买头像
    if (userStore.spendCoins(item.price)) {
      item.unlocked = true
      unlockedAvatars.value.push(item.avatar)
      storage.set('unlocked_avatars', unlockedAvatars.value)
      userStore.setAvatar(item.avatar)
      sound.victory()
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } })
    } else {
      sound.gameover()
    }
  }
}
</script>

<style scoped>
.shop-view {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1100px;
  width: calc(100% - 24px);
  margin: 0 auto 40px auto;
  padding-top: 12px;
}

.header-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 30px;
  border-radius: 20px;
}

.title-box {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: #fff;
}

.page-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.coin-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 14px;
  border-color: rgba(245, 158, 11, 0.4);
}

.coins-amount {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fbbf24;
}

.coins-unit {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.section-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 18px;
}

.shop-card {
  display: flex;
  flex-direction: column;
  border-radius: 18px;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s;
}

.shop-card.is-current {
  border-color: var(--accent-cyan);
  box-shadow: var(--neon-glow);
}

.theme-preview {
  height: 110px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-palette {
  display: flex;
  gap: 10px;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.active-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(6, 182, 212, 0.9);
  color: white;
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
}

.card-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-name {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 4px;
}

.item-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 16px;
  flex: 1;
}

.card-action button {
  width: 100%;
}

.btn-buy {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-buy:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 头像网格 */
.avatars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
  gap: 14px;
  padding: 20px;
  border-radius: 18px;
}

.avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all 0.2s;
}

.avatar-item:hover {
  border-color: var(--accent-cyan);
  transform: translateY(-2px);
}

.avatar-item.is-selected {
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
}

.avatar-emoji {
  font-size: 2.4rem;
  margin-bottom: 6px;
}

.avatar-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: #fff;
  margin-bottom: 8px;
}

.avatar-status .tag {
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 10px;
}

.tag.active {
  background: rgba(6, 182, 212, 0.25);
  color: var(--accent-cyan);
}

.tag.owned {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.tag.price {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

@media (max-width: 768px) {
  .header-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
