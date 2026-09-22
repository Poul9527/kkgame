import type { Card, Suit, EvaluatedHand, HandType, Player } from './types'

const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond']
// 点数 2 ~ 14 (11=J, 12=Q, 13=K, 14=A)
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

// 生成一副 52 张标准扑克牌
export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        suit,
        rank,
        id: `${suit}_${rank}`
      })
    }
  }
  return deck
}

// 洗牌算法 (Fisher-Yates)
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 扑克点数显示文案
export function getRankDisplay(rank: number): string {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

// 花色符号
export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spade': return '♠'
    case 'heart': return '♥'
    case 'club': return '♣'
    case 'diamond': return '♦'
  }
}

// 花色颜色
export function getSuitColor(suit: Suit): string {
  return suit === 'heart' || suit === 'diamond' ? '#ef4444' : '#0f172a'
}

// 手牌评估函数
export function evaluateHand(cards: Card[]): EvaluatedHand {
  if (!cards || cards.length !== 3) {
    return {
      type: 'high_card',
      typeName: '散牌',
      score: 0,
      cards: [],
      ranks: [0, 0, 0]
    }
  }

  // 按点数由大到小排序
  const sorted = [...cards].sort((a, b) => b.rank - a.rank)
  const r0 = sorted[0].rank
  const r1 = sorted[1].rank
  const r2 = sorted[2].rank

  const isSameSuit = sorted[0].suit === sorted[1].suit && sorted[1].suit === sorted[2].suit
  
  // 顺子检测 (包含常规连续与 A23 特殊小顺)
  let isNormalStraight = r0 - r1 === 1 && r1 - r2 === 1
  let isA23Straight = r0 === 14 && r1 === 3 && r2 === 2

  const isStraight = isNormalStraight || isA23Straight
  const straightRanks = isA23Straight ? [3, 2, 1] : [r0, r1, r2]

  // 1. 豹子 (三张同点)
  if (r0 === r1 && r1 === r2) {
    return {
      type: 'set',
      typeName: '豹子 💥',
      score: 600000 + r0 * 1000,
      cards: sorted,
      ranks: [r0]
    }
  }

  // 2. 顺金 / 同花顺 (同花色顺子)
  if (isSameSuit && isStraight) {
    return {
      type: 'straight_flush',
      typeName: '顺金 🌟',
      score: 500000 + straightRanks[0] * 1000,
      cards: sorted,
      ranks: straightRanks
    }
  }

  // 3. 金花 / 同花
  if (isSameSuit) {
    return {
      type: 'flush',
      typeName: '金花 🌺',
      score: 400000 + r0 * 1000 + r1 * 50 + r2,
      cards: sorted,
      ranks: [r0, r1, r2]
    }
  }

  // 4. 顺子
  if (isStraight) {
    return {
      type: 'straight',
      typeName: '顺子 ⚡',
      score: 300000 + straightRanks[0] * 1000,
      cards: sorted,
      ranks: straightRanks
    }
  }

  // 5. 对子
  if (r0 === r1 || r1 === r2 || r0 === r2) {
    let pairRank = 0
    let kicker = 0
    if (r0 === r1) {
      pairRank = r0
      kicker = r2
    } else if (r1 === r2) {
      pairRank = r1
      kicker = r0
    } else {
      pairRank = r0
      kicker = r1
    }

    return {
      type: 'pair',
      typeName: `对${getRankDisplay(pairRank)} 👥`,
      score: 200000 + pairRank * 1000 + kicker,
      cards: sorted,
      ranks: [pairRank, kicker]
    }
  }

  // 6. 特殊 235 (不同花色 2, 3, 5)
  if (!isSameSuit && r0 === 5 && r1 === 3 && r2 === 2) {
    return {
      type: 'special_235',
      typeName: '特殊 235 🃏',
      score: 50000, // 遇到普通牌为最小散牌，遇到豹子翻盘
      cards: sorted,
      ranks: [5, 3, 2]
    }
  }

  // 7. 普通散牌 / 单张
  return {
    type: 'high_card',
    typeName: `${getRankDisplay(r0)}单散牌 🃏`,
    score: 100000 + r0 * 1000 + r1 * 50 + r2,
    cards: sorted,
    ranks: [r0, r1, r2]
  }
}

// 比牌算法：比较手牌 A 与手牌 B（A发起挑战 B）
// 返回 > 0 代表 A 胜；< 0 代表 B 胜；=== 0 代表完全相同（按炸金花规矩：先比者/发起者 A 负，因此返回 -1）
export function compareHands(handA: EvaluatedHand, handB: EvaluatedHand): number {
  // 特殊 235 克制豹子规则
  if (handA.type === 'special_235' && handB.type === 'set') {
    return 1 // A是235，B是豹子，A胜！
  }
  if (handB.type === 'special_235' && handA.type === 'set') {
    return -1 // B是235，A是豹子，B胜！
  }

  const typeWeights: Record<HandType, number> = {
    set: 6,
    straight_flush: 5,
    flush: 4,
    straight: 3,
    pair: 2,
    high_card: 1,
    special_235: 0
  }

  const weightA = typeWeights[handA.type]
  const weightB = typeWeights[handB.type]

  if (weightA !== weightB) {
    return weightA > weightB ? 1 : -1
  }

  // 牌型相同时逐一比对 ranks 点数列表
  for (let i = 0; i < handA.ranks.length; i++) {
    const ra = handA.ranks[i]
    const rb = handB.ranks[i]
    if (ra !== rb) {
      return ra > rb ? 1 : -1
    }
  }

  // 若完全平局，发起比牌者判负
  return -1
}

// 计算手牌大致价值 (0 - 100 强度)
export function getHandStrength(hand: EvaluatedHand): number {
  switch (hand.type) {
    case 'set': return 98
    case 'straight_flush': return 92
    case 'flush': return 80
    case 'straight': return 68
    case 'pair':
      // 对子点数越大越强 (对2 ~ 对A 对应 35 ~ 60)
      return 35 + (hand.ranks[0] / 14) * 25
    case 'special_235': return 15
    case 'high_card':
      // 单张根据最大牌打分 (20 ~ 34)
      return 15 + (hand.ranks[0] / 14) * 18
  }
}

export type AIAction = 
  | { action: 'look' }
  | { action: 'call' }
  | { action: 'raise'; amount: number }
  | { action: 'pk'; targetId: string }
  | { action: 'fold' }

// 拟真 AI 智能决策逻辑
export function decideAIAction(
  ai: Player,
  currentBet: number,
  round: number,
  activeOpponents: Player[],
  minRaiseStep: number
): AIAction {
  const personality = ai.personality || 'calculative'
  const hand = ai.evaluatedHand || evaluateHand(ai.cards)
  const strength = getHandStrength(hand)

  // 1. 还没看牌阶段的决策
  if (!ai.hasSeenCards) {
    // 激进型玩家喜欢闷牌冲到第 3~4 轮
    const keepBlindLimit = personality === 'aggressive' ? 4 : personality === 'calculative' ? 2 : 1
    if (round <= keepBlindLimit) {
      // 偶尔加注刺激底池
      if (personality === 'aggressive' && Math.random() < 0.35) {
        return { action: 'raise', amount: minRaiseStep }
      }
      return { action: 'call' }
    } else {
      // 轮数到了看牌
      return { action: 'look' }
    }
  }

  // 2. 已经看牌阶段的决策
  // 随机可PK的目标
  const validTargets = activeOpponents.filter(p => !p.isFolded && !p.isOut && p.id !== ai.id)
  const randomTarget = validTargets[Math.floor(Math.random() * validTargets.length)]

  // A. 极端好牌 (顺子、金花、顺金、豹子，strength >= 65)
  if (strength >= 65) {
    if (validTargets.length > 0 && (round >= 4 || Math.random() < 0.4)) {
      return { action: 'pk', targetId: randomTarget.id }
    }
    if (Math.random() < 0.5) {
      return { action: 'raise', amount: minRaiseStep }
    }
    return { action: 'call' }
  }

  // B. 中等牌 (中大对子，strength 45 ~ 64)
  if (strength >= 45) {
    if (round >= 3 && validTargets.length > 0 && Math.random() < 0.5) {
      return { action: 'pk', targetId: randomTarget.id }
    }
    if (personality === 'aggressive' && Math.random() < 0.3) {
      return { action: 'raise', amount: minRaiseStep }
    }
    return { action: 'call' }
  }

  // C. 较弱牌 (小对子或大散牌，strength 25 ~ 44)
  if (strength >= 25) {
    if (personality === 'aggressive') {
      // 激进型喜欢用散牌偷鸡 (Bluff)
      if (Math.random() < 0.35) return { action: 'raise', amount: minRaiseStep }
      if (Math.random() < 0.45) return { action: 'call' }
      if (validTargets.length > 0 && Math.random() < 0.4) {
        return { action: 'pk', targetId: randomTarget.id }
      }
      return { action: 'fold' }
    }

    if (personality === 'conservative') {
      // 稳健型在看牌且是散牌时极易弃牌
      if (round <= 2 && Math.random() < 0.4) return { action: 'call' }
      if (validTargets.length > 0 && Math.random() < 0.3) return { action: 'pk', targetId: randomTarget.id }
      return { action: 'fold' }
    }

    // 老谋深算
    if (round <= 3 && Math.random() < 0.6) return { action: 'call' }
    if (validTargets.length > 0) return { action: 'pk', targetId: randomTarget.id }
    return { action: 'fold' }
  }

  // D. 极弱牌 (strength < 25)
  if (personality === 'aggressive' && Math.random() < 0.25) {
    // 偶尔疯狂偷鸡狂赌
    return { action: 'raise', amount: minRaiseStep }
  }
  if (validTargets.length > 0 && Math.random() < 0.25) {
    // 垂死挣扎找人比牌
    return { action: 'pk', targetId: randomTarget.id }
  }
  return { action: 'fold' }
}
