<template>
  <div class="baque-container">
    <!-- 顶部状态栏 -->
    <div class="game-dashboard glass-panel">
      <div class="stat-card">
        <span class="stat-label">我的金币</span>
        <span class="stat-val font-arcade text-amber-400">🪙 {{ userStore.coins.toLocaleString() }}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">牌库剩余</span>
        <span class="stat-val font-arcade text-cyan-400">🀄️ {{ deck.length }} / 84</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">我已胡牌</span>
        <span class="stat-val font-arcade text-emerald-400">🏆 {{ players[0].huRecords.length }} 次</span>
      </div>
      <div class="stat-card" v-if="players[0].renCount > 0">
        <span class="stat-label">当忍则忍</span>
        <span class="stat-val font-arcade text-rose-400">🔥 {{ players[0].renCount }} 忍 (×{{ players[0].renCount + 1 }})</span>
      </div>
      <div class="stat-card">
        <button class="btn-arcade btn-secondary text-xs px-3 py-1.5" @click="startNewGame" :disabled="stage === 'swap2'">
          重新开局
        </button>
      </div>
    </div>

    <!-- 国潮绿呢麻将八雀牌桌 -->
    <div class="baque-table-wrapper">
      <div class="baque-table">
        <!-- 装饰角落 -->
        <div class="table-corner tl"></div>
        <div class="table-corner tr"></div>
        <div class="table-corner bl"></div>
        <div class="table-corner br"></div>

        <!-- 顶部对手 (Player 2: 地主老财) -->
        <div class="player-seat seat-top" :class="{ 'is-active': activePlayerIndex === 2 }">
          <div class="seat-info">
            <span class="seat-avatar">{{ players[2].avatar }}</span>
            <div class="seat-details">
              <span class="seat-name">{{ players[2].name }}</span>
              <span class="seat-hu-badge" v-if="players[2].huRecords.length > 0">胡 {{ players[2].huRecords.length }}次</span>
              <span class="seat-ren-badge" v-if="players[2].renCount > 0">忍 ×{{ players[2].renCount + 1 }}</span>
            </div>
            <div class="seat-status-bubble" v-if="players[2].statusText">{{ players[2].statusText }}</div>
          </div>
          <div class="seat-hand-tiles top-hand">
            <div v-for="i in players[2].cards.length" :key="i" class="tile-back mini"></div>
          </div>
        </div>

        <!-- 左侧对手 (Player 1: 雀圣阿强) -->
        <div class="player-seat seat-left" :class="{ 'is-active': activePlayerIndex === 1 }">
          <div class="seat-info">
            <span class="seat-avatar">{{ players[1].avatar }}</span>
            <div class="seat-details">
              <span class="seat-name">{{ players[1].name }}</span>
              <span class="seat-hu-badge" v-if="players[1].huRecords.length > 0">胡 {{ players[1].huRecords.length }}次</span>
              <span class="seat-ren-badge" v-if="players[1].renCount > 0">忍 ×{{ players[1].renCount + 1 }}</span>
            </div>
            <div class="seat-status-bubble" v-if="players[1].statusText">{{ players[1].statusText }}</div>
          </div>
          <div class="seat-hand-tiles left-hand">
            <div v-for="i in players[1].cards.length" :key="i" class="tile-back mini"></div>
          </div>
        </div>

        <!-- 右侧对手 (Player 3: 百变仙子) -->
        <div class="player-seat seat-right" :class="{ 'is-active': activePlayerIndex === 3 }">
          <div class="seat-info">
            <span class="seat-avatar">{{ players[3].avatar }}</span>
            <div class="seat-details">
              <span class="seat-name">{{ players[3].name }}</span>
              <span class="seat-hu-badge" v-if="players[3].huRecords.length > 0">胡 {{ players[3].huRecords.length }}次</span>
              <span class="seat-ren-badge" v-if="players[3].renCount > 0">忍 ×{{ players[3].renCount + 1 }}</span>
            </div>
            <div class="seat-status-bubble" v-if="players[3].statusText">{{ players[3].statusText }}</div>
          </div>
          <div class="seat-hand-tiles right-hand">
            <div v-for="i in players[3].cards.length" :key="i" class="tile-back mini"></div>
          </div>
        </div>

        <!-- 中央牌桌核心区 (牌库堆叠与公共弃牌河) -->
        <div class="table-center">
          <div class="deck-pile-visual">
            <div class="deck-stack">
              <div class="deck-layer l3"></div>
              <div class="deck-layer l2"></div>
              <div class="deck-layer l1">🀄️</div>
            </div>
            <span class="deck-count font-arcade">剩 {{ deck.length }} 张</span>
          </div>

          <!-- 牌桌中央全局事件横幅 -->
          <transition name="pop">
            <div v-if="bannerText" class="table-event-banner font-arcade">
              {{ bannerText }}
            </div>
          </transition>

          <!-- 弃牌河 (最近打出的牌) -->
          <div class="discards-pool">
            <span class="pool-title">公共弃牌河</span>
            <div class="pool-cards">
              <div 
                v-for="(card, idx) in recentDiscards" 
                :key="card.id + idx"
                class="discard-mini-card"
                :class="{ 'latest': idx === recentDiscards.length - 1 }"
              >
                <span :style="{ color: getSuitColor(card.suit) }">
                  {{ getRankDisplay(card.rank) }} {{ getSuitSymbol(card.suit) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部我方选手 (Player 0: 玩家本人) -->
        <div class="player-seat seat-bottom" :class="{ 'is-active': activePlayerIndex === 0 }">
          <!-- 听牌提示浮条 -->
          <div v-if="myTingList.length > 0" class="ting-indicator glass-panel">
            <span class="ting-title">🎯 听牌提示:</span>
            <div class="ting-chips">
              <span 
                v-for="(ting, ti) in myTingList" 
                :key="ti" 
                class="ting-chip"
              >
                <b :style="{ color: ting.suit ? getSuitColor(ting.suit) : '#fbbf24' }">
                  {{ ting.rank === 99 ? '百变🃏' : getRankDisplay(ting.rank) + (ting.suit ? getSuitSymbol(ting.suit) : '') }}
                </b>
                <span class="text-xs text-slate-400">({{ ting.handName }} {{ ting.fan }}番)</span>
              </span>
            </div>
          </div>

          <!-- 我的手牌区 -->
          <div class="my-hand-wrapper">
            <div class="my-cards-row">
              <div 
                v-for="(card, ci) in sortedMyCards" 
                :key="card.id"
                class="baque-card"
                :class="{
                  'is-selected': selectedCard?.id === card.id,
                  'is-wild': card.isWild,
                  'is-question': card.isQuestion,
                  'is-extra-eight': card.isExtraEight,
                  'is-drawn': isDrawnCard(card)
                }"
                @click="onSelectCard(card)"
              >
                <!-- 角标点数花色 -->
                <div class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
                  <span class="corner-rank">{{ getRankDisplay(card.rank) }}</span>
                  <span class="corner-suit">{{ getSuitSymbol(card.suit) }}</span>
                </div>

                <!-- 牌面中心特殊标识 -->
                <div class="card-center">
                  <span v-if="card.isWild" class="wild-center-icon">🃏<br><small class="text-[10px] text-amber-400 font-bold">百变</small></span>
                  <span v-else-if="card.isQuestion" class="question-center-icon">❓<br><small class="text-[10px] text-purple-400 font-bold">4选1</small></span>
                  <span v-else-if="card.isExtraEight" class="eight-center-icon">👑 8<br><small class="text-[9px] text-yellow-500 font-bold">八雀</small></span>
                  <span v-else class="normal-center-suit" :style="{ color: getSuitColor(card.suit) }">
                    {{ getSuitSymbol(card.suit) }}
                  </span>
                </div>

                <!-- 底部角标 -->
                <div class="card-corner bottom" :style="{ color: getSuitColor(card.suit) }">
                  <span class="corner-rank">{{ getRankDisplay(card.rank) }}</span>
                  <span class="corner-suit">{{ getSuitSymbol(card.suit) }}</span>
                </div>

                <!-- 新摸入牌标识 -->
                <span v-if="isDrawnCard(card)" class="drawn-tag">摸入</span>
              </div>
            </div>
          </div>

          <!-- 操作台按钮组 -->
          <div class="action-console">
            <!-- 胡牌 / 忍 按钮分支 -->
            <template v-if="activePlayerIndex === 0 && currentHuHand">
              <button class="btn-arcade btn-hu font-arcade" @click="playerHu">
                🀄️ 胡牌！({{ currentHuHand.rankName }} {{ currentHuHand.totalFan * (players[0].renCount + 1) }}番)
              </button>
              <button class="btn-arcade btn-ren font-arcade" @click="playerRen">
                🔥 当忍则忍 (倍数 ×{{ players[0].renCount + 2 }})
              </button>
            </template>

            <!-- 正常打牌或打出问号牌 -->
            <template v-if="activePlayerIndex === 0 && players[0].cards.length === 8">
              <button 
                v-if="selectedCard?.isQuestion"
                class="btn-arcade btn-question font-arcade"
                @click="playSelectedCard"
              >
                ❓ 打出问号牌 (触发4选1)
              </button>
              <button 
                v-else
                class="btn-arcade btn-discard font-arcade"
                :disabled="!selectedCard"
                @click="playSelectedCard"
              >
                打出所选牌 ({{ selectedCard ? getRankDisplay(selectedCard.rank) + getSuitSymbol(selectedCard.suit) : '请选牌' }})
              </button>
            </template>

            <div v-else-if="activePlayerIndex !== 0" class="waiting-hint font-arcade">
              ⏳ 轮到 {{ players[activePlayerIndex].name }} 摸打思考中...
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 开局换两张弹窗 -->
    <Modal v-model="showSwapModal" title="🀄️ 开局换两张·优化手牌" width="540px" :show-close="false">
      <div class="swap-modal-content">
        <p class="swap-tip">
          请从你的起手 7 张手牌中挑选 <b>2 张无用废牌</b>，与对手随机互换！
        </p>
        <div class="swap-cards-grid">
          <div 
            v-for="card in players[0].cards" 
            :key="card.id"
            class="baque-card mini"
            :class="{ 'is-selected': swapSelectedIds.includes(card.id) }"
            @click="toggleSwapSelect(card.id)"
          >
            <div class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
              {{ getRankDisplay(card.rank) }}{{ getSuitSymbol(card.suit) }}
            </div>
            <div class="card-center">
              <span v-if="card.isWild">🃏</span>
              <span v-else-if="card.isQuestion">❓</span>
              <span v-else :style="{ color: getSuitColor(card.suit) }">{{ getSuitSymbol(card.suit) }}</span>
            </div>
          </div>
        </div>
        <div class="swap-status-text">已选中 {{ swapSelectedIds.length }} / 2 张</div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button 
            class="btn-arcade btn-primary px-6 py-2.5" 
            :disabled="swapSelectedIds.length !== 2" 
            @click="confirmSwap"
          >
            确认换两张
          </button>
        </div>
      </template>
    </Modal>

    <!-- 问号牌 4 选 1 弹窗 -->
    <Modal v-model="showQuestionModal" title="❓ 问号牌专属特权·牌堆顶 4 选 1" width="560px" :show-close="false">
      <div class="question-modal-content">
        <p class="text-sm text-slate-300 mb-3 text-center">
          你打出了问号牌！已翻开牌堆最顶部的 4 张牌，请<b>自选 1 张补入手牌</b>，其余 3 张将放回牌堆顶：
        </p>
        <div class="question-candidates-grid">
          <div 
            v-for="(card, ci) in questionCandidates" 
            :key="card.id"
            class="baque-card"
            :class="{ 'is-selected': selectedCandidate?.id === card.id }"
            @click="selectedCandidate = card"
          >
            <div class="card-corner top" :style="{ color: getSuitColor(card.suit) }">
              {{ getRankDisplay(card.rank) }} {{ getSuitSymbol(card.suit) }}
            </div>
            <div class="card-center">
              <span v-if="card.isWild">🃏</span>
              <span v-else-if="card.isQuestion">❓</span>
              <span v-else-if="card.isExtraEight">👑 8</span>
              <span v-else :style="{ color: getSuitColor(card.suit) }">{{ getSuitSymbol(card.suit) }}</span>
            </div>
            <div class="card-corner bottom" :style="{ color: getSuitColor(card.suit) }">
              {{ getRankDisplay(card.rank) }} {{ getSuitSymbol(card.suit) }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end w-full">
          <button 
            class="btn-arcade btn-primary px-6 py-2.5" 
            :disabled="!selectedCandidate" 
            @click="confirmQuestionSelect"
          >
            选定此牌入手机会
          </button>
        </div>
      </template>
    </Modal>

    <!-- 终盘大结算面板 -->
    <Modal v-model="showFinalModal" title="🀄️ 牌库抽空·百变八雀全场大结算" width="600px">
      <div class="final-settle-content">
        <div class="winner-trophy-banner">
          <Trophy class="w-12 h-12 text-yellow-400" />
          <div class="text-left">
            <h3 class="text-lg font-bold text-white">
              {{ sortedRanking[0]?.isHuman ? '恭喜荣登雀圣！全场最高胡牌王者' : `${sortedRanking[0]?.name} 拔得头筹！` }}
            </h3>
            <span class="text-xs text-slate-400">84 张牌库已全部摸打完毕</span>
          </div>
        </div>

        <div class="final-players-list">
          <div 
            v-for="(p, rIdx) in sortedRanking" 
            :key="p.id"
            class="final-player-row"
            :class="{ 'is-me': p.isHuman, 'is-champion': rIdx === 0 }"
          >
            <span class="rank-num font-arcade">#{{ rIdx + 1 }}</span>
            <span class="player-avatar">{{ p.avatar }}</span>
            <div class="player-name-col">
              <span class="name">{{ p.name }} <b v-if="p.isHuman" class="text-cyan-400 text-xs">(我)</b></span>
              <span class="hu-stats text-xs text-slate-400">
                共胡牌 <b>{{ p.huRecords.length }}</b> 次 (最高 {{ getMaxFan(p) }} 番)
              </span>
            </div>
            <div class="coins-col font-arcade">
              <span :class="p.chips >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ p.chips >= 0 ? '+' : '' }}{{ p.chips }} 🪙
              </span>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 w-full">
          <button class="btn-arcade btn-primary" @click="startNewGame">
            再战一局
          </button>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Trophy } from 'lucide-vue-next'
import type { Card, BaQuePlayer, BaQueStage, EvaluatedBaQueHand } from './types'
import { 
  createBaQueDeck, shuffleDeck, evaluateBaQueHand, getTingCards, 
  decideAIDiscard, decideAIChooseFrom4, getRankDisplay, getSuitSymbol, 
  getSuitColor, isWildCard 
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

const stage = ref<BaQueStage>('idle')
const deck = ref<Card[]>([])
const activePlayerIndex = ref(0)
const bannerText = ref('')
const recentDiscards = ref<Card[]>([])

// 4 位玩家状态
const players = ref<BaQuePlayer[]>([
  {
    id: 'p0',
    name: userStore.nickname,
    avatar: userStore.avatar,
    chips: 0,
    cards: [],
    discards: [],
    huRecords: [],
    renCount: 0,
    isHuman: true,
    statusText: ''
  },
  {
    id: 'p1',
    name: '雀圣阿强',
    avatar: '😎',
    chips: 0,
    cards: [],
    discards: [],
    huRecords: [],
    renCount: 0,
    isHuman: false,
    personality: 'steady',
    statusText: ''
  },
  {
    id: 'p2',
    name: '地主老财',
    avatar: '🎩',
    chips: 0,
    cards: [],
    discards: [],
    huRecords: [],
    renCount: 0,
    isHuman: false,
    personality: 'aggressive',
    statusText: ''
  },
  {
    id: 'p3',
    name: '百变仙子',
    avatar: '🧚‍♀️',
    chips: 0,
    cards: [],
    discards: [],
    huRecords: [],
    renCount: 0,
    isHuman: false,
    personality: 'gambler',
    statusText: ''
  }
])

const selectedCard = ref<Card | null>(null)
const lastDrawnCard = ref<Card | null>(null)

// 弹窗状态
const showSwapModal = ref(false)
const swapSelectedIds = ref<string[]>([])
const showQuestionModal = ref(false)
const questionCandidates = ref<Card[]>([])
const selectedCandidate = ref<Card | null>(null)
const showFinalModal = ref(false)

let turnTimer: number | null = null

// 我的手牌排序展示
const sortedMyCards = computed(() => {
  return [...players.value[0].cards].sort((a, b) => {
    // 问号和百变牌排在最右侧
    if (isWildCard(a) && !isWildCard(b)) return 1
    if (!isWildCard(a) && isWildCard(b)) return -1
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return a.rank - b.rank
  })
})

// 检查是否为本轮刚摸入的第 8 张牌
const isDrawnCard = (card: Card) => {
  return lastDrawnCard.value?.id === card.id
}

// 检查我当前 8 张牌是否构成胡牌
const currentHuHand = computed<EvaluatedBaQueHand | null>(() => {
  const me = players.value[0]
  if (me.cards.length !== 8) return null
  return evaluateBaQueHand(me.cards)
})

// 我的听牌列表
const myTingList = computed(() => {
  const me = players.value[0]
  if (me.cards.length !== 7) return []
  return getTingCards(me.cards)
})

// 排序结算排行榜
const sortedRanking = computed(() => {
  return [...players.value].sort((a, b) => {
    if (b.huRecords.length !== a.huRecords.length) {
      return b.huRecords.length - a.huRecords.length
    }
    return b.chips - a.chips
  })
})

const getMaxFan = (p: BaQuePlayer) => {
  if (p.huRecords.length === 0) return 0
  return Math.max(...p.huRecords.map(r => r.fan))
}

// 选择手牌
const onSelectCard = (card: Card) => {
  sound.click()
  if (selectedCard.value?.id === card.id) {
    selectedCard.value = null
  } else {
    selectedCard.value = card
  }
}

// 开始游戏流程
const startNewGame = () => {
  sound.click()
  deck.value = shuffleDeck(createBaQueDeck())
  recentDiscards.value = []
  bannerText.value = ''
  selectedCard.value = null
  lastDrawnCard.value = null
  showFinalModal.value = false

  // 重置每位玩家
  players.value.forEach(p => {
    p.cards = []
    p.discards = []
    p.huRecords = []
    p.renCount = 0
    p.chips = 0
    p.statusText = ''
  })

  // 每人发 7 张底牌
  for (let i = 0; i < 7; i++) {
    for (const p of players.value) {
      p.cards.push(deck.value.shift()!)
    }
  }

  sound.cardDeal()

  // 进入换两张阶段
  stage.value = 'swap2'
  swapSelectedIds.value = []
  showSwapModal.value = true
}

// 换两张选择
const toggleSwapSelect = (id: string) => {
  sound.click()
  const idx = swapSelectedIds.value.indexOf(id)
  if (idx !== -1) {
    swapSelectedIds.value.splice(idx, 1)
  } else if (swapSelectedIds.value.length < 2) {
    swapSelectedIds.value.push(id)
  }
}

// 确认换两张
const confirmSwap = () => {
  if (swapSelectedIds.value.length !== 2) return
  showSwapModal.value = false

  // 人类拿出的 2 张牌
  const humanGive = players.value[0].cards.filter(c => swapSelectedIds.value.includes(c.id))
  players.value[0].cards = players.value[0].cards.filter(c => !swapSelectedIds.value.includes(c.id))

  // AI 分别随机拿出 2 张牌
  const aiGives: Card[][] = []
  for (let i = 1; i <= 3; i++) {
    const aiCards = players.value[i].cards
    const idx1 = 0
    const idx2 = 1
    const give = [aiCards[idx1], aiCards[idx2]]
    players.value[i].cards = aiCards.filter((_, idx) => idx !== idx1 && idx !== idx2)
    aiGives.push(give)
  }

  // 顺时针交换给下一家
  // 人类给 AI 1, AI 1 给 AI 2, AI 2 给 AI 3, AI 3 给 人类
  players.value[1].cards.push(...humanGive)
  players.value[2].cards.push(...aiGives[0])
  players.value[3].cards.push(...aiGives[1])
  players.value[0].cards.push(...aiGives[2])

  sound.chips()
  setBanner('换两张完成！各自获得崭新手牌')

  stage.value = 'playing'
  activePlayerIndex.value = 0

  // 玩家首先摸牌
  setTimeout(() => {
    playerDrawCard(players.value[0])
  }, 800)
}

// 玩家/AI 摸牌
const playerDrawCard = (player: BaQuePlayer) => {
  if (deck.value.length === 0) {
    endGame()
    return
  }

  const drawn = deck.value.shift()!
  player.cards.push(drawn)
  lastDrawnCard.value = drawn
  sound.cardDeal()

  if (player.isHuman) {
    player.statusText = '摸牌'
    // 若摸到胡牌，声音提示
    if (currentHuHand.value) {
      sound.victory()
      setBanner(`🎉 听牌已成！${currentHuHand.value.rankName}`)
    }
  } else {
    player.statusText = '摸牌中...'
    // AI 决策行动
    if (turnTimer) clearTimeout(turnTimer)
    turnTimer = window.setTimeout(() => {
      runAITurn(player)
    }, 1000)
  }
}

// 人类选择胡牌
const playerHu = () => {
  const hand = currentHuHand.value
  if (!hand) return

  const renBonus = players.value[0].renCount + 1
  const finalFan = hand.totalFan * renBonus
  const winCoins = finalFan * 10

  sound.victory()
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } })

  players.value[0].chips += winCoins
  userStore.addCoins(winCoins)
  gameStore.recordGame('baquepai', winCoins)

  players.value[0].huRecords.push({
    round: 84 - deck.value.length,
    handName: hand.rankName,
    fan: finalFan,
    coins: winCoins,
    isRenBoosted: players.value[0].renCount > 0,
    renCount: players.value[0].renCount
  })

  setBanner(`🀄️ 胡！${hand.rankName} ${finalFan}番 (+${winCoins}🪙)`)
  players.value[0].renCount = 0 // 胡牌后忍数清零

  // 成就解锁
  if (hand.rank === 'yi_tiao_long') achievementStore.unlock('baque_dragon')
  if (players.value[0].huRecords.length >= 3) achievementStore.unlock('baque_multi')

  // 第一次胡牌后，打出一张非成牌继续打，或系统继续摸打
  // 提示玩家打出一张手牌继续走牌（胡牌不离场）
}

// 人类选择“当忍则忍”
const playerRen = () => {
  sound.reveal()
  players.value[0].renCount += 1
  setBanner(`🔥 当忍则忍！累计 ${players.value[0].renCount} 忍，胡牌倍数翻为 ×${players.value[0].renCount + 1}`)

  if (players.value[0].renCount >= 3) {
    achievementStore.unlock('baque_ren')
  }
}

// 人类打出所选牌
const playSelectedCard = () => {
  if (!selectedCard.value) return
  const card = selectedCard.value
  const me = players.value[0]

  // 如果打出的是问号牌 ❓ -> 触发牌堆顶 4 选 1
  if (card.isQuestion) {
    me.cards = me.cards.filter(c => c.id !== card.id)
    me.discards.push(card)
    recentDiscards.value.push(card)
    selectedCard.value = null

    triggerQuestionModal()
    return
  }

  // 正常打出牌
  me.cards = me.cards.filter(c => c.id !== card.id)
  me.discards.push(card)
  recentDiscards.value.push(card)
  if (recentDiscards.value.length > 8) recentDiscards.value.shift()

  me.statusText = `打出 ${getRankDisplay(card.rank)}${getSuitSymbol(card.suit)}`
  selectedCard.value = null
  sound.fold()

  advanceToNextPlayer()
}

// 触发问号牌 4 选 1
const triggerQuestionModal = () => {
  sound.reveal()
  const countToTake = Math.min(4, deck.value.length)
  if (countToTake === 0) {
    advanceToNextPlayer()
    return
  }

  questionCandidates.value = deck.value.splice(0, countToTake)
  selectedCandidate.value = questionCandidates.value[0]
  showQuestionModal.value = true
}

// 确认选择 4 选 1 其中的一张
const confirmQuestionSelect = () => {
  if (!selectedCandidate.value) return
  showQuestionModal.value = false

  const chosen = selectedCandidate.value
  const rem3 = questionCandidates.value.filter(c => c.id !== chosen.id)

  // 剩余放回牌堆顶
  deck.value.unshift(...rem3)

  // 选中的牌放入手牌
  players.value[0].cards.push(chosen)
  lastDrawnCard.value = chosen
  selectedCandidate.value = null
  sound.chips()
  setBanner(`✨ 问号神抽！补入 ${getRankDisplay(chosen.rank)}${getSuitSymbol(chosen.suit)}`)

  achievementStore.unlock('baque_god_draw')

  // 若正好胡牌
  if (currentHuHand.value) {
    sound.victory()
  }
}

// AI 玩家执行回合
const runAITurn = (ai: BaQuePlayer) => {
  // 1. 检查 AI 是否胡牌
  const hu = evaluateBaQueHand(ai.cards)
  if (hu) {
    // 80% 几率直接胡牌
    if (Math.random() < 0.8 || ai.renCount >= 2) {
      const renBonus = ai.renCount + 1
      const finalFan = hu.totalFan * renBonus
      const winCoins = finalFan * 10
      ai.chips += winCoins
      ai.huRecords.push({
        round: 84 - deck.value.length,
        handName: hu.rankName,
        fan: finalFan,
        coins: winCoins,
        isRenBoosted: ai.renCount > 0,
        renCount: ai.renCount
      })
      sound.victory()
      ai.statusText = `🀄️ 胡！${hu.rankName}`
      setBanner(`${ai.name} 达成胡牌！${hu.rankName} (${finalFan}番)`)
      ai.renCount = 0
    } else {
      // 忍
      ai.renCount += 1
      ai.statusText = `忍 ×${ai.renCount + 1}`
      sound.reveal()
    }
  }

  // 2. 检查手中是否有问号牌，若有则优先打出触发 4 选 1
  const questionCard = ai.cards.find(c => c.isQuestion)
  if (questionCard && Math.random() < 0.7 && deck.value.length >= 4) {
    ai.cards = ai.cards.filter(c => c.id !== questionCard.id)
    ai.discards.push(questionCard)
    recentDiscards.value.push(questionCard)
    ai.statusText = '打出问号牌 ❓ 寻宝'

    // AI 抽取 4 张并选择最优 1 张
    const top4 = deck.value.splice(0, 4)
    const bestPick = decideAIChooseFrom4(ai.cards, top4)
    const rem3 = top4.filter(c => c.id !== bestPick.id)
    deck.value.unshift(...rem3)
    ai.cards.push(bestPick)
    sound.reveal()

    setTimeout(() => {
      // 补牌后再打出 1 张
      const discard = decideAIDiscard(ai)
      ai.cards = ai.cards.filter(c => c.id !== discard.id)
      ai.discards.push(discard)
      recentDiscards.value.push(discard)
      ai.statusText = `打出 ${getRankDisplay(discard.rank)}${getSuitSymbol(discard.suit)}`
      advanceToNextPlayer()
    }, 600)
    return
  }

  // 3. 正常打出一张牌
  const discard = decideAIDiscard(ai)
  ai.cards = ai.cards.filter(c => c.id !== discard.id)
  ai.discards.push(discard)
  recentDiscards.value.push(discard)
  if (recentDiscards.value.length > 8) recentDiscards.value.shift()
  ai.statusText = `打出 ${getRankDisplay(discard.rank)}${getSuitSymbol(discard.suit)}`
  sound.fold()

  advanceToNextPlayer()
}

// 推进到下一位玩家摸打
const advanceToNextPlayer = () => {
  if (deck.value.length === 0) {
    endGame()
    return
  }

  activePlayerIndex.value = (activePlayerIndex.value + 1) % 4
  const nextP = players.value[activePlayerIndex.value]

  setTimeout(() => {
    playerDrawCard(nextP)
  }, 400)
}

// 横幅提示
const setBanner = (msg: string) => {
  bannerText.value = msg
  setTimeout(() => {
    if (bannerText.value === msg) {
      bannerText.value = ''
    }
  }, 2500)
}

// 对局结束（84 张摸完）
const endGame = () => {
  stage.value = 'ended'
  sound.victory()
  showFinalModal.value = true
}

onMounted(() => {
  startNewGame()
})

onUnmounted(() => {
  if (turnTimer) clearTimeout(turnTimer)
})
</script>

<style scoped>
.baque-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding: 10px 16px;
  border-radius: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.stat-label {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.stat-val {
  font-size: 0.95rem;
  font-weight: 700;
}

/* 牌桌区域 */
.baque-table-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 11;
  background: radial-gradient(circle at center, #1b4d3e 0%, #0d2b22 75%, #071712 100%);
  border: 10px solid #2d1810;
  box-shadow: 0 0 0 3px #854d0e, 0 20px 50px rgba(0, 0, 0, 0.75);
  border-radius: 40px;
  overflow: hidden;
}

.baque-table {
  position: relative;
  width: 100%;
  height: 100%;
  padding: 12px;
}

.table-corner {
  position: absolute;
  width: 30px;
  height: 30px;
  border: 2px solid rgba(251, 191, 36, 0.4);
  pointer-events: none;
}
.table-corner.tl { top: 12px; left: 12px; border-right: 0; border-bottom: 0; }
.table-corner.tr { top: 12px; right: 12px; border-left: 0; border-bottom: 0; }
.table-corner.bl { bottom: 12px; left: 12px; border-right: 0; border-top: 0; }
.table-corner.br { bottom: 12px; right: 12px; border-left: 0; border-top: 0; }

/* 各玩家席位定位 */
.player-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
}

.player-seat.is-active {
  filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.6));
}

.seat-top {
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
}

.seat-left {
  left: 14px;
  top: 40%;
  transform: translateY(-50%);
}

.seat-right {
  right: 14px;
  top: 40%;
  transform: translateY(-50%);
}

.seat-bottom {
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 95%;
}

.seat-info {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 20px;
}

.seat-avatar { font-size: 1.3rem; }
.seat-name { font-size: 0.75rem; font-weight: 700; color: #fff; }
.seat-hu-badge { font-size: 0.65rem; background: #059669; color: #fff; padding: 1px 6px; border-radius: 6px; font-weight: bold; }
.seat-ren-badge { font-size: 0.65rem; background: #e11d48; color: #fff; padding: 1px 6px; border-radius: 6px; font-weight: bold; }
.seat-status-bubble {
  position: absolute;
  top: -24px;
  background: #f59e0b;
  color: #000;
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 8px;
  white-space: nowrap;
}

/* 麻将牌背面 */
.tile-back {
  background: linear-gradient(135deg, #0284c7, #0369a1);
  border: 1.5px solid #e0f2fe;
  border-radius: 4px;
  box-shadow: 1px 2px 4px rgba(0, 0, 0, 0.4);
}
.tile-back.mini { width: 18px; height: 26px; }

.seat-hand-tiles {
  display: flex;
  gap: 3px;
  margin-top: 4px;
}

/* 牌桌中央 */
.table-center {
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.deck-pile-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.deck-stack {
  position: relative;
  width: 48px;
  height: 60px;
}

.deck-layer {
  position: absolute;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  border: 1.5px solid #bae6fd;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
}
.deck-layer.l2 { transform: translate(3px, -3px); }
.deck-layer.l3 { transform: translate(6px, -6px); }

.deck-count {
  font-size: 0.78rem;
  color: #fde047;
  font-weight: 800;
  margin-top: 4px;
}

.table-event-banner {
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid #fbbf24;
  color: #fbbf24;
  font-size: 0.95rem;
  font-weight: 800;
  padding: 6px 18px;
  border-radius: 20px;
  box-shadow: 0 0 15px rgba(251, 191, 36, 0.4);
  white-space: nowrap;
}

/* 弃牌河 */
.discards-pool {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 10px;
  border-radius: 8px;
  max-width: 280px;
}

.pool-title {
  font-size: 0.65rem;
  color: #94a3b8;
  margin-bottom: 2px;
}

.pool-cards {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

.discard-mini-card {
  background: #fff;
  border-radius: 4px;
  padding: 1px 4px;
  font-size: 0.68rem;
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}
.discard-mini-card.latest {
  border: 1.5px solid #fbbf24;
  box-shadow: 0 0 8px #fbbf24;
}

/* 听牌浮条 */
.ting-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  margin-bottom: 6px;
  max-width: 100%;
  overflow-x: auto;
}

.ting-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #38bdf8;
  white-space: nowrap;
}

.ting-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ting-chip {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.72rem;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 我的手牌展示 */
.my-hand-wrapper {
  display: flex;
  justify-content: center;
  width: 100%;
}

.my-cards-row {
  display: flex;
  gap: 6px;
  align-items: flex-end;
}

.baque-card {
  position: relative;
  width: 52px;
  height: 76px;
  background: #f8fafc;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 3px 4px;
  cursor: pointer;
  user-select: none;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.35);
}

.baque-card:hover {
  transform: translateY(-8px);
}

.baque-card.is-selected {
  transform: translateY(-16px);
  border-color: #38bdf8;
  box-shadow: 0 0 15px rgba(56, 189, 248, 0.7);
}

.baque-card.is-wild {
  background: linear-gradient(135deg, #fef3c7, #fde68a);
  border-color: #f59e0b;
}

.baque-card.is-question {
  background: linear-gradient(135deg, #f3e8ff, #e9d5ff);
  border-color: #a855f7;
}

.baque-card.is-extra-eight {
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-color: #eab308;
  box-shadow: 0 0 10px rgba(234, 179, 8, 0.4);
}

.baque-card.is-drawn {
  margin-left: 10px;
  border-color: #10b981;
}

.drawn-tag {
  position: absolute;
  top: -8px;
  right: -4px;
  background: #10b981;
  color: #fff;
  font-size: 0.55rem;
  font-weight: 800;
  padding: 1px 4px;
  border-radius: 4px;
}

.card-corner {
  display: flex;
  flex-direction: column;
  line-height: 1;
  font-weight: 800;
  font-size: 0.7rem;
}
.card-corner.bottom {
  transform: rotate(180deg);
}

.card-center {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  text-align: center;
  line-height: 1.1;
}

/* 操作控制台 */
.action-console {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 8px;
}

.btn-hu {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #fff;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.6);
  font-size: 0.95rem;
  padding: 8px 18px;
}

.btn-ren {
  background: linear-gradient(135deg, #e11d48, #be123c);
  color: #fff;
  box-shadow: 0 0 15px rgba(225, 29, 72, 0.5);
  font-size: 0.88rem;
  padding: 8px 16px;
}

.btn-question {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: #fff;
  box-shadow: 0 0 15px rgba(139, 92, 246, 0.5);
  font-size: 0.88rem;
  padding: 8px 16px;
}

.btn-discard {
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: #fff;
  font-size: 0.88rem;
  padding: 8px 16px;
}

.waiting-hint {
  font-size: 0.82rem;
  color: #94a3b8;
}

/* 换两张弹窗样式 */
.swap-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}
.swap-tip { font-size: 0.88rem; color: #e2e8f0; text-align: center; }
.swap-cards-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
.baque-card.mini {
  width: 48px;
  height: 68px;
}
.swap-status-text {
  font-size: 0.82rem;
  color: #f59e0b;
  font-weight: 700;
}

/* 4选1弹窗样式 */
.question-modal-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.question-candidates-grid {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 10px 0;
}

/* 终局大结算 */
.final-settle-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.winner-trophy-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(16, 185, 129, 0.15));
  border: 1.5px solid #fbbf24;
  padding: 12px 18px;
  border-radius: 14px;
}
.final-players-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.final-player-row {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(15, 23, 42, 0.7);
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.final-player-row.is-champion {
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
}
.rank-num { font-weight: 800; color: #94a3b8; font-size: 0.95rem; width: 30px; }
.final-player-row.is-champion .rank-num { color: #fbbf24; }
.player-avatar { font-size: 1.5rem; }
.player-name-col { display: flex; flex-direction: column; flex: 1; }
.player-name-col .name { font-size: 0.88rem; font-weight: 700; color: #fff; }
.coins-col { font-weight: 800; font-size: 0.95rem; }

/* 动画效果 */
.pop-enter-active, .pop-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.pop-enter-from, .pop-leave-to { opacity: 0; transform: scale(0.8); }

@media (max-width: 768px) {
  .baque-card {
    width: 40px;
    height: 60px;
  }
  .card-center { font-size: 0.9rem; }
}
</style>
