export type Suit = 'spade' | 'heart' | 'club' | 'diamond' // 黑桃、红桃、梅花、方块

export interface Card {
  suit: Suit
  rank: number // 2 - 14 (11=J, 12=Q, 13=K, 14=A)
  id: string
}

export type HandType = 
  | 'special_235'   // 特殊 235（不同花色）
  | 'high_card'     // 散牌/单张
  | 'pair'          // 对子
  | 'straight'      // 顺子
  | 'flush'         // 金花/同花
  | 'straight_flush'// 顺金/同花顺
  | 'set'           // 豹子/三同点

export interface EvaluatedHand {
  type: HandType
  typeName: string
  score: number     // 排序用综合分值
  cards: Card[]     // 排序后的手牌
  ranks: number[]   // 比较优先级的点数列表
}

export interface Player {
  id: string
  name: string
  avatar: string
  coins: number
  cards: Card[]
  evaluatedHand?: EvaluatedHand
  hasSeenCards: boolean
  isFolded: boolean
  isOut: boolean     // 输掉比牌或筹码耗尽出局
  currentBet: number // 本局累计投入筹码
  isHuman: boolean
  personality?: 'conservative' | 'aggressive' | 'calculative'
  statusText?: string
}

export type GameStage = 
  | 'idle'        // 等待开局
  | 'dealing'     // 发牌中
  | 'betting'     // 轮流行动中
  | 'pk'          // 比牌动画中
  | 'showdown'    // 最终亮牌结算
  | 'ended'       // 本局结束

export interface PKDuel {
  challenger: Player
  target: Player
  winnerId: string
  loserId: string
}
