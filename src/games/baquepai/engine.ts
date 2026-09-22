import type { Card, Suit, BaQueHandRank, EvaluatedBaQueHand, HandMeld, BaQuePlayer } from './types'

export const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond']
export const BASE_RANKS = [6, 7, 8, 9, 10, 11, 12, 13, 14]

export function getRankDisplay(rank: number): string {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  if (rank === 99) return '🃏'
  if (rank === 100) return '❓'
  return String(rank)
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spade': return '♠'
    case 'heart': return '♥'
    case 'club': return '♣'
    case 'diamond': return '♦'
    case 'special': return '✨'
  }
}

export function getSuitColor(suit: Suit): string {
  if (suit === 'heart' || suit === 'diamond') return '#ef4444'
  if (suit === 'special') return '#f59e0b'
  return '#0f172a'
}

// 生成官方正宗 84 张牌库
export function createBaQueDeck(): Card[] {
  const deck: Card[] = []
  let uid = 1

  // 1. 基础 72 张牌 (6..A, 4个花色, 各2副)
  for (let copy = 1; copy <= 2; copy++) {
    for (const suit of SUITS) {
      for (const rank of BASE_RANKS) {
        deck.push({
          id: `card_${suit}_${rank}_c${copy}_${uid++}`,
          suit,
          rank
        })
      }
    }
  }

  // 2. 额外 4 张主角专属金牌 8 (全场共 12 张 8，黑红梅方各多 1 张)
  for (const suit of SUITS) {
    deck.push({
      id: `card_extra_eight_${suit}_${uid++}`,
      suit,
      rank: 8,
      isExtraEight: true
    })
  }

  // 3. 4 张百变癞子牌 🃏
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `wild_${i}_${uid++}`,
      suit: 'special',
      rank: 99,
      isWild: true
    })
  }

  // 4. 4 张问号机会牌 ❓ (打出触发牌堆顶 4 选 1)
  for (let i = 0; i < 4; i++) {
    deck.push({
      id: `question_${i}_${uid++}`,
      suit: 'special',
      rank: 100,
      isQuestion: true
    })
  }

  return deck
}

// 洗牌算法
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

// 辅助：检查牌是否为万能牌 (百变牌 99 或 问号牌 100 在手牌组牌时均可作为万能牌替代)
export function isWildCard(card: Card): boolean {
  return card.rank === 99 || card.rank === 100 || card.isWild === true || card.isQuestion === true
}

// 评定 8 张牌是否构成胡牌
export function evaluateBaQueHand(cards: Card[]): EvaluatedBaQueHand | null {
  if (cards.length !== 8) return null

  const wilds = cards.filter(c => isWildCard(c))
  const regulars = cards.filter(c => !isWildCard(c)).sort((a, b) => {
    if (a.suit !== b.suit) return a.suit.localeCompare(b.suit)
    return a.rank - b.rank
  })

  const numWilds = wilds.length
  const hasExtraEight = cards.some(c => c.isExtraEight || c.rank === 8)
  const isHardHu = numWilds === 0

  // 1. 判定一条龙 (80番): 8 张同花色连续牌 (6..13 或 7..14)
  const dragonResult = checkDragon(regulars, numWilds)
  if (dragonResult) {
    const bonus = (hasExtraEight ? 10 : 0) + (isHardHu ? 20 : 0)
    return {
      rank: 'yi_tiao_long',
      rankName: '一条龙 (八连顺)',
      baseFan: 80,
      bonusFan: bonus,
      totalFan: 80 + bonus,
      hasExtraEight,
      isHardHu,
      melds: [dragonResult]
    }
  }

  // 2. 判定双炸 (50番): 4 + 4
  const shuangZhaResult = checkShuangZha(regulars, numWilds)
  if (shuangZhaResult) {
    const bonus = (hasExtraEight ? 10 : 0) + (isHardHu ? 15 : 0)
    return {
      rank: 'shuang_zha',
      rankName: '双炸 (四杠连环)',
      baseFan: 50,
      bonusFan: bonus,
      totalFan: 50 + bonus,
      hasExtraEight,
      isHardHu,
      melds: shuangZhaResult
    }
  }

  // 3. 判定四对子 (30番): 4 个对子
  const siDuiResult = checkSiDui(regulars, numWilds)
  if (siDuiResult) {
    // 检查是否也是清一色
    const isPureSuit = isPureSuitCards(regulars)
    const baseFan = isPureSuit ? 60 : 30
    const name = isPureSuit ? '清一色·四对子' : '四对子 (四双飞)'
    const bonus = (hasExtraEight ? 10 : 0) + (isHardHu ? 10 : 0)
    return {
      rank: isPureSuit ? 'qing_yi_se' : 'si_dui',
      rankName: name,
      baseFan,
      bonusFan: bonus,
      totalFan: baseFan + bonus,
      hasExtraEight,
      isHardHu,
      melds: siDuiResult
    }
  }

  // 4. 判定 3 + 3 + 2 标准结构 (平胡、碰碰胡、清一色)
  const melds332 = check332(regulars, numWilds)
  if (melds332) {
    const isPureSuit = isPureSuitCards(regulars)
    const allTriplets = melds332.slice(0, 2).every(m => m.type === 'triplet')

    let rank: BaQueHandRank = 'ping_hu'
    let rankName = '平胡 (3+3+2)'
    let baseFan = 10

    if (isPureSuit) {
      rank = 'qing_yi_se'
      rankName = allTriplets ? '清一色·碰碰胡' : '清一色 (纯色贯通)'
      baseFan = allTriplets ? 50 : 40
    } else if (allTriplets) {
      rank = 'peng_peng'
      rankName = '碰碰胡 (对对胡)'
      baseFan = 20
    }

    const bonus = (hasExtraEight ? 10 : 0) + (isHardHu ? 10 : 0)
    return {
      rank,
      rankName,
      baseFan,
      bonusFan: bonus,
      totalFan: baseFan + bonus,
      hasExtraEight,
      isHardHu,
      melds: melds332
    }
  }

  return null
}

// 辅助：判断所有普通牌是否为同一花色
function isPureSuitCards(regulars: Card[]): boolean {
  if (regulars.length <= 1) return true
  const firstSuit = regulars[0].suit
  return regulars.every(c => c.suit === firstSuit)
}

// 检查一条龙
function checkDragon(regulars: Card[], wilds: number): HandMeld | null {
  for (const suit of SUITS) {
    const suitCards = regulars.filter(c => c.suit === suit)
    // 方案 1: 6..13
    const needed6to13 = [6, 7, 8, 9, 10, 11, 12, 13]
    const missing1 = needed6to13.filter(r => !suitCards.some(c => c.rank === r)).length
    if (missing1 <= wilds) {
      return { type: 'dragon', cards: regulars }
    }

    // 方案 2: 7..14
    const needed7to14 = [7, 8, 9, 10, 11, 12, 13, 14]
    const missing2 = needed7to14.filter(r => !suitCards.some(c => c.rank === r)).length
    if (missing2 <= wilds) {
      return { type: 'dragon', cards: regulars }
    }
  }
  return null
}

// 检查双炸 (4 + 4)
function checkShuangZha(regulars: Card[], wilds: number): HandMeld[] | null {
  const counts: Record<number, number> = {}
  regulars.forEach(c => { counts[c.rank] = (counts[c.rank] || 0) + 1 })
  const distinctRanks = Object.keys(counts).map(Number)

  if (distinctRanks.length > 2) return null

  // 尝试选 2 个点数做炸弹
  for (let i = 0; i < BASE_RANKS.length; i++) {
    for (let j = i + 1; j < BASE_RANKS.length; j++) {
      const r1 = BASE_RANKS[i]
      const r2 = BASE_RANKS[j]
      const have1 = counts[r1] || 0
      const have2 = counts[r2] || 0
      const otherCards = regulars.filter(c => c.rank !== r1 && c.rank !== r2)
      if (otherCards.length > 0) continue

      const need = (4 - have1) + (4 - have2)
      if (need <= wilds) {
        return [
          { type: 'kong', cards: regulars.filter(c => c.rank === r1) },
          { type: 'kong', cards: regulars.filter(c => c.rank === r2) }
        ]
      }
    }
  }
  return null
}

// 检查四对子 (4 pairs)
function checkSiDui(regulars: Card[], wilds: number): HandMeld[] | null {
  const counts: Record<number, Card[]> = {}
  regulars.forEach(c => {
    if (!counts[c.rank]) counts[c.rank] = []
    counts[c.rank].push(c)
  })

  let pairs = 0
  let singles = 0
  const melds: HandMeld[] = []

  for (const rank in counts) {
    const list = counts[rank]
    const pCount = Math.floor(list.length / 2)
    pairs += pCount
    singles += (list.length % 2)
    for (let k = 0; k < pCount; k++) {
      melds.push({ type: 'pair', cards: [list[k * 2], list[k * 2 + 1]] })
    }
  }

  // 每一个单张需要 1 个万能牌凑成对子
  if (singles <= wilds) {
    const remainingWilds = wilds - singles
    // 剩余万能牌必须是偶数对
    if (remainingWilds % 2 === 0) {
      if (pairs + singles + (remainingWilds / 2) === 4) {
        return melds
      }
    }
  }
  return null
}

// 检查 3 + 3 + 2 标准结构
function check332(regulars: Card[], wilds: number): HandMeld[] | null {
  // 枚举将牌 (对子):
  // 1. 用 2 张相同点数的普通牌做将牌
  const distinctRanks = Array.from(new Set(regulars.map(c => c.rank)))

  for (const rank of distinctRanks) {
    const matching = regulars.filter(c => c.rank === rank)
    if (matching.length >= 2) {
      const remainingRegulars = removeTwoCards(regulars, matching[0], matching[1])
      const melds = solveTwoMelds(remainingRegulars, wilds)
      if (melds) {
        return [...melds, { type: 'pair', cards: [matching[0], matching[1]] }]
      }
    }
    // 或者 1 张普通牌 + 1 张万能牌做将牌
    if (wilds >= 1 && matching.length >= 1) {
      const remainingRegulars = removeOneCard(regulars, matching[0])
      const melds = solveTwoMelds(remainingRegulars, wilds - 1)
      if (melds) {
        return [...melds, { type: 'pair', cards: [matching[0]] }]
      }
    }
  }

  // 2. 用 2 张万能牌纯做将牌 (若 wilds >= 2)
  if (wilds >= 2) {
    const melds = solveTwoMelds(regulars, wilds - 2)
    if (melds) {
      return [...melds, { type: 'pair', cards: [] }]
    }
  }

  return null
}

// 求解剩余 6 张牌是否能刚好拼成 2 个面子 (每个面子 3 张: 同花顺子或同点数刻子)
function solveTwoMelds(regulars: Card[], wilds: number): HandMeld[] | null {
  if (regulars.length + wilds !== 6) return null

  // 生成所有可能的面子候选
  const candidates = findAllMeldCandidates(regulars, wilds)

  for (let i = 0; i < candidates.length; i++) {
    const m1 = candidates[i]
    if (canExtractMeld(regulars, wilds, m1)) {
      const remReg1 = extractMeldCards(regulars, m1.usedRegulars)
      const remWild1 = wilds - m1.usedWilds

      // 寻找第 2 个面子
      const candidates2 = findAllMeldCandidates(remReg1, remWild1)
      for (let j = 0; j < candidates2.length; j++) {
        const m2 = candidates2[j]
        if (m2.usedRegulars.length === remReg1.length && m2.usedWilds === remWild1) {
          return [
            { type: m1.type, cards: m1.usedRegulars },
            { type: m2.type, cards: m2.usedRegulars }
          ]
        }
      }
    }
  }

  return null
}

interface MeldCandidate {
  type: 'sequence' | 'triplet'
  usedRegulars: Card[]
  usedWilds: number
}

function findAllMeldCandidates(regulars: Card[], wilds: number): MeldCandidate[] {
  const list: MeldCandidate[] = []

  // 1. 刻子候选 (三张同点数)
  const distinctRanks = Array.from(new Set(regulars.map(c => c.rank)))
  for (const rank of distinctRanks) {
    const cardsOfRank = regulars.filter(c => c.rank === rank)
    for (let take = 1; take <= Math.min(3, cardsOfRank.length); take++) {
      const needWild = 3 - take
      if (needWild <= wilds) {
        list.push({
          type: 'triplet',
          usedRegulars: cardsOfRank.slice(0, take),
          usedWilds: needWild
        })
      }
    }
  }

  // 2. 同花顺子候选 (同花色 3 张连牌)
  for (const suit of SUITS) {
    const suitCards = regulars.filter(c => c.suit === suit)
    for (let start = 6; start <= 12; start++) {
      const neededRanks = [start, start + 1, start + 2]
      const foundCards: Card[] = []
      for (const nr of neededRanks) {
        const match = suitCards.find(c => c.rank === nr && !foundCards.includes(c))
        if (match) foundCards.push(match)
      }
      const needWild = 3 - foundCards.length
      if (needWild <= wilds && foundCards.length > 0) {
        list.push({
          type: 'sequence',
          usedRegulars: foundCards,
          usedWilds: needWild
        })
      }
    }
  }

  return list
}

function canExtractMeld(regulars: Card[], wilds: number, m: MeldCandidate): boolean {
  if (m.usedWilds > wilds) return false
  for (const c of m.usedRegulars) {
    if (!regulars.includes(c)) return false
  }
  return true
}

function extractMeldCards(regulars: Card[], used: Card[]): Card[] {
  const res = [...regulars]
  for (const c of used) {
    const idx = res.indexOf(c)
    if (idx !== -1) res.splice(idx, 1)
  }
  return res
}

function removeOneCard(arr: Card[], card: Card): Card[] {
  const idx = arr.indexOf(card)
  if (idx === -1) return [...arr]
  const copy = [...arr]
  copy.splice(idx, 1)
  return copy
}

function removeTwoCards(arr: Card[], c1: Card, c2: Card): Card[] {
  const copy = [...arr]
  const i1 = copy.indexOf(c1)
  if (i1 !== -1) copy.splice(i1, 1)
  const i2 = copy.indexOf(c2)
  if (i2 !== -1) copy.splice(i2, 1)
  return copy
}

// 听牌分析：给出当前 7 张手牌，分析摸入哪些牌能够胡牌
export function getTingCards(hand7: Card[]): Array<{ rank: number; suit?: Suit; handName: string; fan: number }> {
  if (hand7.length !== 7) return []

  const tingList: Array<{ rank: number; suit?: Suit; handName: string; fan: number }> = []
  const testedKeys = new Set<string>()

  // 1. 测试万能牌
  const testWild: Card = { id: 'test_wild', suit: 'special', rank: 99, isWild: true }
  const huWild = evaluateBaQueHand([...hand7, testWild])
  if (huWild) {
    tingList.push({
      rank: 99,
      handName: huWild.rankName,
      fan: huWild.totalFan
    })
    testedKeys.add('wild')
  }

  // 2. 测试 4 个花色及各点数
  for (const suit of SUITS) {
    for (const rank of BASE_RANKS) {
      const key = `${suit}_${rank}`
      if (testedKeys.has(key)) continue

      const testCard: Card = { id: `test_${key}`, suit, rank }
      const hu = evaluateBaQueHand([...hand7, testCard])
      if (hu) {
        tingList.push({
          rank,
          suit,
          handName: hu.rankName,
          fan: hu.totalFan
        })
        testedKeys.add(key)
      }
    }
  }

  return tingList
}

// AI 智能摸打决策
export function decideAIDiscard(player: BaQuePlayer): Card {
  const hand = player.cards
  if (hand.length <= 7) return hand[0]

  // 优先不打出万能牌
  const nonWilds = hand.filter(c => !isWildCard(c))
  if (nonWilds.length === 0) return hand[0]

  // 对每个可打出的牌评分：打出后剩余 7 张牌的听牌质量
  let bestCard = nonWilds[0]
  let bestScore = -999

  for (const card of nonWilds) {
    const rem7 = removeOneCard(hand, card)
    const tings = getTingCards(rem7)

    // 评分：能听的牌种类越多、总番数越高越好
    let score = tings.length * 10
    tings.forEach(t => { score += t.fan })

    // 尽量保留主角金牌 8
    if (card.isExtraEight || card.rank === 8) {
      score -= 15
    }

    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }

  return bestCard
}

// AI 问号牌 4 选 1 决策
export function decideAIChooseFrom4(aiHand7: Card[], candidates4: Card[]): Card {
  let bestCard = candidates4[0]
  let bestScore = -999

  for (const card of candidates4) {
    const testHand8 = [...aiHand7, card]
    const hu = evaluateBaQueHand(testHand8)

    // 如果选它能直接胡牌，拥有最高权重！
    if (hu) {
      return card
    }

    // 否则根据能否帮手牌大幅增加听牌潜力来选
    const ting = getTingCards(testHand8.slice(0, 7))
    let score = ting.length * 5
    if (isWildCard(card)) score += 50
    if (card.isExtraEight || card.rank === 8) score += 20

    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }

  return bestCard
}
