import type { Card, Suit, TexasHandRank, EvaluatedTexasHand, TexasPlayer } from './types'

const SUITS: Suit[] = ['spade', 'heart', 'club', 'diamond']
const RANKS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]

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

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function getRankDisplay(rank: number): string {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

export function getSuitSymbol(suit: Suit): string {
  switch (suit) {
    case 'spade': return '♠'
    case 'heart': return '♥'
    case 'club': return '♣'
    case 'diamond': return '♦'
  }
}

export function getSuitColor(suit: Suit): string {
  return suit === 'heart' || suit === 'diamond' ? '#ef4444' : '#0f172a'
}

// 辅助组合生成算法：从数组中选出 k 个元素的所有组合
function getCombinations<T>(arr: T[], k: number): T[][] {
  if (k === arr.length) return [arr]
  if (k === 1) return arr.map(el => [el])
  const combinations: T[][] = []
  for (let i = 0; i <= arr.length - k; i++) {
    const head = arr[i]
    const tailCombos = getCombinations(arr.slice(i + 1), k - 1)
    for (const tail of tailCombos) {
      combinations.push([head, ...tail])
    }
  }
  return combinations
}

// 评定精准的 5 张牌牌型
function evaluate5Cards(cards: Card[]): EvaluatedTexasHand {
  const sorted = [...cards].sort((a, b) => b.rank - a.rank)
  const ranks = sorted.map(c => c.rank)
  const isFlush = sorted.every(c => c.suit === sorted[0].suit)

  // 顺子检测 (支持普通顺与 A-2-3-4-5 轮转小顺)
  let isNormalStraight = true
  for (let i = 0; i < 4; i++) {
    if (ranks[i] - ranks[i + 1] !== 1) {
      isNormalStraight = false
      break
    }
  }
  const isA2345 = ranks[0] === 14 && ranks[1] === 5 && ranks[2] === 4 && ranks[3] === 3 && ranks[4] === 2
  const isStraight = isNormalStraight || isA2345
  const straightHigh = isA2345 ? 5 : ranks[0]

  // 统计同点数数量
  const counts: Record<number, number> = {}
  ranks.forEach(r => { counts[r] = (counts[r] || 0) + 1 })
  const countEntries = Object.entries(counts).map(([r, count]) => ({ rank: Number(r), count }))
  countEntries.sort((a, b) => b.count - a.count || b.rank - a.rank)

  // 1. 皇家同花顺 (Royal Flush)
  if (isFlush && isNormalStraight && ranks[0] === 14) {
    return {
      rank: 'royal_flush',
      rankName: '皇家同花顺 👑',
      score: 9000000,
      bestFive: sorted,
      tieBreakers: [14]
    }
  }

  // 2. 同花顺 (Straight Flush)
  if (isFlush && isStraight) {
    return {
      rank: 'straight_flush',
      rankName: `同花顺 (${getRankDisplay(straightHigh)}高) 🌟`,
      score: 8000000 + straightHigh,
      bestFive: sorted,
      tieBreakers: [straightHigh]
    }
  }

  // 3. 四条 / 金刚 (Four of a Kind)
  if (countEntries[0].count === 4) {
    const quad = countEntries[0].rank
    const kicker = countEntries[1].rank
    return {
      rank: 'four_of_a_kind',
      rankName: `四条 ${getRankDisplay(quad)} 💣`,
      score: 7000000 + quad * 100 + kicker,
      bestFive: sorted,
      tieBreakers: [quad, kicker]
    }
  }

  // 4. 葫芦 (Full House, 3带2)
  if (countEntries[0].count === 3 && countEntries[1].count === 2) {
    const trip = countEntries[0].rank
    const pair = countEntries[1].rank
    return {
      rank: 'full_house',
      rankName: `葫芦 (${getRankDisplay(trip)}满${getRankDisplay(pair)}) 🏰`,
      score: 6000000 + trip * 100 + pair,
      bestFive: sorted,
      tieBreakers: [trip, pair]
    }
  }

  // 5. 同花 (Flush)
  if (isFlush) {
    const score = 5000000 + ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4]
    return {
      rank: 'flush',
      rankName: `同花 (${getRankDisplay(ranks[0])}高) 🌺`,
      score,
      bestFive: sorted,
      tieBreakers: ranks
    }
  }

  // 6. 顺子 (Straight)
  if (isStraight) {
    return {
      rank: 'straight',
      rankName: `顺子 (${getRankDisplay(straightHigh)}高) ⚡`,
      score: 4000000 + straightHigh,
      bestFive: sorted,
      tieBreakers: [straightHigh]
    }
  }

  // 7. 三条 (Three of a Kind)
  if (countEntries[0].count === 3) {
    const trip = countEntries[0].rank
    const k1 = countEntries[1].rank
    const k2 = countEntries[2].rank
    return {
      rank: 'three_of_a_kind',
      rankName: `三条 ${getRankDisplay(trip)} 🎯`,
      score: 3000000 + trip * 1000 + k1 * 10 + k2,
      bestFive: sorted,
      tieBreakers: [trip, k1, k2]
    }
  }

  // 8. 两对 (Two Pair)
  if (countEntries[0].count === 2 && countEntries[1].count === 2) {
    const p1 = Math.max(countEntries[0].rank, countEntries[1].rank)
    const p2 = Math.min(countEntries[0].rank, countEntries[1].rank)
    const kicker = countEntries[2].rank
    return {
      rank: 'two_pair',
      rankName: `两对 (${getRankDisplay(p1)}与${getRankDisplay(p2)}) 👥`,
      score: 2000000 + p1 * 1000 + p2 * 50 + kicker,
      bestFive: sorted,
      tieBreakers: [p1, p2, kicker]
    }
  }

  // 9. 一对 (One Pair)
  if (countEntries[0].count === 2) {
    const pair = countEntries[0].rank
    const k1 = countEntries[1].rank
    const k2 = countEntries[2].rank
    const k3 = countEntries[3].rank
    return {
      rank: 'one_pair',
      rankName: `一对 ${getRankDisplay(pair)} 🎲`,
      score: 1000000 + pair * 10000 + k1 * 100 + k2 * 10 + k3,
      bestFive: sorted,
      tieBreakers: [pair, k1, k2, k3]
    }
  }

  // 10. 高牌 (High Card)
  const score = ranks[0] * 10000 + ranks[1] * 1000 + ranks[2] * 100 + ranks[3] * 10 + ranks[4]
  return {
    rank: 'high_card',
    rankName: `高牌 ${getRankDisplay(ranks[0])} 🃏`,
    score,
    bestFive: sorted,
    tieBreakers: ranks
  }
}

// 核心：从 5 到 7 张牌中选出最强的 5 张 (7 选 5 最佳组合)
export function evaluateBest5OfCards(allCards: Card[]): EvaluatedTexasHand {
  if (allCards.length < 5) {
    // 牌少于 5 张时的手牌简单预估
    const sorted = [...allCards].sort((a, b) => b.rank - a.rank)
    if (allCards.length === 2 && allCards[0].rank === allCards[1].rank) {
      return {
        rank: 'one_pair',
        rankName: `底牌对 ${getRankDisplay(allCards[0].rank)}`,
        score: 1000000 + allCards[0].rank * 10000,
        bestFive: sorted,
        tieBreakers: [allCards[0].rank]
      }
    }
    return {
      rank: 'high_card',
      rankName: sorted.length ? `${getRankDisplay(sorted[0].rank)}高` : '未发牌',
      score: sorted.length ? sorted[0].rank * 1000 : 0,
      bestFive: sorted,
      tieBreakers: sorted.map(c => c.rank)
    }
  }

  // 生成所有的 5 张牌组合 (最多 21 种)
  const combos = getCombinations(allCards, 5)
  let bestResult = evaluate5Cards(combos[0])

  for (let i = 1; i < combos.length; i++) {
    const current = evaluate5Cards(combos[i])
    if (current.score > bestResult.score) {
      bestResult = current
    }
  }

  return bestResult
}

// 比较两名玩家的最强 5 张牌 (返回 > 0 为 playerA 赢，< 0 为 playerB 赢，= 0 为平分底池)
export function compareTexasHands(handA: EvaluatedTexasHand, handB: EvaluatedTexasHand): number {
  if (handA.score !== handB.score) {
    return handA.score > handB.score ? 1 : -1
  }
  // 若分值相同，比对踢脚 tieBreakers
  const len = Math.min(handA.tieBreakers.length, handB.tieBreakers.length)
  for (let i = 0; i < len; i++) {
    if (handA.tieBreakers[i] !== handB.tieBreakers[i]) {
      return handA.tieBreakers[i] > handB.tieBreakers[i] ? 1 : -1
    }
  }
  return 0
}

export type TexasAction = 
  | { type: 'check' }
  | { type: 'call'; amount: number }
  | { type: 'raise'; amount: number }
  | { type: 'allin' }
  | { type: 'fold' }

// 拟真 AI 行为决策 (大幅强化拿到大牌时的价值下注、激进加注与半诈唬意识)
export function decideTexasAI(
  ai: TexasPlayer,
  communityCards: Card[],
  currentHighestBet: number,
  pot: number,
  bigBlind: number
): TexasAction {
  const callNeeded = currentHighestBet - ai.currentRoundBet
  const allCards = [...ai.cards, ...communityCards]
  const evaluated = evaluateBest5OfCards(allCards)
  const personality = ai.personality || 'rock'

  // ==========================================
  // 1. 翻牌前决策 (Pre-Flop: 仅有 2 张底牌)
  // ==========================================
  if (communityCards.length === 0) {
    const c1 = ai.cards[0].rank
    const c2 = ai.cards[1].rank
    const isPair = c1 === c2
    const high = Math.max(c1, c2)
    const low = Math.min(c1, c2)
    const isSuited = ai.cards[0].suit === ai.cards[1].suit

    // A. 顶级天赐好牌 (AA, KK, QQ, JJ, 10-10, AK)
    const isPremium = (isPair && high >= 10) || (high === 14 && low >= 12)
    if (isPremium) {
      // 拿到顶级起手牌，所有性格 AI 均有 70%~95% 的超高概率发起加注 (Raise) 造大底池！
      const raiseProb = personality === 'shark' ? 0.95 : (personality === 'rock' ? 0.85 : 0.7)
      if (Math.random() < raiseProb) {
        const raiseAmt = Math.max(bigBlind * 3, Math.floor(currentHighestBet * 2.5))
        return { type: 'raise', amount: raiseAmt }
      }
      return callNeeded === 0 ? { type: 'check' } : { type: 'call', amount: callNeeded }
    }

    // B. 优质强牌 (99, 88, 77, AQ, AJ, KQ, KJ, 同花高张)
    const isStrong = (isPair && high >= 7) || (high >= 12 && low >= 10) || (high === 14 && isSuited)
    if (isStrong) {
      const raiseProb = personality === 'shark' ? 0.7 : (personality === 'rock' ? 0.55 : 0.4)
      if (Math.random() < raiseProb) {
        return { type: 'raise', amount: bigBlind * 2 }
      }
      return callNeeded === 0 ? { type: 'check' } : { type: 'call', amount: callNeeded }
    }

    // C. 可投机牌 (中低对子 66-22, 同花连张, 带 A 弱牌)
    const isSpeculative = isPair || (high === 14) || (isSuited && high >= 9) || (high - low === 1 && high >= 8)
    if (isSpeculative) {
      if (personality === 'shark' && Math.random() < 0.35 && callNeeded <= bigBlind * 2) {
        return { type: 'raise', amount: bigBlind * 2 }
      }
      if (callNeeded <= bigBlind * 2) {
        return callNeeded === 0 ? { type: 'check' } : { type: 'call', amount: callNeeded }
      }
      return personality === 'station' && callNeeded <= bigBlind * 3 ? { type: 'call', amount: callNeeded } : { type: 'fold' }
    }

    // D. 垃圾杂牌
    if (callNeeded === 0) return { type: 'check' }
    if (personality === 'station' && callNeeded <= bigBlind && Math.random() < 0.25) {
      return { type: 'call', amount: callNeeded }
    }
    return { type: 'fold' }
  }

  // ==========================================
  // 2. 翻牌后决策 (Flop, Turn, River)
  // ==========================================
  const rankScores: Record<TexasHandRank, number> = {
    royal_flush: 10,
    straight_flush: 9,
    four_of_a_kind: 8,
    full_house: 7,
    flush: 6,
    straight: 5,
    three_of_a_kind: 4,
    two_pair: 3,
    one_pair: 2,
    high_card: 1
  }

  const strengthTier = rankScores[evaluated.rank]

  // A. 传说/天王级成牌 (同花顺、四条、葫芦、同花: Tier >= 6) -> 必须重锤出击！
  if (strengthTier >= 6) {
    // 筹码量较少时直接 All-In
    if (ai.chips <= pot * 0.8 && Math.random() < 0.7) {
      return { type: 'allin' }
    }

    // 若当前无人加注 (callNeeded === 0)，绝不可一味 Check，必须主动下注打出价值 (Value Bet)！
    if (callNeeded === 0) {
      const betAmt = Math.max(bigBlind * 2, Math.floor(pot * 0.65))
      return { type: 'raise', amount: betAmt }
    }

    // 若有人下注，80%~95% 超高概率强力再加注 (Re-Raise)！
    const raiseProb = personality === 'shark' ? 0.95 : (personality === 'rock' ? 0.88 : 0.78)
    if (Math.random() < raiseProb) {
      const raiseAmt = Math.max(bigBlind * 2, Math.floor(pot * 0.75))
      return { type: 'raise', amount: raiseAmt }
    }
    return { type: 'call', amount: callNeeded }
  }

  // B. 极强成牌 (顺子、三条: Tier 4 或 5)
  if (strengthTier >= 4) {
    if (callNeeded === 0) {
      // 75% 概率主动开枪下注打价值
      const betProb = personality === 'shark' ? 0.88 : (personality === 'rock' ? 0.8 : 0.65)
      if (Math.random() < betProb) {
        const betAmt = Math.max(bigBlind * 2, Math.floor(pot * 0.55))
        return { type: 'raise', amount: betAmt }
      }
      return { type: 'check' }
    }

    // 面对对手下注，75% 概率反加注
    const reRaiseProb = personality === 'shark' ? 0.82 : (personality === 'rock' ? 0.72 : 0.55)
    if (Math.random() < reRaiseProb) {
      const raiseAmt = Math.max(bigBlind * 2, Math.floor(pot * 0.55))
      return { type: 'raise', amount: raiseAmt }
    }
    return { type: 'call', amount: callNeeded }
  }

  // C. 良好成牌 (两对: Tier 3)
  if (strengthTier === 3) {
    if (callNeeded === 0) {
      // 65% 概率主动下注保护手牌
      const betProb = personality === 'shark' ? 0.78 : (personality === 'rock' ? 0.68 : 0.5)
      if (Math.random() < betProb) {
        const betAmt = Math.max(bigBlind * 2, Math.floor(pot * 0.45))
        return { type: 'raise', amount: betAmt }
      }
      return { type: 'check' }
    }

    // 面对对手下注
    if (callNeeded <= pot * 0.65 || personality === 'station') {
      if (Math.random() < (personality === 'shark' ? 0.5 : 0.35)) {
        return { type: 'raise', amount: Math.max(bigBlind * 2, Math.floor(pot * 0.45)) }
      }
      return { type: 'call', amount: callNeeded }
    }
    return personality === 'rock' ? { type: 'fold' } : { type: 'call', amount: callNeeded }
  }

  // D. 普通成牌 (一对: Tier 2)
  if (strengthTier === 2) {
    const commRanks = communityCards.map(c => c.rank)
    const maxCommRank = commRanks.length ? Math.max(...commRanks) : 0
    const myPairRank = evaluated.tieBreakers[0] || 0
    const isTopPair = myPairRank >= maxCommRank

    if (callNeeded === 0) {
      // 顶对 (Top Pair) 拥有 50%~65% 概率主动下注持续施压 (C-Bet)
      if (isTopPair && Math.random() < (personality === 'shark' ? 0.65 : 0.45)) {
        return { type: 'raise', amount: Math.max(bigBlind * 2, Math.floor(pot * 0.35)) }
      }
      return { type: 'check' }
    }

    // 面对对手下注时
    if (isTopPair) {
      if (callNeeded <= pot * 0.5 || personality === 'station') {
        if (personality === 'shark' && Math.random() < 0.3) {
          return { type: 'raise', amount: bigBlind * 2 }
        }
        return { type: 'call', amount: callNeeded }
      }
      return personality === 'rock' ? { type: 'fold' } : { type: 'call', amount: callNeeded }
    } else {
      // 中底对
      if (callNeeded <= bigBlind * 2 || (personality === 'station' && callNeeded <= pot * 0.3)) {
        return { type: 'call', amount: callNeeded }
      }
      return { type: 'fold' }
    }
  }

  // E. 散牌 / 听牌 (高牌: Tier 1)
  const suitsCount: Record<string, number> = {}
  allCards.forEach(c => { suitsCount[c.suit] = (suitsCount[c.suit] || 0) + 1 })
  const hasFlushDraw = Object.values(suitsCount).some(cnt => cnt === 4)

  if (callNeeded === 0) {
    // 听同花或激进鲨鱼有 30% 几率进行半诈唬 (Semi-Bluff) 下注
    if ((hasFlushDraw || personality === 'shark') && Math.random() < 0.35) {
      return { type: 'raise', amount: Math.max(bigBlind * 2, Math.floor(pot * 0.4)) }
    }
    return { type: 'check' }
  }

  // 听同花且赔率划算时跟注
  if (hasFlushDraw && callNeeded <= pot * 0.4) {
    return { type: 'call', amount: callNeeded }
  }

  if (personality === 'station' && callNeeded <= bigBlind && Math.random() < 0.25) {
    return { type: 'call', amount: callNeeded }
  }

  return { type: 'fold' }
}

export interface PotSlice {
  name: string
  amount: number
  eligiblePlayerIds: string[]
  winnerPlayerIds: string[]
  sharePerWinner: number
}

export interface SettlementResult {
  payouts: Record<string, number> // playerId -> total chips won / returned
  slices: PotSlice[]
  uncalledRefunds: Record<string, number> // playerId -> uncalled bet refund
}

// 国际标准主池、边池与未跟注退款切片结算算法 (Pot Slicing Algorithm)
export function distributeTexasPot(
  allPlayers: TexasPlayer[],
  compareHandsFn: (a: EvaluatedTexasHand, b: EvaluatedTexasHand) => number
): SettlementResult {
  const payouts: Record<string, number> = {}
  allPlayers.forEach(p => { payouts[p.id] = 0 })
  const uncalledRefunds: Record<string, number> = {}

  // 1. 获取所有参与下注的玩家
  const contributors = allPlayers.filter(p => p.totalHandBet > 0)
  if (contributors.length === 0) {
    return { payouts, slices: [], uncalledRefunds }
  }

  // 若只有 1 位未弃牌玩家（其他人全部弃牌）
  const activeUnfolded = allPlayers.filter(p => !p.isFolded)
  if (activeUnfolded.length === 1) {
    const soleWinner = activeUnfolded[0]
    const totalPot = contributors.reduce((sum, p) => sum + p.totalHandBet, 0)
    payouts[soleWinner.id] = totalPot
    return {
      payouts,
      slices: [{
        name: '底池独得',
        amount: totalPot,
        eligiblePlayerIds: [soleWinner.id],
        winnerPlayerIds: [soleWinner.id],
        sharePerWinner: totalPot
      }],
      uncalledRefunds
    }
  }

  // 2. 边池与主池分层切片算法
  // 找出所有不同投注额级别（升序）
  const distinctBetLevels = Array.from(
    new Set(contributors.map(p => p.totalHandBet))
  ).sort((a, b) => a - b)

  const slices: PotSlice[] = []
  let previousLevel = 0

  for (let i = 0; i < distinctBetLevels.length; i++) {
    const currentLevel = distinctBetLevels[i]
    const levelDiff = currentLevel - previousLevel
    if (levelDiff <= 0) continue

    // 在这一档位有贡献的玩家（含弃牌者贡献的死钱）
    const levelContributors = contributors.filter(p => p.totalHandBet >= currentLevel)
    const sliceAmount = levelDiff * levelContributors.length

    // 这一档位有资格争夺该池的玩家（必须贡献达到此档位且未弃牌）
    const eligibleContenders = levelContributors.filter(p => !p.isFolded)

    if (eligibleContenders.length === 0) {
      continue
    }

    if (eligibleContenders.length === 1) {
      // 只有 1 人达到此档位且未弃牌 -> 属于未被跟注的超额 All-In (Uncalled Bet Refund)
      const refundPlayer = eligibleContenders[0]
      payouts[refundPlayer.id] += sliceAmount
      uncalledRefunds[refundPlayer.id] = (uncalledRefunds[refundPlayer.id] || 0) + sliceAmount
      slices.push({
        name: '未跟注退款',
        amount: sliceAmount,
        eligiblePlayerIds: [refundPlayer.id],
        winnerPlayerIds: [refundPlayer.id],
        sharePerWinner: sliceAmount
      })
    } else {
      // 2 人及以上争夺此池：比较各自的最佳 5 张牌
      let winners: TexasPlayer[] = [eligibleContenders[0]]

      for (let j = 1; j < eligibleContenders.length; j++) {
        const contender = eligibleContenders[j]
        const currentWinner = winners[0]

        if (!contender.evaluatedHand || !currentWinner.evaluatedHand) continue

        const cmp = compareHandsFn(contender.evaluatedHand, currentWinner.evaluatedHand)
        if (cmp > 0) {
          winners = [contender]
        } else if (cmp === 0) {
          winners.push(contender)
        }
      }

      // 平分该切片池
      const share = Math.floor(sliceAmount / winners.length)
      const remainder = sliceAmount % winners.length

      winners.forEach((w, wIdx) => {
        const actualWin = share + (wIdx < remainder ? 1 : 0)
        payouts[w.id] += actualWin
      })

      const potName = slices.length === 0 ? '主底池 (Main Pot)' : `边池 (Side Pot ${slices.length})`
      slices.push({
        name: potName,
        amount: sliceAmount,
        eligiblePlayerIds: eligibleContenders.map(p => p.id),
        winnerPlayerIds: winners.map(p => p.id),
        sharePerWinner: share
      })
    }

    previousLevel = currentLevel
  }

  return { payouts, slices, uncalledRefunds }
}
