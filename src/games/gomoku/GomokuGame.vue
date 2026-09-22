<template>
  <div class="gomoku-container">
    <!-- 游戏状态仪表板 -->
    <div class="game-dashboard glass-panel">
      <div class="player-status" :class="{ active: currentTurn === 1 }">
        <div class="piece-indicator black"></div>
        <div class="player-info">
          <span class="player-name">{{ mode === 'pve' ? '玩家 (黑方)' : '黑方' }}</span>
          <span class="player-role">{{ currentTurn === 1 ? '正在思考中...' : '等待中' }}</span>
        </div>
      </div>

      <div class="match-info">
        <div class="vs-badge font-arcade">VS</div>
        <div class="turn-counter">步数: {{ moveHistory.length }}</div>
      </div>

      <div class="player-status" :class="{ active: currentTurn === 2 }">
        <div class="piece-indicator white"></div>
        <div class="player-info">
          <span class="player-name">{{ mode === 'pve' ? `电脑 AI (${difficultyName})` : '白方' }}</span>
          <span class="player-role">{{ currentTurn === 2 ? '正在思考中...' : '等待中' }}</span>
        </div>
      </div>
    </div>

    <!-- 棋盘主体 -->
    <div class="board-wrapper glass-panel">
      <div class="board-grid">
        <div 
          v-for="r in 15" 
          :key="'r-' + (r - 1)" 
          class="board-row"
        >
          <div 
            v-for="c in 15" 
            :key="'c-' + (c - 1)" 
            class="board-cell"
            :class="{
              'star-point': isStarPoint(r - 1, c - 1),
              'win-cell': isWinCell(r - 1, c - 1)
            }"
            @click="handleCellClick(r - 1, c - 1)"
          >
            <!-- 棋子渲染 -->
            <transition name="pop">
              <div 
                v-if="board[r - 1][c - 1] !== 0" 
                class="piece" 
                :class="[
                  board[r - 1][c - 1] === 1 ? 'piece-black' : 'piece-white',
                  { 'last-move': isLastMove(r - 1, c - 1) }
                ]"
              >
                <div v-if="isLastMove(r - 1, c - 1)" class="last-dot"></div>
              </div>
              <!-- AI 推荐落子光环 -->
              <div 
                v-else-if="hintMove && hintMove[0] === r - 1 && hintMove[1] === c - 1" 
                class="hint-ring"
                title="AI 智囊推荐落子点"
              ></div>
            </transition>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部控制栏 -->
    <div class="control-panel glass-panel">
      <div class="mode-select">
        <button 
          class="ctrl-btn" 
          :class="{ active: mode === 'pve' }" 
          @click="switchMode('pve')"
        >
          人机对战
        </button>
        <button 
          class="ctrl-btn" 
          :class="{ active: mode === 'pvp' }" 
          @click="switchMode('pvp')"
        >
          双人同屏
        </button>
      </div>

      <div v-if="mode === 'pve'" class="diff-select">
        <button 
          v-for="d in diffOptions" 
          :key="d.key" 
          class="ctrl-btn diff-btn" 
          :class="{ active: difficulty === d.key }"
          @click="switchDifficulty(d.key)"
        >
          {{ d.label }}
        </button>
      </div>

      <div class="action-buttons">
        <button class="ctrl-btn action hint" @click="giveHint" :disabled="isGameOver || isAiThinking" title="获取 AI 推荐落子位">
          <Lightbulb class="w-4 h-4 text-amber-400" />
          <span>提示</span>
        </button>
        <button class="ctrl-btn action" @click="undoMove" :disabled="moveHistory.length === 0 || isGameOver || isAiThinking">
          <RotateCcw class="w-4 h-4" />
          <span>悔棋</span>
        </button>
        <button class="ctrl-btn action reset" @click="resetGame">
          <RefreshCw class="w-4 h-4" />
          <span>重来</span>
        </button>
      </div>
    </div>

    <!-- 结算弹窗 -->
    <Modal v-model="showWinModal" :title="gameResultTitle" width="420px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="winner === 1 || (mode === 'pvp' && winner > 0)" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ gameResultMsg }}</h2>
        <p class="settle-desc">本局总落子：{{ moveHistory.length }} 步</p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ lastEarnedCoins }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-arcade btn-primary" @click="resetGame">再来一局</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { RotateCcw, RefreshCw, Trophy, AlertCircle, Coins, Lightbulb } from 'lucide-vue-next'
import { type BoardState, getBestMove, checkWin } from './ai'
import { sound } from '@/utils/soundEngine'
import { useGameStore } from '@/stores/gameStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const gameStore = useGameStore()

const BOARD_SIZE = 15
const board = ref<BoardState>(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0)))
const currentTurn = ref<number>(1) // 1: 黑, 2: 白
const mode = ref<'pve' | 'pvp'>('pve')
const difficulty = ref<'easy' | 'normal' | 'master'>('normal')
const isAiThinking = ref(false)
const isGameOver = ref(false)
const winner = ref<number>(0)
const winLine = ref<[number, number][]>([])
const moveHistory = ref<{ r: number; c: number; player: number }[]>([])
const hintMove = ref<[number, number] | null>(null)

const showWinModal = ref(false)
const lastEarnedCoins = ref(0)

const diffOptions = [
  { key: 'easy' as const, label: '初级' },
  { key: 'normal' as const, label: '进阶' },
  { key: 'master' as const, label: '大师' }
]

const difficultyName = computed(() => {
  const map = { easy: '初级', normal: '进阶', master: '大师' }
  return map[difficulty.value]
})

// 星位判定 (天元与四个角星位)
const isStarPoint = (r: number, c: number) => {
  return (
    (r === 3 && c === 3) ||
    (r === 3 && c === 11) ||
    (r === 7 && c === 7) ||
    (r === 11 && c === 3) ||
    (r === 11 && c === 11)
  )
}

const isLastMove = (r: number, c: number) => {
  if (moveHistory.value.length === 0) return false
  const last = moveHistory.value[moveHistory.value.length - 1]
  return last.r === r && last.c === c
}

const isWinCell = (r: number, c: number) => {
  return winLine.value.some(([wr, wc]) => wr === r && wc === c)
}

const handleCellClick = (r: number, c: number) => {
  if (isGameOver.value || isAiThinking.value) return
  if (board.value[r][c] !== 0) return

  makeMove(r, c, currentTurn.value)

  // 若为人机模式且轮到白方 AI
  if (!isGameOver.value && mode.value === 'pve' && currentTurn.value === 2) {
    isAiThinking.value = true
    setTimeout(() => {
      aiTurn()
      isAiThinking.value = false
    }, 320)
  }
}

const makeMove = (r: number, c: number, player: number) => {
  hintMove.value = null
  board.value[r][c] = player
  moveHistory.value.push({ r, c, player })
  sound.placePiece()

  const result = checkWin(board.value)
  if (result) {
    handleGameOver(result.winner, result.line)
    return
  }

  // 检查平局（棋盘下满）
  if (moveHistory.value.length === BOARD_SIZE * BOARD_SIZE) {
    handleGameOver(0, [])
    return
  }

  currentTurn.value = player === 1 ? 2 : 1
}

const giveHint = () => {
  if (isGameOver.value || isAiThinking.value) return
  sound.click()
  // 计算当前轮次方的最优落子位
  const best = getBestMove(board.value, 'master', currentTurn.value)
  if (best) {
    hintMove.value = [best[0], best[1]]
  }
}

const aiTurn = () => {
  if (isGameOver.value) return
  const move = getBestMove(board.value, difficulty.value, 2)
  if (move) {
    makeMove(move[0], move[1], 2)
  }
}

const handleGameOver = (winPlayer: number, line: [number, number][]) => {
  isGameOver.value = true
  winner.value = winPlayer
  winLine.value = line

  if (winPlayer === 1 || (mode.value === 'pvp' && winPlayer > 0)) {
    sound.victory()
    confetti({
      particleCount: 80,
      spread: 80,
      origin: { y: 0.6 }
    })
  } else if (winPlayer === 2 && mode.value === 'pve') {
    sound.gameover()
  }

  const settle = gameStore.recordGame('gomoku', winPlayer === 1 ? 1 : 0)
  lastEarnedCoins.value = settle?.coins || 15

  setTimeout(() => {
    showWinModal.value = true
  }, 700)
}

const undoMove = () => {
  if (isGameOver.value || moveHistory.value.length === 0 || isAiThinking.value) return
  sound.click()
  hintMove.value = null

  if (mode.value === 'pve') {
    // 人机模式一次撤销 2 步（AI 和玩家各一步）
    const count = moveHistory.value.length >= 2 ? 2 : 1
    for (let i = 0; i < count; i++) {
      const last = moveHistory.value.pop()
      if (last) {
        board.value[last.r][last.c] = 0
      }
    }
    currentTurn.value = 1
  } else {
    // 双人模式撤销 1 步
    const last = moveHistory.value.pop()
    if (last) {
      board.value[last.r][last.c] = 0
      currentTurn.value = last.player
    }
  }
}

const resetGame = () => {
  sound.click()
  board.value = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0))
  currentTurn.value = 1
  isGameOver.value = false
  winner.value = 0
  winLine.value = []
  moveHistory.value = []
  hintMove.value = null
  isAiThinking.value = false
  showWinModal.value = false
}

const switchMode = (newMode: 'pve' | 'pvp') => {
  if (mode.value === newMode) return
  mode.value = newMode
  resetGame()
}

const switchDifficulty = (newDiff: 'easy' | 'normal' | 'master') => {
  difficulty.value = newDiff
  resetGame()
}

const gameResultTitle = computed(() => {
  if (winner.value === 0) return '棋局平局'
  if (mode.value === 'pvp') return winner.value === 1 ? '黑方获胜！' : '白方获胜！'
  return winner.value === 1 ? '恭喜获胜！' : '很遗憾，战败了'
})

const gameResultMsg = computed(() => {
  if (winner.value === 0) return '旗鼓相当，平分秋色！'
  if (mode.value === 'pvp') return `恭喜 ${winner.value === 1 ? '黑棋' : '白棋'} 连成五子大获全胜！`
  return winner.value === 1 ? '你凭借高超棋艺击败了智能 AI！' : '电脑 AI 技高一筹，再接再厉！'
})

onMounted(() => {
  resetGame()
})
</script>

<style scoped>
.gomoku-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 12px 20px;
  border-radius: 14px;
}

.player-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 12px;
  border-radius: 10px;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.player-status.active {
  background: rgba(6, 182, 212, 0.12);
  border-color: rgba(6, 182, 212, 0.4);
}

.piece-indicator {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.4);
}

.piece-indicator.black {
  background: radial-gradient(circle at 35% 35%, #475569, #0f172a 80%);
  border: 1px solid #64748b;
}

.piece-indicator.white {
  background: radial-gradient(circle at 35% 35%, #ffffff, #cbd5e1 80%);
  border: 1px solid #94a3b8;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 0.9rem;
  font-weight: 700;
}

.player-role {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.match-info {
  text-align: center;
}

.vs-badge {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--accent-cyan);
}

.turn-counter {
  font-size: 0.75rem;
  color: var(--text-dim);
}

/* 棋盘主体 */
.board-wrapper {
  padding: 14px;
  border-radius: 18px;
  background: #deb887;
  background: radial-gradient(circle, #e2ba7d 0%, #c49658 100%);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.4), 0 16px 32px rgba(0, 0, 0, 0.5);
  border: 4px solid #8b5a2b;
  width: 100%;
  aspect-ratio: 1 / 1;
  max-width: 580px;
}

.board-grid {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.board-row {
  display: flex;
  flex: 1;
}

.board-cell {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

/* 棋盘十字线交织 */
.board-cell::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #5c3a21;
}

.board-cell::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: #5c3a21;
}

/* 边缘线截断保持传统棋盘美感 */
.board-row:first-child .board-cell::after {
  top: 50%;
}
.board-row:last-child .board-cell::after {
  bottom: 50%;
}
.board-cell:first-child::before {
  left: 50%;
}
.board-cell:last-child::before {
  right: 50%;
}

/* 天元与星位小黑点 */
.star-point::before {
  content: '';
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #5c3a21;
  z-index: 1;
}

/* 棋子渲染 */
.piece {
  width: 82%;
  height: 82%;
  border-radius: 50%;
  position: relative;
  z-index: 2;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.piece-black {
  background: radial-gradient(circle at 35% 35%, #475569, #020617 80%);
}

.piece-white {
  background: radial-gradient(circle at 35% 35%, #ffffff, #cbd5e1 80%);
}

.last-move .last-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f43f5e;
  box-shadow: 0 0 6px #f43f5e;
}

.win-cell .piece {
  animation: pulseGlow 1.2s infinite ease-in-out;
  box-shadow: 0 0 16px #fbbf24;
}

/* 控制栏 */
.control-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 12px 18px;
  border-radius: 14px;
}

.mode-select, .diff-select, .action-buttons {
  display: flex;
  gap: 8px;
}

.ctrl-btn {
  padding: 8px 14px;
  font-size: 0.85rem;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.ctrl-btn:hover:not(:disabled) {
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.ctrl-btn.active {
  background: rgba(6, 182, 212, 0.2);
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

/* 弹窗内容 */
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
  font-size: 0.88rem;
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

.pop-enter-active {
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.2s;
}
.pop-enter-from {
  transform: scale(0.3);
  opacity: 0;
}

/* AI 智囊推荐落子点光环 */
.hint-ring {
  width: 58%;
  height: 58%;
  border-radius: 50%;
  border: 3px dashed #f59e0b;
  position: relative;
  z-index: 5;
  animation: hint-pulse 1.4s infinite ease-in-out;
  background: rgba(245, 158, 11, 0.25);
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.7);
}

@keyframes hint-pulse {
  0%, 100% {
    transform: scale(0.9);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.15);
    opacity: 1;
  }
}
</style>
