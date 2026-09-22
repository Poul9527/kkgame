<template>
  <div class="zhajinhua-container">
    <!-- 顶部状态栏 -->
    <div class="game-dashboard glass-panel">
      <div class="stat-card">
        <span class="stat-label">公共底池</span>
        <span class="stat-value font-arcade text-amber-400">🪙 {{ pot }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">当前轮数</span>
        <span class="stat-value font-arcade text-cyan-400">第 {{ currentRound }} / {{ maxRounds }} 轮</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">基础底注</span>
        <span class="stat-value font-arcade text-emerald-400">{{ baseBet }} 闷 / {{ baseBet * 2 }} 明</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">我的金币</span>
        <span class="stat-value font-arcade text-purple-400">{{ userStore.coins }}</span>
      </div>
    </div>

    <!-- 豪华扑克牌桌 -->
    <div class="poker-table-wrapper" :class="{ 'pk-mode-active': isSelectingPkTarget }">
      <div class="poker-felt">
        <!-- 牌桌内边缘金边与纹理 -->
        <div class="felt-inner-ring"></div>

        <!-- 牌桌中央底池筹码堆 -->
        <div class="table-center-pot">
          <div class="chips-stack">
            <span class="chip-item c-1">🪙</span>
            <span class="chip-item c-2">🪙</span>
            <span class="chip-item c-3">🪙</span>
          </div>
          <div class="pot-badge font-arcade">
            <span class="pot-title">TOTAL POT</span>
            <span class="pot-num">{{ pot }}</span>
          </div>
          <div v-if="isSelectingPkTarget" class="pk-hint-banner animate-pulse-glow">
            <span>⚡ 请点击选择一个对手进行比牌！ ⚡</span>
          </div>
        </div>

        <!-- AI 玩家 2：顶部 (激进狂徒) -->
        <div 
          class="seat seat-top" 
          :class="[
            { 'is-turn': activePlayerIndex === 2 },
            { 'is-folded': players[2].isFolded },
            { 'can-pk': isSelectingPkTarget && canBePkTarget(players[2]) }
          ]"
          @click="selectPkTarget(players[2])"
        >
          <div class="seat-player-box">
            <div class="player-avatar">{{ players[2].avatar }}</div>
            <div class="player-info">
              <span class="player-name">{{ players[2].name }}</span>
              <span class="player-coins font-arcade">🪙 {{ players[2].coins }}</span>
            </div>
            <div v-if="players[2].statusText" class="status-bubble">{{ players[2].statusText }}</div>
          </div>
          <!-- 3张暗牌 -->
          <div class="cards-row">
            <div 
              v-for="(card, i) in players[2].cards" 
              :key="i" 
              class="poker-card"
              :class="{ 'card-revealed': isShowdown && !players[2].isFolded }"
            >
              <template v-if="isShowdown && !players[2].isFolded">
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
          <div v-if="isShowdown && !players[2].isFolded && players[2].evaluatedHand" class="hand-type-tag">
            {{ players[2].evaluatedHand.typeName }}
          </div>
        </div>

        <!-- AI 玩家 1：左侧 (稳健大师) -->
        <div 
          class="seat seat-left"
          :class="[
            { 'is-turn': activePlayerIndex === 1 },
            { 'is-folded': players[1].isFolded },
            { 'can-pk': isSelectingPkTarget && canBePkTarget(players[1]) }
          ]"
          @click="selectPkTarget(players[1])"
        >
          <div class="seat-player-box">
            <div class="player-avatar">{{ players[1].avatar }}</div>
            <div class="player-info">
              <span class="player-name">{{ players[1].name }}</span>
              <span class="player-coins font-arcade">🪙 {{ players[1].coins }}</span>
            </div>
            <div v-if="players[1].statusText" class="status-bubble">{{ players[1].statusText }}</div>
          </div>
          <div class="cards-row">
            <div 
              v-for="(card, i) in players[1].cards" 
              :key="i" 
              class="poker-card"
              :class="{ 'card-revealed': isShowdown && !players[1].isFolded }"
            >
              <template v-if="isShowdown && !players[1].isFolded">
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
          <div v-if="isShowdown && !players[1].isFolded && players[1].evaluatedHand" class="hand-type-tag">
            {{ players[1].evaluatedHand.typeName }}
          </div>
        </div>

        <!-- AI 玩家 3：右侧 (冷面雀圣) -->
        <div 
          class="seat seat-right"
          :class="[
            { 'is-turn': activePlayerIndex === 3 },
            { 'is-folded': players[3].isFolded },
            { 'can-pk': isSelectingPkTarget && canBePkTarget(players[3]) }
          ]"
          @click="selectPkTarget(players[3])"
        >
          <div class="seat-player-box">
            <div class="player-avatar">{{ players[3].avatar }}</div>
            <div class="player-info">
              <span class="player-name">{{ players[3].name }}</span>
              <span class="player-coins font-arcade">🪙 {{ players[3].coins }}</span>
            </div>
            <div v-if="players[3].statusText" class="status-bubble">{{ players[3].statusText }}</div>
          </div>
          <div class="cards-row">
            <div 
              v-for="(card, i) in players[3].cards" 
              :key="i" 
              class="poker-card"
              :class="{ 'card-revealed': isShowdown && !players[3].isFolded }"
            >
              <template v-if="isShowdown && !players[3].isFolded">
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
          <div v-if="isShowdown && !players[3].isFolded && players[3].evaluatedHand" class="hand-type-tag">
            {{ players[3].evaluatedHand.typeName }}
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
          <!-- 我的手牌 (支持点击翻牌) -->
          <div class="my-cards-container" @click="toggleLookCards">
            <div 
              v-for="(card, i) in players[0].cards" 
              :key="i" 
              class="poker-card my-card"
              :class="[
                `card-slot-${i}`,
                { 'card-revealed': players[0].hasSeenCards || isShowdown }
              ]"
            >
              <!-- 牌正面 -->
              <div v-if="players[0].hasSeenCards || isShowdown" class="card-face">
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
              <!-- 牌背面 -->
              <div v-else class="card-back">
                <div class="peek-hint">点我<br>看牌</div>
              </div>
            </div>

            <!-- 手牌类型高亮指示条 -->
            <div v-if="players[0].hasSeenCards && players[0].evaluatedHand" class="my-hand-tag">
              {{ players[0].evaluatedHand.typeName }}
            </div>
          </div>

          <!-- 我的玩家名牌 -->
          <div class="seat-player-box me-box">
            <div class="player-avatar">{{ userStore.avatar }}</div>
            <div class="player-info">
              <span class="player-name">{{ userStore.nickname }} (我)</span>
              <span class="player-coins font-arcade">🪙 {{ userStore.coins }}</span>
            </div>
            <div class="play-mode-pill">
              <span v-if="players[0].isFolded" class="badge-folded">已弃牌</span>
              <span v-else-if="players[0].hasSeenCards" class="badge-seen">已看牌 (明牌)</span>
              <span v-else class="badge-blind">未看牌 (暗注)</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作按钮栏 -->
    <div class="action-dock glass-panel">
      <!-- 等待开始阶段 -->
      <div v-if="stage === 'idle' || stage === 'ended'" class="dock-actions start-actions">
        <button class="btn-arcade btn-primary btn-big" @click="startNewRound">
          <Play class="w-5 h-5 fill-current" />
          <span>开始发牌 (投入底注 {{ ante }} 🪙)</span>
        </button>
      </div>

      <!-- 比牌目标选择取消按钮 -->
      <div v-else-if="isSelectingPkTarget" class="dock-actions pk-select-actions">
        <button class="btn-arcade btn-secondary" @click="cancelPkTargetSelect">
          取消选择
        </button>
      </div>

      <!-- 轮到人类玩家决策时 -->
      <div v-else-if="activePlayerIndex === 0 && !players[0].isFolded" class="dock-actions ingame-actions">
        <!-- 看牌按钮 -->
        <button 
          v-if="!players[0].hasSeenCards" 
          class="btn-arcade btn-secondary"
          @click="lookCards"
        >
          <Eye class="w-4 h-4" />
          <span>看牌</span>
        </button>

        <!-- 跟注按钮 -->
        <button class="btn-arcade btn-primary" @click="playerCall">
          <Coins class="w-4 h-4" />
          <span>跟注 {{ callAmount }} 🪙</span>
        </button>

        <!-- 加注按钮 -->
        <div class="raise-group">
          <button 
            class="btn-arcade btn-raise" 
            @click="playerRaise(10)"
            :disabled="userStore.coins < callAmount + (players[0].hasSeenCards ? 20 : 10)"
          >
            <TrendingUp class="w-4 h-4" />
            <span>加注 +{{ players[0].hasSeenCards ? 20 : 10 }}</span>
          </button>
          <button 
            class="btn-arcade btn-raise" 
            @click="playerRaise(20)"
            :disabled="userStore.coins < callAmount + (players[0].hasSeenCards ? 40 : 20)"
          >
            <span>加注 +{{ players[0].hasSeenCards ? 40 : 20 }}</span>
          </button>
        </div>

        <!-- 比牌按钮 (需在第 2 轮之后且场上有至少 2 位存活玩家) -->
        <button 
          class="btn-arcade btn-pk" 
          :disabled="currentRound < 2 || activeOpponents.length === 0"
          @click="startPkSelection"
        >
          <Swords class="w-4 h-4" />
          <span>比牌 ({{ pkCost }} 🪙)</span>
        </button>

        <!-- 弃牌按钮 -->
        <button class="btn-arcade btn-danger" @click="playerFold">
          <ShieldAlert class="w-4 h-4" />
          <span>弃牌</span>
        </button>
      </div>

      <!-- 轮到 AI 行动时 -->
      <div v-else class="dock-actions waiting-actions">
        <div class="waiting-box font-arcade">
          <Loader2 class="w-5 h-5 animate-spin text-cyan-400" />
          <span>等待 {{ players[activePlayerIndex]?.name }} 思考决策中...</span>
        </div>
      </div>
    </div>

    <!-- 1v1 比牌酷炫绝杀弹窗 -->
    <teleport to="body">
      <transition name="pk-zoom">
        <div v-if="activePkDuel" class="pk-overlay">
          <div class="pk-stage">
            <div class="pk-header">
              <span class="pk-title font-arcade">⚡ 绝杀 1V1 比牌对决 ⚡</span>
            </div>

            <div class="pk-combatants">
              <!-- 发起者 -->
              <div class="combatant left" :class="{ 'is-pk-winner': pkResult?.winnerId === activePkDuel.challenger.id, 'is-pk-loser': pkResult?.loserId === activePkDuel.challenger.id }">
                <div class="combatant-avatar">{{ activePkDuel.challenger.avatar }}</div>
                <h3 class="combatant-name">{{ activePkDuel.challenger.name }}</h3>
                <div class="pk-cards">
                  <div class="poker-card pk-card card-revealed" v-if="pkShowCards">
                    <span class="card-corner top" :style="{ color: getSuitColor(activePkDuel.challenger.cards[0].suit) }">
                      {{ getRankDisplay(activePkDuel.challenger.cards[0].rank) }}
                    </span>
                  </div>
                  <div class="poker-card pk-card card-back" v-else></div>
                </div>
                <div v-if="pkResult?.winnerId === activePkDuel.challenger.id" class="result-stamp win font-arcade">WINNER</div>
                <div v-if="pkResult?.loserId === activePkDuel.challenger.id" class="result-stamp lose font-arcade">OUT</div>
              </div>

              <!-- VS 徽章 -->
              <div class="pk-vs font-arcade">
                <Swords class="w-12 h-12 text-rose-500 animate-pulse-glow" />
                <span>VS</span>
              </div>

              <!-- 被挑战者 -->
              <div class="combatant right" :class="{ 'is-pk-winner': pkResult?.winnerId === activePkDuel.target.id, 'is-pk-loser': pkResult?.loserId === activePkDuel.target.id }">
                <div class="combatant-avatar">{{ activePkDuel.target.avatar }}</div>
                <h3 class="combatant-name">{{ activePkDuel.target.name }}</h3>
                <div class="pk-cards">
                  <div class="poker-card pk-card card-revealed" v-if="pkShowCards">
                    <span class="card-corner top" :style="{ color: getSuitColor(activePkDuel.target.cards[0].suit) }">
                      {{ getRankDisplay(activePkDuel.target.cards[0].rank) }}
                    </span>
                  </div>
                  <div class="poker-card pk-card card-back" v-else></div>
                </div>
                <div v-if="pkResult?.winnerId === activePkDuel.target.id" class="result-stamp win font-arcade">WINNER</div>
                <div v-if="pkResult?.loserId === activePkDuel.target.id" class="result-stamp lose font-arcade">OUT</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </teleport>

    <!-- 游戏结算弹窗 -->
    <Modal v-model="showSettleModal" :title="settleTitle" width="420px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="winner?.isHuman" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ winner?.isHuman ? '独揽底池大获全胜！' : `${winner?.name} 摘得底池！` }}</h2>
        <p class="settle-desc">
          赢家牌型：<b class="text-amber-400">{{ winner?.evaluatedHand?.typeName }}</b>
        </p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ winner?.isHuman ? lastEarnedCoins : 0 }} 🪙</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-arcade btn-primary" @click="startNewRound">再开一局</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Play, Eye, Coins, TrendingUp, Swords, ShieldAlert, Loader2, Trophy, AlertCircle } from 'lucide-vue-next'
import type { Card, Player, GameStage, PKDuel } from './types'
import { 
  createDeck, shuffleDeck, evaluateHand, compareHands, 
  getRankDisplay, getSuitSymbol, getSuitColor, decideAIAction 
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

const ante = 10
const baseBet = ref(10)
const pot = ref(0)
const currentRound = ref(1)
const maxRounds = 15
const stage = ref<GameStage>('idle')
const activePlayerIndex = ref(0)
const isSelectingPkTarget = ref(false)
const isShowdown = ref(false)

// 玩家席位
const players = ref<Player[]>([
  {
    id: 'p0',
    name: userStore.nickname,
    avatar: userStore.avatar,
    coins: userStore.coins,
    cards: [],
    hasSeenCards: false,
    isFolded: false,
    isOut: false,
    currentBet: 0,
    isHuman: true
  },
  {
    id: 'p1',
    name: '稳健大师',
    avatar: '🧙‍♂️',
    coins: 1000,
    cards: [],
    hasSeenCards: false,
    isFolded: false,
    isOut: false,
    currentBet: 0,
    isHuman: false,
    personality: 'conservative'
  },
  {
    id: 'p2',
    name: '激进狂徒',
    avatar: '⚡',
    coins: 1000,
    cards: [],
    hasSeenCards: false,
    isFolded: false,
    isOut: false,
    currentBet: 0,
    isHuman: false,
    personality: 'aggressive'
  },
  {
    id: 'p3',
    name: '冷面雀圣',
    avatar: '🕶️',
    coins: 1000,
    cards: [],
    hasSeenCards: false,
    isFolded: false,
    isOut: false,
    currentBet: 0,
    isHuman: false,
    personality: 'calculative'
  }
])

// PK 对决状态
const activePkDuel = ref<PKDuel | null>(null)
const pkResult = ref<{ winnerId: string; loserId: string } | null>(null)
const pkShowCards = ref(false)

// 结算弹窗
const showSettleModal = ref(false)
const winner = ref<Player | null>(null)
const lastEarnedCoins = ref(0)

let aiTimer: number | null = null

// 活跃未弃牌对手
const activeOpponents = computed(() => {
  return players.value.filter((p: Player) => !p.isHuman && !p.isFolded && !p.isOut)
})

// 活跃未弃牌全部玩家
const activePlayers = computed(() => {
  return players.value.filter((p: Player) => !p.isFolded && !p.isOut)
})

// 当前跟注所需金额（看牌双倍，闷牌单倍）
const callAmount = computed(() => {
  const me = players.value[0]
  return me.hasSeenCards ? baseBet.value * 2 : baseBet.value
})

// 比牌所需筹码（比牌需消耗跟注的双倍）
const pkCost = computed(() => {
  return callAmount.value * 2
})

// 能否被选为 PK 对象
const canBePkTarget = (p: Player) => {
  return !p.isHuman && !p.isFolded && !p.isOut
}

// 开始新一局
const startNewRound = () => {
  sound.click()
  if (userStore.coins < ante) {
    userStore.addCoins(100) // 破产补助金
  }

  stage.value = 'dealing'
  currentRound.value = 1
  baseBet.value = 10
  pot.value = 0
  activePlayerIndex.value = 0
  isSelectingPkTarget.value = false
  isShowdown.value = false
  showSettleModal.value = false
  winner.value = null

  // 洗牌并给每位玩家发 3 张手牌
  const deck = shuffleDeck(createDeck())
  let cardIdx = 0

  players.value.forEach((p: Player) => {
    p.cards = [deck[cardIdx++], deck[cardIdx++], deck[cardIdx++]]
    p.evaluatedHand = evaluateHand(p.cards)
    p.hasSeenCards = false
    p.isFolded = false
    p.isOut = false
    p.currentBet = ante
    p.statusText = ''

    // 扣除底注
    if (p.isHuman) {
      userStore.spendCoins(ante)
    } else {
      p.coins = Math.max(10, p.coins - ante)
    }
    pot.value += ante
  })

  sound.cardDeal()
  sound.chips()

  // 发牌完成进入轮流行动
  setTimeout(() => {
    stage.value = 'betting'
    nextTurn(0)
  }, 600)
}

// 人类看牌
const toggleLookCards = () => {
  if (players.value[0].isFolded) return
  if (!players.value[0].hasSeenCards) {
    lookCards()
  }
}

const lookCards = () => {
  sound.cardDeal()
  players.value[0].hasSeenCards = true
  players.value[0].statusText = '已看牌'

  // 检查是否拿到豹子成就
  if (players.value[0].evaluatedHand?.type === 'set') {
    achievementStore.unlock('zhajinhua_set')
  }
}

// 人类跟注
const playerCall = () => {
  const me = players.value[0]
  const amount = callAmount.value
  if (!userStore.spendCoins(amount)) {
    sound.gameover()
    return
  }

  sound.chips()
  me.currentBet += amount
  pot.value += amount
  me.statusText = me.hasSeenCards ? `明跟 ${amount}` : `暗跟 ${amount}`
  advancePlayerTurn()
}

// 人类加注
const playerRaise = (step: number) => {
  const me = players.value[0]
  const raiseStep = me.hasSeenCards ? step * 2 : step
  const totalNeed = callAmount.value + raiseStep

  if (!userStore.spendCoins(totalNeed)) {
    sound.gameover()
    return
  }

  sound.chips()
  baseBet.value += step
  me.currentBet += totalNeed
  pot.value += totalNeed
  me.statusText = `加注至 ${baseBet.value}`
  advancePlayerTurn()
}

// 人类进入比牌目标选择模式
const startPkSelection = () => {
  sound.click()
  isSelectingPkTarget.value = true
}

const cancelPkTargetSelect = () => {
  sound.click()
  isSelectingPkTarget.value = false
}

// 人类选择目标并发起 PK
const selectPkTarget = (target: Player) => {
  if (!isSelectingPkTarget.value || !canBePkTarget(target)) return
  isSelectingPkTarget.value = false

  const me = players.value[0]
  const cost = pkCost.value
  if (!userStore.spendCoins(cost)) {
    sound.gameover()
    return
  }

  sound.chips()
  me.currentBet += cost
  pot.value += cost
  executePK(me, target)
}

// 人类弃牌
const playerFold = () => {
  sound.fold()
  players.value[0].isFolded = true
  players.value[0].statusText = '已弃牌'
  checkRoundEnd()
  advancePlayerTurn()
}

// 执行 1v1 比牌
const executePK = (challenger: Player, target: Player) => {
  stage.value = 'pk'
  activePkDuel.value = {
    challenger,
    target,
    winnerId: '',
    loserId: ''
  }
  pkResult.value = null
  pkShowCards.value = false
  sound.pkClash()

  // 牌型碰撞判定
  const cmp = compareHands(challenger.evaluatedHand!, target.evaluatedHand!)
  const winnerP = cmp > 0 ? challenger : target
  const loserP = cmp > 0 ? target : challenger

  setTimeout(() => {
    pkShowCards.value = true
    pkResult.value = {
      winnerId: winnerP.id,
      loserId: loserP.id
    }

    // 淘汰输者
    loserP.isFolded = true
    loserP.isOut = true
    loserP.statusText = '比牌战败'

    // 成就判定：若人类用单张散牌在 PK 中战胜对手
    if (winnerP.isHuman && challenger.evaluatedHand?.type === 'high_card') {
      achievementStore.unlock('zhajinhua_bluff')
    }

    setTimeout(() => {
      activePkDuel.value = null
      stage.value = 'betting'
      checkRoundEnd()
      advancePlayerTurn()
    }, 1800)
  }, 1000)
}

// 推进轮次与行动权
const advancePlayerTurn = () => {
  if (checkRoundEnd()) return

  let nextIdx = (activePlayerIndex.value + 1) % players.value.length

  // 如果转完一整圈，轮数 +1
  if (nextIdx === 0) {
    currentRound.value++
    if (currentRound.value > maxRounds) {
      forceShowdown()
      return
    }
  }

  // 跳过已经弃牌/出局的玩家
  while (players.value[nextIdx].isFolded || players.value[nextIdx].isOut) {
    nextIdx = (nextIdx + 1) % players.value.length
    if (nextIdx === 0) {
      currentRound.value++
      if (currentRound.value > maxRounds) {
        forceShowdown()
        return
      }
    }
  }

  nextTurn(nextIdx)
}

const nextTurn = (idx: number) => {
  activePlayerIndex.value = idx
  const currPlayer = players.value[idx]

  if (!currPlayer.isHuman) {
    // AI 思考并行动
    currPlayer.statusText = '思考中...'
    if (aiTimer) clearTimeout(aiTimer)
    aiTimer = window.setTimeout(() => {
      runAITurn(currPlayer)
    }, 1100)
  }
}

// AI 行动处理
const runAITurn = (ai: Player) => {
  if (ai.isFolded || ai.isOut) return

  const opponents = players.value.filter((p: Player) => p.id !== ai.id && !p.isFolded && !p.isOut)
  const decision = decideAIAction(ai, baseBet.value, currentRound.value, opponents, 10)

  if (decision.action === 'look') {
    ai.hasSeenCards = true
    ai.statusText = '已看牌'
    sound.cardDeal()
    // 看牌后紧接着下注或弃牌
    setTimeout(() => runAITurn(ai), 800)
    return
  }

  if (decision.action === 'call') {
    const cost = ai.hasSeenCards ? baseBet.value * 2 : baseBet.value
    ai.coins = Math.max(0, ai.coins - cost)
    ai.currentBet += cost
    pot.value += cost
    ai.statusText = ai.hasSeenCards ? `明跟 ${cost}` : `暗跟 ${cost}`
    sound.chips()
    advancePlayerTurn()
    return
  }

  if (decision.action === 'raise') {
    const step = decision.amount
    baseBet.value += step
    const cost = ai.hasSeenCards ? baseBet.value * 2 : baseBet.value
    ai.coins = Math.max(0, ai.coins - cost)
    ai.currentBet += cost
    pot.value += cost
    ai.statusText = `加注至 ${baseBet.value}`
    sound.chips()
    advancePlayerTurn()
    return
  }

  if (decision.action === 'pk') {
    const cost = (ai.hasSeenCards ? baseBet.value * 2 : baseBet.value) * 2
    ai.coins = Math.max(0, ai.coins - cost)
    ai.currentBet += cost
    pot.value += cost
    sound.chips()

    const target = players.value.find((p: Player) => p.id === decision.targetId) || opponents[0]
    ai.statusText = `挑战 ${target.name}`
    executePK(ai, target)
    return
  }

  if (decision.action === 'fold') {
    ai.isFolded = true
    ai.statusText = '已弃牌'
    sound.fold()
    checkRoundEnd()
    advancePlayerTurn()
    return
  }
}

// 检查是否只剩 1 位存活玩家（提前获胜）
const checkRoundEnd = (): boolean => {
  const alive = activePlayers.value
  if (alive.length === 1) {
    declareWinner(alive[0])
    return true
  }
  return false
}

// 满轮开牌比大小
const forceShowdown = () => {
  stage.value = 'showdown'
  isShowdown.value = true
  sound.reveal()

  const alive = activePlayers.value
  let bestPlayer = alive[0]

  for (let i = 1; i < alive.length; i++) {
    const cmp = compareHands(alive[i].evaluatedHand!, bestPlayer.evaluatedHand!)
    if (cmp > 0) {
      bestPlayer = alive[i]
    }
  }

  setTimeout(() => {
    declareWinner(bestPlayer)
  }, 1200)
}

// 宣告本局胜者
const declareWinner = (winP: Player) => {
  stage.value = 'ended'
  isShowdown.value = true
  winner.value = winP
  const winCoins = pot.value
  lastEarnedCoins.value = winCoins

  if (winP.isHuman) {
    sound.victory()
    userStore.addCoins(winCoins)
    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.6 }
    })
    // 记录战绩
    gameStore.recordGame('zhajinhua', winCoins)

    // 大奖成就
    if (winCoins >= 200) {
      achievementStore.unlock('zhajinhua_winner')
    }
  } else {
    sound.gameover()
    winP.coins += winCoins
    gameStore.recordGame('zhajinhua', 0)
  }

  setTimeout(() => {
    showSettleModal.value = true
  }, 1400)
}

const settleTitle = computed(() => {
  return winner.value?.isHuman ? '恭喜通杀大赢！' : '很遗憾，本局告负'
})

onMounted(() => {
  startNewRound()
})

onUnmounted(() => {
  if (aiTimer) clearTimeout(aiTimer)
})
</script>

<style scoped>
.zhajinhua-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 900px;
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

/* 牌桌主体 */
.poker-table-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10.5;
  max-height: 540px;
  border-radius: 120px;
  background: radial-gradient(circle, #0e3b24 0%, #082114 80%, #031009 100%);
  border: 12px solid #5a3818;
  box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.8), 0 20px 40px rgba(0, 0, 0, 0.7);
  padding: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.poker-felt {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 100px;
  border: 2px dashed rgba(245, 158, 11, 0.35);
}

.felt-inner-ring {
  position: absolute;
  inset: 15px;
  border-radius: 85px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  pointer-events: none;
}

/* 牌桌中央底池 */
.table-center-pot {
  position: absolute;
  top: 48%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
}

.chips-stack {
  display: flex;
  gap: -10px;
  margin-bottom: 2px;
}

.chip-item {
  font-size: 1.8rem;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
}

.pot-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.65);
  border: 1.5px solid #fbbf24;
  padding: 4px 16px;
  border-radius: 20px;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.35);
}

.pot-title {
  font-size: 0.65rem;
  color: #fbbf24;
  letter-spacing: 1px;
}

.pot-num {
  font-size: 1.3rem;
  font-weight: 800;
  color: #fff;
}

.pk-hint-banner {
  margin-top: 8px;
  background: rgba(244, 63, 94, 0.85);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
  padding: 3px 12px;
  border-radius: 12px;
  white-space: nowrap;
}

/* 各席位通用 */
.seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 10;
}

.seat-player-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 14px;
  margin-bottom: 6px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.4);
}

.seat.is-turn .seat-player-box {
  border-color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.7);
  animation: pulseGlow 1.8s infinite;
}

.seat.is-folded {
  opacity: 0.45;
  filter: grayscale(80%);
}

.seat.can-pk {
  cursor: pointer;
  animation: pulseGlow 1s infinite;
}

.seat.can-pk .seat-player-box {
  border-color: #f43f5e;
  box-shadow: 0 0 20px #f43f5e;
}

.player-avatar {
  font-size: 1.5rem;
}

.player-info {
  display: flex;
  flex-direction: column;
}

.player-name {
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
}

.player-coins {
  font-size: 0.72rem;
  color: #fbbf24;
}

.status-bubble {
  position: absolute;
  top: -24px;
  background: rgba(6, 182, 212, 0.95);
  color: #0f172a;
  font-weight: 800;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
}

/* 席位绝对定位 */
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

.me-box {
  margin-top: 6px;
  margin-bottom: 0;
  padding: 6px 14px;
}

.play-mode-pill span {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 8px;
}

.badge-blind { background: rgba(59, 130, 246, 0.25); color: #60a5fa; }
.badge-seen { background: rgba(16, 185, 129, 0.25); color: #34d399; }
.badge-folded { background: rgba(239, 68, 68, 0.25); color: #f87171; }

/* 扑克手牌渲染 */
.cards-row {
  display: flex;
  gap: 4px;
}

.my-cards-container {
  display: flex;
  gap: 6px;
  position: relative;
  cursor: pointer;
}

.poker-card {
  width: 44px;
  height: 62px;
  background: #ffffff;
  border-radius: 6px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.5);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.my-card {
  width: 58px;
  height: 82px;
  border-radius: 8px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.my-card:hover {
  transform: translateY(-8px);
}

.card-back {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: repeating-linear-gradient(
    45deg,
    #991b1b,
    #991b1b 6px,
    #7f1d1d 6px,
    #7f1d1d 12px
  );
  border: 2px solid #fef08a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.peek-hint {
  font-size: 0.65rem;
  font-weight: 800;
  color: #fef08a;
  text-align: center;
  line-height: 1.1;
}

.card-face {
  width: 100%;
  height: 100%;
  position: relative;
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

.hand-type-tag, .my-hand-tag {
  background: rgba(245, 158, 11, 0.95);
  color: #0f172a;
  font-weight: 800;
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  margin-top: 4px;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.my-hand-tag {
  position: absolute;
  bottom: -22px;
  left: 50%;
  transform: translateX(-50%);
  white-space: nowrap;
}

/* 控制底栏 */
.action-dock {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 12px 20px;
  border-radius: 16px;
}

.dock-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.btn-big {
  padding: 12px 28px;
  font-size: 1rem;
}

.raise-group {
  display: flex;
  gap: 8px;
}

.btn-raise {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: white;
}

.btn-pk {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.4);
}

.waiting-box {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-muted);
  font-size: 0.95rem;
}

/* 1v1 PK 绝杀弹窗 */
.pk-overlay {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.pk-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.pk-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: #fbbf24;
  text-shadow: 0 0 20px rgba(251, 191, 36, 0.6);
}

.pk-combatants {
  display: flex;
  align-items: center;
  gap: 40px;
}

.combatant {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.15);
  min-width: 140px;
  position: relative;
  transition: all 0.3s;
}

.combatant-avatar {
  font-size: 3rem;
  margin-bottom: 8px;
}

.combatant-name {
  font-size: 1.1rem;
  color: #fff;
  margin-bottom: 14px;
}

.pk-cards .pk-card {
  width: 70px;
  height: 98px;
}

.is-pk-winner {
  border-color: #fbbf24;
  box-shadow: 0 0 35px rgba(251, 191, 36, 0.8);
  transform: scale(1.08);
}

.is-pk-loser {
  opacity: 0.35;
  filter: grayscale(100%);
}

.result-stamp {
  position: absolute;
  top: 40%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(-15deg);
  font-size: 2rem;
  font-weight: 900;
  padding: 4px 16px;
  border-radius: 8px;
}

.result-stamp.win {
  color: #fbbf24;
  border: 3px solid #fbbf24;
}

.result-stamp.lose {
  color: #ef4444;
  border: 3px solid #ef4444;
}

.pk-vs {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 1.8rem;
  font-weight: 900;
  color: #f43f5e;
}

.pk-zoom-enter-active, .pk-zoom-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.pk-zoom-enter-from, .pk-zoom-leave-to {
  opacity: 0;
  transform: scale(0.85);
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

@media (max-width: 768px) {
  .poker-table-wrapper {
    aspect-ratio: 16 / 13;
    border-radius: 60px;
  }
  .poker-card {
    width: 34px;
    height: 48px;
  }
  .my-card {
    width: 44px;
    height: 62px;
  }
  .seat-player-box {
    padding: 3px 8px;
  }
}
</style>
