<template>
  <div class="leaderboard-view">
    <div class="header-section glass-panel">
      <div class="title-box">
        <Trophy class="w-8 h-8 text-amber-400" />
        <div>
          <h1 class="page-title">名人堂排行榜</h1>
          <span class="page-desc">各路高能玩家最高纪录竞技场，你能登顶第几名？</span>
        </div>
      </div>

      <!-- 游戏切换按钮 -->
      <div class="game-tabs">
        <button 
          v-for="game in gameStore.games" 
          :key="game.id" 
          class="tab-btn" 
          :class="{ active: selectedGameId === game.id }"
          @click="selectGame(game.id)"
        >
          <span>{{ game.icon }}</span>
          <span>{{ game.title }}</span>
        </button>
      </div>
    </div>

    <!-- 领奖台（前三名荣耀展示） -->
    <section v-if="topThree.length >= 3" class="podium-section glass-panel">
      <!-- 亚军 Rank 2 -->
      <div class="podium-pillar rank-2">
        <div class="player-avatar-box">
          <span class="rank-crown silver">🥈</span>
          <span class="avatar">{{ topThree[1]?.avatar }}</span>
        </div>
        <div class="player-name">{{ topThree[1]?.nickname }}</div>
        <div class="player-score font-arcade">{{ formatScore(topThree[1]?.score) }}</div>
        <div class="pillar-block silver-block">
          <span class="pillar-rank font-arcade">2</span>
        </div>
      </div>

      <!-- 冠军 Rank 1 -->
      <div class="podium-pillar rank-1">
        <div class="player-avatar-box">
          <span class="rank-crown gold">👑</span>
          <span class="avatar">{{ topThree[0]?.avatar }}</span>
        </div>
        <div class="player-name">{{ topThree[0]?.nickname }}</div>
        <div class="player-score font-arcade text-amber-400">{{ formatScore(topThree[0]?.score) }}</div>
        <div class="pillar-block gold-block">
          <span class="pillar-rank font-arcade">1</span>
        </div>
      </div>

      <!-- 季军 Rank 3 -->
      <div class="podium-pillar rank-3">
        <div class="player-avatar-box">
          <span class="rank-crown bronze">🥉</span>
          <span class="avatar">{{ topThree[2]?.avatar }}</span>
        </div>
        <div class="player-name">{{ topThree[2]?.nickname }}</div>
        <div class="player-score font-arcade">{{ formatScore(topThree[2]?.score) }}</div>
        <div class="pillar-block bronze-block">
          <span class="pillar-rank font-arcade">3</span>
        </div>
      </div>
    </section>

    <!-- 完整排行榜表格 -->
    <section class="board-table-section glass-panel">
      <div class="table-header">
        <span class="col rank">排名</span>
        <span class="col player">玩家</span>
        <span class="col score">得分 / 记录</span>
        <span class="col date">时间</span>
      </div>

      <div class="table-body">
        <div 
          v-for="entry in currentLeaderboard" 
          :key="entry.rank + entry.nickname" 
          class="table-row"
          :class="{ 'is-me': entry.nickname.includes('(我)') }"
        >
          <div class="col rank">
            <span class="rank-tag" :class="'rank-' + entry.rank">{{ entry.rank }}</span>
          </div>
          <div class="col player">
            <span class="avatar-icon">{{ entry.avatar }}</span>
            <span class="player-nick">{{ entry.nickname }}</span>
          </div>
          <div class="col score font-arcade">
            {{ formatScore(entry.score) }}
          </div>
          <div class="col date">
            {{ entry.date }}
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Trophy } from 'lucide-vue-next'
import { useGameStore } from '@/stores/gameStore'
import { sound } from '@/utils/soundEngine'

const gameStore = useGameStore()
const selectedGameId = ref<string>('gomoku')

const selectGame = (id: string) => {
  sound.click()
  selectedGameId.value = id
}

const currentLeaderboard = computed(() => {
  return gameStore.getLeaderboard(selectedGameId.value)
})

const topThree = computed(() => {
  return currentLeaderboard.value.slice(0, 3)
})

const formatScore = (val?: number) => {
  if (val === undefined || val === null) return '-'
  if (selectedGameId.value === 'minesweeper') {
    return val > 0 ? `${val} 秒` : '无'
  }
  if (selectedGameId.value === 'gomoku') {
    return `${val} 胜场`
  }
  return val.toLocaleString() + ' 分'
}
</script>

<style scoped>
.leaderboard-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 1000px;
  width: calc(100% - 24px);
  margin: 0 auto 40px auto;
  padding-top: 12px;
}

.header-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
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

.game-tabs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: #fff;
  border-color: var(--accent-cyan);
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

/* 领奖台 */
.podium-section {
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 20px;
  padding: 40px 20px 20px 20px;
  border-radius: 20px;
}

.podium-pillar {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 140px;
}

.player-avatar-box {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 2px solid rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  margin-bottom: 8px;
}

.rank-crown {
  position: absolute;
  top: -16px;
  font-size: 1.4rem;
}

.player-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 2px;
  max-width: 130px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-score {
  font-size: 0.95rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.pillar-block {
  width: 100%;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: center;
  padding-top: 10px;
}

.pillar-rank {
  font-size: 1.6rem;
  font-weight: 900;
  color: rgba(255, 255, 255, 0.8);
}

.rank-1 .pillar-block {
  height: 120px;
  background: linear-gradient(to bottom, rgba(245, 158, 11, 0.45), rgba(245, 158, 11, 0.15));
  border: 2px solid rgba(245, 158, 11, 0.7);
  border-bottom: none;
}

.rank-2 .pillar-block {
  height: 90px;
  background: linear-gradient(to bottom, rgba(148, 163, 184, 0.4), rgba(148, 163, 184, 0.15));
  border: 2px solid rgba(148, 163, 184, 0.7);
  border-bottom: none;
}

.rank-3 .pillar-block {
  height: 70px;
  background: linear-gradient(to bottom, rgba(180, 83, 9, 0.35), rgba(180, 83, 9, 0.15));
  border: 2px solid rgba(180, 83, 9, 0.7);
  border-bottom: none;
}

/* 完整列表表格 */
.board-table-section {
  padding: 16px 20px;
  border-radius: 20px;
}

.table-header {
  display: flex;
  padding: 10px 16px;
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 700;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.table-row {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-radius: 12px;
  transition: background 0.2s;
  margin-top: 6px;
}

.table-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.table-row.is-me {
  background: rgba(6, 182, 212, 0.12);
  border: 1px solid rgba(6, 182, 212, 0.35);
}

.col.rank { width: 70px; }
.col.player { flex: 1; display: flex; align-items: center; gap: 10px; }
.col.score { width: 140px; font-size: 0.95rem; font-weight: 700; color: #fbbf24; }
.col.date { width: 100px; font-size: 0.8rem; color: var(--text-dim); text-align: right; }

.rank-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  font-size: 0.85rem;
  font-weight: 700;
}

.rank-tag.rank-1 { background: #f59e0b; color: #000; }
.rank-tag.rank-2 { background: #94a3b8; color: #000; }
.rank-tag.rank-3 { background: #b45309; color: #fff; }

.avatar-icon {
  font-size: 1.3rem;
}

.player-nick {
  font-size: 0.9rem;
  font-weight: 600;
}
</style>
