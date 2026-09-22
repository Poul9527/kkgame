<template>
  <div class="draw-guess-container">
    <!-- 顶部状态与工具栏 -->
    <header class="hud-bar glass-panel">
      <div class="hud-left">
        <span class="game-tag font-arcade">🎨 你画我猜 PARTY</span>
        <div class="mode-pills">
          <button 
            class="mode-pill" 
            :class="{ active: playMode === 'draw' }"
            @click="switchMode('draw')"
          >
            🖌️ 我来画 · 电脑猜
          </button>
          <button 
            class="mode-pill" 
            :class="{ active: playMode === 'guess' }"
            @click="switchMode('guess')"
          >
            🕵️ 电脑画 · 我来猜
          </button>
        </div>
      </div>

      <div class="hud-center">
        <!-- 题目或提示 -->
        <div v-if="playMode === 'draw' && currentWord" class="secret-word-pill font-arcade">
          <span class="lbl">请画出：</span>
          <span class="word-text text-amber-300 font-bold">{{ currentWord.word }}</span>
          <span class="cat-text text-cyan-300">({{ currentWord.category }})</span>
        </div>
        <div v-else-if="playMode === 'guess' && currentWord" class="secret-word-pill font-arcade">
          <span class="lbl">提示：</span>
          <span class="word-text text-amber-300 font-bold">{{ currentWord.hint }}</span>
          <span class="cat-text text-cyan-300">[{{ currentWord.category }} · {{ currentWord.word.length }}个字]</span>
        </div>

        <div class="timer-badge font-arcade" :class="{ warning: timeLeft <= 10 }">
          <Clock class="w-4 h-4" />
          <span>{{ timeLeft }}s</span>
        </div>
      </div>

      <div class="hud-right">
        <div class="score-pill font-arcade">
          <Trophy class="w-4 h-4 text-amber-400" />
          <span>得分: <b class="text-amber-400">{{ score }}</b></span>
        </div>
        <button class="btn-tool" @click="startNewRound" title="换一题">
          <RotateCcw class="w-4 h-4 text-cyan-400" />
          <span>换一题</span>
        </button>
      </div>
    </header>

    <!-- 画布与右侧常驻互动分栏 -->
    <div class="main-arena">
      <!-- 左侧：画板工作区 -->
      <div class="canvas-workspace">
        <div class="canvas-card glass-panel">
          <canvas 
            ref="canvasRef"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart.passive="handleTouchStart"
            @touchmove.passive="handleTouchMove"
            @touchend="stopDrawing"
            class="paint-canvas"
          ></canvas>

          <!-- 猜词成功徽章展示 -->
          <transition name="pop">
            <div v-if="roundSuccess" class="success-overlay">
              <div class="success-card glass-panel">
                <div class="success-icon">🎉</div>
                <h3 class="success-title font-arcade">猜对啦！答案：{{ currentWord?.word }}</h3>
                <p class="success-sub font-arcade">+100 积分 · 奖励 🪙 50 金币</p>
                <button class="btn-next-round font-arcade" @click="startNewRound">
                  <span>下一题 ❯</span>
                </button>
              </div>
            </div>
          </transition>
        </div>

        <!-- 画板底栏调色盘与工具 -->
        <footer v-if="playMode === 'draw'" class="canvas-toolbar glass-panel">
          <!-- 调色盘 -->
          <div class="palette-colors">
            <button 
              v-for="c in colorList" 
              :key="c"
              class="color-dot"
              :class="{ active: currentColor === c && !isEraser }"
              :style="{ backgroundColor: c }"
              @click="selectColor(c)"
            ></button>
          </div>

          <!-- 画笔粗细 -->
          <div class="brush-sizes">
            <button 
              v-for="s in [3, 6, 12, 20]" 
              :key="s"
              class="size-dot-btn"
              :class="{ active: currentSize === s && !isEraser }"
              @click="currentSize = s; isEraser = false"
            >
              <span class="inner-dot" :style="{ width: `${s}px`, height: `${s}px` }"></span>
            </button>
          </div>

          <!-- 工具按钮 -->
          <div class="tool-actions">
            <button 
              class="btn-canvas-tool" 
              :class="{ active: isEraser }"
              @click="isEraser = !isEraser"
              title="橡皮擦"
            >
              <Eraser class="w-4 h-4" />
              <span>橡皮</span>
            </button>
            <button class="btn-canvas-tool" @click="undoStroke" title="撤销一步">
              <Undo2 class="w-4 h-4" />
              <span>撤销</span>
            </button>
            <button class="btn-canvas-tool btn-danger" @click="clearCanvas" title="清空画板">
              <Trash2 class="w-4 h-4" />
              <span>清空</span>
            </button>
          </div>
        </footer>
      </div>

      <!-- 右侧：常驻实时猜词与弹幕互动面板 -->
      <aside class="chat-sidebar glass-panel">
        <div class="sidebar-header">
          <div class="header-tab">
            <MessageSquare class="w-4 h-4 text-cyan-400" />
            <span class="font-arcade text-xs text-cyan-300">实时竞猜 & 互动</span>
          </div>
          <span class="spectator-counter font-arcade">👥 4 位牌友围观中</span>
        </div>

        <div class="sidebar-body" ref="chatScrollRef">
          <div v-for="(m, i) in messages" :key="i" class="chat-msg" :class="{ 'is-correct': m.isCorrect }">
            <span class="msg-avatar">{{ m.avatar }}</span>
            <div class="msg-content">
              <div class="msg-sender font-arcade">{{ m.sender }}</div>
              <div class="msg-text">{{ m.text }}</div>
            </div>
          </div>
        </div>

        <!-- 猜词输入框 (猜题模式或自由互动) -->
        <div class="sidebar-footer">
          <div class="quick-tags">
            <button 
              v-for="q in ['好像是动物？', '画得太生动了！', '看不懂求提示', '太难了！']" 
              :key="q"
              class="btn-quick-tag"
              @click="userSubmitGuess(q)"
            >
              {{ q }}
            </button>
          </div>
          <div class="guess-input-row">
            <input 
              v-model="guessInput" 
              :placeholder="playMode === 'guess' ? '输入你的猜词答案...' : '发送聊天互动...'" 
              @keyup.enter="handleUserSend"
            />
            <button class="btn-send-guess font-arcade" @click="handleUserSend">
              <span>竞猜</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Clock, Trophy, RotateCcw, Eraser, Undo2, Trash2, MessageSquare } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useUserStore } from '@/stores/userStore'
import confetti from 'canvas-confetti'

interface WordItem {
  word: string
  category: string
  hint: string
}

const userStore = useUserStore()
const playMode = ref<'draw' | 'guess'>('draw')
const canvasRef = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null

const currentColor = ref('#ffffff')
const currentSize = ref(6)
const isEraser = ref(false)
const isDrawing = ref(false)
let strokeHistory: ImageData[] = []

const colorList = [
  '#ffffff', '#000000', '#ef4444', '#f97316', '#eab308', 
  '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#78350f'
]

// 丰富有趣的高频词库
const wordsLibrary: WordItem[] = [
  { word: '大熊猫', category: '动物', hint: '黑白相间，喜欢吃竹子' },
  { word: '汉堡包', category: '美食', hint: '两片面包夹肉和生菜' },
  { word: '太阳眼镜', category: '物品', hint: '夏天戴在脸上的防晒用品' },
  { word: '皮卡丘', category: '动漫', hint: '十万伏特！黄色电气鼠' },
  { word: '珍珠奶茶', category: '饮品', hint: '台湾特色，里面有一颗颗黑色的' },
  { word: '西瓜', category: '水果', hint: '绿皮红瓤黑籽，夏天消暑神器' },
  { word: '火箭', category: '航天', hint: '尾部喷火发射到太空' },
  { word: '吉他', category: '乐器', hint: '六根弦的弹拨乐器' },
  { word: '恐龙', category: '史前', hint: '霸王龙、三角龙的统称' },
  { word: '小黄人', category: '电影', hint: '穿着蓝色背带裤的黄色胶囊生物' },
  { word: '火锅', category: '美食', hint: '围着沸腾锅底涮肉涮菜' },
  { word: '雨伞', category: '物品', hint: '下雨天撑开挡雨的' },
  { word: '企鹅', category: '动物', hint: '南极不会飞但游泳很厉害的鸟' },
  { word: '长颈鹿', category: '动物', hint: '脖子最长的陆地动物' },
  { word: '闹钟', category: '日常', hint: '早上叮铃铃叫你起床' },
  { word: '雪人', category: '冬日', hint: '堆雪堆出来的，胡萝卜做鼻子' },
  { word: '魔术师', category: '职业', hint: '从帽子里变出鸽子的人' }
]

const currentWord = ref<WordItem | null>(null)
const timeLeft = ref(60)
const score = ref(0)
const roundSuccess = ref(false)
const guessInput = ref('')
const chatScrollRef = ref<HTMLElement | null>(null)

let roundTimer: any = null
let aiGuessInterval: any = null

interface ChatMessage {
  sender: string
  avatar: string
  text: string
  isCorrect?: boolean
}

const messages = ref<ChatMessage[]>([
  { sender: '系统裁判', avatar: '🤖', text: '游戏开始！请抓紧时间完成画作或进行竞猜！' }
])

const spectators = [
  { name: '聪明小美', avatar: '👧' },
  { name: '涂鸦阿强', avatar: '👦' },
  { name: '推理狂客', avatar: '🕵️' }
]

function switchMode(mode: 'draw' | 'guess') {
  playMode.value = mode
  startNewRound()
}

function selectColor(c: string) {
  currentColor.value = c
  isEraser.value = false
}

// 初始化画布
function initCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  canvas.width = rect.width * window.devicePixelRatio || 720
  canvas.height = rect.height * window.devicePixelRatio || 480
  ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, rect.width, rect.height)
    saveState()
  }
}

function saveState() {
  if (!ctx || !canvasRef.value) return
  strokeHistory.push(ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height))
  if (strokeHistory.length > 20) strokeHistory.shift()
}

function undoStroke() {
  if (!ctx || !canvasRef.value || strokeHistory.length <= 1) return
  strokeHistory.pop()
  const previous = strokeHistory[strokeHistory.length - 1]
  ctx.putImageData(previous, 0, 0)
  sound.click()
}

function clearCanvas() {
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, 0, rect.width, rect.height)
  saveState()
  sound.click()
}

// 绘图事件处理
function startDrawing(e: MouseEvent) {
  if (playMode.value !== 'draw' || roundSuccess.value) return
  isDrawing.value = true
  const { x, y } = getCanvasPos(e.clientX, e.clientY)
  if (!ctx) return
  ctx.beginPath()
  ctx.moveTo(x, y)
}

function draw(e: MouseEvent) {
  if (!isDrawing.value || !ctx || playMode.value !== 'draw') return
  const { x, y } = getCanvasPos(e.clientX, e.clientY)
  ctx.lineTo(x, y)
  ctx.strokeStyle = isEraser.value ? '#1e293b' : currentColor.value
  ctx.lineWidth = isEraser.value ? 24 : currentSize.value
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.stroke()
}

function stopDrawing() {
  if (isDrawing.value) {
    isDrawing.value = false
    saveState()
  }
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 0) return
  const t = e.touches[0]
  startDrawing({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 0) return
  const t = e.touches[0]
  draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function getCanvasPos(clientX: number, clientY: number) {
  if (!canvasRef.value) return { x: 0, y: 0 }
  const rect = canvasRef.value.getBoundingClientRect()
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

// 模拟电脑智能竞猜逻辑
function triggerAIGuessing() {
  clearInterval(aiGuessInterval)
  let attempts = 0
  const wrongGuesses = ['苹果？', '圆圈', '小狗吗', '好像是汉堡', '杯子？', '汽车？', '太阳', '某种水果？']

  aiGuessInterval = setInterval(() => {
    if (roundSuccess.value || !currentWord.value) return
    attempts++
    const bot = spectators[Math.floor(Math.random() * spectators.length)]

    if (attempts >= 4 && Math.random() < 0.6) {
      // AI 猜中！
      addMessage(bot.name, bot.avatar, currentWord.value.word, true)
      handleRoundSuccess(bot.name)
    } else {
      const wrong = wrongGuesses[Math.floor(Math.random() * wrongGuesses.length)]
      addMessage(bot.name, bot.avatar, wrong)
    }
  }, 7000)
}

// 模拟电脑绘制演示
function simulateAIDrawing() {
  clearCanvas()
  if (!ctx || !canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const cx = rect.width / 2
  const cy = rect.height / 2

  // 简易绘制一个有趣剪影
  ctx.beginPath()
  ctx.arc(cx, cy, 50, 0, Math.PI * 2)
  ctx.fillStyle = '#38bdf8'
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 4
  ctx.stroke()
}

// 用户发送猜词
function handleUserSend() {
  if (!guessInput.value.trim()) return
  userSubmitGuess(guessInput.value.trim())
  guessInput.value = ''
}

function userSubmitGuess(text: string) {
  if (roundSuccess.value || !currentWord.value) return
  addMessage(userStore.nickname || '我', userStore.avatar || '😎', text)

  if (text.trim() === currentWord.value.word) {
    addMessage('系统裁判', '🎉', `恭喜 [${userStore.nickname || '我'}] 一语中的，完全正确！`, true)
    handleRoundSuccess(userStore.nickname || '我')
  } else {
    sound.click()
  }
}

function handleRoundSuccess(winnerName: string) {
  roundSuccess.value = true
  clearInterval(roundTimer)
  clearInterval(aiGuessInterval)
  score.value += 100
  userStore.addCoins(50)
  sound.victory()
  confetti({ particleCount: 80, spread: 70 })
}

function addMessage(sender: string, avatar: string, text: string, isCorrect = false) {
  messages.value.push({ sender, avatar, text, isCorrect })
  if (messages.value.length > 50) messages.value.shift()
  nextTick(() => {
    if (chatScrollRef.value) {
      chatScrollRef.value.scrollTop = chatScrollRef.value.scrollHeight
    }
  })
}

// 开启新一轮
function startNewRound() {
  roundSuccess.value = false
  clearInterval(roundTimer)
  clearInterval(aiGuessInterval)
  timeLeft.value = 60
  strokeHistory = []

  const randomIndex = Math.floor(Math.random() * wordsLibrary.length)
  currentWord.value = wordsLibrary[randomIndex]
  clearCanvas()

  addMessage('系统裁判', '📢', `新题目已就位！类别：【${currentWord.value.category}】，限时 60 秒！`)

  if (playMode.value === 'draw') {
    triggerAIGuessing()
  } else {
    simulateAIDrawing()
  }

  roundTimer = setInterval(() => {
    if (timeLeft.value > 0) {
      timeLeft.value--
    } else {
      clearInterval(roundTimer)
      clearInterval(aiGuessInterval)
      addMessage('系统裁判', '⏰', `时间到！正确答案是：【${currentWord.value?.word}】`)
      sound.gameover()
    }
  }, 1000)
}

onMounted(() => {
  initCanvas()
  startNewRound()
})

onUnmounted(() => {
  clearInterval(roundTimer)
  clearInterval(aiGuessInterval)
})
</script>

<style scoped>
.draw-guess-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at center, #0f172a 0%, #020617 100%);
  user-select: none;
  overflow: hidden;
}

.hud-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-tag {
  font-size: 13px;
  font-weight: 900;
  color: #ec4899;
}

.mode-pills {
  display: flex;
  gap: 6px;
}

.mode-pill {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-pill.active {
  background: rgba(236, 72, 153, 0.2);
  border-color: #ec4899;
  color: #f472b6;
}

.hud-center {
  display: flex;
  align-items: center;
  gap: 14px;
}

.secret-word-pill {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 4px 14px;
  border-radius: 14px;
  font-size: 13px;
  display: flex;
  gap: 6px;
  align-items: center;
}

.timer-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 12px;
  color: #38bdf8;
  font-size: 12px;
}

.timer-badge.warning {
  color: #ef4444;
  border-color: #ef4444;
  animation: pulse 1s infinite;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.score-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.btn-tool {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

/* 主竞技场 */
.main-arena {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.canvas-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
  overflow: hidden;
}

.canvas-card {
  flex: 1;
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.paint-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.canvas-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-radius: 10px;
}

.palette-colors {
  display: flex;
  gap: 6px;
}

.color-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 0.15s;
}

.color-dot.active {
  transform: scale(1.25);
  border-color: #fff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.8);
}

.brush-sizes {
  display: flex;
  gap: 6px;
  align-items: center;
}

.size-dot-btn {
  width: 26px;
  height: 26px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.size-dot-btn.active {
  background: rgba(56, 189, 248, 0.25);
  border-color: #38bdf8;
}

.inner-dot {
  background: #fff;
  border-radius: 50%;
}

.tool-actions {
  display: flex;
  gap: 8px;
}

.btn-canvas-tool {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

.btn-canvas-tool.active {
  background: rgba(245, 158, 11, 0.25);
  border-color: #f59e0b;
  color: #fbbf24;
}

.btn-canvas-tool.btn-danger {
  color: #fda4af;
  border-color: rgba(244, 63, 94, 0.3);
}

/* 侧边常驻聊天竞猜 */
.chat-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-tab { display: flex; align-items: center; gap: 6px; }
.spectator-counter { font-size: 10px; color: #94a3b8; }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg {
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  padding: 6px 8px;
  border-radius: 8px;
  font-size: 12px;
}

.chat-msg.is-correct {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
}

.msg-avatar { font-size: 16px; }
.msg-sender { font-size: 10px; color: #94a3b8; }
.msg-text { color: #f1f5f9; }

.sidebar-footer {
  padding: 8px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quick-tags {
  display: flex;
  gap: 4px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.btn-quick-tag {
  white-space: nowrap;
  font-size: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.guess-input-row {
  display: flex;
  gap: 6px;
}

.guess-input-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 10px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.guess-input-row input:focus {
  border-color: #ec4899;
}

.btn-send-guess {
  background: linear-gradient(135deg, #ec4899, #be185d);
  border: none;
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
}

/* 成功弹窗 */
.success-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  z-index: 10;
}

.success-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 32px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(245, 158, 11, 0.4);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
}

.success-icon { font-size: 40px; }
.success-title { font-size: 18px; color: #facc15; }
.success-sub { font-size: 12px; color: #94a3b8; }

.btn-next-round {
  margin-top: 8px;
  background: linear-gradient(135deg, #10b981, #059669);
  border: none;
  color: #fff;
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
}
</style>
