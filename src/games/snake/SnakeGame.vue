<template>
  <div class="snake-container">
    <!-- 顶部状态栏 -->
    <div class="game-dashboard glass-panel">
      <div class="stat-card">
        <span class="stat-label">当前得分</span>
        <span class="stat-value font-arcade text-cyan-400">{{ score }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">历史最高</span>
        <span class="stat-value font-arcade text-amber-400">{{ bestScore }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">蛇身长度</span>
        <span class="stat-value font-arcade text-emerald-400">{{ snake.length }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">移动速度</span>
        <span class="stat-value font-arcade text-purple-400">{{ currentSpeedLevel }}x</span>
      </div>
    </div>

    <!-- 游戏主画布容器 (支持触控滑动手势) -->
    <div 
      class="canvas-wrapper glass-panel"
      @touchstart="handleTouchStart"
      @touchend="handleTouchEnd"
    >
      <canvas 
        ref="canvasRef" 
        :width="CANVAS_SIZE" 
        :height="CANVAS_SIZE"
        class="snake-canvas"
      ></canvas>

      <!-- 倒计时 / 暂停覆盖层 -->
      <div v-if="isPaused && !isGameOver" class="overlay">
        <div class="overlay-box">
          <Pause class="w-12 h-12 text-cyan-400 mb-2" />
          <h3>游戏已暂停</h3>
          <p>按下 空格键 或点击下方按钮继续</p>
          <button class="btn-arcade btn-primary mt-4" @click="togglePause">继续挑战</button>
        </div>
      </div>
    </div>

    <!-- 底部控制面板与移动端方向键 -->
    <div class="control-panel glass-panel">
      <div class="desktop-tips">
        <span>键盘 <kbd>WASD</kbd> / 方向键操控 · 手机端直接在屏幕上滑动手势操控</span>
        <span>长按 <kbd>Shift</kbd> 极速冲刺 · <kbd>空格</kbd> 暂停</span>
      </div>

      <!-- 移动端虚拟方向盘 (触摸友好) -->
      <div class="virtual-dpad">
        <button class="dpad-btn up" @click="handleDirection(0, -1)" :disabled="isGameOver">▲</button>
        <div class="dpad-mid">
          <button class="dpad-btn left" @click="handleDirection(-1, 0)" :disabled="isGameOver">◀</button>
          <button class="dpad-center" @click="togglePause">
            <Pause v-if="!isPaused" class="w-4 h-4" />
            <Play v-else class="w-4 h-4 fill-current" />
          </button>
          <button class="dpad-btn right" @click="handleDirection(1, 0)" :disabled="isGameOver">▶</button>
        </div>
        <button class="dpad-btn down" @click="handleDirection(0, 1)" :disabled="isGameOver">▼</button>
      </div>

      <div class="actions">
        <button class="ctrl-btn boost-btn" :class="{ active: isBoosting }" @click="toggleBoost" :disabled="isGameOver">
          <Zap class="w-4 h-4 text-amber-400" />
          <span>{{ isBoosting ? '冲刺中' : '极速冲刺' }}</span>
        </button>
        <button class="ctrl-btn" @click="togglePause" :disabled="isGameOver">
          <Pause v-if="!isPaused" class="w-4 h-4" />
          <Play v-else class="w-4 h-4 fill-current" />
          <span>{{ isPaused ? '继续' : '暂停' }}</span>
        </button>
        <button class="ctrl-btn reset" @click="restartGame">
          <RefreshCw class="w-4 h-4" />
          <span>重新开始</span>
        </button>
      </div>
    </div>

    <!-- 结算弹窗 -->
    <Modal v-model="isGameOver" title="游戏结束" width="400px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="isNewRecord" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ isNewRecord ? '打破最高纪录！' : '游戏结束' }}</h2>
        <p class="settle-desc">最终得分：<b class="text-cyan-400">{{ score }}</b> 点 (蛇长 {{ snake.length }} 节)</p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ earnedCoins }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-arcade btn-primary" @click="restartGame">再来一盘</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Pause, Play, RefreshCw, Trophy, AlertCircle, Coins, Zap } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useGameStore } from '@/stores/gameStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const gameStore = useGameStore()

const CANVAS_SIZE = 480
const GRID_COUNT = 20
const CELL_SIZE = CANVAS_SIZE / GRID_COUNT

const canvasRef = ref<HTMLCanvasElement | null>(null)

interface Point {
  x: number
  y: number
}

interface FoodItem extends Point {
  type: 'normal' | 'gold' | 'freeze' | 'heart'
  points: number
  color: string
}

const snake = ref<Point[]>([
  { x: 10, y: 10 },
  { x: 9, y: 10 },
  { x: 8, y: 10 }
])

let dir = { x: 1, y: 0 }
let nextDir = { x: 1, y: 0 }

const foods = ref<FoodItem[]>([])
const score = ref(0)
const bestScore = computed(() => gameStore.getBestScore('snake'))
const isPaused = ref(false)
const isGameOver = ref(false)
const isNewRecord = ref(false)
const earnedCoins = ref(0)
const isBoosting = ref(false)

// 触控滑动手势支持
let touchStartX = 0
let touchStartY = 0

const handleTouchStart = (e: TouchEvent) => {
  if (!e.touches[0]) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
}

const handleTouchEnd = (e: TouchEvent) => {
  if (!e.changedTouches[0]) return
  const dx = e.changedTouches[0].clientX - touchStartX
  const dy = e.changedTouches[0].clientY - touchStartY
  const absX = Math.abs(dx)
  const absY = Math.abs(dy)

  if (Math.max(absX, absY) > 20) {
    if (absX > absY) {
      handleDirection(dx > 0 ? 1 : -1, 0)
    } else {
      handleDirection(0, dy > 0 ? 1 : -1)
    }
  }
}

const toggleBoost = () => {
  isBoosting.value = !isBoosting.value
  scheduleNextTick()
}

// 速度控制
let baseInterval = 130
let freezeTimer: number | null = null
let gameLoopTimer: number | null = null

const currentSpeedLevel = computed(() => {
  return (130 / Math.max(65, baseInterval - Math.floor(score.value / 40) * 8)).toFixed(1)
})

// 生成特色随机食物
const spawnFood = () => {
  let x = 0
  let y = 0
  let occupied = true

  while (occupied) {
    x = Math.floor(Math.random() * GRID_COUNT)
    y = Math.floor(Math.random() * GRID_COUNT)
    occupied = snake.value.some(seg => seg.x === x && seg.y === y) ||
               foods.value.some(f => f.x === x && f.y === y)
  }

  // 权重掉落机制
  const rand = Math.random()
  let type: FoodItem['type'] = 'normal'
  let points = 10
  let color = '#ef4444' // 经典红色

  if (rand < 0.15) {
    type = 'gold'
    points = 35
    color = '#fbbf24' // 金币黄金色
  } else if (rand < 0.25) {
    type = 'freeze'
    points = 15
    color = '#06b6d4' // 冰晶青色
  } else if (rand < 0.32) {
    type = 'heart'
    points = 50
    color = '#ec4899' // 爱心粉红
  }

  foods.value.push({ x, y, type, points, color })
}

const handleDirection = (dx: number, dy: number) => {
  // 禁止反方向调头
  if (dx !== 0 && dir.x === -dx) return
  if (dy !== 0 && dir.y === -dy) return
  nextDir = { x: dx, y: dy }
}

const togglePause = () => {
  if (isGameOver.value) return
  isPaused.value = !isPaused.value
  sound.click()
}

// 核心循环
const tick = () => {
  if (isPaused.value || isGameOver.value) return

  dir = { ...nextDir }
  const head = { x: snake.value[0].x + dir.x, y: snake.value[0].y + dir.y }

  // 撞墙检测
  if (head.x < 0 || head.x >= GRID_COUNT || head.y < 0 || head.y >= GRID_COUNT) {
    gameOver()
    return
  }

  // 咬自己检测
  if (snake.value.some(seg => seg.x === head.x && seg.y === head.y)) {
    gameOver()
    return
  }

  snake.value.unshift(head)

  // 吃食物检测
  const foodIndex = foods.value.findIndex(f => f.x === head.x && f.y === head.y)
  if (foodIndex !== -1) {
    const eaten = foods.value[foodIndex]
    foods.value.splice(foodIndex, 1)
    score.value += eaten.points

    if (eaten.type === 'normal') {
      sound.eat()
    } else if (eaten.type === 'gold') {
      sound.coin()
    } else if (eaten.type === 'freeze') {
      sound.powerup()
      // 减速减压效果
      if (freezeTimer) clearTimeout(freezeTimer)
      baseInterval = Math.min(180, baseInterval + 40)
      freezeTimer = window.setTimeout(() => {
        baseInterval = Math.max(70, 130 - Math.floor(score.value / 40) * 8)
      }, 5000)
    } else if (eaten.type === 'heart') {
      sound.powerup()
    }

    // 维持场上有 1~2 个食物
    if (foods.value.length < 2) {
      spawnFood()
    }
  } else {
    snake.value.pop()
  }

  draw()
  scheduleNextTick()
}

const scheduleNextTick = () => {
  if (gameLoopTimer) clearTimeout(gameLoopTimer)
  let currentInterval = Math.max(65, baseInterval - Math.floor(score.value / 40) * 8)
  if (isBoosting.value) {
    currentInterval = Math.max(38, Math.floor(currentInterval * 0.55))
  }
  gameLoopTimer = window.setTimeout(tick, currentInterval)
}

const draw = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 背景底色与轻微霓虹网格
  ctx.fillStyle = '#080d1a'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
  ctx.lineWidth = 1
  for (let i = 0; i <= CANVAS_SIZE; i += CELL_SIZE) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, CANVAS_SIZE)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(CANVAS_SIZE, i)
    ctx.stroke()
  }

  // 绘制食物
  for (const food of foods.value) {
    ctx.fillStyle = food.color
    ctx.shadowColor = food.color
    ctx.shadowBlur = 12
    ctx.beginPath()
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2.3,
      0,
      Math.PI * 2
    )
    ctx.fill()
    ctx.shadowBlur = 0
  }

  // 绘制蛇
  snake.value.forEach((seg, idx) => {
    const isHead = idx === 0
    ctx.fillStyle = isHead ? '#38bdf8' : '#10b981'
    ctx.shadowColor = isHead ? '#38bdf8' : '#10b981'
    ctx.shadowBlur = isHead ? 10 : 4

    const pad = 2
    const radius = isHead ? 6 : 4
    const x = seg.x * CELL_SIZE + pad
    const y = seg.y * CELL_SIZE + pad
    const w = CELL_SIZE - pad * 2
    const h = CELL_SIZE - pad * 2

    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    ctx.fill()
    ctx.shadowBlur = 0

    // 蛇头眼睛
    if (isHead) {
      ctx.fillStyle = '#0f172a'
      const eyeOffset = 6
      const eyeR = 2.5
      ctx.beginPath()
      ctx.arc(x + eyeOffset, y + eyeOffset, eyeR, 0, Math.PI * 2)
      ctx.arc(x + w - eyeOffset, y + eyeOffset, eyeR, 0, Math.PI * 2)
      ctx.fill()
    }
  })
}

const gameOver = () => {
  isGameOver.value = true
  sound.gameover()

  const settle = gameStore.recordGame('snake', score.value)
  earnedCoins.value = settle?.coins || 10
  isNewRecord.value = settle?.isNewRecord || false

  if (isNewRecord.value) {
    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    })
  }
}

const restartGame = () => {
  sound.click()
  if (gameLoopTimer) clearTimeout(gameLoopTimer)
  if (freezeTimer) clearTimeout(freezeTimer)

  snake.value = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]
  dir = { x: 1, y: 0 }
  nextDir = { x: 1, y: 0 }
  score.value = 0
  baseInterval = 130
  foods.value = []
  isPaused.value = false
  isGameOver.value = false
  isNewRecord.value = false

  spawnFood()
  spawnFood()
  draw()
  scheduleNextTick()
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    handleDirection(0, -1)
    e.preventDefault()
  } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
    handleDirection(0, 1)
    e.preventDefault()
  } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
    handleDirection(-1, 0)
    e.preventDefault()
  } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
    handleDirection(1, 0)
    e.preventDefault()
  } else if (e.key === ' ') {
    togglePause()
    e.preventDefault()
  } else if (e.key === 'Shift') {
    if (!isBoosting.value) {
      isBoosting.value = true
      scheduleNextTick()
    }
  }
}

const handleKeyup = (e: KeyboardEvent) => {
  if (e.key === 'Shift') {
    isBoosting.value = false
    scheduleNextTick()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('keyup', handleKeyup)
  restartGame()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('keyup', handleKeyup)
  if (gameLoopTimer) clearTimeout(gameLoopTimer)
  if (freezeTimer) clearTimeout(freezeTimer)
})
</script>

<style scoped>
.snake-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 580px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding: 12px 18px;
  border-radius: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
}

.canvas-wrapper {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid var(--border-color);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  line-height: 0;
}

.snake-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(11, 15, 25, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.overlay-box h3 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 4px;
}

.overlay-box p {
  font-size: 0.85rem;
  color: var(--text-muted);
}

.control-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 18px;
  border-radius: 14px;
}

.desktop-tips {
  display: flex;
  gap: 16px;
  font-size: 0.8rem;
  color: var(--text-dim);
}

.desktop-tips kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  margin: 0 2px;
}

/* 移动端十字键 */
.virtual-dpad {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  margin: 4px 0;
}

.dpad-mid {
  display: flex;
  gap: 6px;
  align-items: center;
}

.dpad-btn {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  color: var(--accent-cyan);
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.dpad-btn:active {
  transform: scale(0.92);
  background: var(--accent-cyan);
  color: #0f172a;
}

.dpad-center {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: rgba(6, 182, 212, 0.15);
  border: 1px solid var(--border-color);
  color: var(--accent-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.actions {
  display: flex;
  gap: 10px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.88rem;
  transition: all 0.2s;
}

.ctrl-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.ctrl-btn.reset:hover {
  color: #f43f5e;
  border-color: #f43f5e;
}

.ctrl-btn.boost-btn {
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.1);
}

.ctrl-btn.boost-btn.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  color: #fff;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

/* 结算弹窗 */
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
