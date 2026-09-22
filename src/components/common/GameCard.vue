<template>
  <div class="game-card glass-panel" @click="startGame">
    <!-- 顶部徽章 -->
    <div class="card-header">
      <span class="category-badge">{{ categoryName }}</span>
      <span v-if="game.hot" class="hot-badge">
        <Flame class="w-3.5 h-3.5" /> 热门
      </span>
    </div>

    <!-- 图标与主视觉 -->
    <div class="card-hero" :style="{ background: game.color }">
      <span class="game-icon animate-float">{{ game.icon }}</span>
      <div class="hero-overlay"></div>
    </div>

    <!-- 内容区 -->
    <div class="card-body">
      <h3 class="game-title">{{ game.title }}</h3>
      <span class="game-subtitle font-arcade">{{ game.subtitle }}</span>
      <p class="game-desc">{{ game.description }}</p>

      <!-- 标签 -->
      <div class="tags-container">
        <span v-for="tag in game.tags" :key="tag" class="tag-chip">
          #{{ tag }}
        </span>
      </div>

      <!-- 统计数据 -->
      <div class="stats-row">
        <div class="stat-item">
          <span class="stat-label">历史最高</span>
          <span class="stat-val font-arcade">
            {{ bestScoreDisplay }}
          </span>
        </div>
        <div class="stat-item">
          <span class="stat-label">游玩次数</span>
          <span class="stat-val font-arcade">{{ game.playCount }} 次</span>
        </div>
      </div>
    </div>

    <!-- 底部行动区 -->
    <div class="card-footer">
      <button class="play-btn btn-arcade btn-primary">
        <Play class="w-4 h-4 fill-current" />
        <span>立即开玩</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Flame, Play } from 'lucide-vue-next'
import type { GameInfo } from '@/types'
import { useGameStore } from '@/stores/gameStore'
import { sound } from '@/utils/soundEngine'

const props = defineProps<{
  game: GameInfo
}>()

const router = useRouter()
const gameStore = useGameStore()

const categoryName = computed(() => {
  const map: Record<string, string> = {
    board: '棋牌对弈',
    arcade: '街机动作',
    puzzle: '休闲益智',
    shooter: '射击飞行'
  }
  return map[props.game.category] || '迷你游戏'
})

const bestScoreDisplay = computed(() => {
  const score = gameStore.getBestScore(props.game.id)
  if (props.game.id === 'minesweeper') {
    return score > 0 ? `${score}秒` : '暂无'
  }
  if (props.game.id === 'gomoku') {
    return score > 0 ? `${score}胜` : '暂无'
  }
  return score > 0 ? score.toLocaleString() : '暂无'
})

const startGame = () => {
  sound.click()
  router.push(`/game/${props.game.id}`)
}
</script>

<style scoped>
.game-card {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  border-radius: 20px;
  background: var(--bg-card);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s, border-color 0.28s;
}

.game-card:hover {
  transform: translateY(-6px) scale(1.015);
  border-color: var(--accent-cyan);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(6, 182, 212, 0.25);
}

.card-header {
  position: absolute;
  top: 14px;
  left: 14px;
  right: 14px;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.category-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(8px);
  color: #e2e8f0;
  border: 1px solid rgba(255, 255, 255, 0.15);
}

.hot-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  background: linear-gradient(135deg, #f43f5e, #e11d48);
  color: white;
  box-shadow: 0 0 12px rgba(244, 63, 94, 0.5);
}

.card-hero {
  height: 140px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, transparent 30%, var(--bg-card) 100%);
}

.game-icon {
  font-size: 4rem;
  filter: drop-shadow(0 8px 16px rgba(0, 0, 0, 0.5));
}

.card-body {
  padding: 16px 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.game-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--text-main);
  margin-bottom: 2px;
}

.game-subtitle {
  font-size: 0.72rem;
  color: var(--accent-cyan);
  font-weight: 700;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.game-desc {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.tag-chip {
  font-size: 0.7rem;
  color: var(--text-dim);
  background: rgba(255, 255, 255, 0.04);
  padding: 2px 8px;
  border-radius: 6px;
}

.stats-row {
  display: flex;
  justify-content: space-between;
  margin-top: auto;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--text-dim);
}

.stat-val {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fbbf24;
}

.card-footer {
  padding: 0 20px 20px 20px;
}

.play-btn {
  width: 100%;
}
</style>
