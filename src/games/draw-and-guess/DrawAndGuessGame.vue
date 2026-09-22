<template>
  <div class="draw-guess-container">
    <!-- 顶部 HUD 栏 -->
    <header class="hud-bar glass-panel">
      <div class="hud-left">
        <span class="game-tag font-arcade">🎨 你画我猜 · 真人对决</span>

        <!-- 房间切换器 -->
        <div class="room-selector">
          <button 
            v-for="r in presetRooms" 
            :key="r.id"
            class="room-chip"
            :class="{ active: currentRoomId === r.id }"
            @click="switchRoom(r.id)"
          >
            {{ r.name }}
          </button>
          <button class="room-chip btn-create-chip" @click="showCreateModal = true">
            <Plus class="w-3.5 h-3.5" />
            <span>自建房间</span>
          </button>
        </div>
      </div>

      <div class="hud-center">
        <!-- 题目或提示 (真实状态) -->
        <template v-if="roomState?.stage === 'drawing'">
          <!-- 如果当前我是画师，显示秘密题目 -->
          <div v-if="multiplayer.isDrawer.value" class="secret-word-pill font-arcade drawer-view">
            <span class="lbl">🖌️ 您是画师，请画出：</span>
            <span class="word-text text-amber-300 font-bold">【{{ roomState.secretWord }}】</span>
            <span class="cat-text text-cyan-300">({{ roomState.currentHint }})</span>
          </div>
          <!-- 如果是猜词玩家 -->
          <div v-else class="secret-word-pill font-arcade guesser-view">
            <span class="lbl">🎨 轮到 [{{ roomState.drawerNickname }}] 作画：</span>
            <span class="word-text text-amber-300 font-bold">{{ roomState.currentHint }}</span>
            <span class="cat-text text-cyan-300">({{ roomState.currentWordLength }} 个字)</span>
          </div>

          <div class="timer-badge font-arcade" :class="{ warning: (roomState.timeLeft || 0) <= 10 }">
            <Clock class="w-4 h-4 animate-spin text-amber-400" />
            <span>{{ roomState.timeLeft }}s</span>
          </div>
        </template>

        <template v-else-if="roomState?.stage === 'round_end'">
          <div class="round-end-pill font-arcade">
            <span>🎉 本轮结束！正确答案是：</span>
            <b class="text-amber-300">【{{ roomState.secretWord }}】</b>
          </div>
        </template>

        <template v-else-if="roomState?.stage === 'game_over'">
          <div class="game-over-pill font-arcade">
            <span>🏆 全场对决结束！</span>
          </div>
        </template>

        <template v-else>
          <div class="waiting-pill font-arcade">
            <span>⏳ 等待更多玩家入座 (满2人房主可发车)</span>
          </div>
        </template>
      </div>

      <div class="hud-right">
        <!-- 房主发车按钮 -->
        <button 
          v-if="multiplayer.isHost.value && (roomState?.stage === 'waiting' || roomState?.stage === 'game_over')"
          class="btn-host-action font-arcade"
          @click="handleStartGame"
          :disabled="seatedCount < 2"
        >
          <Sparkles class="w-4 h-4" />
          <span>{{ seatedCount >= 2 ? '👑 房主开始对决' : '👑 至少需2人入座' }}</span>
        </button>

        <button class="btn-tool" @click="handleCopyInvite" title="复制房间邀请">
          <Share2 class="w-4 h-4 text-cyan-400" />
          <span>{{ copySuccess ? '已复制！' : '邀请' }}</span>
        </button>
      </div>
    </header>

    <!-- 主竞技场：左侧画室与席位，右侧常驻聊天与竞猜流 -->
    <div class="main-arena">
      <!-- 左侧：席位与画板主体 -->
      <div class="canvas-workspace">
        <!-- 6 个在席真人玩家展示 (支持随时点击空座换座！) -->
        <div class="seats-dock glass-panel">
          <div 
            v-for="(seat, idx) in seatsDisplay" 
            :key="idx" 
            class="seat-box"
            :class="{
              'is-empty': !seat,
              'is-me': seat && seat.userId === authStore.currentUser?.id,
              'is-drawer': roomState?.stage === 'drawing' && roomState?.currentDrawerIndex === idx,
              'has-guessed': seat?.hasGuessed
            }"
          >
            <!-- 席位有人 -->
            <template v-if="seat">
              <div class="seat-avatar-wrap">
                <span class="seat-avatar">{{ seat.avatar }}</span>
                <span v-if="roomState?.hostUserId === seat.userId" class="host-crown" title="房主">👑</span>
                <span v-if="roomState?.stage === 'drawing' && roomState?.currentDrawerIndex === idx" class="drawer-brush" title="画师执笔中">🎨</span>
                <span v-if="seat.hasGuessed" class="guessed-badge" title="已猜中">✨</span>
              </div>
              <div class="seat-info">
                <div class="seat-name">
                  {{ seat.nickname }}
                  <span v-if="seat.userId === authStore.currentUser?.id" class="me-tag">(我)</span>
                </div>
                <div class="seat-score font-arcade text-amber-400">{{ seat.score }} 分</div>
              </div>
            </template>

            <!-- 席位为空：点击直接坐下或换座 -->
            <template v-else>
              <button 
                class="btn-switch-seat font-arcade" 
                @click="handleSeatClick(idx)"
                :title="multiplayer.mySeat.value ? '点击切换到该座位' : '入座该席位'"
              >
                <Plus class="w-3.5 h-3.5" />
                <span>{{ multiplayer.mySeat.value ? '换座' : '坐下' }}</span>
              </button>
            </template>
          </div>
        </div>

        <!-- 画板卡片 -->
        <div class="canvas-card glass-panel">
          <canvas 
            ref="canvasRef" 
            width="800" 
            height="500" 
            class="paint-canvas"
            :class="{ 'is-disabled': !multiplayer.isDrawer.value }"
            @mousedown="startDrawing"
            @mousemove="draw"
            @mouseup="stopDrawing"
            @mouseleave="stopDrawing"
            @touchstart.prevent="handleTouchStart"
            @touchmove.prevent="handleTouchMove"
            @touchend.prevent="stopDrawing"
          ></canvas>

          <!-- 画布覆盖提示：非画师观摩中 -->
          <div v-if="!multiplayer.isDrawer.value && roomState?.stage === 'drawing'" class="canvas-spectate-pill font-arcade">
            <span>👀 观摩画师作画中，请在右侧聊天框竞猜！</span>
          </div>

          <!-- 等待开局覆盖遮罩 -->
          <div v-if="roomState?.stage === 'waiting'" class="canvas-idle-overlay">
            <Sparkles class="w-10 h-10 text-cyan-400 mb-2 animate-bounce" />
            <h3 class="font-arcade text-lg text-white">真人你画我猜 · 房间就绪</h3>
            <p class="text-xs text-slate-300 mt-1">
              {{ seatedCount >= 2 ? '玩家已就绪，等待房主点击上方【房主开始对决】！' : '点击上方空位入座，满 2 人即可发车！' }}
            </p>
          </div>

          <!-- 画具控制栏 (仅当前画师可见可用) -->
          <div v-if="multiplayer.isDrawer.value" class="canvas-toolbar">
            <!-- 调色盘 -->
            <div class="color-palette">
              <button 
                v-for="c in colors" 
                :key="c" 
                class="color-btn" 
                :style="{ backgroundColor: c }" 
                :class="{ active: strokeColor === c && !isEraser }" 
                @click="selectColor(c)"
              ></button>
            </div>

            <div class="divider"></div>

            <!-- 画笔粗细 -->
            <div class="size-group">
              <button 
                v-for="s in brushSizes" 
                :key="s.size" 
                class="size-btn" 
                :class="{ active: strokeWidth === s.size && !isEraser }" 
                @click="selectSize(s.size)"
              >
                <span class="size-dot" :style="{ width: s.size + 'px', height: s.size + 'px' }"></span>
              </button>
            </div>

            <div class="divider"></div>

            <!-- 橡皮擦、撤销与清空 -->
            <div class="tool-actions">
              <button class="tool-btn" :class="{ active: isEraser }" @click="toggleEraser" title="橡皮擦">
                <Eraser class="w-4 h-4" />
                <span>橡皮</span>
              </button>
              <button class="tool-btn" @click="handleUndo" title="撤销上一步">
                <Undo2 class="w-4 h-4" />
                <span>撤销</span>
              </button>
              <button class="tool-btn danger" @click="handleClear" title="清空画板">
                <Trash2 class="w-4 h-4" />
                <span>清空</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：常驻玩家聊天与竞猜面板 -->
      <aside class="sidebar-chat-panel glass-panel">
        <div class="sidebar-header">
          <div class="header-tab">
            <MessageSquare class="w-4 h-4 text-cyan-400" />
            <span class="font-arcade text-xs text-cyan-300">竞猜流 & 牌友聊天</span>
          </div>
          <span class="conn-dot" :class="{ online: multiplayer.isConnected.value }">
            {{ multiplayer.isConnected.value ? '● 实时' : '○ 断开' }}
          </span>
        </div>

        <div class="sidebar-body" ref="logContainer">
          <div v-for="(l, i) in multiplayer.logs.value" :key="i" class="log-item">
            <span class="log-time font-arcade">[{{ l.time }}]</span>
            <span v-if="l.sender" class="log-sender font-bold">{{ l.sender }}: </span>
            <span class="log-text">{{ l.text }}</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="emoji-bar">
            <button v-for="e in ['👏', '🔥', '🎨', '🚀', '😭', '🎉', '😎']" :key="e" @click="sendQuickEmoji(e)">
              {{ e }}
            </button>
          </div>
          <div class="chat-input-row">
            <input 
              v-model="guessInput" 
              :placeholder="multiplayer.isDrawer.value ? '您是画师，请勿泄题...' : '输入猜测答案或聊天...'" 
              @keyup.enter="handleSendGuess"
            />
            <button class="btn-send-guess font-arcade" @click="handleSendGuess">
              <span>竞猜 / 发送</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- 自建房间弹窗 -->
    <Modal v-model="showCreateModal" title="自建画猜专属包厢" width="460px">
      <div class="create-room-box font-arcade">
        <div class="form-group">
          <label>包厢名称</label>
          <input v-model="customRoomName" placeholder="例如：灵魂画手夜间局" class="custom-input" />
        </div>
        <div class="form-group mt-3">
          <label>包厢房号 (ID)</label>
          <input v-model="customRoomId" placeholder="例如：my_draw_888" class="custom-input" />
        </div>
        <button class="btn-arcade btn-primary w-full mt-4" @click="handleCreateRoom">
          <span>立即开房并就任房主</span>
        </button>
      </div>
    </Modal>

    <!-- 未登录入场遮罩 -->
    <div v-if="!authStore.isLoggedIn" class="unlogged-gate-overlay">
      <div class="unlogged-card glass-panel">
        <ShieldAlert class="w-12 h-12 text-pink-400 mb-2" />
        <h3 class="text-lg font-bold text-white font-arcade">你画我猜 · 需登录入场</h3>
        <p class="text-xs text-slate-300 mt-2 text-center max-w-sm">
          为了同步竞猜得分与画师排位战绩，参与多人实时画猜对局需登录专属账号。新用户注册即送 🪙 1,000 启航礼金！
        </p>
        <div class="gate-actions mt-4 flex gap-3">
          <button class="btn-arcade btn-primary" @click="authStore.openAuthModal('login')">
            <span>已有账号，立即登录</span>
          </button>
          <button class="btn-arcade btn-secondary" @click="authStore.openAuthModal('register')">
            <span>免费注册 (送1000)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useDrawMultiplayer, type DrawStroke } from './useDrawMultiplayer'
import { sound } from '@/utils/soundEngine'
import Modal from '@/components/common/Modal.vue'
import confetti from 'canvas-confetti'
import { 
  Clock, RotateCcw, Share2, Plus, Sparkles, MessageSquare, 
  Eraser, Undo2, Trash2, ShieldAlert 
} from 'lucide-vue-next'

const authStore = useAuthStore()
const userStore = useUserStore()
const multiplayer = useDrawMultiplayer()

const currentRoomId = ref('draw_1')
const showCreateModal = ref(false)
const customRoomName = ref('')
const customRoomId = ref(`draw_${Date.now().toString().slice(-4)}`)
const copySuccess = ref(false)
const guessInput = ref('')
const logContainer = ref<HTMLElement | null>(null)

// 预设公共房间
const presetRooms = [
  { id: 'draw_1', name: '🎨 欢乐大厅 1' },
  { id: 'draw_2', name: '🎨 灵魂画手 2' }
]

// 画笔配置
const colors = ['#ffffff', '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#ec4899', '#000000']
const brushSizes = [
  { size: 3 },
  { size: 6 },
  { size: 12 },
  { size: 24 }
]
const strokeColor = ref('#ffffff')
const strokeWidth = ref(6)
const isEraser = ref(false)

const canvasRef = ref<HTMLCanvasElement | null>(null)
let isDrawing = false
let lastX = 0
let lastY = 0

const roomState = computed(() => multiplayer.roomState.value)

const seatedCount = computed(() => {
  if (!roomState.value?.seats) return 0
  return roomState.value.seats.filter(Boolean).length
})

const seatsDisplay = computed(() => {
  if (!roomState.value?.seats) return Array(6).fill(null)
  return roomState.value.seats
})

function switchRoom(roomId: string, name?: string) {
  currentRoomId.value = roomId
  if (!authStore.isLoggedIn || !authStore.currentUser) {
    return
  }
  const user = {
    userId: authStore.currentUser.id,
    nickname: authStore.currentUser.nickname,
    avatar: authStore.currentUser.avatar
  }
  multiplayer.connect(roomId, user, name)
}

watch(() => authStore.isLoggedIn, (logged) => {
  if (logged) {
    switchRoom(currentRoomId.value)
  } else {
    multiplayer.disconnect()
  }
})

function handleCreateRoom() {
  const roomId = customRoomId.value.trim() || `draw_${Date.now()}`
  const name = customRoomName.value.trim() || '自建画猜包厢'
  showCreateModal.value = false
  switchRoom(roomId, name)
}

function handleSeatClick(idx: number) {
  if (!authStore.isLoggedIn) {
    authStore.openAuthModal('login')
    return
  }
  sound.click()
  multiplayer.sit(idx)
}

function handleStartGame() {
  sound.victory()
  multiplayer.startGame()
}

function handleCopyInvite() {
  const shareUrl = `${window.location.origin}/game/draw-and-guess?room=${currentRoomId.value}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2500)
  })
}

function selectColor(c: string) {
  strokeColor.value = c
  isEraser.value = false
}

function selectSize(s: number) {
  strokeWidth.value = s
}

function toggleEraser() {
  isEraser.value = !isEraser.value
}

// 画布操作
function getCanvasCoords(e: MouseEvent) {
  const canvas = canvasRef.value
  if (!canvas) return { x: 0, y: 0 }
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

function startDrawing(e: MouseEvent) {
  if (!multiplayer.isDrawer.value) return
  isDrawing = true
  const { x, y } = getCanvasCoords(e)
  lastX = x
  lastY = y

  const stroke: DrawStroke = {
    x1: x,
    y1: y,
    x2: x,
    y2: y,
    color: strokeColor.value,
    size: strokeWidth.value,
    isEraser: isEraser.value,
    isNew: true
  }
  renderStroke(stroke)
  multiplayer.sendStroke(stroke)
}

function draw(e: MouseEvent) {
  if (!isDrawing || !multiplayer.isDrawer.value) return
  const { x, y } = getCanvasCoords(e)

  const stroke: DrawStroke = {
    x1: lastX,
    y1: lastY,
    x2: x,
    y2: y,
    color: strokeColor.value,
    size: strokeWidth.value,
    isEraser: isEraser.value,
    isNew: false
  }
  renderStroke(stroke)
  multiplayer.sendStroke(stroke)

  lastX = x
  lastY = y
}

function stopDrawing() {
  isDrawing = false
}

function handleTouchStart(e: TouchEvent) {
  if (!multiplayer.isDrawer.value || e.touches.length === 0) return
  const t = e.touches[0]
  startDrawing({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function handleTouchMove(e: TouchEvent) {
  if (!multiplayer.isDrawer.value || e.touches.length === 0) return
  const t = e.touches[0]
  draw({ clientX: t.clientX, clientY: t.clientY } as MouseEvent)
}

function renderStroke(s: DrawStroke) {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.beginPath()
  ctx.strokeStyle = s.isEraser ? '#0f172a' : s.color
  ctx.lineWidth = s.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.moveTo(s.x1, s.y1)
  ctx.lineTo(s.x2, s.y2)
  ctx.stroke()
}

function clearLocalCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

function handleClear() {
  clearLocalCanvas()
  multiplayer.sendClear()
}

function handleUndo() {
  multiplayer.sendUndo()
}

function handleSendGuess() {
  if (!guessInput.value.trim()) return
  multiplayer.chat(guessInput.value)
  guessInput.value = ''
}

function sendQuickEmoji(e: string) {
  multiplayer.chat(e)
}

// 监听日志滚动
watch(() => multiplayer.logs.value.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

// 监听阶段特效
watch(() => roomState.value?.stage, (newStage) => {
  if (newStage === 'round_end' || newStage === 'game_over') {
    confetti({ particleCount: 60, spread: 70 })
    sound.victory()
  }
})

onMounted(() => {
  clearLocalCanvas()
  multiplayer.onRemoteStroke((stroke) => {
    renderStroke(stroke)
  })
  multiplayer.onRemoteClear(() => {
    clearLocalCanvas()
  })
  multiplayer.onRemoteHistory((strokes) => {
    clearLocalCanvas()
    strokes.forEach(s => renderStroke(s))
  })

  switchRoom('draw_1')
})

onUnmounted(() => {
  multiplayer.disconnect()
})
</script>

<style scoped>
.draw-guess-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at center, #0b1329 0%, #030712 100%);
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
  gap: 12px;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-tag {
  font-size: 13px;
  font-weight: bold;
  color: #38bdf8;
}

.room-selector {
  display: flex;
  gap: 6px;
}

.room-chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.room-chip.active {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #fff;
}

.btn-create-chip {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.4);
  color: #f472b6;
}

.hud-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.secret-word-pill, .round-end-pill, .waiting-pill, .game-over-pill {
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.secret-word-pill.drawer-view {
  border-color: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.3);
}

.timer-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  color: #fbbf24;
  font-size: 12px;
  font-weight: bold;
}

.timer-badge.warning {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
  color: #f87171;
  animation: pulse 1s infinite;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-host-action {
  padding: 5px 14px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid #fef08a;
  color: #1e1b4b;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.btn-host-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-tool {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
}

/* 主竞技场分栏 */
.main-arena {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.canvas-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  overflow: hidden;
}

/* 6 个席位栏 */
.seats-dock {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 8px 12px;
}

.seat-box {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 6px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  position: relative;
}

.seat-box.is-me {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}

.seat-box.is-drawer {
  border-color: #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
}

.seat-box.has-guessed {
  background: rgba(34, 197, 94, 0.15);
  border-color: #22c55e;
}

.seat-avatar-wrap {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.host-crown {
  position: absolute;
  top: -8px;
  right: -6px;
  font-size: 12px;
}

.drawer-brush {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 11px;
}

.guessed-badge {
  position: absolute;
  top: -6px;
  left: -4px;
  font-size: 11px;
}

.seat-info {
  flex: 1;
  min-width: 0;
}

.seat-name {
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.me-tag {
  color: #38bdf8;
  font-size: 10px;
}

.seat-score {
  font-size: 10px;
}

.btn-switch-seat {
  width: 100%;
  height: 100%;
  min-height: 36px;
  background: transparent;
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  color: #64748b;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  transition: all 0.2s;
}

.btn-switch-seat:hover {
  border-color: #38bdf8;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}

/* 画板卡片 */
.canvas-card {
  flex: 1;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px;
  overflow: hidden;
}

.paint-canvas {
  width: 100%;
  max-width: 800px;
  height: 480px;
  background: #0f172a;
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.6);
  cursor: crosshair;
}

.paint-canvas.is-disabled {
  cursor: default;
}

.canvas-spectate-pill {
  position: absolute;
  top: 20px;
  padding: 4px 14px;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
  font-size: 11px;
}

.canvas-idle-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

/* 画具工具栏 */
.canvas-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  background: rgba(15, 23, 42, 0.8);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.color-palette {
  display: flex;
  gap: 5px;
}

.color-btn {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s;
}

.color-btn.active {
  transform: scale(1.3);
  border-color: #fff;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
}

.divider {
  width: 1px;
  height: 20px;
  background: rgba(255, 255, 255, 0.12);
}

.size-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.size-btn {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.size-btn.active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.2);
}

.size-dot {
  border-radius: 50%;
  background: #cbd5e1;
}

.tool-actions {
  display: flex;
  gap: 6px;
}

.tool-actions .tool-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  display: flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
}

.tool-actions .tool-btn.active {
  background: rgba(56, 189, 248, 0.3);
  border-color: #38bdf8;
  color: #fff;
}

.tool-actions .tool-btn.danger:hover {
  background: rgba(239, 68, 68, 0.3);
  border-color: #ef4444;
  color: #fca5a5;
}

/* 右侧常驻面板 */
.sidebar-chat-panel {
  width: 290px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.8);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-tab {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conn-dot {
  font-size: 10px;
  color: #64748b;
}

.conn-dot.online {
  color: #34d399;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.log-time { color: #64748b; font-size: 10px; margin-right: 4px; }
.log-sender { color: #38bdf8; }
.log-text { color: #cbd5e1; line-height: 1.3; }

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.emoji-bar {
  display: flex;
  gap: 5px;
  margin-bottom: 6px;
}

.emoji-bar button {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  font-size: 14px;
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input-row {
  display: flex;
  gap: 5px;
}

.chat-input-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.chat-input-row input:focus {
  border-color: #38bdf8;
}

.btn-send-guess {
  background: #ec4899;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}

.btn-send-guess:hover {
  background: #db2777;
}

/* 建房弹窗 */
.custom-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  margin-top: 4px;
}

.unlogged-gate-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(8px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.unlogged-card {
  max-width: 440px;
  width: 100%;
  padding: 28px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(236, 72, 153, 0.4);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(236, 72, 153, 0.2);
}
</style>
