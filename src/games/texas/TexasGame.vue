<template>
  <div class="texas-container">
    <!-- 顶部玩法模式切换栏 -->
    <div class="texas-mode-bar glass-panel">
      <div class="mode-tabs">
        <button 
          class="mode-tab" 
          :class="{ active: playMode === 'multiplayer' }"
          @click="playMode = 'multiplayer'"
        >
          <Users class="w-4 h-4 text-cyan-400" />
          <span>🌐 真人对决 (在线联机 - 纯真人无BOT)</span>
          <span class="live-pill">实时真人</span>
        </button>
        <button 
          class="mode-tab" 
          :class="{ active: playMode === 'single' }"
          @click="playMode = 'single'"
        >
          <Bot class="w-4 h-4 text-emerald-400" />
          <span>🤖 单机人机练手 (离线AI配置)</span>
        </button>
      </div>
    </div>

    <!-- 多人在线模式 -->
    <MultiplayerTexas v-if="playMode === 'multiplayer'" :initial-room-id="routeRoomId" />

    <!-- 单机人机练习模式 -->
    <div v-else class="single-player-view">
      <!-- AI 练习模式控制面板 -->
      <div class="bot-control-toolbar glass-panel">
        <div class="toolbar-section">
          <span class="toolbar-title font-arcade">👥 牌桌席位 ({{ players.length }}/6 人):</span>
          <div class="btn-group">
            <button 
              class="toolbar-btn" 
              :disabled="players.length >= 6 || isHandInProgress"
              @click="addBot"
              title="增加一名电脑AI牌手"
            >
              <UserPlus class="w-3.5 h-3.5 text-emerald-400" />
              <span>+ 增加AI</span>
            </button>
            <button 
              class="toolbar-btn" 
              :disabled="players.length <= 2 || isHandInProgress"
              @click="removeBot"
              title="减少一名电脑AI牌手"
            >
              <UserMinus class="w-3.5 h-3.5 text-rose-400" />
              <span>- 减少AI</span>
            </button>
          </div>
        </div>

        <div class="toolbar-section">
          <span class="toolbar-title font-arcade">⚡ 节奏:</span>
          <div class="speed-chips">
            <button 
              class="speed-btn" 
              :class="{ active: speedMultiplier === 1 }"
              @click="speedMultiplier = 1"
            >
              1x 正常
            </button>
            <button 
              class="speed-btn" 
              :class="{ active: speedMultiplier === 2 }"
              @click="speedMultiplier = 2"
            >
              2x 快速
            </button>
            <button 
              class="speed-btn" 
              :class="{ active: speedMultiplier === 3 }"
              @click="speedMultiplier = 3"
            >
              3x 极速
            </button>
          </div>
        </div>

        <div class="toolbar-section">
          <button class="toolbar-btn refill-btn" @click="refillHumanCoins">
            <Coins class="w-3.5 h-3.5 text-amber-400" />
            <span>+2000 练习金币</span>
          </button>
        </div>
      </div>

      <!-- 顶部状态栏 -->
      <div class="game-dashboard glass-panel">
        <div class="stat-card">
          <span class="stat-label">总底池</span>
          <span class="stat-value font-arcade text-amber-400">🪙 {{ pot }}</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">阶段进程</span>
          <span class="stat-value font-arcade text-cyan-400">{{ stageName }}</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">盲注级别</span>
          <span class="stat-value font-arcade text-emerald-400">SB: {{ smallBlind }} / BB: {{ bigBlind }}</span>
        </div>

        <div class="stat-card">
          <span class="stat-label">我的金币</span>
          <span class="stat-value font-arcade text-purple-400">🪙 {{ userStore.coins }}</span>
        </div>
      </div>

      <!-- 德州扑克豪华主牌桌 -->
      <div class="texas-table-wrapper">
        <div class="texas-felt">
          <!-- 豪华皮质扶手外圈 -->
          <div class="leather-armrest"></div>
          <!-- 黄铜内饰边框 -->
          <div class="brass-bezel"></div>
          <!-- 祖母绿桌布内芯 -->
          <div class="felt-inner">
            <!-- 暗纹水印 -->
            <div class="felt-watermark">
              <span class="wm-suit">♠</span>
              <span class="wm-text font-arcade">KK POKER CLUB</span>
              <span class="wm-suit">♠</span>
            </div>

            <!-- 牌桌中央公共区域 (5张公共牌 + 底池) -->
            <div class="community-board">
              <div class="pot-display-box font-arcade">
                <span class="pot-tag">POT</span>
                <span class="pot-amount">🪙 {{ pot }}</span>
              </div>

              <!-- 5 张公共牌槽位 -->
              <div class="community-cards-row">
                <div 
                  v-for="(card, i) in 5" 
                  :key="i" 
                  class="comm-card-slot"
                >
                  <transition name="card-flip">
                    <div 
                      v-if="communityCards[i]" 
                      class="poker-card comm-card"
                      :class="{ 'is-winning-card': isCardInBestFive(communityCards[i]) }"
                    >
                      <span class="card-corner top" :style="{ color: getSuitColor(communityCards[i].suit) }">
                        {{ getRankDisplay(communityCards[i].rank) }}<br>{{ getSuitSymbol(communityCards[i].suit) }}
                      </span>
                      <span class="card-center-suit" :style="{ color: getSuitColor(communityCards[i].suit) }">
                        {{ getSuitSymbol(communityCards[i].suit) }}
                      </span>
                      <span class="card-corner bottom" :style="{ color: getSuitColor(communityCards[i].suit) }">
                        {{ getRankDisplay(communityCards[i].rank) }}<br>{{ getSuitSymbol(communityCards[i].suit) }}
                      </span>
                    </div>
                    <div v-else class="empty-card-placeholder">
                      <span class="placeholder-dot"></span>
                    </div>
                  </transition>
                </div>
              </div>
            </div>

            <!-- 动态渲染 2~6 位玩家席位 -->
            <div 
              v-for="(p, pIdx) in players" 
              :key="p.id"
              class="seat"
              :class="[
                getSeatPositionClass(pIdx, players.length),
                { 'is-turn': activePlayerIndex === pIdx && !p.isFolded && (stage !== 'idle' && stage !== 'ended' && stage !== 'showdown') },
                { 'is-folded': p.isFolded },
                { 'is-human': p.isHuman }
              ]"
            >
              <!-- 玩家状态头部 -->
              <div class="seat-head" :class="{ 'me-head': p.isHuman }">
                <div class="player-avatar">{{ p.avatar }}</div>
                <div class="player-meta">
                  <div class="player-name-row">
                    <span class="player-name">{{ p.name }}</span>
                    <span v-if="!p.isHuman" class="bot-badge" :title="p.personality">
                      {{ getPersonalityBadge(p.personality) }}
                    </span>
                  </div>
                  <span class="player-chips font-arcade">🪙 {{ p.isHuman ? userStore.coins : p.chips }}</span>
                </div>
                <!-- 庄家标志 -->
                <div v-if="dealerIndex === pIdx" class="dealer-btn font-arcade">D</div>
              </div>

              <!-- 玩家手牌 (2 张) -->
              <div class="player-cards">
                <div 
                  v-for="(card, ci) in (p.cards.length ? p.cards : 2)" 
                  :key="ci" 
                  class="poker-card small-card"
                  :class="{ 
                    'revealed': p.isHuman || (stage === 'showdown' || stage === 'ended'),
                    'is-winning-card': (stage === 'showdown' || stage === 'ended') && typeof card === 'object' && isCardInBestFive(card) && p.id === winner?.id 
                  }"
                >
                  <template v-if="(p.isHuman || stage === 'showdown' || stage === 'ended') && typeof card === 'object' && card.rank > 0">
                    <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                      {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                    </span>
                    <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                      {{ getSuitSymbol(card.suit) }}
                    </span>
                    <span class="card-corner bottom" :style="{ color: getSuitColor(card.suit) }">
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

              <!-- 下注与状态气泡 -->
              <div class="bet-bubble font-arcade" v-if="p.currentRoundBet > 0">
                下注: 🪙 {{ p.currentRoundBet }}
              </div>
              <div class="status-bubble font-arcade" v-else-if="p.statusText">
                {{ p.statusText }}
              </div>

              <!-- 实时手牌评级预估 (本人) 或摊牌最终牌型 (电脑) -->
              <div v-if="p.isHuman && myEvaluatedHand && stage !== 'idle'" class="hand-rank-pill font-arcade">
                {{ myEvaluatedHand.rankName }}
              </div>
              <div v-else-if="(stage === 'showdown' || stage === 'ended') && p.evaluatedHand" class="hand-rank-pill" :class="{ 'is-winner': p.id === winner?.id }">
                {{ p.isFolded ? '已弃牌' : p.evaluatedHand.rankName }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 底部操作控制台 -->
      <div class="action-console glass-panel">
        <!-- 准备/下一局 -->
        <div v-if="stage === 'idle' || stage === 'ended'" class="console-actions">
          <button v-if="stage === 'ended'" class="btn-arcade btn-secondary" @click="showSettleModal = true">
            <Eye class="w-4 h-4" />
            <span>查看亮牌明细</span>
          </button>
          <button class="btn-arcade btn-primary btn-start" @click="startNewHand">
            <Play class="w-5 h-5 fill-current" />
            <span>发牌开局 (盲注 {{ smallBlind }}/{{ bigBlind }})</span>
          </button>
        </div>

        <!-- 轮到玩家行动 -->
        <div v-else-if="activePlayerIndex === 0 && !players[0].isFolded" class="console-actions">
          <!-- 弃牌 -->
          <button class="btn-arcade btn-danger" @click="playerFold">
            <ShieldAlert class="w-4 h-4" />
            <span>弃牌</span>
          </button>

          <!-- 过牌 / 跟注 -->
          <button 
            class="btn-arcade btn-primary" 
            @click="playerCheckOrCall"
          >
            <Coins class="w-4 h-4" />
            <span v-if="callNeeded === 0">过牌 (Check)</span>
            <span v-else>跟注 🪙 {{ callNeeded }}</span>
          </button>

          <!-- 快捷加注栏 -->
          <div class="raise-cluster">
            <button 
              class="btn-arcade btn-raise" 
              @click="playerRaise(bigBlind * 2)"
              :disabled="userStore.coins < callNeeded + bigBlind * 2"
            >
              +{{ bigBlind * 2 }}
            </button>
            <button 
              class="btn-arcade btn-raise" 
              @click="playerRaise(Math.max(bigBlind * 2, Math.floor(pot * 0.5)))"
              :disabled="userStore.coins < callNeeded + Math.max(bigBlind * 2, Math.floor(pot * 0.5))"
            >
              1/2 底池
            </button>
            <button 
              class="btn-arcade btn-raise" 
              @click="playerRaise(Math.max(bigBlind * 2, pot))"
              :disabled="userStore.coins < callNeeded + Math.max(bigBlind * 2, pot)"
            >
              满底池
            </button>
          </div>

          <!-- 孤注一掷 All-In -->
          <button class="btn-arcade btn-allin" @click="playerAllIn">
            <Flame class="w-4 h-4" />
            <span>ALL IN 全下</span>
          </button>
        </div>

        <!-- AI 思考中 -->
        <div v-else class="console-actions waiting">
          <Loader2 class="w-5 h-5 animate-spin text-cyan-400" />
          <span class="font-arcade text-slate-300">轮到 {{ players[activePlayerIndex]?.name }} 权衡决策中...</span>
        </div>
      </div>

      <!-- 全量亮牌结算与复盘弹窗 -->
      <Modal v-model="showSettleModal" :title="settleTitle" width="600px">
        <div class="settle-summary-modal">
          <!-- 胜者 Banner -->
          <div class="winner-banner" :class="{ 'is-human-winner': winner?.isHuman }">
            <div class="winner-trophy animate-float">
              <Trophy v-if="winner?.isHuman" class="w-9 h-9 text-amber-400" />
              <Crown v-else class="w-9 h-9 text-amber-400" />
            </div>
            <div class="winner-info">
              <h3 class="winner-title">
                {{ winner?.isHuman ? '恭喜您斩获整张底池！' : `${winner?.name} 拿下底池` }}
              </h3>
              <span class="winner-sub font-arcade">
                总底池金币: <b class="text-amber-400 font-bold">+{{ lastEarnedCoins }} 🪙</b>
              </span>
            </div>
          </div>

          <!-- 5 张公共牌回顾 -->
          <div class="settle-comm-section" v-if="communityCards.length > 0">
            <span class="section-tag font-arcade">COMMUNITY CARDS 公共牌</span>
            <div class="settle-comm-row">
              <div 
                v-for="(card, i) in communityCards" 
                :key="i" 
                class="poker-card settle-mini-card"
                :class="{ 'is-winning-card': isCardInBestFive(card) }"
              >
                <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                  {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                </span>
                <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                  {{ getSuitSymbol(card.suit) }}
                </span>
              </div>
            </div>
          </div>

          <!-- 主池与边池拆分公示 -->
          <div v-if="settlementResult && settlementResult.slices.length > 1" class="settle-slices-section">
            <span class="section-tag font-arcade">POT SLICES 底池与边池明细</span>
            <div class="slices-grid">
              <div 
                v-for="(slice, sidx) in settlementResult.slices" 
                :key="sidx"
                class="slice-item"
              >
                <div class="slice-header">
                  <span class="slice-title">{{ slice.name }}</span>
                  <span class="slice-amt font-arcade text-amber-400">🪙 {{ slice.amount }}</span>
                </div>
                <div class="slice-winner-text text-xs">
                  分配: <b class="text-white">{{ getPlayerNames(slice.winnerPlayerIds) }}</b>
                </div>
              </div>
            </div>
          </div>

          <!-- 选手各自底牌与最终牌型明细 -->
          <div class="settle-players-list">
            <span class="section-tag font-arcade">SHOWDOWN HANDS 选手底牌与终盘结算</span>
            <div 
              v-for="p in players" 
              :key="p.id" 
              class="settle-player-row"
              :class="{
                'is-winner-row': (settlementResult?.payouts[p.id] || 0) > p.totalHandBet,
                'is-folded-row': p.isFolded,
                'is-me-row': p.isHuman
              }"
            >
              <!-- 选手信息 -->
              <div class="settle-p-info">
                <span class="settle-p-avatar">{{ p.avatar }}</span>
                <div class="settle-p-text">
                  <span class="settle-p-name">
                    {{ p.name }} <span v-if="p.isHuman" class="text-cyan-400 text-xs">(我)</span>
                  </span>
                  <span class="settle-p-tag winner" v-if="(settlementResult?.payouts[p.id] || 0) > p.totalHandBet">👑 净赢底池</span>
                  <span class="settle-p-tag refund" v-else-if="(settlementResult?.payouts[p.id] || 0) > 0">💰 收回部分</span>
                  <span class="settle-p-tag folded" v-else-if="p.isFolded">已弃牌</span>
                  <span class="settle-p-tag loss" v-else>未胜出</span>
                </div>
              </div>

              <!-- 2 张底牌 -->
              <div class="settle-p-cards">
                <div 
                  v-for="(card, ci) in p.cards" 
                  :key="ci" 
                  class="poker-card settle-mini-card"
                  :class="{ 'is-winning-card': isCardInBestFive(card) && (settlementResult?.payouts[p.id] || 0) > p.totalHandBet }"
                >
                  <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                    {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                  </span>
                  <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                    {{ getSuitSymbol(card.suit) }}
                  </span>
                </div>
              </div>

              <!-- 最佳 5 张牌型与筹码变动 -->
              <div class="settle-p-hand">
                <span class="hand-badge font-arcade" :class="{ 'highlight': (settlementResult?.payouts[p.id] || 0) > p.totalHandBet }">
                  {{ p.evaluatedHand?.rankName || (p.isFolded ? '已弃牌' : '高牌') }}
                </span>
                <div v-if="settlementResult" class="settle-coin-diff font-arcade">
                  <span v-if="(settlementResult.payouts[p.id] || 0) > 0" class="win-coins">
                    +{{ settlementResult.payouts[p.id] }} 🪙
                  </span>
                  <span v-else class="loss-coins">
                    -{{ p.totalHandBet }} 🪙
                  </span>
                  <span v-if="settlementResult.uncalledRefunds[p.id]" class="refund-badge">
                    (退款 {{ settlementResult.uncalledRefunds[p.id] }})
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <template #footer>
          <div class="modal-footer-btns">
            <button class="btn-arcade btn-secondary" @click="showSettleModal = false">
              留在桌面复盘
            </button>
            <button class="btn-arcade btn-primary" @click="startNewHand">
              再来一手
            </button>
          </div>
        </template>
      </Modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Play, Coins, ShieldAlert, Flame, Loader2, Trophy, Eye, Crown, Users, Bot, UserPlus, UserMinus } from 'lucide-vue-next'
import MultiplayerTexas from './MultiplayerTexas.vue'
import type { Card, TexasPlayer, TexasStage } from './types'
import { 
  createDeck, shuffleDeck, evaluateBest5OfCards, compareTexasHands, 
  getRankDisplay, getSuitSymbol, getSuitColor, decideTexasAI,
  distributeTexasPot, type SettlementResult
} from './engine'
import { sound } from '@/utils/soundEngine'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const route = useRoute()
const playMode = ref<'multiplayer' | 'single'>(route.query.mode === 'single' ? 'single' : 'multiplayer')
const routeRoomId = computed(() => (route.query.room as string) || 'room_beginner')

const userStore = useUserStore()
const gameStore = useGameStore()
const achievementStore = useAchievementStore()

const smallBlind = 5
const bigBlind = 10

const pot = ref(0)
const stage = ref<TexasStage>('idle')
const dealerIndex = ref(0)
const activePlayerIndex = ref(0)
const currentHighestBet = ref(0)

const communityCards = ref<Card[]>([])
const showSettleModal = ref(false)
const winner = ref<TexasPlayer | null>(null)
const lastEarnedCoins = ref(0)
const settlementResult = ref<SettlementResult | null>(null)

// 速度倍率与延迟
const speedMultiplier = ref<1 | 2 | 3>(1)
const aiDelay = computed(() => {
  if (speedMultiplier.value === 3) return 200
  if (speedMultiplier.value === 2) return 500
  return 900
})

let aiTimer: number | null = null
let nextStageTimer: number | null = null

// 可供选配的 AI 库
const botCandidates = [
  { name: '鲨鱼狂客', avatar: '🦈', personality: 'shark' as const },
  { name: '保本岩石', avatar: '🗿', personality: 'rock' as const },
  { name: '电话站', avatar: '📞', personality: 'station' as const },
  { name: 'GTO大师', avatar: '🧠', personality: 'master' as const },
  { name: '牛仔杰克', avatar: '🤠', personality: 'shark' as const }
]

// 初始 4 位玩家 (1 人类 + 3 电脑)
const players = ref<TexasPlayer[]>([
  {
    id: 'p0',
    name: userStore.nickname || '我',
    avatar: userStore.avatar || '😎',
    chips: userStore.coins,
    cards: [],
    isFolded: false,
    isAllIn: false,
    hasActedThisRound: false,
    currentRoundBet: 0,
    totalHandBet: 0,
    isHuman: true,
    position: 'btn'
  },
  {
    id: 'p1',
    name: '鲨鱼狂客',
    avatar: '🦈',
    chips: 1200,
    cards: [],
    isFolded: false,
    isAllIn: false,
    hasActedThisRound: false,
    currentRoundBet: 0,
    totalHandBet: 0,
    isHuman: false,
    personality: 'shark',
    position: 'sb'
  },
  {
    id: 'p2',
    name: '保本岩石',
    avatar: '🗿',
    chips: 1200,
    cards: [],
    isFolded: false,
    isAllIn: false,
    hasActedThisRound: false,
    currentRoundBet: 0,
    totalHandBet: 0,
    isHuman: false,
    personality: 'rock',
    position: 'bb'
  },
  {
    id: 'p3',
    name: '电话站',
    avatar: '📞',
    chips: 1200,
    cards: [],
    isFolded: false,
    isAllIn: false,
    hasActedThisRound: false,
    currentRoundBet: 0,
    totalHandBet: 0,
    isHuman: false,
    personality: 'station',
    position: 'utg'
  }
])

let deck: Card[] = []
let cardIndex = 0

const isHandInProgress = computed(() => {
  return stage.value !== 'idle' && stage.value !== 'ended'
})

// 增加电脑牌手
function addBot() {
  if (players.value.length >= 6 || isHandInProgress.value) return
  const nextIdx = players.value.length
  const candidate = botCandidates[nextIdx % botCandidates.length]
  players.value.push({
    id: `bot_${Date.now()}_${nextIdx}`,
    name: `${candidate.name} #${nextIdx}`,
    avatar: candidate.avatar,
    chips: 1200,
    cards: [],
    isFolded: false,
    isAllIn: false,
    hasActedThisRound: false,
    currentRoundBet: 0,
    totalHandBet: 0,
    isHuman: false,
    personality: candidate.personality,
    position: 'mp'
  })
}

// 减少电脑牌手
function removeBot() {
  if (players.value.length <= 2 || isHandInProgress.value) return
  players.value.pop()
}

// 补充练习筹码
function refillHumanCoins() {
  userStore.addCoins(2000)
  players.value[0].chips = userStore.coins
  sound.chips()
}

// 获取人格徽章文本
function getPersonalityBadge(personality?: string) {
  switch (personality) {
    case 'shark': return '🦈激进'
    case 'rock': return '🗿紧凶'
    case 'station': return '📞跟注'
    case 'master': return '🧠大师'
    default: return 'AI'
  }
}

// 动态计算不同人数下的座位布局 CSS 类
function getSeatPositionClass(idx: number, total: number): string {
  if (idx === 0) return 'seat-pos-bottom' // 本人
  if (total === 2) return 'seat-pos-top'
  if (total === 3) {
    return idx === 1 ? 'seat-pos-top-left' : 'seat-pos-top-right'
  }
  if (total === 4) {
    if (idx === 1) return 'seat-pos-left'
    if (idx === 2) return 'seat-pos-top'
    return 'seat-pos-right'
  }
  if (total === 5) {
    if (idx === 1) return 'seat-pos-bottom-left'
    if (idx === 2) return 'seat-pos-top-left'
    if (idx === 3) return 'seat-pos-top-right'
    return 'seat-pos-bottom-right'
  }
  // 6 人标准桌
  if (idx === 1) return 'seat-pos-bottom-left'
  if (idx === 2) return 'seat-pos-top-left'
  if (idx === 3) return 'seat-pos-top'
  if (idx === 4) return 'seat-pos-top-right'
  return 'seat-pos-bottom-right'
}

// 存活（未弃牌）玩家
const activePlayers = computed(() => {
  return players.value.filter((p: TexasPlayer) => !p.isFolded)
})

// 人类需要补齐的跟注差额
const callNeeded = computed(() => {
  return Math.max(0, currentHighestBet.value - players.value[0].currentRoundBet)
})

// 我的实时 7 选 5 手牌预估
const myEvaluatedHand = computed(() => {
  if (players.value[0].cards.length === 0) return null
  const all = [...players.value[0].cards, ...communityCards.value]
  return evaluateBest5OfCards(all)
})

const stageName = computed(() => {
  const map: Record<TexasStage, string> = {
    idle: '准备发牌',
    preflop: '翻牌前 (Pre-Flop)',
    flop: '翻牌圈 (Flop)',
    turn: '转牌圈 (Turn)',
    river: '河牌圈 (River)',
    showdown: '摊牌结算 (Showdown)',
    ended: '对局结算'
  }
  return map[stage.value] || ''
})

const settleTitle = computed(() => {
  return winner.value?.isHuman ? '🎉 牌局获胜！' : '🃏 对局结束'
})

const getPlayerNames = (ids: string[]) => {
  return ids.map(id => {
    const p = players.value.find(pl => pl.id === id)
    return p ? (p.isHuman ? '我' : p.name) : id
  }).join(', ')
}

watch(() => userStore.coins, (val) => {
  if (players.value[0]) {
    players.value[0].chips = val
  }
}, { immediate: true })

const isCardInBestFive = (card: Card) => {
  if (stage.value !== 'showdown' && stage.value !== 'ended') return false
  if (!winner.value || !winner.value.evaluatedHand) return false
  return winner.value.evaluatedHand.bestFive.some(c => c.suit === card.suit && c.rank === card.rank)
}

// 开始新的一手牌
const startNewHand = () => {
  sound.click()
  if (userStore.coins < bigBlind) {
    userStore.addCoins(200)
  }

  // 补充电脑 AI 筹码
  players.value.forEach((p: TexasPlayer) => {
    if (!p.isHuman && p.chips < bigBlind * 2) {
      p.chips = 1200
    }
  })

  // 重置桌面状态
  stage.value = 'preflop'
  pot.value = 0
  communityCards.value = []
  winner.value = null
  showSettleModal.value = false
  settlementResult.value = null

  // 轮转庄家位 D
  dealerIndex.value = (dealerIndex.value + 1) % players.value.length

  // 洗牌
  deck = shuffleDeck(createDeck())
  cardIndex = 0

  // 发底牌
  players.value.forEach((p: TexasPlayer) => {
    p.cards = [deck[cardIndex++], deck[cardIndex++]]
    p.isFolded = false
    p.isAllIn = false
    p.hasActedThisRound = false
    p.currentRoundBet = 0
    p.totalHandBet = 0
    p.evaluatedHand = undefined
    p.statusText = ''
    if (p.isHuman) {
      p.chips = userStore.coins
    }
  })

  sound.cardDeal()

  // 扣除小盲与大盲
  let sbIdx: number
  let bbIdx: number
  let firstActIdx: number

  if (players.value.length === 2) {
    // 单挑 (Heads Up): 庄家为小盲并先表态，非庄为大盲
    sbIdx = dealerIndex.value
    bbIdx = (dealerIndex.value + 1) % 2
    firstActIdx = sbIdx
  } else {
    // 多人: SB = D+1, BB = D+2, UTG = D+3
    sbIdx = (dealerIndex.value + 1) % players.value.length
    bbIdx = (dealerIndex.value + 2) % players.value.length
    firstActIdx = (dealerIndex.value + 3) % players.value.length
  }

  postBlind(players.value[sbIdx], smallBlind, '小盲 5')
  postBlind(players.value[bbIdx], bigBlind, '大盲 10')

  players.value[sbIdx].hasActedThisRound = false
  players.value[bbIdx].hasActedThisRound = false

  currentHighestBet.value = bigBlind
  sound.chips()

  setTimeout(() => {
    runTurn(firstActIdx)
  }, aiDelay.value)
}

const postBlind = (p: TexasPlayer, amount: number, label: string) => {
  if (p.isHuman) {
    userStore.spendCoins(amount)
    p.chips = userStore.coins
  } else {
    p.chips = Math.max(0, p.chips - amount)
  }
  p.currentRoundBet = amount
  p.totalHandBet = amount
  pot.value += amount
  p.statusText = label
}

// 轮流行动推进
const runTurn = (idx: number) => {
  activePlayerIndex.value = idx
  const curr = players.value[idx]

  if (curr.isFolded || curr.isAllIn) {
    advanceToNextPlayer()
    return
  }

  if (!curr.isHuman) {
    curr.statusText = '思考中...'
    if (aiTimer) clearTimeout(aiTimer)
    aiTimer = window.setTimeout(() => {
      runAITurn(curr)
    }, aiDelay.value)
  }
}

// AI 做出行动
const runAITurn = (ai: TexasPlayer) => {
  if (ai.isFolded || ai.isAllIn) return

  const action = decideTexasAI(ai, communityCards.value, currentHighestBet.value, pot.value, bigBlind)

  if (action.type === 'check') {
    ai.statusText = '过牌'
    ai.hasActedThisRound = true
    sound.click()
  } else if (action.type === 'call') {
    const cost = Math.min(ai.chips, action.amount)
    ai.chips -= cost
    ai.currentRoundBet += cost
    ai.totalHandBet += cost
    pot.value += cost
    if (ai.chips === 0) ai.isAllIn = true
    ai.statusText = `跟注 ${cost}`
    ai.hasActedThisRound = true
    sound.chips()
  } else if (action.type === 'raise') {
    const totalBet = currentHighestBet.value + action.amount
    const needPay = totalBet - ai.currentRoundBet
    const actualPay = Math.min(ai.chips, needPay)
    ai.chips -= actualPay
    ai.currentRoundBet += actualPay
    ai.totalHandBet += actualPay
    pot.value += actualPay
    if (ai.chips === 0) ai.isAllIn = true

    if (ai.currentRoundBet > currentHighestBet.value) {
      currentHighestBet.value = ai.currentRoundBet
      players.value.forEach((p: TexasPlayer) => {
        if (p.id !== ai.id && !p.isFolded && !p.isAllIn) {
          p.hasActedThisRound = false
        }
      })
    }
    ai.statusText = ai.isAllIn ? '加注 All-In 🔥' : `加注至 ${ai.currentRoundBet}`
    ai.hasActedThisRound = true
    sound.chips()
  } else if (action.type === 'allin') {
    const actualPay = ai.chips
    ai.chips = 0
    ai.currentRoundBet += actualPay
    ai.totalHandBet += actualPay
    pot.value += actualPay
    ai.isAllIn = true

    if (ai.currentRoundBet > currentHighestBet.value) {
      currentHighestBet.value = ai.currentRoundBet
      players.value.forEach((p: TexasPlayer) => {
        if (p.id !== ai.id && !p.isFolded && !p.isAllIn) {
          p.hasActedThisRound = false
        }
      })
    }
    ai.statusText = 'ALL IN 🔥'
    ai.hasActedThisRound = true
    sound.victory()
  } else if (action.type === 'fold') {
    ai.isFolded = true
    ai.hasActedThisRound = true
    ai.statusText = '弃牌'
    sound.fold()
  }

  advanceToNextPlayer()
}

// 人类玩家过牌 / 跟注
const playerCheckOrCall = () => {
  const me = players.value[0]
  const diff = callNeeded.value

  if (diff === 0) {
    me.statusText = '过牌'
    me.hasActedThisRound = true
    sound.click()
  } else {
    const pay = Math.min(userStore.coins, diff)
    if (!userStore.spendCoins(pay)) {
      sound.gameover()
      return
    }
    me.currentRoundBet += pay
    me.totalHandBet += pay
    pot.value += pay
    me.chips = userStore.coins
    if (userStore.coins === 0) me.isAllIn = true
    me.hasActedThisRound = true
    me.statusText = me.isAllIn ? '跟注 All-in 🔥' : `跟注 ${pay}`
    sound.chips()
  }

  advanceToNextPlayer()
}

// 人类玩家加注
const playerRaise = (raiseAmount: number) => {
  const me = players.value[0]
  const totalNeed = callNeeded.value + raiseAmount
  const pay = Math.min(userStore.coins, totalNeed)

  if (!userStore.spendCoins(pay)) {
    sound.gameover()
    return
  }

  me.currentRoundBet += pay
  me.totalHandBet += pay
  pot.value += pay
  me.chips = userStore.coins
  if (userStore.coins === 0) me.isAllIn = true

  if (me.currentRoundBet > currentHighestBet.value) {
    currentHighestBet.value = me.currentRoundBet
    players.value.forEach((p: TexasPlayer) => {
      if (p.id !== me.id && !p.isFolded && !p.isAllIn) {
        p.hasActedThisRound = false
      }
    })
  }

  me.hasActedThisRound = true
  me.statusText = me.isAllIn ? '加注 All-in 🔥' : `加注至 ${me.currentRoundBet}`
  sound.chips()

  advanceToNextPlayer()
}

// 人类玩家 All-In
const playerAllIn = () => {
  const me = players.value[0]
  if (userStore.coins <= 0) return

  const otherActive = activePlayers.value.filter(p => p.id !== me.id)
  const maxOpponentStack = otherActive.length > 0 
    ? Math.max(...otherActive.map(p => p.chips + p.currentRoundBet)) 
    : currentHighestBet.value + bigBlind * 5

  const targetBet = Math.max(currentHighestBet.value + bigBlind, maxOpponentStack)
  const needed = Math.max(callNeeded.value, targetBet - me.currentRoundBet)
  const actualBet = Math.min(userStore.coins, needed)

  userStore.spendCoins(actualBet)
  me.currentRoundBet += actualBet
  me.totalHandBet += actualBet
  pot.value += actualBet
  me.chips = userStore.coins
  me.isAllIn = true

  if (me.currentRoundBet > currentHighestBet.value) {
    currentHighestBet.value = me.currentRoundBet
    players.value.forEach((p: TexasPlayer) => {
      if (p.id !== me.id && !p.isFolded && !p.isAllIn) {
        p.hasActedThisRound = false
      }
    })
  }

  me.hasActedThisRound = true
  me.statusText = 'ALL IN 🔥'
  sound.victory()

  advanceToNextPlayer()
}

// 人类玩家弃牌
const playerFold = () => {
  players.value[0].isFolded = true
  players.value[0].hasActedThisRound = true
  players.value[0].statusText = '弃牌'
  sound.fold()

  advanceToNextPlayer()
}

// 推进行动权或进入下一街区
const advanceToNextPlayer = () => {
  // 1. 若只剩 1 位未弃牌玩家，提前获胜
  if (activePlayers.value.length === 1) {
    declareWinner(activePlayers.value[0])
    return
  }

  // 2. 检查本轮下注是否已完全结束
  const nonAllInPlayers = activePlayers.value.filter((p: TexasPlayer) => !p.isAllIn)
  const isRoundComplete = nonAllInPlayers.every((p: TexasPlayer) => {
    return p.hasActedThisRound && p.currentRoundBet === currentHighestBet.value
  })

  if (isRoundComplete) {
    transitionToNextStage()
    return
  }

  // 3. 顺时针寻找下一位需要表态的玩家 (未弃牌且未全下)
  let nextIdx = (activePlayerIndex.value + 1) % players.value.length
  let attempts = 0
  while ((players.value[nextIdx].isFolded || players.value[nextIdx].isAllIn) && attempts < players.value.length) {
    nextIdx = (nextIdx + 1) % players.value.length
    attempts++
  }

  if (attempts >= players.value.length) {
    // 所有存活玩家均已全下
    transitionToNextStage()
  } else {
    runTurn(nextIdx)
  }
}

// 进入下一个街区轮次
const transitionToNextStage = () => {
  players.value.forEach((p: TexasPlayer) => {
    p.currentRoundBet = 0
    p.hasActedThisRound = false
  })
  currentHighestBet.value = 0

  if (stage.value === 'preflop') {
    stage.value = 'flop'
    communityCards.value.push(deck[cardIndex++], deck[cardIndex++], deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'flop') {
    stage.value = 'turn'
    communityCards.value.push(deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'turn') {
    stage.value = 'river'
    communityCards.value.push(deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'river') {
    stage.value = 'showdown'
    doShowdown()
    return
  }

  const nonAllInActive = activePlayers.value.filter((p: TexasPlayer) => !p.isAllIn)
  if (nonAllInActive.length <= 1) {
    if (nextStageTimer) clearTimeout(nextStageTimer)
    nextStageTimer = window.setTimeout(() => {
      transitionToNextStage()
    }, aiDelay.value * 1.5)
    return
  }

  // 翻牌后由小盲位(或单挑非庄位)顺时针第一个活着的玩家表态
  const firstSeat = players.value.length === 2 
    ? (dealerIndex.value + 1) % 2 
    : (dealerIndex.value + 1) % players.value.length

  let firstIdx = firstSeat
  let attempts = 0
  while ((players.value[firstIdx].isFolded || players.value[firstIdx].isAllIn) && attempts < players.value.length) {
    firstIdx = (firstIdx + 1) % players.value.length
    attempts++
  }

  if (nextStageTimer) clearTimeout(nextStageTimer)
  nextStageTimer = window.setTimeout(() => {
    runTurn(firstIdx)
  }, aiDelay.value)
}

// 摊牌最终比对
const doShowdown = () => {
  sound.reveal()
  stage.value = 'showdown'

  players.value.forEach((p: TexasPlayer) => {
    if (p.cards.length === 2) {
      p.evaluatedHand = evaluateBest5OfCards([...p.cards, ...communityCards.value])
    }
  })

  const alive = activePlayers.value
  let best = alive[0]
  for (let i = 1; i < alive.length; i++) {
    const cmp = compareTexasHands(alive[i].evaluatedHand!, best.evaluatedHand!)
    if (cmp > 0) {
      best = alive[i]
    }
  }

  setTimeout(() => {
    declareWinner(best)
  }, aiDelay.value * 1.5)
}

// 宣告胜者及边池结算
const declareWinner = (winP: TexasPlayer) => {
  stage.value = 'ended'
  winner.value = winP

  players.value.forEach((p: TexasPlayer) => {
    if (p.cards.length === 2 && !p.evaluatedHand) {
      p.evaluatedHand = evaluateBest5OfCards([...p.cards, ...communityCards.value])
    }
  })

  const result = distributeTexasPot(players.value, compareTexasHands)
  settlementResult.value = result

  players.value.forEach((p: TexasPlayer) => {
    const payout = result.payouts[p.id] || 0
    if (p.isHuman) {
      if (payout > 0) {
        userStore.addCoins(payout)
      }
      p.chips = userStore.coins
    } else {
      p.chips += payout
    }
  })

  const humanPayout = result.payouts[players.value[0].id] || 0
  lastEarnedCoins.value = humanPayout

  if (humanPayout > players.value[0].totalHandBet) {
    sound.victory()
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 }
    })
    gameStore.recordGame('texas', humanPayout)

    const hand = players.value[0].evaluatedHand
    if (hand) {
      if (hand.rank === 'royal_flush' || hand.rank === 'straight_flush') {
        achievementStore.unlock('texas_royal')
      }
    }
  }

  showSettleModal.value = true
}

onUnmounted(() => {
  if (aiTimer) clearTimeout(aiTimer)
  if (nextStageTimer) clearTimeout(nextStageTimer)
})
</script>

<style scoped>
.texas-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background: radial-gradient(circle at center, #0b1324 0%, #030712 100%);
  user-select: none;
  overflow: hidden;
}

/* 顶部模式切换 */
.texas-mode-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  z-index: 20;
}

.mode-tabs {
  display: flex;
  gap: 12px;
}

.mode-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-tab.active {
  background: rgba(6, 182, 212, 0.15);
  border-color: #06b6d4;
  color: #38bdf8;
  box-shadow: 0 0 14px rgba(6, 182, 212, 0.3);
}

.live-pill {
  font-size: 10px;
  background: #ef4444;
  color: #fff;
  padding: 1px 5px;
  border-radius: 4px;
}

/* 单机人机练习视图 */
.single-player-view {
  display: flex;
  flex-direction: column;
  flex: 1;
  position: relative;
  overflow: hidden;
}

/* Bot 管理控制工具栏 */
.bot-control-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 18px;
  background: rgba(15, 23, 42, 0.7);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 12px;
}

.toolbar-section {
  display: flex;
  align-items: center;
  gap: 10px;
}

.toolbar-title {
  color: #94a3b8;
}

.btn-group {
  display: flex;
  gap: 6px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.refill-btn {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fbbf24;
}

.speed-chips {
  display: flex;
  gap: 4px;
}

.speed-btn {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
}

.speed-btn.active {
  background: #0284c7;
  color: #fff;
  border-color: #38bdf8;
}

/* 顶部状态仪表板 */
.game-dashboard {
  display: flex;
  justify-content: space-around;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 11px;
  color: #64748b;
}

.stat-value {
  font-size: 14px;
  font-weight: bold;
}

/* 主牌桌包裹层 */
.texas-table-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  position: relative;
}

.texas-felt {
  width: 920px;
  height: 510px;
  border-radius: 255px;
  position: relative;
  box-shadow: 
    0 30px 60px -10px rgba(0, 0, 0, 0.9),
    0 0 100px rgba(10, 80, 50, 0.2);
}

.leather-armrest {
  position: absolute;
  inset: 0;
  border-radius: 255px;
  background: linear-gradient(135deg, #2b1810 0%, #150b07 100%);
  border: 4px solid #3d2112;
  box-shadow: 
    inset 0 4px 8px rgba(255, 255, 255, 0.15),
    inset 0 -6px 14px rgba(0, 0, 0, 0.9);
}

.brass-bezel {
  position: absolute;
  inset: 16px;
  border-radius: 239px;
  background: linear-gradient(135deg, #d4af37 0%, #aa7c11 50%, #f6e27a 100%);
  box-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
}

.felt-inner {
  position: absolute;
  inset: 20px;
  border-radius: 235px;
  background: radial-gradient(ellipse at center, #0d5f3a 0%, #083c24 70%, #032114 100%);
  border: 2px solid rgba(0, 0, 0, 0.6);
  box-shadow: inset 0 0 80px rgba(0, 0, 0, 0.8);
}

.felt-watermark {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.15;
  pointer-events: none;
}

.wm-suit { font-size: 20px; color: #d4af37; }
.wm-text { font-size: 14px; letter-spacing: 4px; color: #d4af37; font-weight: 900; }

/* 牌桌中央公共牌 */
.community-board {
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

.pot-display-box {
  background: rgba(0, 0, 0, 0.65);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 4px 22px;
  border-radius: 20px;
  display: flex;
  gap: 8px;
  align-items: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

.pot-tag { font-size: 11px; color: #94a3b8; }
.pot-amount { font-size: 15px; color: #facc15; font-weight: bold; }

.community-cards-row {
  display: flex;
  gap: 10px;
}

.comm-card-slot {
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
.card-corner.bottom { bottom: 4px; right: 5px; transform: rotate(180deg); }
.card-center-suit { font-size: 22px; }

.empty-card-placeholder {
  width: 100%;
  height: 100%;
  border: 1.5px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
}

.is-winning-card {
  box-shadow: 0 0 16px #facc15, inset 0 0 8px #facc15 !important;
  border: 2px solid #facc15 !important;
}

/* 动态席位坐标 */
.seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

.seat-pos-bottom { bottom: -18px; left: 50%; transform: translateX(-50%); }
.seat-pos-top { top: -18px; left: 50%; transform: translateX(-50%); }
.seat-pos-left { top: 50%; left: 30px; transform: translateY(-50%); }
.seat-pos-right { top: 50%; right: 30px; transform: translateY(-50%); }
.seat-pos-top-left { top: 45px; left: 50px; }
.seat-pos-top-right { top: 45px; right: 50px; }
.seat-pos-bottom-left { bottom: 45px; left: 50px; }
.seat-pos-bottom-right { bottom: 45px; right: 50px; }

.seat-head {
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

.seat.is-turn .seat-head {
  border-color: #facc15;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.65);
}

.seat.is-folded {
  opacity: 0.45;
  filter: grayscale(0.8);
}

.player-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  border: 2px solid rgba(255, 255, 255, 0.15);
}

.player-meta {
  display: flex;
  flex-direction: column;
}

.player-name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.player-name {
  font-size: 12px;
  color: #f8fafc;
  font-weight: 600;
  max-width: 75px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bot-badge {
  font-size: 9px;
  background: rgba(56, 189, 248, 0.2);
  color: #38bdf8;
  padding: 1px 4px;
  border-radius: 4px;
}

.player-chips {
  font-size: 12px;
  color: #facc15;
}

.dealer-btn {
  position: absolute;
  top: -8px;
  right: -8px;
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
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.6);
}

.player-cards {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.small-card {
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

.bet-bubble, .status-bubble {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid #f59e0b;
  color: #fef08a;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
}

.hand-rank-pill {
  margin-top: 4px;
  background: linear-gradient(135deg, #0284c7, #0369a1);
  color: #fff;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 6px;
  font-weight: bold;
}

.hand-rank-pill.is-winner {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fef08a;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
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

.console-actions {
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

.btn-start {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  box-shadow: 0 4px 0 #047857, 0 6px 15px rgba(16, 185, 129, 0.4);
}

.btn-allin {
  background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%);
  color: #fff;
  box-shadow: 0 4px 0 #9f1239, 0 6px 15px rgba(244, 63, 94, 0.5);
  animation: pulse-glow 2s infinite;
}

.raise-cluster {
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

.btn-raise:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
  border-color: #38bdf8;
}

.btn-raise:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 结算复盘弹窗内部 */
.settle-summary-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.winner-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
}

.winner-banner.is-human-winner {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.winner-title {
  font-size: 16px;
  font-weight: bold;
  color: #fff;
}

.section-tag {
  font-size: 11px;
  color: #94a3b8;
  margin-bottom: 6px;
  display: block;
}

.settle-comm-row {
  display: flex;
  gap: 8px;
}

.settle-mini-card {
  width: 44px;
  height: 62px;
}

.slices-grid {
  display: flex;
  gap: 10px;
}

.slice-item {
  flex: 1;
  background: rgba(0, 0, 0, 0.35);
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.slice-header {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.settle-player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 6px;
}

.settle-player-row.is-winner-row {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.3);
}

.settle-player-row.is-me-row {
  border-left: 3px solid #38bdf8;
}

.settle-p-info {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 140px;
}

.settle-p-avatar {
  font-size: 20px;
}

.settle-p-name {
  font-size: 13px;
  color: #fff;
  font-weight: 600;
}

.settle-p-cards {
  display: flex;
  gap: 6px;
}

.settle-p-hand {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.hand-badge {
  font-size: 11px;
  color: #94a3b8;
}

.hand-badge.highlight {
  color: #facc15;
  font-weight: bold;
}

.win-coins { color: #34d399; font-weight: bold; }
.loss-coins { color: #f87171; }

.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
