<template>
  <div class="multiplayer-texas">
    <!-- 顶部状态栏与房间切换 -->
    <div class="table-header glass-panel">
      <div class="header-left">
        <div class="room-selector">
          <label class="text-xs text-slate-400 font-arcade">当前牌桌：</label>
          <div class="room-chips">
            <button 
              v-for="r in roomList" 
              :key="r.id"
              class="room-btn"
              :class="{ active: currentRoomId === r.id }"
              @click="switchRoom(r.id)"
            >
              <span>{{ r.name }}</span>
              <span class="text-xs text-amber-400 font-arcade">({{ r.sb }}/{{ r.bb }})</span>
            </button>
          </div>
        </div>
      </div>

      <div class="header-center stats-row font-arcade">
        <div class="stat-badge">
          <span class="text-xs text-slate-400">总底池</span>
          <span class="text-amber-400 font-bold">🪙 {{ roomState?.pot || 0 }}</span>
        </div>
        <div class="stat-badge">
          <span class="text-xs text-slate-400">牌局阶段</span>
          <span class="text-cyan-400 font-bold">{{ stageText }}</span>
        </div>
        <div class="stat-badge">
          <span class="text-xs text-slate-400">盲注</span>
          <span class="text-emerald-400 font-bold">SB:{{ roomState?.smallBlind || 10 }} / BB:{{ roomState?.bigBlind || 20 }}</span>
        </div>
        <div class="stat-badge">
          <span class="text-xs text-slate-400">我的余额</span>
          <span class="text-purple-400 font-bold">🪙 {{ authStore.currentUser?.coins ?? userStore.coins }}</span>
        </div>
      </div>

      <div class="header-right">
        <!-- 邀请好友功能 -->
        <button class="btn-tool btn-invite" @click="handleCopyInvite" title="复制房间邀请链接">
          <Share2 v-if="!copySuccess" class="w-4 h-4 text-emerald-400" />
          <Check v-else class="w-4 h-4 text-emerald-400" />
          <span>{{ copySuccess ? '已复制链接！' : '邀请好友' }}</span>
        </button>
        <button v-if="multiplayer.mySeat.value" class="btn-tool btn-stand" @click="multiplayer.stand">
          <LogOut class="w-4 h-4 text-rose-400" />
          <span>离座观战</span>
        </button>
        <button class="btn-tool" @click="showLogDrawer = !showLogDrawer">
          <MessageSquare class="w-4 h-4 text-amber-400" />
          <span>牌桌明细</span>
        </button>
      </div>
    </div>

    <!-- 德州扑克 6 人豪华牌桌 -->
    <div class="table-container">
      <div class="poker-table">
        <!-- 豪华皮质扶手外圈 -->
        <div class="leather-armrest"></div>
        <!-- 黄铜内饰边框 -->
        <div class="brass-bezel"></div>
        <!-- 蒙特卡洛祖母绿桌布 -->
        <div class="table-inner-felt">
          <!-- 牌桌中央：水印、公共牌 5 张 + 底池 -->
          <div class="board-center">
            <!-- 牌桌中央暗纹水印 -->
            <div class="felt-watermark">
              <span class="wm-suit">♠</span>
              <span class="wm-text font-arcade">KK POKER CLUB</span>
              <span class="wm-suit">♠</span>
            </div>

            <!-- 等待真实玩家提示 (当入座人数不足 2 人时) -->
            <div v-if="seatedCount < 2" class="waiting-human-banner">
              <div class="waiting-header">
                <Users class="w-4 h-4 text-amber-400 animate-pulse" />
                <span class="font-bold text-amber-300">等待真实牌手入座 ({{ seatedCount }}/6)</span>
              </div>
              <p class="waiting-hint">真人纯竞技对战 · 满 2 人自动发牌</p>
              <button class="btn-copy-mini" @click="handleCopyInvite">
                <Copy v-if="!copySuccess" class="w-3 h-3" />
                <Check v-else class="w-3 h-3 text-emerald-400" />
                <span>{{ copySuccess ? '已复制邀请链接' : '复制房间链接分享给好友' }}</span>
              </button>
            </div>

            <!-- 底池显示 (有牌局或开局时) -->
            <div v-else class="pot-box font-arcade">
              <span class="pot-lbl">TOTAL POT</span>
              <span class="pot-val text-amber-400">🪙 {{ roomState?.pot || 0 }}</span>
            </div>

            <!-- 5 张公共牌槽位 -->
            <div class="community-cards">
              <div 
                v-for="i in 5" 
                :key="i"
                class="card-slot"
              >
                <div 
                  v-if="roomState?.communityCards && roomState.communityCards[i - 1]"
                  class="poker-card comm-card animate-card-drop"
                >
                  <span class="card-corner top" :style="{ color: getSuitColor(roomState.communityCards[i - 1].suit) }">
                    {{ getRankDisplay(roomState.communityCards[i - 1].rank) }}<br>{{ getSuitSymbol(roomState.communityCards[i - 1].suit) }}
                  </span>
                  <span class="card-center" :style="{ color: getSuitColor(roomState.communityCards[i - 1].suit) }">
                    {{ getSuitSymbol(roomState.communityCards[i - 1].suit) }}
                  </span>
                  <span class="card-corner btm" :style="{ color: getSuitColor(roomState.communityCards[i - 1].suit) }">
                    {{ getRankDisplay(roomState.communityCards[i - 1].rank) }}<br>{{ getSuitSymbol(roomState.communityCards[i - 1].suit) }}
                  </span>
                </div>
                <div v-else class="card-empty-slot">
                  <div class="empty-dot"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- 6 个座位分布 -->
          <div 
            v-for="(seat, idx) in seatsDisplay" 
            :key="idx" 
            class="table-seat"
            :class="[
              `seat-pos-${idx}`,
              { 'is-active': roomState?.activeSeatIndex === idx },
              { 'is-folded': seat?.isFolded },
              { 'is-me': seat && seat.userId === authStore.currentUser?.id }
            ]"
          >
            <!-- 席位有人 -->
            <template v-if="seat">
              <!-- 头像与筹码信息 -->
              <div class="seat-badge">
                <div class="avatar-ring">
                  <span class="avatar-emoji">{{ seat.avatar }}</span>
                </div>
                <div class="seat-meta">
                  <div class="seat-name">
                    {{ seat.nickname }}
                    <span v-if="seat.userId === authStore.currentUser?.id" class="me-tag">(我)</span>
                  </div>
                  <div class="seat-chips font-arcade">🪙 {{ seat.chips }}</div>
                </div>
                <!-- 庄家标志 -->
                <div v-if="roomState?.dealerSeatIndex === idx" class="dealer-token font-arcade">D</div>
                <!-- 思考倒计时徽章 -->
                <div v-if="roomState?.activeSeatIndex === idx && !seat.isFolded" class="timer-badge font-arcade">
                  <Timer class="w-3 h-3 animate-spin text-amber-400" />
                  <span>{{ turnSeconds }}s</span>
                </div>
              </div>

              <!-- 下注筹码气泡 -->
              <div v-if="seat.currentRoundBet > 0" class="bet-bubble font-arcade">
                下注: 🪙 {{ seat.currentRoundBet }}
              </div>

              <!-- 玩家手牌 (2 张) -->
              <div class="seat-cards">
                <div 
                  v-for="(card, cIdx) in (seat.cards.length ? seat.cards : 2)" 
                  :key="cIdx"
                  class="poker-card seat-card"
                  :class="{ 'card-back': typeof card === 'number' || (card.rank === 0) }"
                >
                  <template v-if="typeof card === 'object' && card.rank > 0">
                    <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                      {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                    </span>
                    <span class="card-center" :style="{ color: getSuitColor(card.suit) }">
                      {{ getSuitSymbol(card.suit) }}
                    </span>
                    <span class="card-corner btm" :style="{ color: getSuitColor(card.suit) }">
                      {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                    </span>
                  </template>
                  <template v-else>
                    <div class="card-back-pattern">
                      <div class="back-inner-diamond">♠</div>
                    </div>
                  </template>
                </div>
              </div>

              <!-- 牌型名称 (摊牌或本人) -->
              <div v-if="seat.evaluatedHand" class="hand-rank-tag">
                {{ seat.evaluatedHand.rankName }}
              </div>
            </template>

            <!-- 席位为空：显示坐下按钮 -->
            <template v-else>
              <button 
                class="sit-down-btn font-arcade" 
                @click="handleSitClick(idx)"
                :disabled="!!multiplayer.mySeat.value"
              >
                <Plus class="w-4 h-4" />
                <span>坐下</span>
              </button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作控制台 -->
    <div class="action-console glass-panel">
      <!-- 场景 A：未坐下观战 -->
      <div v-if="!multiplayer.mySeat.value" class="console-spectate">
        <Eye class="w-5 h-5 text-cyan-400" />
        <span class="text-slate-300">您当前处于观战模式，点击牌桌任意空座即可坐下参与对决！</span>
        <button class="btn-arcade btn-primary" @click="handleSitClick()">
          <Plus class="w-4 h-4" />
          <span>快速入座 (自动选座)</span>
        </button>
      </div>

      <!-- 场景 B：轮到我操作 -->
      <div v-else-if="multiplayer.isMyTurn.value" class="console-actions">
        <!-- 弃牌 -->
        <button class="btn-arcade btn-danger" @click="multiplayer.action('fold')">
          <ShieldAlert class="w-4 h-4" />
          <span>弃牌 (Fold)</span>
        </button>

        <!-- 看牌 / 跟注 -->
        <button 
          class="btn-arcade btn-primary"
          @click="multiplayer.canCheck.value ? multiplayer.action('check') : multiplayer.action('call')"
        >
          <Coins class="w-4 h-4" />
          <span v-if="multiplayer.canCheck.value">过牌 (Check)</span>
          <span v-else>跟注 🪙 {{ multiplayer.callAmount.value }}</span>
        </button>

        <!-- 加注快捷按钮 -->
        <div class="raise-group">
          <button 
            class="btn-arcade btn-raise"
            @click="multiplayer.action('raise', currentBb * 2)"
          >
            2BB
          </button>
          <button 
            class="btn-arcade btn-raise"
            @click="multiplayer.action('raise', Math.floor((roomState?.pot || currentBb) * 0.5))"
          >
            1/2 底池
          </button>
          <button 
            class="btn-arcade btn-raise"
            @click="multiplayer.action('raise', roomState?.pot || currentBb * 4)"
          >
            满底池
          </button>
        </div>

        <!-- 全下 All In -->
        <button class="btn-arcade btn-allin" @click="multiplayer.action('allin')">
          <Flame class="w-4 h-4" />
          <span>ALL-IN 全下</span>
        </button>
      </div>

      <!-- 场景 C：已坐下但未轮到我 -->
      <div v-else class="console-waiting">
        <Loader2 class="w-5 h-5 animate-spin text-cyan-400" />
        <span class="text-slate-300 font-arcade">
          牌局进行中，等待 {{ activePlayerName }} 操作...
        </span>
      </div>
    </div>

    <!-- 侧边实时牌局动态与聊天抽屉 -->
    <div class="chat-drawer glass-panel" :class="{ open: showLogDrawer }">
      <div class="drawer-header">
        <span class="font-arcade text-sm text-cyan-400">牌桌日志 & 互动</span>
        <button class="btn-close" @click="showLogDrawer = false">✕</button>
      </div>
      <div class="drawer-body" ref="logContainer">
        <div v-for="(l, i) in multiplayer.logs.value" :key="i" class="log-item">
          <span class="log-time font-arcade">[{{ l.time }}]</span>
          <span v-if="l.sender" class="log-sender font-bold">{{ l.sender }}: </span>
          <span class="log-text">{{ l.text }}</span>
        </div>
      </div>
      <div class="drawer-footer">
        <div class="emoji-bar">
          <button v-for="e in ['👏', '🔥', '😎', '🪙', '🚀', '😭']" :key="e" @click="sendQuickEmoji(e)">
            {{ e }}
          </button>
        </div>
        <div class="chat-input-row">
          <input 
            v-model="chatInput" 
            placeholder="与桌上牌友聊天..." 
            @keyup.enter="handleSendChat"
          />
          <button class="btn-send" @click="handleSendChat">发送</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useTexasMultiplayer } from './multiplayer'
import { getRankDisplay, getSuitSymbol, getSuitColor } from './engine'
import { Share2, Check, Copy, LogOut, MessageSquare, Plus, ShieldAlert, Coins, Flame, Loader2, Eye, Timer, Users } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const authStore = useAuthStore()
const userStore = useUserStore()
const multiplayer = useTexasMultiplayer()

const props = defineProps<{ initialRoomId?: string }>()
const currentRoomId = ref(props.initialRoomId || 'room_beginner')
const showLogDrawer = ref(false)
const chatInput = ref('')
const turnSeconds = ref(15)
const copySuccess = ref(false)
let timerInterval: any = null

const roomList = [
  { id: 'room_beginner', name: '新手欢聚桌 🟢', sb: 10, bb: 20 },
  { id: 'room_pro', name: '高手进阶桌 🟡', sb: 50, bb: 100 },
  { id: 'room_master', name: '巅峰赌神桌 🔴', sb: 200, bb: 400 }
]

const roomState = computed(() => multiplayer.roomState.value)
const currentBb = computed(() => roomState.value?.bigBlind || 20)

const seatedCount = computed(() => {
  if (!roomState.value?.seats) return 0
  return roomState.value.seats.filter(Boolean).length
})

const stageText = computed(() => {
  switch (roomState.value?.stage) {
    case 'preflop': return '翻牌前'
    case 'flop': return '翻牌圈'
    case 'turn': return '转牌圈'
    case 'river': return '河牌圈'
    case 'showdown': return '摊牌结算'
    case 'ended': return '本手结束'
    default: return '等待开局'
  }
})

const seatsDisplay = computed(() => {
  if (!roomState.value?.seats) return Array(6).fill(null)
  return roomState.value.seats
})

const activePlayerName = computed(() => {
  const activeIdx = roomState.value?.activeSeatIndex
  if (activeIdx !== undefined && activeIdx >= 0 && roomState.value?.seats[activeIdx]) {
    return roomState.value.seats[activeIdx]?.nickname || '其他牌手'
  }
  return '其他牌手'
})

// 复制邀请链接
function handleCopyInvite() {
  const shareUrl = `${window.location.origin}/game/texas?room=${currentRoomId.value}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    copySuccess.value = true
    setTimeout(() => {
      copySuccess.value = false
    }, 2500)
  })
}

// 监听回合变化触发 15s 倒计时动画
watch(() => roomState.value?.activeSeatIndex, () => {
  turnSeconds.value = 15
  clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (turnSeconds.value > 0) turnSeconds.value--
    else clearInterval(timerInterval)
  }, 1000)
})

// 胜利撒花特效
watch(() => roomState.value?.stage, (newStage) => {
  if (newStage === 'ended') {
    const mySeat = multiplayer.mySeat.value
    if (mySeat && !mySeat.isFolded) {
      confetti({
        particleCount: 60,
        spread: 80,
        origin: { y: 0.6 }
      })
    }
  }
})

function switchRoom(roomId: string) {
  currentRoomId.value = roomId
  connectToRoom()
}

function connectToRoom() {
  const user = {
    userId: authStore.currentUser?.id || `guest_${Date.now()}`,
    nickname: authStore.currentUser?.nickname || userStore.nickname || '牌手',
    avatar: authStore.currentUser?.avatar || userStore.avatar || '🤠',
    chips: authStore.currentUser?.coins ?? userStore.coins ?? 2000
  }
  multiplayer.connect(currentRoomId.value, user)
}

function handleSitClick(seatIndex?: number) {
  if (!authStore.isLoggedIn) {
    authStore.openAuthModal('login')
    return
  }
  const myCoins = authStore.currentUser?.coins ?? userStore.coins
  const buyIn = Math.min(myCoins, currentBb.value * 25)
  multiplayer.sit(seatIndex, buyIn)
}

function handleSendChat() {
  if (!chatInput.value.trim()) return
  multiplayer.chat(chatInput.value)
  chatInput.value = ''
}

function sendQuickEmoji(emoji: string) {
  multiplayer.chat(emoji)
}

onMounted(() => {
  connectToRoom()
})

onUnmounted(() => {
  clearInterval(timerInterval)
  multiplayer.disconnect()
})
</script>

<style scoped>
.multiplayer-texas {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: radial-gradient(circle at center, #0b1324 0%, #030712 100%);
  user-select: none;
  overflow: hidden;
}

/* 顶部状态栏 */
.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 18px;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
}

.room-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.room-chips {
  display: flex;
  gap: 6px;
}

.room-btn {
  padding: 5px 12px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 6px;
  align-items: center;
}

.room-btn.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  color: #38bdf8;
  box-shadow: 0 0 12px rgba(6, 182, 212, 0.35);
}

.stats-row {
  display: flex;
  gap: 16px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.header-right {
  display: flex;
  gap: 8px;
}

.btn-tool {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #e2e8f0;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-tool:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.btn-invite {
  border-color: rgba(16, 185, 129, 0.4);
  background: rgba(16, 185, 129, 0.12);
  color: #a7f3d0;
}

.btn-stand {
  border-color: rgba(244, 63, 94, 0.4);
  color: #fda4af;
}

/* 牌桌主体与外圈装潢 */
.table-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  position: relative;
}

.poker-table {
  width: 920px;
  height: 520px;
  border-radius: 260px;
  position: relative;
  box-shadow: 
    0 30px 60px -10px rgba(0, 0, 0, 0.9),
    0 0 100px rgba(10, 80, 50, 0.2);
}

/* 豪华皮质扶手 */
.leather-armrest {
  position: absolute;
  inset: 0;
  border-radius: 260px;
  background: linear-gradient(135deg, #2b1810 0%, #150b07 100%);
  border: 4px solid #3d2112;
  box-shadow: 
    inset 0 4px 8px rgba(255, 255, 255, 0.15),
    inset 0 -6px 14px rgba(0, 0, 0, 0.9);
}

/* 黄铜镶嵌边框 */
.brass-bezel {
  position: absolute;
  inset: 16px;
  border-radius: 244px;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 50%, #f6e27a 100%);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

/* 蒙特卡洛祖母绿桌布 */
.table-inner-felt {
  position: absolute;
  inset: 20px;
  border-radius: 240px;
  background: radial-gradient(ellipse at center, #0d5f3a 0%, #083c24 70%, #032114 100%);
  border: 2px solid rgba(0, 0, 0, 0.6);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.8);
}

/* 牌桌中心 */
.board-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  z-index: 2;
}

.felt-watermark {
  position: absolute;
  top: -48px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.15;
  pointer-events: none;
}

.wm-suit {
  font-size: 20px;
  color: #d4af37;
}

.wm-text {
  font-size: 14px;
  letter-spacing: 4px;
  color: #d4af37;
  font-weight: 900;
}

/* 等待真实玩家卡片 */
.waiting-human-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 10px 24px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
}

.waiting-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.waiting-hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 3px 0 8px;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-copy-mini:hover {
  background: rgba(56, 189, 248, 0.3);
  transform: scale(1.03);
}

.pot-box {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 4px 20px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.community-cards {
  display: flex;
  gap: 10px;
}

.card-slot {
  width: 60px;
  height: 86px;
}

.poker-card {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.45);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.card-corner {
  position: absolute;
  font-size: 11px;
  line-height: 1.1;
  text-align: center;
}

.card-corner.top { top: 4px; left: 5px; }
.card-corner.btm { bottom: 4px; right: 5px; transform: rotate(180deg); }
.card-center { font-size: 22px; }

.card-empty-slot {
  width: 100%;
  height: 100%;
  border: 1.5px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

/* 6个席位排布 */
.table-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

/* 座位坐标 */
.seat-pos-0 { bottom: -20px; left: 50%; transform: translateX(-50%); } /* 正下方 (我) */
.seat-pos-1 { bottom: 50px; left: 40px; } /* 左下 */
.seat-pos-2 { top: 50px; left: 40px; } /* 左上 */
.seat-pos-3 { top: -20px; left: 50%; transform: translateX(-50%); } /* 正上方 */
.seat-pos-4 { top: 50px; right: 40px; } /* 右上 */
.seat-pos-5 { bottom: 50px; right: 40px; } /* 右下 */

.seat-badge {
  background: rgba(15, 23, 42, 0.92);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 30px;
  padding: 4px 14px 4px 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
  position: relative;
}

.table-seat.is-active .seat-badge {
  border-color: #facc15;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.6);
}

.avatar-ring {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.seat-meta {
  display: flex;
  flex-direction: column;
}

.seat-name {
  font-size: 12px;
  color: #f8fafc;
  font-weight: 600;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-tag { color: #38bdf8; font-size: 11px; margin-left: 2px; }

.seat-chips {
  font-size: 12px;
  color: #facc15;
}

.dealer-token {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: radial-gradient(circle, #ef4444 0%, #b91c1c 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
}

.timer-badge {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  border: 1px solid #f59e0b;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}

.bet-bubble {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #f59e0b;
  color: #fef08a;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.seat-cards {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.seat-card {
  width: 40px;
  height: 56px;
}

.card-back-pattern {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, #1e293b 0%, #0f172a 100%);
  border-radius: 6px;
  border: 1px solid #334155;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-inner-diamond {
  color: rgba(255, 255, 255, 0.25);
  font-size: 16px;
}

.hand-rank-tag {
  margin-top: 4px;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #fff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: bold;
}

/* 坐下按钮 */
.sit-down-btn {
  background: rgba(15, 23, 42, 0.7);
  border: 1.5px dashed rgba(56, 189, 248, 0.6);
  color: #38bdf8;
  padding: 8px 18px;
  border-radius: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.sit-down-btn:hover:not(:disabled) {
  background: rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  transform: scale(1.05);
}

/* 底部操作控制台 */
.action-console {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 72px;
}

.console-actions, .console-spectate, .console-waiting {
  display: flex;
  align-items: center;
  gap: 16px;
}

.btn-arcade {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  font-size: 14px;
}

.btn-arcade:active {
  transform: translateY(2px);
}

.btn-danger {
  background: #dc2626;
  color: #fff;
  box-shadow: 0 4px 0 #991b1b, 0 6px 12px rgba(220, 38, 38, 0.35);
}

.btn-primary {
  background: #0284c7;
  color: #fff;
  box-shadow: 0 4px 0 #0369a1, 0 6px 12px rgba(2, 132, 199, 0.35);
}

.btn-allin {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #fff;
  box-shadow: 0 4px 0 #9f1239, 0 6px 15px rgba(244, 63, 94, 0.5);
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 0 #9f1239, 0 0 15px rgba(244, 63, 94, 0.4); }
  50% { box-shadow: 0 4px 0 #9f1239, 0 0 25px rgba(244, 63, 94, 0.8); }
}

.raise-group {
  display: flex;
  gap: 6px;
}

.btn-raise {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f1f5f9;
  padding: 8px 14px;
  border-radius: 8px;
}

.btn-raise:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: #38bdf8;
}

/* 侧边日志抽屉 */
.chat-drawer {
  position: absolute;
  top: 60px;
  right: 0;
  width: 320px;
  bottom: 72px;
  background: rgba(15, 23, 42, 0.96);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 20;
}

.chat-drawer.open {
  transform: translateX(0);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-close {
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  font-size: 16px;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.log-time { color: #64748b; margin-right: 4px; }
.log-sender { color: #38bdf8; }
.log-text { color: #cbd5e1; }

.drawer-footer {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.emoji-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.emoji-bar button {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  font-size: 16px;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input-row {
  display: flex;
  gap: 8px;
}

.chat-input-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  padding: 6px 10px;
  color: #fff;
  font-size: 12px;
}

.btn-send {
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
}
</style>
