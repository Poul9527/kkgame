export type Suit = 'spade' | 'heart' | 'club' | 'diamond' | 'special'

export interface Card {
  id: string
  suit: Suit
  rank: number // 6..14 (11=J, 12=Q, 13=K, 14=A), 99=Wild百变, 100=Question问号
  isExtraEight?: boolean // 额外的 4 张金牌 8
  isWild?: boolean       // 百变牌 🃏 (万能替代)
  isQuestion?: boolean   // 问号牌 ❓ (打出触发牌堆顶 4 选 1)
}

export type BaQueHandRank = 
  | 'yi_tiao_long'    // 一条龙 (80番)
  | 'shuang_zha'      // 双炸 (50番)
  | 'qing_yi_se'      // 清一色 (40番)
  | 'si_dui'          // 四对子 (30番)
  | 'peng_peng'       // 碰碰胡 (20番)
  | 'ping_hu'         // 平胡 3+3+2 (10番)

export interface HandMeld {
  type: 'sequence' | 'triplet' | 'pair' | 'kong' | 'dragon'
  cards: Card[]
}

export interface EvaluatedBaQueHand {
  rank: BaQueHandRank
  rankName: string
  baseFan: number
  bonusFan: number      // 八雀生威 (+10), 硬胡 (+10) 等
  totalFan: number
  hasExtraEight: boolean
  isHardHu: boolean     // 无百变纯天然硬胡
  melds: HandMeld[]
}

export interface HuRecord {
  round: number
  handName: string
  fan: number
  coins: number
  isRenBoosted: boolean
  renCount: number
}

export interface BaQuePlayer {
  id: string
  name: string
  avatar: string
  chips: number
  cards: Card[]           // 当前手牌 (平时 7 张，摸牌时 8 张)
  drawnCard?: Card | null // 本轮新摸入的第 8 张牌
  discards: Card[]        // 面前打出的弃牌
  huRecords: HuRecord[]   // 本局已达成的胡牌记录
  renCount: number        // 累计“忍”标记数量
  isHuman: boolean
  statusText?: string
  personality?: 'aggressive' | 'steady' | 'gambler'
}

export type BaQueStage = 
  | 'idle'
  | 'swap2'               // 开局换两张阶段
  | 'playing'             // 正常摸打阶段
  | 'question_selecting'  // 问号牌 4 选 1 弹窗选择中
  | 'ended'               // 牌库打空大结算
