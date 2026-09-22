<template>
  <div class="lobby-view">
    <!-- 巨幕 Banner 区域 -->
    <section class="hero-banner glass-panel">
      <div class="hero-content">
        <div class="hero-badge font-arcade">
          <Sparkles class="w-4 h-4 text-cyan-400" />
          <span>KK ARCADE HUB v1.0 ONLINE</span>
        </div>
        <h1 class="hero-title">
          重燃街机热血，<br />
          <span class="gradient-text">随时开局，畅享指尖对决</span>
        </h1>
        <p class="hero-desc">
          汇聚五大精美经典游戏，纯前端零依赖极速畅玩。挑战 AI 五子棋、驾驭霓虹战机、滑动 2048、躲避雷区与贪吃蛇竞技！
        </p>

        <div class="hero-actions">
          <button class="btn-arcade btn-primary" @click="quickStartRandom">
            <Zap class="w-4 h-4 fill-current" />
            <span>随机开一局</span>
          </button>
          <button class="btn-arcade btn-secondary" @click="claimDailyBonus" :disabled="hasClaimedBonus">
            <Gift class="w-4 h-4" />
            <span>{{ hasClaimedBonus ? '今日已签到' : '每日领 50 金币' }}</span>
          </button>
        </div>
      </div>

      <!-- 霓虹装饰视觉 -->
      <div class="hero-graphic">
        <div class="glow-sphere"></div>
        <div class="floating-icons">
          <span class="float-icon i-1">🎮</span>
          <span class="float-icon i-2">🚀</span>
          <span class="float-icon i-3">♟️</span>
          <span class="float-icon i-4">💣</span>
        </div>
      </div>
    </section>

    <!-- 分类过滤与搜索栏 -->
    <section class="filter-section glass-panel">
      <div class="category-tabs">
        <button 
          v-for="cat in categories" 
          :key="cat.key" 
          class="cat-tab" 
          :class="{ active: currentCategory === cat.key }"
          @click="selectCategory(cat.key)"
        >
          <span>{{ cat.icon }}</span>
          <span>{{ cat.label }}</span>
        </button>
      </div>

      <div class="search-box">
        <Search class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="搜索游戏名称或标签..." 
          class="search-input"
        />
      </div>
    </section>

    <!-- 游戏展厅网格 -->
    <section class="games-grid-section">
      <div v-if="filteredGames.length > 0" class="games-grid">
        <GameCard 
          v-for="game in filteredGames" 
          :key="game.id" 
          :game="game" 
        />
      </div>
      <div v-else class="empty-state glass-panel">
        <AlertCircle class="w-12 h-12 text-slate-500 mb-2" />
        <h3>未找到相关游戏</h3>
        <p>换个搜索关键词或切换全部分类试试看吧</p>
      </div>
    </section>

    <!-- 最近战绩速递 -->
    <section v-if="gameStore.records.length > 0" class="recent-records-section glass-panel">
      <div class="section-title-bar">
        <div class="title-left">
          <History class="w-5 h-5 text-cyan-400" />
          <h3>最近战绩动态</h3>
        </div>
        <router-link to="/profile" class="view-all-link">查看全部记录 →</router-link>
      </div>

      <div class="records-list">
        <div 
          v-for="rec in recentRecords" 
          :key="rec.id" 
          class="record-item"
        >
          <div class="rec-game">
            <span class="rec-name">{{ rec.gameTitle }}</span>
            <span class="rec-time">{{ rec.date }}</span>
          </div>
          <div class="rec-score font-arcade">
            得分: <b class="text-cyan-400">{{ rec.score }}</b>
          </div>
          <div class="rec-coin font-arcade">
            +{{ rec.coinsEarned }} 🪙
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Zap, Gift, Search, History, AlertCircle } from 'lucide-vue-next'
import { useGameStore } from '@/stores/gameStore'
import { useUserStore } from '@/stores/userStore'
import { sound } from '@/utils/soundEngine'
import { storage } from '@/utils/storage'
import confetti from 'canvas-confetti'
import GameCard from '@/components/common/GameCard.vue'
import type { GameCategory } from '@/types'

const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()

const currentCategory = ref<GameCategory>('all')
const searchQuery = ref('')

const categories: { key: GameCategory; label: string; icon: string }[] = [
  { key: 'all', label: '全部游戏', icon: '✨' },
  { key: 'board', label: '棋牌对弈', icon: '♟️' },
  { key: 'arcade', label: '经典街机', icon: '👾' },
  { key: 'puzzle', label: '休闲益智', icon: '🧩' },
  { key: 'shooter', label: '飞行射击', icon: '🚀' }
]

const hasClaimedBonus = ref(storage.get('daily_claimed_' + new Date().toDateString(), false))

const selectCategory = (cat: GameCategory) => {
  sound.click()
  currentCategory.value = cat
}

const filteredGames = computed(() => {
  return gameStore.games.filter(g => {
    const matchCat = currentCategory.value === 'all' || g.category === currentCategory.value
    const query = searchQuery.value.trim().toLowerCase()
    const matchSearch = !query || 
      g.title.toLowerCase().includes(query) || 
      g.subtitle.toLowerCase().includes(query) ||
      g.tags.some(t => t.toLowerCase().includes(query))
    return matchCat && matchSearch
  })
})

const recentRecords = computed(() => {
  return gameStore.records.slice(0, 5)
})

const quickStartRandom = () => {
  sound.click()
  const list = gameStore.games
  const randomGame = list[Math.floor(Math.random() * list.length)]
  router.push(`/game/${randomGame.id}`)
}

const claimDailyBonus = () => {
  if (hasClaimedBonus.value) return
  hasClaimedBonus.value = true
  storage.set('daily_claimed_' + new Date().toDateString(), true)
  userStore.addCoins(50)
  sound.victory()
  confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } })
}
</script>

<style scoped>
.lobby-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1400px;
  width: calc(100% - 24px);
  margin: 0 auto 40px auto;
  padding-top: 12px;
}

/* 巨幕 Banner */
.hero-banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 44px 50px;
  border-radius: 24px;
  overflow: hidden;
  min-height: 280px;
}

.hero-content {
  max-width: 640px;
  z-index: 2;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.3);
  font-size: 0.8rem;
  color: var(--accent-cyan);
  margin-bottom: 16px;
  font-weight: 700;
}

.hero-title {
  font-size: 2.3rem;
  font-weight: 900;
  line-height: 1.25;
  margin-bottom: 14px;
}

.gradient-text {
  background: linear-gradient(90deg, #38bdf8, #818cf8, #ec4899);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-desc {
  font-size: 0.95rem;
  color: var(--text-muted);
  line-height: 1.6;
  margin-bottom: 24px;
}

.hero-actions {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.hero-graphic {
  position: relative;
  width: 280px;
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.glow-sphere {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(139, 92, 246, 0.2) 60%, transparent 100%);
  filter: blur(20px);
  animation: pulseGlow 4s infinite ease-in-out;
}

.floating-icons .float-icon {
  position: absolute;
  font-size: 2.8rem;
  filter: drop-shadow(0 10px 20px rgba(0, 0, 0, 0.5));
}

.i-1 { top: 20px; left: 30px; animation: floatAnim 3.2s infinite ease-in-out; }
.i-2 { top: 15px; right: 40px; animation: floatAnim 2.8s infinite 0.5s ease-in-out; }
.i-3 { bottom: 25px; left: 40px; animation: floatAnim 3.5s infinite 1s ease-in-out; }
.i-4 { bottom: 30px; right: 30px; animation: floatAnim 3s infinite 1.5s ease-in-out; }

/* 过滤与搜索 */
.filter-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px 20px;
  border-radius: 16px;
}

.category-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cat-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.cat-tab:hover {
  color: var(--text-main);
  border-color: var(--accent-cyan);
}

.cat-tab.active {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  min-width: 240px;
}

.search-icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--text-dim);
}

.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 8px 12px 8px 36px;
  color: #fff;
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input:focus {
  border-color: var(--accent-cyan);
}

/* 游戏网格 */
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 22px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  border-radius: 18px;
  text-align: center;
  color: var(--text-muted);
}

/* 战绩速递 */
.recent-records-section {
  padding: 20px 26px;
  border-radius: 18px;
}

.section-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.1rem;
  font-weight: 700;
}

.view-all-link {
  font-size: 0.82rem;
  color: var(--accent-cyan);
  text-decoration: none;
}

.records-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}

.record-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(255, 255, 255, 0.03);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.rec-game {
  display: flex;
  flex-direction: column;
}

.rec-name {
  font-size: 0.85rem;
  font-weight: 700;
}

.rec-time {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.rec-score {
  font-size: 0.85rem;
}

.rec-coin {
  font-size: 0.8rem;
  color: #fbbf24;
}

@media (max-width: 900px) {
  .hero-banner {
    flex-direction: column;
    padding: 30px 24px;
    text-align: center;
  }
  .hero-graphic {
    display: none;
  }
  .hero-actions {
    justify-content: center;
  }
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  .search-box {
    width: 100%;
  }
}
</style>
