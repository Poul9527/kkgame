<template>
  <div class="texas-container">
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
        <span class="stat-value font-arcade text-purple-400">{{ userStore.coins }}</span>
      </div>
    </div>

    <!-- 德州扑克豪华主牌桌 -->
    <div class="texas-table-wrapper">
      <div class="texas-felt">
        <div class="felt-border-ring"></div>

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

        <!-- 玩家 2：顶部 (岩石保本怪) -->
        <div 
          class="seat seat-top"
          :class="[
            { 'is-turn': activePlayerIndex === 2 },
            { 'is-folded': players[2].isFolded }
          ]"
        >
          <div class="seat-head">
            <div class="player-avatar">{{ players[2].avatar }}</div>
            <div class="player-meta">
              <span class="player-name">{{ players[2].name }}</span>
              <span class="player-chips font-arcade">🪙 {{ players[2].chips }}</span>
            </div>
            <div v-if="dealerIndex === 2" class="dealer-btn font-arcade">D</div>
          </div>
          <div class="player-cards">
            <div 
              v-for="(card, i) in players[2].cards" 
              :key="i" 
              class="poker-card small-card"
              :class="{ 
                'revealed': (stage === 'showdown' || stage === 'ended'),
                'is-winning-card': isCardInBestFive(card) && players[2].id === winner?.id 
              }"
            >
              <template v-if="(stage === 'showdown' || stage === 'ended')">
                <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                  {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                </span>
                <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                  {{ getSuitSymbol(card.suit) }}
                </span>
              </template>
              <div v-else class="card-back"></div>
            </div>
          </div>
          <div class="bet-bubble font-arcade" v-if="players[2].currentRoundBet > 0">
            下注: {{ players[2].currentRoundBet }}
          </div>
          <div v-if="(stage === 'showdown' || stage === 'ended') && players[2].evaluatedHand" class="hand-rank-pill" :class="{ 'is-winner': players[2].id === winner?.id }">
            {{ players[2].isFolded ? '已弃牌' : players[2].evaluatedHand.rankName }}
          </div>
        </div>

        <!-- 玩家 1：左侧 (鲨鱼狂客) -->
        <div 
          class="seat seat-left"
          :class="[
            { 'is-turn': activePlayerIndex === 1 },
            { 'is-folded': players[1].isFolded }
          ]"
        >
          <div class="seat-head">
            <div class="player-avatar">{{ players[1].avatar }}</div>
            <div class="player-meta">
              <span class="player-name">{{ players[1].name }}</span>
              <span class="player-chips font-arcade">🪙 {{ players[1].chips }}</span>
            </div>
            <div v-if="dealerIndex === 1" class="dealer-btn font-arcade">D</div>
          </div>
          <div class="player-cards">
            <div 
              v-for="(card, i) in players[1].cards" 
              :key="i" 
              class="poker-card small-card"
              :class="{ 
                'revealed': (stage === 'showdown' || stage === 'ended'),
                'is-winning-card': isCardInBestFive(card) && players[1].id === winner?.id 
              }"
            >
              <template v-if="(stage === 'showdown' || stage === 'ended')">
                <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                  {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                </span>
                <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                  {{ getSuitSymbol(card.suit) }}
                </span>
              </template>
              <div v-else class="card-back"></div>
            </div>
          </div>
          <div class="bet-bubble font-arcade" v-if="players[1].currentRoundBet > 0">
            下注: {{ players[1].currentRoundBet }}
          </div>
          <div v-if="(stage === 'showdown' || stage === 'ended') && players[1].evaluatedHand" class="hand-rank-pill" :class="{ 'is-winner': players[1].id === winner?.id }">
            {{ players[1].isFolded ? '已弃牌' : players[1].evaluatedHand.rankName }}
          </div>
        </div>

        <!-- 玩家 3：右侧 (电话投注站) -->
        <div 
          class="seat seat-right"
          :class="[
            { 'is-turn': activePlayerIndex === 3 },
            { 'is-folded': players[3].isFolded }
          ]"
        >
          <div class="seat-head">
            <div class="player-avatar">{{ players[3].avatar }}</div>
            <div class="player-meta">
              <span class="player-name">{{ players[3].name }}</span>
              <span class="player-chips font-arcade">🪙 {{ players[3].chips }}</span>
            </div>
            <div v-if="dealerIndex === 3" class="dealer-btn font-arcade">D</div>
          </div>
          <div class="player-cards">
            <div 
              v-for="(card, i) in players[3].cards" 
              :key="i" 
              class="poker-card small-card"
              :class="{ 
                'revealed': (stage === 'showdown' || stage === 'ended'),
                'is-winning-card': isCardInBestFive(card) && players[3].id === winner?.id 
              }"
            >
              <template v-if="(stage === 'showdown' || stage === 'ended')">
                <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                  {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
                </span>
                <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                  {{ getSuitSymbol(card.suit) }}
                </span>
              </template>
              <div v-else class="card-back"></div>
            </div>
          </div>
          <div class="bet-bubble font-arcade" v-if="players[3].currentRoundBet > 0">
            下注: {{ players[3].currentRoundBet }}
          </div>
          <div v-if="(stage === 'showdown' || stage === 'ended') && players[3].evaluatedHand" class="hand-rank-pill" :class="{ 'is-winner': players[3].id === winner?.id }">
            {{ players[3].isFolded ? '已弃牌' : players[3].evaluatedHand.rankName }}
          </div>
        </div>

        <!-- 人类玩家：底部 -->
        <div 
          class="seat seat-bottom"
          :class="[
            { 'is-turn': activePlayerIndex === 0 && !players[0].isFolded },
            { 'is-folded': players[0].isFolded }
          ]"
        >
          <!-- 我的 2 张明牌 -->
          <div class="my-cards-box">
            <div 
              v-for="(card, i) in players[0].cards" 
              :key="i" 
              class="poker-card my-card"
              :class="{ 'is-winning-card': isCardInBestFive(card) }"
            >
              <span class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
              </span>
              <span class="card-center-suit" :style="{ color: getSuitColor(card.suit) }">
                {{ getSuitSymbol(card.suit) }}
              </span>
              <span class="card-corner bottom" :style="{ color: getSuitColor(card.suit) }">
                {{ getRankDisplay(card.rank) }}<br>{{ getSuitSymbol(card.suit) }}
              </span>
            </div>

            <!-- 实时手牌评级预估指示 -->
            <div v-if="myEvaluatedHand" class="my-current-rank font-arcade">
              {{ myEvaluatedHand.rankName }}
            </div>
          </div>

          <div class="seat-head me-head">
            <div class="player-avatar">{{ userStore.avatar }}</div>
            <div class="player-meta">
              <span class="player-name">{{ userStore.nickname }} (我)</span>
              <span class="player-chips font-arcade">🪙 {{ userStore.coins }}</span>
            </div>
            <div v-if="dealerIndex === 0" class="dealer-btn font-arcade">D</div>
            <div v-if="players[0].currentRoundBet > 0" class="bet-bubble font-arcade">
              已下: {{ players[0].currentRoundBet }}
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
          <span v-else>跟注 {{ callNeeded }} 🪙</span>
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
    <Modal v-model="showSettleModal" :title="settleTitle" width="580px">
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

        <!-- 主池与边池拆分公示 (若存在多个池或退款) -->
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

        <!-- 4 位选手各自底牌与最终牌型明细 -->
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
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Play, Coins, ShieldAlert, Flame, Loader2, Trophy, AlertCircle, Eye, Crown } from 'lucide-vue-next'
import type { Card, TexasPlayer, TexasStage, EvaluatedTexasHand } from './types'
import { 
  createDeck, shuffleDeck, evaluateBest5OfCards, compareTexasHands, 
  getRankDisplay, getSuitSymbol, getSuitColor, decideTexasAI,
  distributeTexasPot, type SettlementResult, type PotSlice
} from './engine'
import { sound } from '@/utils/soundEngine'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

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

let aiTimer: number | null = null
let nextStageTimer: number | null = null

// 4 位玩家
const players = ref<TexasPlayer[]>([
  {
    id: 'p0',
    name: userStore.nickname,
    avatar: userStore.avatar,
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
    name: '岩石保本怪',
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
    name: '电话投注站',
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

// 获取参与者名称列表辅助函数
const getPlayerNames = (ids: string[]) => {
  return ids.map(id => {
    const p = players.value.find(pl => pl.id === id)
    return p ? (p.isHuman ? '我' : p.name) : id
  }).join(', ')
}

// 保持玩家与 Store 金币持续同步
watch(() => userStore.coins, (val) => {
  if (players.value[0]) {
    players.value[0].chips = val
  }
}, { immediate: true })

// 判断某张牌是否属于赢家最终组成的最佳 5 张牌中
const isCardInBestFive = (card: Card) => {
  if (stage.value !== 'showdown' && stage.value !== 'ended') return false
  if (!winner.value || !winner.value.evaluatedHand) return false
  return winner.value.evaluatedHand.bestFive.some(c => c.suit === card.suit && c.rank === card.rank)
}

// 开始新的一手牌
const startNewHand = () => {
  sound.click()
  if (userStore.coins < bigBlind) {
    userStore.addCoins(100)
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

  // 扣除小盲与大盲 (强制盲注不计入自主行动表态)
  const sbIdx = (dealerIndex.value + 1) % players.value.length
  const bbIdx = (dealerIndex.value + 2) % players.value.length

  postBlind(players.value[sbIdx], smallBlind, '小盲 5')
  postBlind(players.value[bbIdx], bigBlind, '大盲 10')

  players.value[sbIdx].hasActedThisRound = false
  players.value[bbIdx].hasActedThisRound = false

  currentHighestBet.value = bigBlind
  sound.chips()

  // 翻牌前由大盲后一位 (UTG) 先行动
  const utgIdx = (dealerIndex.value + 3) % players.value.length
  setTimeout(() => {
    runTurn(utgIdx)
  }, 600)
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

  // 如果已弃牌或已全下，跳过
  if (curr.isFolded || curr.isAllIn) {
    advanceToNextPlayer()
    return
  }

  if (!curr.isHuman) {
    curr.statusText = '思考中...'
    if (aiTimer) clearTimeout(aiTimer)
    aiTimer = window.setTimeout(() => {
      runAITurn(curr)
    }, 900)
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
      // 只要发生加注，其他存活且未全下的玩家必须重新响应表态
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
    // 过牌
    me.statusText = '过牌'
    me.hasActedThisRound = true
    sound.click()
  } else {
    // 跟注
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
    // 重置其他未弃牌、未全下玩家的表态标志
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

// 人类玩家 All-In 全下
const playerAllIn = () => {
  const me = players.value[0]
  if (userStore.coins <= 0) return

  // 国际德州扑克有效全下规则：
  // 投入的有效筹码上限无需超过场上存活对手能覆盖的最大筹码总量
  const otherActive = activePlayers.value.filter(p => p.id !== me.id)
  const maxOpponentStack = otherActive.length > 0 
    ? Math.max(...otherActive.map(p => p.chips + p.currentRoundBet)) 
    : currentHighestBet.value + bigBlind * 5

  // 确定有效全下所需追加的筹码（至少补齐跟注，至多覆盖对手全量筹码或自身全部资金）
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
  // 规则：所有存活且未全下的玩家都已表态 (hasActedThisRound === true) 且已投入相同注额 (currentRoundBet === currentHighestBet)
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
  while ((players.value[nextIdx].isFolded || players.value[nextIdx].isAllIn) && attempts < 4) {
    nextIdx = (nextIdx + 1) % players.value.length
    attempts++
  }

  if (attempts >= 4) {
    // 没有可以行动的非全下玩家了（所有存活玩家都已全下）
    transitionToNextStage()
  } else {
    runTurn(nextIdx)
  }
}

// 进入下一个街区轮次 (Flop -> Turn -> River -> Showdown)
const transitionToNextStage = () => {
  // 重置每位玩家本轮已下注额及本轮表态状态
  players.value.forEach((p: TexasPlayer) => {
    p.currentRoundBet = 0
    p.hasActedThisRound = false
  })
  currentHighestBet.value = 0

  if (stage.value === 'preflop') {
    // 发 3 张翻牌 (Flop)
    stage.value = 'flop'
    communityCards.value.push(deck[cardIndex++], deck[cardIndex++], deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'flop') {
    // 发第 4 张转牌 (Turn)
    stage.value = 'turn'
    communityCards.value.push(deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'turn') {
    // 发第 5 张河牌 (River)
    stage.value = 'river'
    communityCards.value.push(deck[cardIndex++])
    sound.cardDeal()
  } else if (stage.value === 'river') {
    // 进入最终亮牌阶段
    stage.value = 'showdown'
    doShowdown()
    return
  }

  // 检查是否还有两个以上未全下的玩家能够进行下注
  const nonAllInActive = activePlayers.value.filter((p: TexasPlayer) => !p.isAllIn)
  if (nonAllInActive.length <= 1) {
    // 已经无法进行后续下注（全下冲刺阶段），按节奏自动推进发完剩余公共牌
    if (nextStageTimer) clearTimeout(nextStageTimer)
    nextStageTimer = window.setTimeout(() => {
      transitionToNextStage()
    }, 1200)
    return
  }

  // 正常情况下，从小盲位顺时针寻找第一个活着的、未全下的玩家表态
  let firstIdx = (dealerIndex.value + 1) % players.value.length
  let attempts = 0
  while ((players.value[firstIdx].isFolded || players.value[firstIdx].isAllIn) && attempts < 4) {
    firstIdx = (firstIdx + 1) % players.value.length
    attempts++
  }

  if (nextStageTimer) clearTimeout(nextStageTimer)
  nextStageTimer = window.setTimeout(() => {
    runTurn(firstIdx)
  }, 800)
}

// 摊牌最终比对
const doShowdown = () => {
  sound.reveal()
  stage.value = 'showdown'

  // 计算每人从 7 张牌中选出的最强 5 张（包括弃牌者供复盘对照）
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
  }, 1200)
}

// 宣告胜者及边池切片结算
const declareWinner = (winP: TexasPlayer) => {
  stage.value = 'ended'
  winner.value = winP

  // 保证所有选手手牌已算出
  players.value.forEach((p: TexasPlayer) => {
    if (p.cards.length === 2 && !p.evaluatedHand) {
      p.evaluatedHand = evaluateBest5OfCards([...p.cards, ...communityCards.value])
    }
  })

  // 核心：使用多边池切片算法精确计算底池收益与退款
  const result = distributeTexasPot(players.value, compareTexasHands)
  settlementResult.value = result

  // 向各选手准确分发筹码与退款
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
    // 净赢利获胜
    sound.victory()
    confetti({
      particleCount: 110,
      spread: 90,
      origin: { y: 0.6 }
    })
    gameStore.recordGame('texas', humanPayout)

    // 触发成就判定
    const hand = players.value[0].evaluatedHand
    if (hand) {
      if (hand.rank === 'royal_flush' || hand.rank === 'straight_flush') {
        achievementStore.unlock('texas_royal')
      }
      if (hand.rank === 'full_house' || hand.rank === 'four_of_a_kind') {
        achievementStore.unlock('texas_fullhouse')
      }
    }
    if (players.value[0].isAllIn) {
      achievementStore.unlock('texas_allin')
    }
  } else if (humanPayout > 0) {
    // 收回部分或平局退款
    sound.chips()
    gameStore.recordGame('texas', humanPayout)
  } else {
    sound.gameover()
    gameStore.recordGame('texas', 0)
  }

  setTimeout(() => {
    showSettleModal.value = true
  }, 1200)
}

const settleTitle = computed(() => {
  return winner.value?.isHuman ? '🏆 赢得对局！' : '♠️ 牌局终盘结算'
})

onMounted(() => {
  startNewHand()
})

onUnmounted(() => {
  if (aiTimer) clearTimeout(aiTimer)
  if (nextStageTimer) clearTimeout(nextStageTimer)
})
</script>

<style scoped>
.texas-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding: 12px 20px;
  border-radius: 16px;
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

/* 德州扑克牌桌 */
.texas-table-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10.5;
  max-height: 560px;
  border-radius: 130px;
  background: radial-gradient(circle, #0e2a47 0%, #08192b 80%, #030a12 100%);
  border: 14px solid #4a3319;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.85), 0 24px 48px rgba(0, 0, 0, 0.75);
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.texas-felt {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 110px;
  border: 2px dashed rgba(56, 189, 248, 0.3);
}

.felt-border-ring {
  position: absolute;
  inset: 14px;
  border-radius: 95px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

/* 中央公共区域 */
.community-board {
  position: absolute;
  top: 46%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 5;
}

.pot-display-box {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.7);
  border: 1.5px solid #fbbf24;
  padding: 4px 16px;
  border-radius: 20px;
  box-shadow: 0 0 16px rgba(251, 191, 36, 0.4);
}

.pot-tag {
  font-size: 0.7rem;
  color: #fbbf24;
  font-weight: 800;
}

.pot-amount {
  font-size: 1.25rem;
  font-weight: 900;
  color: #fff;
}

.community-cards-row {
  display: flex;
  gap: 8px;
}

.comm-card-slot {
  width: 52px;
  height: 74px;
}

.empty-card-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  border: 1.5px dashed rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
}

/* 席位定位 */
.seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 10;
  transition: all 0.25s;
}

.seat.is-folded {
  opacity: 0.4;
  filter: grayscale(80%);
}

.seat-head {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.88);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 14px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
  position: relative;
}

.seat.is-turn .seat-head {
  border-color: #38bdf8;
  box-shadow: 0 0 18px rgba(56, 189, 248, 0.8);
  animation: pulseGlow 1.8s infinite;
}

.player-avatar {
  font-size: 1.5rem;
}

.player-meta {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
}

.player-chips {
  font-size: 0.72rem;
  color: #fbbf24;
}

.dealer-btn {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #ffffff;
  color: #0f172a;
  font-weight: 900;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.6);
  border: 1.5px solid #f59e0b;
}

.bet-bubble {
  position: absolute;
  top: -24px;
  background: rgba(245, 158, 11, 0.95);
  color: #0f172a;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

.hand-rank-pill {
  margin-top: 4px;
  background: rgba(6, 182, 212, 0.9);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

/* 各方位 */
.seat-top {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.seat-left {
  left: 14px;
  top: 44%;
  transform: translateY(-50%);
}

.seat-right {
  right: 14px;
  top: 44%;
  transform: translateY(-50%);
}

.seat-bottom {
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  flex-direction: column-reverse;
}

.me-head {
  margin-top: 6px;
  padding: 6px 14px;
}

/* 扑克牌渲染 */
.player-cards {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.my-cards-box {
  display: flex;
  gap: 8px;
  position: relative;
}

.poker-card {
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.small-card {
  width: 36px;
  height: 52px;
}

.comm-card {
  width: 52px;
  height: 74px;
  border-radius: 8px;
}

.my-card {
  width: 60px;
  height: 86px;
  border-radius: 8px;
  border: 1.5px solid rgba(255, 255, 255, 0.3);
  transition: transform 0.2s;
}

.my-card:hover {
  transform: translateY(-6px);
}

.is-winning-card {
  box-shadow: 0 0 16px #fbbf24;
  border: 2px solid #fbbf24;
  animation: pulseGlow 1.5s infinite;
}

.card-back {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: repeating-linear-gradient(
    45deg,
    #1e3a8a,
    #1e3a8a 6px,
    #172554 6px,
    #172554 12px
  );
  border: 1.5px solid #93c5fd;
}

.card-corner {
  position: absolute;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.card-corner.top {
  top: 4px;
  left: 4px;
}

.card-corner.bottom {
  bottom: 4px;
  right: 4px;
  transform: rotate(180deg);
}

.card-center-suit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
}

.my-current-rank {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(245, 158, 11, 0.95);
  color: #0f172a;
  font-weight: 800;
  font-size: 0.72rem;
  padding: 2px 10px;
  border-radius: 10px;
  white-space: nowrap;
}

/* 控制底栏 */
.action-console {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 20px;
  border-radius: 16px;
}

.console-actions {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.btn-start {
  padding: 12px 30px;
  font-size: 1rem;
}

.raise-cluster {
  display: flex;
  gap: 6px;
}

.btn-raise {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  padding: 8px 14px;
  font-size: 0.85rem;
}

.btn-allin {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
}

.console-actions.waiting {
  color: var(--text-muted);
}

/* 全景亮牌结算弹窗 */
.settle-summary-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.winner-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1.5px solid rgba(251, 191, 36, 0.4);
  padding: 12px 18px;
  border-radius: 14px;
}

.winner-banner.is-human-winner {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(16, 185, 129, 0.15));
  border-color: #fbbf24;
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.25);
}

.winner-trophy {
  display: flex;
  align-items: center;
  justify-content: center;
}

.winner-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.winner-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
}

.winner-sub {
  font-size: 0.88rem;
  color: var(--text-muted);
}

.section-tag {
  font-size: 0.72rem;
  color: var(--text-dim);
  letter-spacing: 1px;
  margin-bottom: 6px;
  display: block;
}

.settle-comm-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.35);
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.settle-comm-row {
  display: flex;
  gap: 8px;
}

.settle-mini-card {
  width: 42px;
  height: 60px;
  border-radius: 6px;
  background: #fff;
  position: relative;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
}

.settle-mini-card .card-corner {
  font-size: 0.65rem;
  top: 2px;
  left: 3px;
}

.settle-mini-card .card-center-suit {
  font-size: 1.15rem;
}

.settle-players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.settle-player-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 12px;
  border-radius: 10px;
  transition: all 0.2s;
}

.settle-player-row.is-winner-row {
  background: rgba(245, 158, 11, 0.15);
  border-color: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.2);
}

.settle-player-row.is-folded-row {
  opacity: 0.55;
}

.settle-p-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 130px;
}

.settle-p-avatar {
  font-size: 1.5rem;
}

.settle-p-text {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.settle-p-name {
  font-size: 0.85rem;
  font-weight: 700;
  color: #fff;
}

.settle-p-tag {
  font-size: 0.7rem;
  font-weight: 700;
}

.settle-p-tag.winner {
  color: #fbbf24;
}

.settle-p-tag.folded {
  color: #94a3b8;
}

.settle-p-tag.loss {
  color: #64748b;
}

.settle-p-cards {
  display: flex;
  gap: 6px;
}

.settle-p-hand {
  min-width: 140px;
  text-align: right;
}

.hand-badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.7);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.settle-slices-section {
  background: rgba(0, 0, 0, 0.4);
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px dashed rgba(251, 191, 36, 0.3);
}

.slices-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.slice-item {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 10px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slice-header {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 0.75rem;
}

.slice-title {
  color: #94a3b8;
}

.slice-amt {
  font-weight: 800;
}

.slice-winner-text {
  color: #cbd5e1;
  font-size: 0.7rem;
}

.settle-coin-diff {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 4px;
  font-size: 0.75rem;
}

.win-coins {
  color: #34d399;
  font-weight: 800;
}

.loss-coins {
  color: #f87171;
  font-weight: 700;
}

.refund-badge {
  color: #38bdf8;
  font-size: 0.68rem;
}

.settle-p-tag.refund {
  color: #38bdf8;
}

.modal-footer-btns {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

@media (max-width: 768px) {
  .texas-table-wrapper {
    aspect-ratio: 16 / 13;
    border-radius: 60px;
  }
  .comm-card-slot {
    width: 38px;
    height: 54px;
  }
  .comm-card {
    width: 38px;
    height: 54px;
  }
  .my-card {
    width: 44px;
    height: 64px;
  }
}
</style>
