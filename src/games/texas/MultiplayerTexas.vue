<template>
  <div class="multiplayer-texas">
    <!-- 顶部奢华 HUD 导航与状态栏 -->
    <header class="hud-top-bar glass-panel">
      <div class="hud-left">
        <router-link to="/lobby" class="hud-back-btn" title="返回游戏大厅">
          <ChevronLeft class="w-4 h-4" />
          <span>大厅</span>
        </router-link>

        <div class="room-selector">
          <label class="selector-label font-arcade">切换牌桌：</label>
          <div class="room-chips">
            <button 
              v-for="r in roomList" 
              :key="r.id"
              class="room-pill-btn"
              :class="{ 
                active: currentRoomId === r.id,
                'is-short': r.isShort
              }"
              @click="switchRoom(r.id)"
            >
              <span class="room-name">{{ r.name }}</span>
              <span class="room-stakes font-arcade">({{ r.sb }}/{{ r.bb }})</span>
            </button>
          </div>
        </div>
      </div>

      <div class="hud-center stats-row font-arcade">
        <!-- 玩法标签 -->
        <div class="mode-badge" :class="isShortDeckRoom ? 'short' : 'standard'">
          {{ isShortDeckRoom ? '⚡ 短牌 6+ (36张)' : '♠ 经典德州 (52张)' }}
        </div>
        <div class="stat-badge">
          <span class="badge-lbl">总底池</span>
          <span class="badge-val text-amber-400 font-bold">🪙 {{ roomState?.pot || 0 }}</span>
        </div>
        <div class="stat-badge">
          <span class="badge-lbl">阶段</span>
          <span class="badge-val text-cyan-400 font-bold">{{ stageText }}</span>
        </div>
        <div class="stat-badge">
          <span class="badge-lbl">盲注</span>
          <span class="badge-val text-emerald-400 font-bold">SB:{{ roomState?.smallBlind || 10 }} / BB:{{ roomState?.bigBlind || 20 }}</span>
        </div>
      </div>

      <div class="hud-right">
        <!-- 我的资产 -->
        <div class="my-wallet-badge font-arcade">
          <span class="wallet-lbl">筹码</span>
          <span class="wallet-val text-purple-300">🪙 {{ authStore.currentUser?.coins ?? userStore.coins }}</span>
        </div>

        <!-- 邀请好友 -->
        <button class="btn-hud btn-invite" @click="handleCopyInvite" title="复制房间邀请链接">
          <Share2 v-if="!copySuccess" class="w-3.5 h-3.5 text-emerald-400" />
          <Check v-else class="w-3.5 h-3.5 text-emerald-400" />
          <span>{{ copySuccess ? '已复制！' : '邀请好友' }}</span>
        </button>

        <!-- 离座观战 -->
        <button v-if="multiplayer.mySeat.value" class="btn-hud btn-stand" @click="multiplayer.stand">
          <LogOut class="w-3.5 h-3.5 text-rose-400" />
          <span>离座观战</span>
        </button>
      </div>
    </header>

    <!-- 短牌 6+ 专属规则说明条 (短牌桌时显眼常驻) -->
    <div v-if="isShortDeckRoom" class="short-deck-banner">
      <div class="banner-inner">
        <Sparkles class="w-4 h-4 text-amber-400 animate-spin" />
        <span class="banner-title font-arcade font-bold text-amber-300">短牌 6+ 规则生效中：</span>
        <span class="banner-rules text-slate-200">已剔除 2~5 牌（共36张）· <b>同花大于葫芦</b> · <b>A-6-7-8-9 算最小顺子</b></span>
      </div>
    </div>

    <!-- 主竞技场：左/中为牌桌及控制台，右侧常驻聊天与战报面板 -->
    <div class="main-poker-arena">
      <!-- 牌桌与控制台区域 -->
      <div class="table-play-zone">
        <div class="table-container">
          <div class="poker-table">
            <!-- 奢华暗黑皮革缝线扶手垫 -->
            <div class="leather-armrest"></div>
            <!-- 黄铜微光金属内嵌饰边 -->
            <div class="brass-bezel"></div>
            <!-- 蒙特卡洛祖母绿桌布 -->
            <div class="table-inner-felt">
              <!-- 牌桌中央：暗纹水印、公共牌 5 张 + 底池 -->
              <div class="board-center">
                <!-- 暗纹水印 -->
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

              <!-- 6 个席位分布 -->
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
                        <span v-if="roomState?.hostUserId === seat.userId" class="host-badge" title="房主">👑</span>
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

                <!-- 席位为空：显示坐下或换座按钮 -->
                <template v-else>
                  <button 
                    class="sit-down-btn font-arcade" 
                    @click="handleSitClick(idx)"
                    :title="multiplayer.mySeat.value ? '点击切换到该座位' : '入座该座位'"
                  >
                    <Plus class="w-4 h-4" />
                    <span>{{ multiplayer.mySeat.value ? '换座' : '坐下' }}</span>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部高级操作控制台 -->
        <footer class="action-console glass-panel">
          <!-- 场景 A：未坐下观战 -->
          <div v-if="!multiplayer.mySeat.value" class="console-spectate">
            <Eye class="w-5 h-5 text-cyan-400" />
            <span class="spectate-tip">您当前处于观战模式，点击牌桌空座或快速入座参与对决！</span>
            <button class="btn-arcade btn-primary btn-quick-sit" @click="handleSitClick()">
              <Plus class="w-4 h-4" />
              <span>快速入座 (自动选座)</span>
            </button>
          </div>

          <!-- 场景 B：轮到我操作 -->
          <div v-else-if="multiplayer.isMyTurn.value" class="console-actions">
            <!-- 弃牌 -->
            <button class="btn-arcade btn-danger btn-fold" @click="multiplayer.action('fold')">
              <ShieldAlert class="w-4 h-4" />
              <span>弃牌 (Fold)</span>
            </button>

            <!-- 看牌 / 跟注 -->
            <button 
              class="btn-arcade btn-primary btn-call"
              @click="multiplayer.canCheck.value ? multiplayer.action('check') : multiplayer.action('call')"
            >
              <Coins class="w-4 h-4" />
              <span v-if="multiplayer.canCheck.value">过牌 (Check)</span>
              <span v-else>跟注 🪙 {{ multiplayer.callAmount.value }}</span>
            </button>

            <!-- 加注交互控制组 -->
            <div class="raise-control-cluster">
              <div class="raise-quick-row">
                <button class="btn-quick-chip" @click="setRaiseMultiplier(2)">2BB</button>
                <button class="btn-quick-chip" @click="setRaiseMultiplier(3)">3BB</button>
                <button class="btn-quick-chip" @click="setRaisePotFraction(0.5)">1/2底池</button>
                <button class="btn-quick-chip" @click="setRaisePotFraction(1)">满底池</button>
              </div>
              <div class="raise-slider-row">
                <input 
                  type="range" 
                  v-model.number="customRaiseAmount" 
                  :min="minRaiseAmount" 
                  :max="maxRaiseAmount"
                  :step="currentBb"
                  class="raise-slider"
                />
                <button 
                  class="btn-arcade btn-raise" 
                  @click="multiplayer.action('raise', customRaiseAmount)"
                >
                  <span>加注至 🪙{{ customRaiseAmount }}</span>
                </button>
              </div>
            </div>

            <!-- 全下 All In -->
            <button class="btn-arcade btn-allin" @click="multiplayer.action('allin')">
              <Flame class="w-4 h-4" />
              <span>ALL IN 全下</span>
            </button>
          </div>

          <!-- 场景 C：已坐下，处于等待或结束准备阶段 -->
          <div v-else-if="roomState?.stage === 'idle' || roomState?.stage === 'ended'" class="console-waiting">
            <template v-if="roomState?.hostUserId === authStore.currentUser?.id && seatedCount >= 2">
              <span class="text-amber-300 font-arcade text-sm">👑 您是房主，当前已有 {{ seatedCount }} 人入座</span>
              <button class="btn-arcade btn-primary btn-host-start" @click="multiplayer.startGame()">
                <Sparkles class="w-4 h-4" />
                <span>立即发牌开局</span>
              </button>
            </template>
            <span v-else class="text-slate-300 font-arcade">
              {{ seatedCount >= 2 ? '牌局准备中，即将发牌...' : '等待更多牌友入座 (满2人自动开局)...' }}
            </span>
          </div>

          <!-- 场景 D：已坐下但未轮到我 -->
          <div v-else class="console-waiting">
            <Loader2 class="w-5 h-5 animate-spin text-cyan-400" />
            <span class="text-slate-300 font-arcade">
              牌局进行中，等待 {{ activePlayerName }} 操作...
            </span>
          </div>
        </footer>
      </div>

      <!-- 右侧常驻牌桌互动与战报面板 (常驻显示，不遮挡牌桌) -->
      <aside class="sidebar-chat-panel glass-panel">
        <div class="sidebar-header">
          <div class="header-tab">
            <MessageSquare class="w-4 h-4 text-cyan-400" />
            <span class="font-arcade text-xs text-cyan-300">牌桌动态 & 互动</span>
          </div>
          <span class="conn-dot" :class="{ online: multiplayer.isConnected.value }">
            {{ multiplayer.isConnected.value ? '● 实时联机' : '○ 断开' }}
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
            <button v-for="e in ['👏', '🔥', '😎', '🪙', '🚀', '😭', '🎉']" :key="e" @click="sendQuickEmoji(e)">
              {{ e }}
            </button>
          </div>
          <div class="chat-input-row">
            <input 
              v-model="chatInput" 
              placeholder="与牌友交流..." 
              @keyup.enter="handleSendChat"
            />
            <button class="btn-send-chat" @click="handleSendChat">发送</button>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useTexasMultiplayer } from './multiplayer'
import { getRankDisplay, getSuitSymbol, getSuitColor } from './engine'
import { 
  ChevronLeft, Share2, Check, Copy, LogOut, MessageSquare, Plus, 
  ShieldAlert, Coins, Flame, Loader2, Eye, Timer, Users, Sparkles 
} from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const authStore = useAuthStore()
const userStore = useUserStore()
const multiplayer = useTexasMultiplayer()

const props = defineProps<{ initialRoomId?: string }>()
const currentRoomId = ref(props.initialRoomId || 'room_beginner')
const chatInput = ref('')
const turnSeconds = ref(15)
const copySuccess = ref(false)
const logContainer = ref<HTMLElement | null>(null)
let timerInterval: any = null

const roomList = [
  { id: 'room_beginner', name: '标准·微额 🟢', sb: 10, bb: 20, isShort: false },
  { id: 'room_pro', name: '标准·进阶 🟡', sb: 50, bb: 100, isShort: false },
  { id: 'room_master', name: '标准·巅峰 🔴', sb: 200, bb: 400, isShort: false },
  { id: 'room_short_1', name: '短牌6+·热血 ⚡', sb: 10, bb: 20, isShort: true },
  { id: 'room_short_pro', name: '短牌6+·狂暴 🔥', sb: 50, bb: 100, isShort: true }
]

const roomState = computed(() => multiplayer.roomState.value)
const currentBb = computed(() => roomState.value?.bigBlind || 20)

const isShortDeckRoom = computed(() => {
  return roomState.value?.isShortDeck || currentRoomId.value.includes('short')
})

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

// 加注滑动条金额计算
const minRaiseAmount = computed(() => {
  const curBet = roomState.value?.currentHighestBet || 0
  return curBet + currentBb.value
})

const maxRaiseAmount = computed(() => {
  return multiplayer.mySeat.value?.chips || 1000
})

const customRaiseAmount = ref(40)

// 轮到玩家行动时重置加注滑动条默认值
watch(() => multiplayer.isMyTurn.value, (isTurn) => {
  if (isTurn) {
    customRaiseAmount.value = Math.max(minRaiseAmount.value, currentBb.value * 2)
  }
})

function setRaiseMultiplier(bbMultiplier: number) {
  customRaiseAmount.value = Math.min(maxRaiseAmount.value, currentBb.value * bbMultiplier)
}

function setRaisePotFraction(fraction: number) {
  const pot = roomState.value?.pot || currentBb.value * 2
  const target = Math.max(minRaiseAmount.value, Math.floor(pot * fraction))
  customRaiseAmount.value = Math.min(maxRaiseAmount.value, target)
}

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

// 监听日志更新自动滚动底部
watch(() => multiplayer.logs.value.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

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
        particleCount: 70,
        spread: 85,
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

/* 顶部奢华 HUD 状态栏 */
.hud-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 10;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.hud-back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 12px;
  text-decoration: none;
  transition: all 0.2s;
}

.hud-back-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.room-selector {
  display: flex;
  align-items: center;
  gap: 6px;
}

.selector-label {
  font-size: 11px;
  color: #64748b;
}

.room-chips {
  display: flex;
  gap: 6px;
}

.room-pill-btn {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 4px;
  align-items: center;
}

.room-pill-btn.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: #06b6d4;
  color: #38bdf8;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.35);
}

.room-pill-btn.is-short.active {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  color: #fbbf24;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.35);
}

.room-stakes {
  font-size: 11px;
  color: #eab308;
}

.hud-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mode-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
}

.mode-badge.standard {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}

.mode-badge.short {
  background: rgba(245, 158, 11, 0.18);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
  animation: pulse 2s infinite;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.35);
  padding: 3px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.badge-lbl {
  font-size: 10px;
  color: #64748b;
}

.badge-val {
  font-size: 12px;
}

.hud-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.my-wallet-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(147, 51, 234, 0.15);
  border: 1px solid rgba(147, 51, 234, 0.35);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
}

.wallet-lbl {
  font-size: 10px;
  color: #c084fc;
}

.btn-hud {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #e2e8f0;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-hud:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.btn-invite {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
  color: #6ee7b7;
}

.btn-stand {
  background: rgba(244, 63, 94, 0.15);
  border-color: rgba(244, 63, 94, 0.4);
  color: #fda4af;
}

/* 短牌 6+ 说明横幅 */
.short-deck-banner {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%);
  border-bottom: 1px solid rgba(245, 158, 11, 0.3);
  padding: 4px 16px;
  display: flex;
  justify-content: center;
}

.banner-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

/* 主竞技场分栏布局 */
.main-poker-arena {
  display: flex;
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* 左侧牌桌与控制台区域 */
.table-play-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.table-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  position: relative;
}

.poker-table {
  width: 880px;
  height: 480px;
  border-radius: 240px;
  position: relative;
  box-shadow: 
    0 25px 50px -10px rgba(0, 0, 0, 0.9),
    0 0 80px rgba(10, 80, 50, 0.2);
}

.leather-armrest {
  position: absolute;
  inset: 0;
  border-radius: 240px;
  background: linear-gradient(135deg, #2b1810 0%, #150b07 100%);
  border: 4px solid #3d2112;
  box-shadow: 
    inset 0 4px 8px rgba(255, 255, 255, 0.15),
    inset 0 -6px 14px rgba(0, 0, 0, 0.9);
}

.brass-bezel {
  position: absolute;
  inset: 15px;
  border-radius: 225px;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 50%, #f6e27a 100%);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.table-inner-felt {
  position: absolute;
  inset: 19px;
  border-radius: 221px;
  background: radial-gradient(ellipse at center, #0d5f3a 0%, #083c24 70%, #032114 100%);
  border: 2px solid rgba(0, 0, 0, 0.6);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.8);
}

/* 牌桌中央 */
.board-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  z-index: 2;
}

.felt-watermark {
  position: absolute;
  top: -44px;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.15;
  pointer-events: none;
}

.wm-suit { font-size: 18px; color: #d4af37; }
.wm-text { font-size: 13px; letter-spacing: 4px; color: #d4af37; font-weight: 900; }

.waiting-human-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.75);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 8px 20px;
  border-radius: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
}

.waiting-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.waiting-hint {
  font-size: 11px;
  color: #94a3b8;
  margin: 3px 0 6px;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #38bdf8;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  padding: 3px 9px;
  border-radius: 10px;
  cursor: pointer;
}

.pot-box {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 4px 18px;
  border-radius: 18px;
  display: flex;
  gap: 8px;
  align-items: center;
}

.pot-lbl { font-size: 10px; color: #94a3b8; }
.pot-val { font-size: 14px; }

.community-cards {
  display: flex;
  gap: 8px;
}

.card-slot {
  width: 56px;
  height: 80px;
}

.poker-card {
  width: 100%;
  height: 100%;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 5px 12px rgba(0, 0, 0, 0.45);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
}

.card-corner {
  position: absolute;
  font-size: 10px;
  line-height: 1.1;
  text-align: center;
}

.card-corner.top { top: 3px; left: 4px; }
.card-corner.btm { bottom: 3px; right: 4px; transform: rotate(180deg); }
.card-center { font-size: 20px; }

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
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

/* 座位分布 */
.table-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

.seat-pos-0 { bottom: -16px; left: 50%; transform: translateX(-50%); }
.seat-pos-1 { bottom: 45px; left: 35px; }
.seat-pos-2 { top: 45px; left: 35px; }
.seat-pos-3 { top: -16px; left: 50%; transform: translateX(-50%); }
.seat-pos-4 { top: 45px; right: 35px; }
.seat-pos-5 { bottom: 45px; right: 35px; }

.seat-badge {
  background: rgba(15, 23, 42, 0.92);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 28px;
  padding: 3px 12px 3px 3px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.6);
  position: relative;
}

.table-seat.is-active .seat-badge {
  border-color: #facc15;
  box-shadow: 0 0 18px rgba(250, 204, 21, 0.6);
}

.avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.seat-meta { display: flex; flex-direction: column; }
.seat-name {
  font-size: 11px;
  color: #f8fafc;
  font-weight: 600;
  max-width: 72px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.me-tag { color: #38bdf8; font-size: 10px; }
.seat-chips { font-size: 11px; color: #facc15; }

.dealer-token {
  position: absolute;
  top: -7px;
  right: -7px;
  width: 22px;
  height: 22px;
  background: radial-gradient(circle, #ef4444 0%, #b91c1c 100%);
  color: #fff;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
}

.timer-badge {
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #0f172a;
  border: 1px solid #f59e0b;
  border-radius: 10px;
  padding: 1px 6px;
  font-size: 9px;
  color: #fbbf24;
  display: flex;
  align-items: center;
  gap: 3px;
}

.bet-bubble {
  margin-top: 3px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #f59e0b;
  color: #fef08a;
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 10px;
}

.seat-cards { display: flex; gap: 3px; margin-top: 3px; }
.seat-card { width: 38px; height: 52px; }

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

.back-inner-diamond { color: rgba(255, 255, 255, 0.25); font-size: 14px; }

.hand-rank-tag {
  margin-top: 3px;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #fff;
  font-size: 9px;
  padding: 1px 6px;
  border-radius: 5px;
  font-weight: bold;
}

.host-badge {
  font-size: 13px;
  margin-right: 2px;
  filter: drop-shadow(0 0 4px #fbbf24);
}

.btn-host-start {
  background: linear-gradient(135deg, #f59e0b, #d97706) !important;
  border: 1px solid #fef08a !important;
  color: #1e1b4b !important;
  font-weight: 800;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
}

.btn-host-start:hover {
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 0 18px rgba(245, 158, 11, 0.7);
}

.sit-down-btn {
  background: rgba(15, 23, 42, 0.7);
  border: 1.5px dashed rgba(56, 189, 248, 0.6);
  color: #38bdf8;
  padding: 6px 14px;
  border-radius: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  transition: all 0.2s;
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
  padding: 10px 20px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  min-height: 70px;
}

.console-actions, .console-spectate, .console-waiting {
  display: flex;
  align-items: center;
  gap: 14px;
  width: 100%;
  justify-content: center;
}

.spectate-tip {
  font-size: 13px;
  color: #94a3b8;
}

.btn-arcade {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.15s;
  border: none;
  font-size: 13px;
  white-space: nowrap;
}

.btn-arcade:active { transform: translateY(2px); }

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

.btn-quick-sit {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 0 #047857, 0 6px 14px rgba(16, 185, 129, 0.4);
}

.btn-allin {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #fff;
  box-shadow: 0 4px 0 #9f1239, 0 6px 15px rgba(244, 63, 94, 0.5);
  animation: pulse-glow 2s infinite;
}

/* 加注交互组 */
.raise-control-cluster {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(0, 0, 0, 0.35);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.raise-quick-row {
  display: flex;
  gap: 4px;
}

.btn-quick-chip {
  padding: 2px 7px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 10px;
  cursor: pointer;
}

.btn-quick-chip:hover {
  background: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.raise-slider-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.raise-slider {
  width: 100px;
  accent-color: #f59e0b;
  cursor: pointer;
}

.btn-raise {
  background: #d97706;
  color: #fff;
  box-shadow: 0 3px 0 #92400e;
  padding: 6px 12px;
  font-size: 12px;
}

/* 右侧常驻聊天与战报面板 */
.sidebar-chat-panel {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: rgba(15, 23, 42, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 5;
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-tab {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conn-dot {
  font-size: 11px;
  color: #64748b;
}

.conn-dot.online {
  color: #34d399;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  font-size: 12px;
}

.log-time { color: #64748b; margin-right: 4px; font-size: 10px; }
.log-sender { color: #38bdf8; }
.log-text { color: #cbd5e1; line-height: 1.3; }

.sidebar-footer {
  padding: 8px 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.emoji-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}

.emoji-bar button {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  font-size: 15px;
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.emoji-bar button:hover {
  background: rgba(255, 255, 255, 0.15);
}

.chat-input-row {
  display: flex;
  gap: 6px;
}

.chat-input-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.chat-input-row input:focus {
  border-color: #38bdf8;
}

.btn-send-chat {
  background: #0284c7;
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
}

.btn-send-chat:hover {
  background: #0369a1;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 4px 0 #9f1239, 0 0 15px rgba(244, 63, 94, 0.4); }
  50% { box-shadow: 0 4px 0 #9f1239, 0 0 25px rgba(244, 63, 94, 0.8); }
}
</style>
