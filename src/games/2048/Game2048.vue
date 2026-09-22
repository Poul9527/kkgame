<template>
  <div class="game-2048-container">
    <!-- 仪表盘 -->
    <div class="game-dashboard glass-panel">
      <div class="header-main">
        <h1 class="logo-text font-arcade">2048</h1>
        <span class="logo-sub">合并相同数字冲击极限！</span>
      </div>

      <div class="scores-group">
        <div class="score-pill current">
          <span class="score-label">当前得分</span>
          <span class="score-val font-arcade">{{ score }}</span>
        </div>
        <div class="score-pill best">
          <span class="score-label">历史最高</span>
          <span class="score-val font-arcade">{{ bestScore }}</span>
        </div>
      </div>
    </div>

    <!-- 工具与操作条 -->
    <div class="toolbar glass-panel">
      <div class="tip-text">
        <span>使用方向键 / WASD 或在棋盘上滑动操控</span>
      </div>
      <div class="actions">
        <button class="ctrl-btn" @click="undo" :disabled="!canUndo || isGameOver">
          <RotateCcw class="w-4 h-4" />
          <span>撤销</span>
        </button>
        <button class="ctrl-btn reset" @click="restartGame">
          <RefreshCw class="w-4 h-4" />
          <span>重新开始</span>
        </button>
      </div>
    </div>

    <!-- 2048 网格主体 -->
    <div 
      class="board-grid glass-panel"
      ref="gridRef"
      @touchstart="handleTouchStart"
      @touchmove.prevent
      @touchend="handleTouchEnd"
    >
      <div v-for="r in 4" :key="'row-' + (r - 1)" class="grid-row">
        <div 
          v-for="c in 4" 
          :key="'cell-' + (r - 1) + '-' + (c - 1)" 
          class="grid-cell"
        >
          <transition name="tile-pop">
            <div 
              v-if="grid[r - 1][c - 1] !== 0" 
              class="tile font-arcade"
              :class="getTileClass(grid[r - 1][c - 1])"
            >
              {{ grid[r - 1][c - 1] }}
            </div>
          </transition>
        </div>
      </div>
    </div>

    <!-- 游戏胜利（达到 2048）或结束弹窗 -->
    <Modal v-model="showModal" :title="modalTitle" width="400px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="hasWon" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ modalMsg }}</h2>
        <p class="settle-desc">本局最终积分：<b class="text-cyan-400">{{ score }}</b> 点</p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ earnedCoins }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button v-if="hasWon && !isGameOver" class="btn-arcade btn-secondary" @click="continuePlaying">继续挑战</button>
        <button class="btn-arcade btn-primary" @click="restartGame">再玩一局</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { RotateCcw, RefreshCw, Trophy, AlertCircle, Coins } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useGameStore } from '@/stores/gameStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const gameStore = useGameStore()

type Grid = number[][]

const grid = ref<Grid>([
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0]
])

const previousGrid = ref<Grid | null>(null)
const previousScore = ref<number>(0)
const score = ref(0)
const bestScore = computed(() => gameStore.getBestScore('2048'))

const isGameOver = ref(false)
const hasWon = ref(false)
const keepPlaying = ref(false)
const showModal = ref(false)
const earnedCoins = ref(0)
const canUndo = ref(false)

// 触控滑动变量
let touchStartX = 0
let touchStartY = 0

const getTileClass = (val: number) => {
  return `tile-${val > 2048 ? 'super' : val}`
}

const addRandomTile = () => {
  const emptyCells: { r: number; c: number }[] = []
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid.value[r][c] === 0) {
        emptyCells.push({ r, c })
      }
    }
  }

  if (emptyCells.length > 0) {
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)]
    grid.value[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4
  }
}

// 保存上一步以便撤回
const saveState = () => {
  previousGrid.value = grid.value.map(row => [...row])
  previousScore.value = score.value
  canUndo.value = true
}

const undo = () => {
  if (!canUndo.value || !previousGrid.value || isGameOver.value) return
  sound.click()
  grid.value = previousGrid.value.map(row => [...row])
  score.value = previousScore.value
  canUndo.value = false
}

// 滑动合并算法（对单行处理）
const slideRow = (row: number[]): { newRow: number[]; gainedScore: number; merged: boolean } => {
  let filtered = row.filter(val => val !== 0)
  let gainedScore = 0
  let merged = false

  for (let i = 0; i < filtered.length - 1; i++) {
    if (filtered[i] === filtered[i + 1]) {
      filtered[i] *= 2
      gainedScore += filtered[i]
      filtered.splice(i + 1, 1)
      merged = true
    }
  }

  while (filtered.length < 4) {
    filtered.push(0)
  }

  return { newRow: filtered, gainedScore, merged }
}

const move = (direction: 'left' | 'right' | 'up' | 'down') => {
  if (isGameOver.value) return

  let changed = false
  let turnScore = 0
  let hadMerge = false

  const newGrid: Grid = grid.value.map(row => [...row])

  if (direction === 'left') {
    for (let r = 0; r < 4; r++) {
      const res = slideRow(newGrid[r])
      if (res.newRow.some((val, idx) => val !== newGrid[r][idx])) changed = true
      newGrid[r] = res.newRow
      turnScore += res.gainedScore
      if (res.merged) hadMerge = true
    }
  } else if (direction === 'right') {
    for (let r = 0; r < 4; r++) {
      const reversed = [...newGrid[r]].reverse()
      const res = slideRow(reversed)
      const restored = res.newRow.reverse()
      if (restored.some((val, idx) => val !== newGrid[r][idx])) changed = true
      newGrid[r] = restored
      turnScore += res.gainedScore
      if (res.merged) hadMerge = true
    }
  } else if (direction === 'up') {
    for (let c = 0; c < 4; c++) {
      const col = [newGrid[0][c], newGrid[1][c], newGrid[2][c], newGrid[3][c]]
      const res = slideRow(col)
      for (let r = 0; r < 4; r++) {
        if (newGrid[r][c] !== res.newRow[r]) changed = true
        newGrid[r][c] = res.newRow[r]
      }
      turnScore += res.gainedScore
      if (res.merged) hadMerge = true
    }
  } else if (direction === 'down') {
    for (let c = 0; c < 4; c++) {
      const col = [newGrid[3][c], newGrid[2][c], newGrid[1][c], newGrid[0][c]]
      const res = slideRow(col)
      for (let r = 0; r < 4; r++) {
        if (newGrid[3 - r][c] !== res.newRow[r]) changed = true
        newGrid[3 - r][c] = res.newRow[r]
      }
      turnScore += res.gainedScore
      if (res.merged) hadMerge = true
    }
  }

  if (changed) {
    saveState()
    grid.value = newGrid
    score.value += turnScore

    if (hadMerge) {
      sound.merge(Math.floor(Math.log2(turnScore || 2)))
    } else {
      sound.click()
    }

    addRandomTile()
    checkStatus()
  }
}

const checkStatus = () => {
  // 检查是否达成 2048
  if (!hasWon.value && !keepPlaying.value) {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid.value[r][c] === 2048) {
          hasWon.value = true
          showModal.value = true
          sound.victory()
          confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.6 }
          })
          return
        }
      }
    }
  }

  // 检查是否已无合法移动（游戏失败）
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (grid.value[r][c] === 0) return
      if (c < 3 && grid.value[r][c] === grid.value[r][c + 1]) return
      if (r < 3 && grid.value[r][c] === grid.value[r + 1][c]) return
    }
  }

  // 游戏结束
  isGameOver.value = true
  sound.gameover()
  const settle = gameStore.recordGame('2048', score.value)
  earnedCoins.value = settle?.coins || 15
  showModal.value = true
}

const continuePlaying = () => {
  keepPlaying.value = true
  showModal.value = false
}

const restartGame = () => {
  sound.click()
  grid.value = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ]
  score.value = 0
  isGameOver.value = false
  hasWon.value = false
  keepPlaying.value = false
  showModal.value = false
  canUndo.value = false
  previousGrid.value = null

  addRandomTile()
  addRandomTile()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    move('left')
    e.preventDefault()
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    move('right')
    e.preventDefault()
  } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    move('up')
    e.preventDefault()
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    move('down')
    e.preventDefault()
  }
}

const handleTouchStart = (e: TouchEvent) => {
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY

  if (Math.abs(dx) < 25 && Math.abs(dy) < 25) return // 防误触

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? 'right' : 'left')
  } else {
    move(dy > 0 ? 'down' : 'up')
  }
}

const modalTitle = computed(() => (hasWon.value && !isGameOver.value ? '恭喜达成 2048！' : '游戏结束'))
const modalMsg = computed(() => {
  if (hasWon.value && !isGameOver.value) return '你成功合成了传奇 2048 方块！'
  return '棋盘已满，无法再进行任何合并。'
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  restartGame()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.game-2048-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 20px;
  border-radius: 16px;
}

.logo-text {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-sub {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.scores-group {
  display: flex;
  gap: 10px;
}

.score-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  border-radius: 12px;
  min-width: 84px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
}

.score-label {
  font-size: 0.68rem;
  color: var(--text-dim);
}

.score-val {
  font-size: 1.15rem;
  font-weight: 800;
}

.score-pill.current .score-val {
  color: var(--accent-cyan);
}

.score-pill.best .score-val {
  color: #fbbf24;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 18px;
  border-radius: 14px;
}

.tip-text {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.actions {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover:not(:disabled) {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.ctrl-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.ctrl-btn.reset:hover {
  border-color: #f43f5e;
  color: #f43f5e;
}

/* 4x4 棋盘 */
.board-grid {
  width: 100%;
  aspect-ratio: 1 / 1;
  padding: 12px;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.85);
  border: 2px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 12px;
  touch-action: none;
}

.grid-row {
  display: flex;
  flex: 1;
  gap: 12px;
}

.grid-cell {
  flex: 1;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tile {
  position: absolute;
  inset: 0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  font-weight: 800;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.15s ease-out;
}

/* 经典与霓虹色彩梯度 */
.tile-2 { background: #334155; color: #f8fafc; }
.tile-4 { background: #475569; color: #f8fafc; }
.tile-8 { background: #0284c7; color: #ffffff; box-shadow: 0 0 10px rgba(2, 132, 199, 0.5); }
.tile-16 { background: #0d9488; color: #ffffff; box-shadow: 0 0 12px rgba(13, 148, 136, 0.6); }
.tile-32 { background: #16a34a; color: #ffffff; box-shadow: 0 0 14px rgba(22, 163, 74, 0.6); }
.tile-64 { background: #ca8a04; color: #ffffff; box-shadow: 0 0 16px rgba(202, 138, 4, 0.7); }
.tile-128 { background: #ea580c; color: #ffffff; font-size: 1.45rem; box-shadow: 0 0 18px rgba(234, 88, 12, 0.7); }
.tile-256 { background: #dc2626; color: #ffffff; font-size: 1.45rem; box-shadow: 0 0 20px rgba(220, 38, 38, 0.8); }
.tile-512 { background: #9333ea; color: #ffffff; font-size: 1.45rem; box-shadow: 0 0 22px rgba(147, 51, 234, 0.8); }
.tile-1024 { background: #c026d3; color: #ffffff; font-size: 1.25rem; box-shadow: 0 0 24px rgba(192, 38, 211, 0.9); }
.tile-2048 { background: linear-gradient(135deg, #e11d48, #fbbf24); color: #ffffff; font-size: 1.25rem; box-shadow: 0 0 30px #fbbf24; animation: pulseGlow 2s infinite; }
.tile-super { background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: #ffffff; font-size: 1.15rem; box-shadow: 0 0 35px #06b6d4; }

.tile-pop-enter-active {
  animation: tileAppear 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes tileAppear {
  0% { transform: scale(0); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.modal-settle-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 0;
}

.settle-trophy {
  margin-bottom: 12px;
}

.settle-status {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
}

.settle-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.reward-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 8px 18px;
  border-radius: 12px;
  color: #fbbf24;
  font-weight: 700;
  font-size: 1rem;
}
</style>
