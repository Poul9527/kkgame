import type * as Party from 'partykit/server'
import { createClient, type Client } from '@libsql/client/web'

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: number // 2~14 (14为Ace)
}

export interface PlayerSeat {
  userId: string
  nickname: string
  avatar: string
  chips: number
  seatIndex: number
  cards: Card[]
  currentBet: number
  totalRoundBet: number
  isFolded: boolean
  isAllIn: boolean
  isSittingOut: boolean
  connectionId: string
}

export type TexasStage = 'waiting' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended'

const SUITS: Card['suit'][] = ['spades', 'hearts', 'clubs', 'diamonds']

export default class TexasRoom implements Party.Server {
  private seats: (PlayerSeat | null)[] = Array(6).fill(null)
  private stage: TexasStage = 'waiting'
  private deck: Card[] = []
  private communityCards: Card[] = []
  private pot: number = 0
  private currentHighestBet: number = 0
  private activeSeatIndex: number = -1
  private dealerSeatIndex: number = 0
  private smallBlind: number = 10
  private bigBlind: number = 20
  private turnTimeoutTimer: any = null
  private readonly TURN_TIME_LIMIT = 15 // 每位玩家15秒思考时间

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // 下发当前牌桌公有快照给新连接者
    this.sendSnapshotTo(conn)
  }

  onClose(conn: Party.Connection) {
    const seatIdx = this.seats.findIndex(s => s && s.connectionId === conn.id)
    if (seatIdx !== -1 && this.seats[seatIdx]) {
      const p = this.seats[seatIdx]!
      p.isSittingOut = true
      this.broadcastState(`玩家 ${p.nickname} 暂时离线`)
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message)
      switch (data.type) {
        case 'sit_down':
          this.handleSitDown(sender, data)
          break
        case 'stand_up':
          this.handleStandUp(sender)
          break
        case 'action':
          this.handlePlayerAction(sender, data)
          break
        case 'start_hand':
          this.tryStartNewHand()
          break
      }
    } catch (e: any) {
      sender.send(JSON.stringify({ type: 'error', message: e.message }))
    }
  }

  // 1. 玩家坐下
  private handleSitDown(conn: Party.Connection, data: { userId: string; nickname: string; avatar: string; chips: number; seatIndex?: number }) {
    // 检查是否已经在席
    const existing = this.seats.findIndex(s => s && s.userId === data.userId)
    if (existing !== -1) {
      // 重新绑定连接
      this.seats[existing]!.connectionId = conn.id
      this.seats[existing]!.isSittingOut = false
      this.broadcastSnapshot()
      return
    }

    let targetSeat = data.seatIndex ?? -1
    if (targetSeat < 0 || targetSeat >= 6 || this.seats[targetSeat] !== null) {
      targetSeat = this.seats.findIndex(s => s === null)
    }

    if (targetSeat === -1) {
      conn.send(JSON.stringify({ type: 'error', message: '牌桌座位已满' }))
      return
    }

    this.seats[targetSeat] = {
      userId: data.userId,
      nickname: data.nickname || '牛仔玩家',
      avatar: data.avatar || '🤠',
      chips: Math.max(100, data.chips || 1000),
      seatIndex: targetSeat,
      cards: [],
      currentBet: 0,
      totalRoundBet: 0,
      isFolded: false,
      isAllIn: false,
      isSittingOut: false,
      connectionId: conn.id
    }

    this.broadcastState(`${this.seats[targetSeat]!.nickname} 坐上了 ${targetSeat + 1} 号座`)
    this.broadcastSnapshot()

    // 若当前牌局空闲且人数 >= 2，自动启动对局
    if (this.stage === 'waiting') {
      this.tryStartNewHand()
    }
  }

  // 2. 玩家离席
  private handleStandUp(conn: Party.Connection) {
    const seatIdx = this.seats.findIndex(s => s && s.connectionId === conn.id)
    if (seatIdx !== -1) {
      const p = this.seats[seatIdx]!
      this.seats[seatIdx] = null
      this.broadcastState(`${p.nickname} 离开了牌桌`)
      this.broadcastSnapshot()
    }
  }

  // 3. 尝试开始新一手牌
  private tryStartNewHand() {
    const activePlayers = this.seats.filter(s => s !== null && s.chips >= this.bigBlind && !s.isSittingOut)
    if (activePlayers.length < 2) {
      this.stage = 'waiting'
      this.broadcastSnapshot()
      return
    }

    // 重置牌桌状态
    this.clearTurnTimer()
    this.stage = 'preflop'
    this.pot = 0
    this.communityCards = []
    this.deck = this.createShuffledDeck()

    // 轮转庄家
    this.dealerSeatIndex = this.findNextOccupiedSeat(this.dealerSeatIndex)

    // 发底牌并重置各玩家手牌与下注
    this.seats.forEach(p => {
      if (p && !p.isSittingOut && p.chips >= this.bigBlind) {
        p.cards = [this.deck.pop()!, this.deck.pop()!]
        p.currentBet = 0
        p.totalRoundBet = 0
        p.isFolded = false
        p.isAllIn = false
      } else if (p) {
        p.cards = []
        p.isFolded = true
      }
    })

    // 扣除大小盲注
    const sbSeat = this.findNextOccupiedSeat(this.dealerSeatIndex)
    const bbSeat = this.findNextOccupiedSeat(sbSeat)

    this.placeBet(sbSeat, this.smallBlind)
    this.placeBet(bbSeat, this.bigBlind)
    this.currentHighestBet = this.bigBlind

    // 枪口位 UTG（大盲下一位）首先行动
    this.activeSeatIndex = this.findNextOccupiedSeat(bbSeat)

    this.broadcastSnapshot()
    this.startTurnTimer()
  }

  // 4. 玩家操作（Check / Call / Raise / Fold / All-in）
  private handlePlayerAction(conn: Party.Connection, actionData: { action: 'check' | 'call' | 'raise' | 'fold' | 'allin'; amount?: number }) {
    if (this.stage === 'waiting' || this.stage === 'ended' || this.activeSeatIndex === -1) return
    const currentSeat = this.seats[this.activeSeatIndex]
    if (!currentSeat || currentSeat.connectionId !== conn.id) {
      conn.send(JSON.stringify({ type: 'error', message: '尚未轮到您的回合' }))
      return
    }

    this.clearTurnTimer()
    const toCall = this.currentHighestBet - currentSeat.currentBet

    switch (actionData.action) {
      case 'fold':
        currentSeat.isFolded = true
        this.broadcastState(`${currentSeat.nickname} 弃牌`)
        break

      case 'check':
        if (toCall > 0) {
          conn.send(JSON.stringify({ type: 'error', message: '必须跟注或弃牌，无法免费过牌' }))
          this.startTurnTimer()
          return
        }
        this.broadcastState(`${currentSeat.nickname} 过牌`)
        break

      case 'call':
        this.placeBet(this.activeSeatIndex, toCall)
        this.broadcastState(`${currentSeat.nickname} 跟注 ${toCall}`)
        break

      case 'raise':
        const raiseAmount = Math.max(toCall + this.bigBlind, actionData.amount || (toCall + this.bigBlind))
        this.placeBet(this.activeSeatIndex, raiseAmount)
        this.currentHighestBet = currentSeat.currentBet
        this.broadcastState(`${currentSeat.nickname} 加注至 ${this.currentHighestBet}`)
        break

      case 'allin':
        const allInChips = currentSeat.chips
        this.placeBet(this.activeSeatIndex, allInChips)
        currentSeat.isAllIn = true
        if (currentSeat.currentBet > this.currentHighestBet) {
          this.currentHighestBet = currentSeat.currentBet
        }
        this.broadcastState(`${currentSeat.nickname} 孤注一掷 ALL-IN (${allInChips})`)
        break
    }

    this.advanceTurnOrStage()
  }

  // 推进回合或阶段
  private advanceTurnOrStage() {
    const unFolded = this.seats.filter(s => s && !s.isFolded)
    // 仅剩 1 位未弃牌玩家，直接胜出
    if (unFolded.length === 1) {
      this.settleSingleWinner(unFolded[0]!)
      return
    }

    // 检查本轮下注是否已平齐
    const needAction = this.seats.some(s => s && !s.isFolded && !s.isAllIn && s.currentBet < this.currentHighestBet)
    if (!needAction) {
      this.advanceStage()
    } else {
      this.activeSeatIndex = this.findNextActionableSeat(this.activeSeatIndex)
      this.broadcastSnapshot()
      this.startTurnTimer()
    }
  }

  private advanceStage() {
    // 收齐所有下注到底池
    this.seats.forEach(s => {
      if (s) {
        this.pot += s.currentBet
        s.totalRoundBet += s.currentBet
        s.currentBet = 0
      }
    })
    this.currentHighestBet = 0

    if (this.stage === 'preflop') {
      this.stage = 'flop'
      this.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!)
    } else if (this.stage === 'flop') {
      this.stage = 'turn'
      this.communityCards.push(this.deck.pop()!)
    } else if (this.stage === 'turn') {
      this.stage = 'river'
      this.communityCards.push(this.deck.pop()!)
    } else if (this.stage === 'river') {
      this.stage = 'showdown'
      this.settleShowdown()
      return
    }

    this.activeSeatIndex = this.findNextActionableSeat(this.dealerSeatIndex)
    this.broadcastSnapshot()
    this.startTurnTimer()
  }

  // 5. 独赢结算（其他人均已弃牌）
  private settleSingleWinner(winner: PlayerSeat) {
    this.seats.forEach(s => {
      if (s) {
        this.pot += s.currentBet
        s.currentBet = 0
      }
    })
    winner.chips += this.pot
    const winAmount = this.pot
    this.pot = 0
    this.stage = 'ended'
    this.activeSeatIndex = -1

    this.broadcastState(`🏆 恭喜 ${winner.nickname} 独揽底池 +${winAmount} 筹码！`)
    this.broadcastSnapshot()

    // 异步同步到 Turso 数据库
    this.syncWalletToDb(winner.userId, winAmount, 'texas_win')

    setTimeout(() => {
      this.stage = 'waiting'
      this.tryStartNewHand()
    }, 4500)
  }

  // 6. 摊牌结算 (Showdown)
  private settleShowdown() {
    this.clearTurnTimer()
    this.stage = 'ended'
    this.activeSeatIndex = -1

    const activeShowdowns = this.seats.filter(s => s && !s.isFolded)
    const winner = activeShowdowns[0] // 基础赢家裁决
    if (winner) {
      winner.chips += this.pot
      this.broadcastState(`🏆 摊牌结算：${winner.nickname} 胜出！赢得 ${this.pot} 筹码`)
      this.syncWalletToDb(winner.userId, this.pot, 'texas_win')
      this.pot = 0
    }

    this.broadcastSnapshot(true) // 摊牌阶段广播所有活跃手牌

    setTimeout(() => {
      this.stage = 'waiting'
      this.tryStartNewHand()
    }, 5500)
  }

  // 下注辅助
  private placeBet(seatIndex: number, amount: number) {
    const seat = this.seats[seatIndex]
    if (!seat) return
    const actual = Math.min(seat.chips, amount)
    seat.chips -= actual
    seat.currentBet += actual
  }

  private startTurnTimer() {
    this.clearTurnTimer()
    this.turnTimeoutTimer = setTimeout(() => {
      const active = this.seats[this.activeSeatIndex]
      if (active) {
        const toCall = this.currentHighestBet - active.currentBet
        if (toCall === 0) {
          this.broadcastState(`${active.nickname} 思考超时，系统自动过牌`)
        } else {
          active.isFolded = true
          this.broadcastState(`${active.nickname} 思考超时，系统自动弃牌`)
        }
        this.advanceTurnOrStage()
      }
    }, this.TURN_TIME_LIMIT * 1000)
  }

  private clearTurnTimer() {
    if (this.turnTimeoutTimer) {
      clearTimeout(this.turnTimeoutTimer)
      this.turnTimeoutTimer = null
    }
  }

  private findNextOccupiedSeat(fromIndex: number): number {
    for (let i = 1; i <= 6; i++) {
      const idx = (fromIndex + i) % 6
      if (this.seats[idx] !== null && !this.seats[idx]!.isSittingOut) {
        return idx
      }
    }
    return 0
  }

  private findNextActionableSeat(fromIndex: number): number {
    for (let i = 1; i <= 6; i++) {
      const idx = (fromIndex + i) % 6
      const s = this.seats[idx]
      if (s !== null && !s.isFolded && !s.isAllIn && !s.isSittingOut) {
        return idx
      }
    }
    return -1
  }

  private createShuffledDeck(): Card[] {
    const d: Card[] = []
    for (const suit of SUITS) {
      for (let rank = 2; rank <= 14; rank++) {
        d.push({ suit, rank })
      }
    }
    // Fisher-Yates 洗牌
    for (let i = d.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[d[i], d[j]] = [d[j], d[i]]
    }
    return d
  }

  // 严格防窥牌：对当前玩家发真实手牌，对其他玩家发占位符
  private getSanitizedSeats(viewerConnectionId: string, isShowdown: boolean = false) {
    return this.seats.map(s => {
      if (!s) return null
      const isMe = s.connectionId === viewerConnectionId
      return {
        ...s,
        connectionId: undefined,
        cards: (isMe || isShowdown) ? s.cards : s.cards.map(() => ({ suit: 'unknown', rank: 0 }))
      }
    })
  }

  private sendSnapshotTo(conn: Party.Connection, isShowdown: boolean = false) {
    conn.send(JSON.stringify({
      type: 'snapshot',
      stage: this.stage,
      pot: this.pot,
      communityCards: this.communityCards,
      activeSeatIndex: this.activeSeatIndex,
      dealerSeatIndex: this.dealerSeatIndex,
      currentHighestBet: this.currentHighestBet,
      turnTimeLimit: this.TURN_TIME_LIMIT,
      seats: this.getSanitizedSeats(conn.id, isShowdown)
    }))
  }

  private broadcastSnapshot(isShowdown: boolean = false) {
    for (const conn of this.room.getConnections()) {
      this.sendSnapshotTo(conn, isShowdown)
    }
  }

  private broadcastState(text: string) {
    this.room.broadcast(JSON.stringify({ type: 'announcement', text }))
  }

  private getDb(): Client | null {
    const url = (this.room.env.TURSO_DATABASE_URL as string) || (typeof process !== 'undefined' ? process.env?.TURSO_DATABASE_URL : undefined)
    const authToken = (this.room.env.TURSO_AUTH_TOKEN as string) || (typeof process !== 'undefined' ? process.env?.TURSO_AUTH_TOKEN : undefined)
    if (!url) return null
    return createClient({ url, authToken })
  }

  // 异步将输赢结算写入 Turso 数据库
  private async syncWalletToDb(userId: string, deltaCoins: number, type: string) {
    try {
      const client = this.getDb()
      if (client) {
        await client.execute({
          sql: `UPDATE wallets SET coins = coins + ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
          args: [deltaCoins, userId]
        })
      }
    } catch (e) {
      console.error('Failed to sync chips to Turso DB:', e)
    }
  }
}
