<template>
  <div class="minesweeper-container">
    <!-- 仪表盘 -->
    <div class="game-dashboard glass-panel">
      <!-- 剩余雷数 -->
      <div class="dashboard-badge mines">
        <Bomb class="w-5 h-5 text-rose-400" />
        <span class="badge-num font-arcade text-rose-400">{{ String(remainingMines).padStart(3, '0') }}</span>
      </div>

      <!-- 表情交互复位按钮 -->
      <button class="face-btn" @click="resetGame" title="重置当前雷区">
        <span class="face-icon">{{ faceStatus }}</span>
      </button>

      <!-- 计时器 -->
      <div class="dashboard-badge timer">
        <Clock class="w-5 h-5 text-amber-400" />
        <span class="badge-num font-arcade text-amber-400">{{ String(timerSec).padStart(3, '0') }}</span>
      </div>
    </div>

    <!-- 难度与插旗切换栏 -->
    <div class="toolbar glass-panel">
      <div class="difficulty-tabs">
        <button 
          v-for="d in difficulties" 
          :key="d.key" 
          class="tab-btn" 
          :class="{ active: currentDifficulty === d.key }"
          @click="changeDifficulty(d.key)"
        >
          {{ d.label }} ({{ d.mines }}雷)
        </button>
      </div>

      <div class="flag-toggle-wrapper">
        <button 
          class="flag-mode-btn" 
          :class="{ active: flagMode }" 
          @click="toggleFlagMode"
          :title="flagMode ? '当前：插旗标记模式' : '当前：翻开格子模式'"
        >
          <Flag class="w-4 h-4" />
          <span>{{ flagMode ? '标记模式' : '排雷模式' }}</span>
        </button>
      </div>
    </div>

    <!-- 扫雷网格主体 -->
    <div class="mine-board-wrapper glass-panel">
      <div 
        class="mine-grid" 
        :style="{ 
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: `${cols * 36 + 24}px` 
        }"
      >
        <div 
          v-for="(cell, index) in flatCells" 
          :key="index"
          class="mine-cell"
          :class="{
            'revealed': cell.revealed,
            'flagged': cell.flagged,
            'exploded': cell.exploded,
            'is-mine': cell.revealed && cell.isMine
          }"
          @click="handleCellClick(cell.r, cell.c)"
          @contextmenu.prevent="handleRightClick(cell.r, cell.c)"
        >
          <!-- 标记了旗帜 -->
          <Flag v-if="cell.flagged" class="w-4 h-4 text-rose-500 fill-rose-500" />

          <!-- 翻开并且是地雷 -->
          <Bomb v-else-if="cell.revealed && cell.isMine" class="w-5 h-5 text-gray-900" />

          <!-- 翻开并有周围地雷数字 -->
          <span 
            v-else-if="cell.revealed && cell.neighborMines > 0" 
            class="mine-number font-arcade"
            :class="'num-' + cell.neighborMines"
          >
            {{ cell.neighborMines }}
          </span>
        </div>
      </div>
    </div>

    <div class="footer-tip">
      <span>电脑端：左键翻开，右键插旗；点击已翻开数字可快速排查周围 (Chord)</span>
      <span>移动端：点击上方按钮切换「排雷 / 标记」，点击数字方格可自动速扫</span>
    </div>

    <!-- 结算弹窗 -->
    <Modal v-model="showModal" :title="isWin ? '排雷胜利！' : '触发地雷！'" width="400px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="isWin" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ isWin ? '安全排查所有雷区！' : '雷区引爆，任务失败' }}</h2>
        <p class="settle-desc">
          {{ isWin ? `耗时：${timerSec} 秒，神准的推演！` : `在第 ${timerSec} 秒不幸触雷。` }}
        </p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ earnedCoins }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-arcade btn-primary" @click="resetGame">重整雷区</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Bomb, Clock, Flag, Trophy, AlertCircle, Coins } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useGameStore } from '@/stores/gameStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const gameStore = useGameStore()

interface Cell {
  r: number
  c: number
  isMine: boolean
  revealed: boolean
  flagged: boolean
  exploded?: boolean
  neighborMines: number
}

const difficulties = [
  { key: 'easy', label: '初级', rows: 9, cols: 9, mines: 10 },
  { key: 'medium', label: '中级', rows: 14, cols: 14, mines: 30 },
  { key: 'hard', label: '高级', rows: 14, cols: 20, mines: 55 }
]

const currentDifficulty = ref<'easy' | 'medium' | 'hard'>('easy')
const rows = ref(9)
const cols = ref(9)
const totalMines = ref(10)

const board = ref<Cell[][]>([])
const isGameStarted = ref(false)
const isGameOver = ref(false)
const isWin = ref(false)
const timerSec = ref(0)
const flagMode = ref(false)
const showModal = ref(false)
const earnedCoins = ref(0)

let timerInterval: number | null = null

const flatCells = computed(() => {
  const list: Cell[] = []
  for (const r of board.value) {
    for (const c of r) {
      list.push(c)
    }
  }
  return list
})

const remainingMines = computed(() => {
  let flaggedCount = 0
  for (const r of board.value) {
    for (const c of r) {
      if (c.flagged) flaggedCount++
    }
  }
  return Math.max(0, totalMines.value - flaggedCount)
})

const faceStatus = computed(() => {
  if (isWin.value) return '😎'
  if (isGameOver.value) return '😵'
  return '🙂'
})

// 初始化空白棋盘
const initEmptyBoard = () => {
  const newBoard: Cell[][] = []
  for (let r = 0; r < rows.value; r++) {
    const row: Cell[] = []
    for (let c = 0; c < cols.value; c++) {
      row.push({
        r,
        c,
        isMine: false,
        revealed: false,
        flagged: false,
        neighborMines: 0
      })
    }
    newBoard.push(row)
  }
  board.value = newBoard
}

// 首次点击后布雷，确保点击位置绝对安全 (且周围无地雷以便开出一大片空白)
const placeMines = (firstR: number, firstC: number) => {
  let placed = 0
  while (placed < totalMines.value) {
    const r = Math.floor(Math.random() * rows.value)
    const c = Math.floor(Math.random() * cols.value)

    // 避开首次点击周围的 3x3 九宫格
    const isNearFirst = Math.abs(r - firstR) <= 1 && Math.abs(c - firstC) <= 1
    if (!board.value[r][c].isMine && !isNearFirst) {
      board.value[r][c].isMine = true
      placed++
    }
  }

  // 计算每个格子的邻居雷数
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      if (board.value[r][c].isMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value && board.value[nr][nc].isMine) {
            count++
          }
        }
      }
      board.value[r][c].neighborMines = count
    }
  }
}

// 连环扩散翻开
const revealCell = (r: number, c: number) => {
  const cell = board.value[r][c]
  if (cell.revealed || cell.flagged) return

  cell.revealed = true

  // 若为空白格（周围0雷），递归扩散展开
  if (cell.neighborMines === 0 && !cell.isMine) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = r + dr
        const nc = c + dc
        if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
          revealCell(nr, nc)
        }
      }
    }
  }
}

const handleCellClick = (r: number, c: number) => {
  if (isGameOver.value || isWin.value) return

  // 移动端插旗模式切换处理
  if (flagMode.value) {
    handleRightClick(r, c)
    return
  }

  const cell = board.value[r][c]
  if (cell.flagged) return

  // 点击已翻开的数字格子触发双击快速排雷 (Chord)
  if (cell.revealed) {
    if (cell.neighborMines > 0) {
      handleChord(r, c)
    }
    return
  }

  // 首次点击初始化
  if (!isGameStarted.value) {
    isGameStarted.value = true
    placeMines(r, c)
    startTimer()
  }

  // 踩雷
  if (cell.isMine) {
    cell.exploded = true
    gameOver(false)
    return
  }

  sound.reveal()
  revealCell(r, c)
  checkVictory()
}

// 快速双击排雷 (Chord 机制)
const handleChord = (r: number, c: number) => {
  const cell = board.value[r][c]
  if (!cell.revealed || cell.neighborMines === 0 || isGameOver.value || isWin.value) return

  let flagCount = 0
  const unrevealedNeighbors: { r: number; c: number }[] = []

  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows.value && nc >= 0 && nc < cols.value) {
        const neighbor = board.value[nr][nc]
        if (neighbor.flagged) {
          flagCount++
        } else if (!neighbor.revealed) {
          unrevealedNeighbors.push({ r: nr, c: nc })
        }
      }
    }
  }

  if (flagCount === cell.neighborMines && unrevealedNeighbors.length > 0) {
    let exploded = false
    sound.reveal()
    for (const pos of unrevealedNeighbors) {
      const target = board.value[pos.r][pos.c]
      if (target.isMine) {
        target.exploded = true
        target.revealed = true
        exploded = true
      } else {
        revealCell(pos.r, pos.c)
      }
    }

    if (exploded) {
      gameOver(false)
    } else {
      checkVictory()
    }
  }
}

const handleRightClick = (r: number, c: number) => {
  if (isGameOver.value || isWin.value) return
  const cell = board.value[r][c]
  if (cell.revealed) return

  cell.flagged = !cell.flagged
  sound.flag()
  checkVictory()
}

const toggleFlagMode = () => {
  sound.click()
  flagMode.value = !flagMode.value
}

const checkVictory = () => {
  let unrevealedSafeCount = 0
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const cell = board.value[r][c]
      if (!cell.isMine && !cell.revealed) {
        unrevealedSafeCount++
      }
    }
  }

  if (unrevealedSafeCount === 0) {
    gameOver(true)
  }
}

const gameOver = (win: boolean) => {
  isGameOver.value = true
  isWin.value = win
  stopTimer()

  // 揭晓所有地雷
  for (let r = 0; r < rows.value; r++) {
    for (let c = 0; c < cols.value; c++) {
      const cell = board.value[r][c]
      if (cell.isMine && !cell.flagged) {
        cell.revealed = true
      }
    }
  }

  if (win) {
    sound.victory()
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } })
    const settle = gameStore.recordGame('minesweeper', timerSec.value)
    earnedCoins.value = settle?.coins || 30
  } else {
    sound.explosion()
    const settle = gameStore.recordGame('minesweeper', 0)
    earnedCoins.value = settle?.coins || 5
  }

  setTimeout(() => {
    showModal.value = true
  }, 600)
}

const startTimer = () => {
  stopTimer()
  timerSec.value = 0
  timerInterval = window.setInterval(() => {
    timerSec.value++
    if (timerSec.value >= 999) stopTimer()
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

const resetGame = () => {
  sound.click()
  stopTimer()
  timerSec.value = 0
  isGameStarted.value = false
  isGameOver.value = false
  isWin.value = false
  showModal.value = false
  initEmptyBoard()
}

const changeDifficulty = (diffKey: string) => {
  const d = difficulties.find(item => item.key === diffKey)
  if (!d) return
  currentDifficulty.value = diffKey as any
  rows.value = d.rows
  cols.value = d.cols
  totalMines.value = d.mines
  resetGame()
}

onMounted(() => {
  initEmptyBoard()
})

onUnmounted(() => {
  stopTimer()
})
</script>

<style scoped>
.minesweeper-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 24px;
  border-radius: 14px;
}

.dashboard-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 14px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
}

.badge-num {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: 2px;
}

.face-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid var(--border-color);
  border-radius: 50%;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s;
}

.face-btn:hover {
  transform: scale(1.1);
  border-color: var(--accent-cyan);
}

.face-icon {
  font-size: 1.5rem;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  width: 100%;
  padding: 10px 18px;
  border-radius: 14px;
}

.difficulty-tabs {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.tab-btn.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.flag-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.flag-mode-btn.active {
  background: rgba(244, 63, 94, 0.2);
  border-color: #f43f5e;
  color: #f43f5e;
}

/* 扫雷网格主体 */
.mine-board-wrapper {
  padding: 14px;
  border-radius: 18px;
  width: 100%;
  overflow-x: auto;
  display: flex;
  justify-content: center;
}

.mine-grid {
  display: grid;
  gap: 4px;
  width: 100%;
}

.mine-cell {
  aspect-ratio: 1 / 1;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 800;
  transition: background 0.15s, transform 0.1s;
}

.mine-cell:hover:not(.revealed) {
  background: rgba(255, 255, 255, 0.16);
  border-color: var(--accent-cyan);
}

.mine-cell.revealed {
  background: rgba(15, 23, 42, 0.65);
  border-color: rgba(255, 255, 255, 0.04);
  cursor: default;
}

.mine-cell.is-mine {
  background: #f43f5e;
}

.mine-cell.exploded {
  background: #ef4444;
  animation: pulseGlow 1s infinite;
}

.mine-number {
  font-size: 1.1rem;
}

.num-1 { color: #38bdf8; }
.num-2 { color: #34d399; }
.num-3 { color: #f87171; }
.num-4 { color: #818cf8; }
.num-5 { color: #fbbf24; }
.num-6 { color: #2dd4bf; }
.num-7 { color: #e879f9; }
.num-8 { color: #94a3b8; }

.footer-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-dim);
  gap: 4px;
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
