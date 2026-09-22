export type Suit = 'spade' | 'heart' | 'club' | 'diamond'

export interface Card {
  suit: Suit
  rank: number // 2 - 14 (11=J, 12=Q, 13=K, 14=A)
  id: string
}

export type TexasHandRank = 
  | 'high_card'       // 1. 高牌
  | 'one_pair'        // 2. 一对
  | 'two_pair'        // 3. 两对
  | 'three_of_a_kind' // 4. 三条
  | 'straight'        // 5. 顺子
  | 'flush'           // 6. 同花
  | 'full_house'      // 7. 葫芦 (3条 + 1对)
  | 'four_of_a_kind'  // 8. 四条 / 金刚
  | 'straight_flush'  // 9. 同花顺
  | 'royal_flush'     // 10. 皇家同花顺

export interface EvaluatedTexasHand {
  rank: TexasHandRank
  rankName: string
  score: number           // 用于完全排名的绝对分数
  bestFive: Card[]        // 7 选 5 出来的最佳 5 张牌
  tieBreakers: number[]   // 用于平局判定时的踢脚权重
}

export type TexasStage = 
  | 'idle'      // 准备中
  | 'preflop'   // 翻牌前 (发 2 张底牌，大小盲注)
  | 'flop'      // 翻牌圈 (发 3 张公共牌)
  | 'turn'      // 转牌圈 (发第 4 张公共牌)
  | 'river'     // 河牌圈 (发第 5 张公共牌)
  | 'showdown'  // 摊牌结算
  | 'ended'     // 本局结束

export type PlayerPosition = 'btn' | 'sb' | 'bb' | 'utg' | 'mp' | 'co'

export interface TexasPlayer {
  id: string
  name: string
  avatar: string
  chips: number          // 剩余筹码
  cards: Card[]          // 2 张底牌
  evaluatedHand?: EvaluatedTexasHand
  isFolded: boolean
  isAllIn: boolean
  hasActedThisRound: boolean // 本轮是否已经表态过
  currentRoundBet: number // 本轮已下注额
  totalHandBet: number    // 本局累计已投入总额
  isHuman: boolean
  position: PlayerPosition
  statusText?: string
  personality?: 'shark' | 'rock' | 'station' | 'master'
}
