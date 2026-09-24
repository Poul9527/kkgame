import http from 'http'
import { WebSocketServer, WebSocket } from 'ws'
import { createClient, type Client } from '@libsql/client/web'
import { evaluateBest5OfCards, createDeck, shuffleDeck, getRankDisplay, getSuitSymbol } from '../src/games/texas/engine'
import type { Card, Suit, EvaluatedTexasHand } from '../src/games/texas/types'

const PORT = Number(process.env.PORT || 8787)
const TURSO_URL = process.env.TURSO_DATABASE_URL || 'libsql://kkgame-ethereal-taurus-tlo3ms.aws-us-east-2.turso.io'
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTAwOTY4MzgsImlkIjoiMDFhMGNhMTUtZTAwMS03NTllLWFjYmYtOGEwODgzMzBkZDkzIiwia2lkIjoiLVFZRUZPZGp3VEgtUlJWU29oSW52eWVjMFNLaVNYTzVPWGQxNlJheXVKQSIsInJpZCI6IjM0YmJhMGQwLThmNmItNGY3Ny1hZGRjLWQ1ODZhNDE4YjVlNCJ9.3AJeIytD0dhUbKx9noADN3QNqKMhfhD8B8GCkg7zcSYJAR8GuqO4UMpXbEiKxZw7GLRrH0KCLuPZ0NmUPNpSCg'

let db: Client | null = null
try {
  db = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN })
} catch (e) {
  console.warn('Turso client init warning:', e)
}

export interface PlayerSeat {
  userId: string
  nickname: string
  avatar: string
  chips: number
  seatIndex: number
  cards: Card[]
  currentRoundBet: number
  totalHandBet: number
  isFolded: boolean
  isAllIn: boolean
  hasActedThisRound: boolean
  isBot: boolean
  ws?: WebSocket
  evaluatedHand?: EvaluatedTexasHand
}

import { DrawRoomManager } from './drawServer.js'
import { UndercoverRoomManager } from './undercoverServer.js'

export type TexasStage = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended'

class TexasRoom {
  public id: string
  public name: string
  public hostUserId: string = ''
  public smallBlind: number
  public bigBlind: number
  public seats: (PlayerSeat | null)[] = Array(6).fill(null)
  public stage: TexasStage = 'idle'
  public deck: Card[] = []
  public communityCards: Card[] = []
  public pot: number = 0
  public currentHighestBet: number = 0
  public activeSeatIndex: number = -1
  public dealerSeatIndex: number = 0
  public turnTimeoutTimer: any = null
  public readonly TURN_TIME_LIMIT = 15
  public logMessages: { id: string; time: string; text: string; sender?: string }[] = []
  public isShortDeck: boolean = false
  public clients: Set<WebSocket> = new Set()

  constructor(id: string, name: string, sb: number, bb: number, isShortDeck = false) {
    this.id = id
    this.name = name
    this.smallBlind = sb
    this.bigBlind = bb
    this.isShortDeck = isShortDeck
    const deckType = isShortDeck ? '【短牌6+ (36张)】' : '【标准德州 (52张)】'
    this.addLog(`🎲 房间 [${name}] 已就绪，规则: ${deckType}，盲注: ${sb}/${bb}`)
  }

  public addLog(text: string, sender?: string) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    this.logMessages.push({
      id: Math.random().toString(36).slice(2),
      time,
      text,
      sender
    })
    if (this.logMessages.length > 50) this.logMessages.shift()
    this.broadcast({
      type: 'log',
      log: { time, text, sender }
    })
  }

  public handleConnection(ws: WebSocket, query: URLSearchParams) {
    this.clients.add(ws)

    const queryUserId = query.get('userId')
    if (queryUserId) {
      const existing = this.seats.find(s => s && s.userId === queryUserId)
      if (existing) {
        existing.ws = ws
        this.addLog(`⚡ [${existing.nickname}] 重新连线牌桌`)
      }
    }

    // 建立新连接时发送房间快照
    this.sendSnapshot(ws)

    ws.on('message', async (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'sit':
            this.handleSitDown(ws, msg)
            break
          case 'stand':
            this.handleStandUp(ws)
            break
          case 'rebuy':
            this.handleRebuy(ws, msg)
            break
          case 'action':
            this.handlePlayerAction(ws, msg)
            break
          case 'start_hand':
            this.tryStartNewHand()
            break
          case 'chat':
            this.handleChat(ws, msg)
            break
        }
      } catch (err: any) {
        ws.send(JSON.stringify({ type: 'error', message: err.message }))
      }
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      const idx = this.seats.findIndex(s => s && s.ws === ws)
      if (idx !== -1) {
        const p = this.seats[idx]!
        p.ws = undefined
        this.addLog(`🔌 玩家 [${p.nickname}] 网络连接暂时断开`)
        if (this.stage === 'idle' || this.stage === 'ended') {
          this.seats[idx] = null
          if (p.userId === this.hostUserId) {
            const next = this.seats.find(Boolean)
            this.hostUserId = next ? next.userId : ''
            if (next) this.addLog(`👑 [${next.nickname}] 成为新房主`)
          }
          this.broadcastSnapshot()
        }
      }
    })
  }

  private handleRebuy(ws: WebSocket, msg: { amount?: number }) {
    const p = this.seats.find(s => s && s.ws === ws)
    if (!p) return
    const addAmount = Math.max(this.bigBlind * 10, msg.amount || (this.bigBlind * 25))
    p.chips += addAmount
    p.isFolded = false
    p.isAllIn = false
    this.addLog(`🪙 [${p.nickname}] 补充带入 🪙${addAmount} 筹码 (现有: 🪙${p.chips})`)
    this.broadcastSnapshot()
    if (this.stage === 'idle' || this.stage === 'ended') {
      const seatedCount = this.seats.filter(Boolean).length
      if (seatedCount >= 2) {
        setTimeout(() => this.tryStartNewHand(), 1500)
      }
    }
  }

  private handleSitDown(ws: WebSocket, msg: { userId: string; nickname: string; avatar: string; chips: number; seatIndex?: number }) {
    if (!this.hostUserId) {
      this.hostUserId = msg.userId
    }

    // 检查是否已坐下
    const existing = this.seats.findIndex(s => s && s.userId === msg.userId)
    if (existing !== -1) {
      const player = this.seats[existing]!
      player.ws = ws
      const target = msg.seatIndex
      // 自由换座：点击另一个有效空座位直接瞬移换座
      if (target !== undefined && target >= 0 && target < 6 && target !== existing && this.seats[target] === null) {
        this.seats[existing] = null
        player.seatIndex = target
        this.seats[target] = player
        this.addLog(`🔄 [${player.nickname}] 换到了 ${target + 1} 号座`)
        this.broadcastSnapshot()
        return
      }
      this.sendSnapshot(ws)
      return
    }

    let target = msg.seatIndex ?? -1
    if (target < 0 || target >= 6 || this.seats[target] !== null) {
      target = this.seats.findIndex(s => s === null)
    }

    if (target === -1) {
      ws.send(JSON.stringify({ type: 'error', message: '牌桌座位已满' }))
      return
    }

    const buyIn = Math.max(this.bigBlind * 10, Math.min(msg.chips || 1000, 50000))
    this.seats[target] = {
      userId: msg.userId,
      nickname: msg.nickname || '匿名牌手',
      avatar: msg.avatar || '🤠',
      chips: buyIn,
      seatIndex: target,
      cards: [],
      currentRoundBet: 0,
      totalHandBet: 0,
      isFolded: false,
      isAllIn: false,
      hasActedThisRound: false,
      isBot: false,
      ws
    }

    this.addLog(`👋 [${msg.nickname}] 携带 🪙${buyIn} 坐下了 ${target + 1} 号座`)
    this.broadcastSnapshot()

    // 检查能否开局
    const seatedCount = this.seats.filter(Boolean).length
    if (seatedCount >= 2 && (this.stage === 'idle' || this.stage === 'ended')) {
      setTimeout(() => this.tryStartNewHand(), 1500)
    }
  }

  private handleStandUp(ws: WebSocket) {
    const idx = this.seats.findIndex(s => s && s.ws === ws)
    if (idx !== -1) {
      const p = this.seats[idx]!
      this.addLog(`🚪 [${p.nickname}] 离座离开牌桌`)
      this.seats[idx] = null
      if (p.userId === this.hostUserId) {
        const next = this.seats.find(Boolean)
        this.hostUserId = next ? next.userId : ''
        if (next) this.addLog(`👑 [${next.nickname}] 成为新房主`)
      }
      this.broadcastSnapshot()
      if (this.stage !== 'idle' && this.stage !== 'ended') {
        this.checkHandEnded()
      }
    }
  }

  private handleChat(ws: WebSocket, msg: { text: string; sender?: string }) {
    if (!msg.text || !msg.text.trim()) return
    const p = this.seats.find(s => s && s.ws === ws)
    const sender = p ? p.nickname : (msg.sender || '观战牌手')
    this.addLog(msg.text.trim(), sender)
  }

  public tryStartNewHand() {
    clearTimeout(this.turnTimeoutTimer)

    // 自动为筹码不足的玩家充值补给，确保牌局不卡顿
    for (let i = 0; i < 6; i++) {
      const p = this.seats[i]
      if (p && p.chips < this.bigBlind) {
        const reload = this.bigBlind * 25
        p.chips = reload
        p.isFolded = false
        p.isAllIn = false
        this.addLog(`🎁 [${p.nickname}] 筹码已补充至 🪙${reload}，重返牌局！`)
      }
    }

    const activePlayers = this.seats.filter(s => s && s.chips >= this.bigBlind)
    if (activePlayers.length < 2) {
      this.stage = 'idle'
      this.addLog('⏳ 牌桌等待更多真实牌手入座 (满2人自动发牌)...')
      this.broadcastSnapshot()
      return
    }

    this.stage = 'preflop'
    this.deck = shuffleDeck(createDeck(this.isShortDeck))
    this.communityCards = []
    this.pot = 0
    this.currentHighestBet = 0

    // 重置玩家本手状态
    for (let i = 0; i < 6; i++) {
      const p = this.seats[i]
      if (p) {
        p.cards = [this.deck.pop()!, this.deck.pop()!]
        p.currentRoundBet = 0
        p.totalHandBet = 0
        p.isFolded = false
        p.isAllIn = false
        p.hasActedThisRound = false
        delete p.evaluatedHand
      }
    }

    // 移动庄家位
    this.dealerSeatIndex = this.findNextActiveSeat(this.dealerSeatIndex)

    let sbSeat: number
    let bbSeat: number

    if (activePlayers.length === 2) {
      // 单挑模式 (Heads-Up):
      // 庄家位 (Button) 是小盲注，翻牌前首先表态！
      // 另一个玩家是大盲注！
      sbSeat = this.dealerSeatIndex
      bbSeat = this.findNextActiveSeat(this.dealerSeatIndex)
      this.activeSeatIndex = sbSeat
    } else {
      // 多人模式 (3人及以上):
      // 庄家左手位是小盲注，第二位是大盲注
      sbSeat = this.findNextActiveSeat(this.dealerSeatIndex)
      bbSeat = this.findNextActiveSeat(sbSeat)
      this.activeSeatIndex = this.findNextActiveSeat(bbSeat)
    }

    this.postBet(this.seats[sbSeat]!, this.smallBlind, '小盲注')
    this.postBet(this.seats[bbSeat]!, this.bigBlind, '大盲注')
    this.currentHighestBet = this.bigBlind

    this.addLog(`✨ --- 第 ${Date.now().toString().slice(-4)} 手德州扑克开始 ---`)
    this.broadcastSnapshot()
    this.startTurnTimer()
  }

  private postBet(player: PlayerSeat, amount: number, note: string) {
    const actualBet = Math.min(player.chips, amount)
    player.chips -= actualBet
    player.currentRoundBet += actualBet
    player.totalHandBet += actualBet
    this.pot += actualBet
    if (player.chips === 0) player.isAllIn = true
    this.addLog(`🪙 [${player.nickname}] 投入 ${note}: ${actualBet}`)
  }

  private handlePlayerAction(ws: WebSocket, msg: { action: 'fold' | 'check' | 'call' | 'raise' | 'allin'; amount?: number }) {
    if (this.stage === 'idle' || this.stage === 'ended' || this.stage === 'showdown') return
    const p = this.seats[this.activeSeatIndex]
    if (!p) return

    // 如果 ws 发生了重连，及时更新连接
    if (p.ws !== ws) {
      const matchWsPlayer = this.seats.find(s => s && s.ws === ws)
      if (matchWsPlayer && matchWsPlayer !== p) {
        ws.send(JSON.stringify({ type: 'error', message: '还未轮到您操作' }))
        return
      }
      p.ws = ws
    }

    this.executePlayerAction(p, msg.action, msg.amount)
  }

  private executePlayerAction(p: PlayerSeat, action: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) {
    clearTimeout(this.turnTimeoutTimer)
    p.hasActedThisRound = true

    switch (action) {
      case 'fold':
        p.isFolded = true
        this.addLog(`✋ [${p.nickname}] 弃牌 (Fold)`)
        break

      case 'check':
        if (p.currentRoundBet < this.currentHighestBet) {
          // 无法过牌，自动转为跟注或弃牌
          this.executePlayerAction(p, 'call')
          return
        }
        this.addLog(`👀 [${p.nickname}] 看牌 (Check)`)
        break

      case 'call': {
        const toCall = this.currentHighestBet - p.currentRoundBet
        const actual = Math.min(p.chips, toCall)
        p.chips -= actual
        p.currentRoundBet += actual
        p.totalHandBet += actual
        this.pot += actual
        if (p.chips === 0) p.isAllIn = true
        this.addLog(`👌 [${p.nickname}] 跟注: 🪙${actual}`)
        break
      }

      case 'raise': {
        const minTarget = this.currentHighestBet + this.bigBlind
        const targetBet = Math.max(minTarget, amount || (this.currentHighestBet * 2))
        const need = targetBet - p.currentRoundBet
        const actual = Math.min(p.chips, need)
        p.chips -= actual
        p.currentRoundBet += actual
        p.totalHandBet += actual
        this.pot += actual
        if (p.currentRoundBet > this.currentHighestBet) {
          this.currentHighestBet = p.currentRoundBet
        }
        if (p.chips === 0) p.isAllIn = true
        this.addLog(`🔥 [${p.nickname}] 加注到: 🪙${p.currentRoundBet}`)
        // 加注后其他未 AllIn 且未 Fold 的玩家需要重新表态
        for (const s of this.seats) {
          if (s && !s.isFolded && !s.isAllIn && s !== p) {
            s.hasActedThisRound = false
          }
        }
        break
      }

      case 'allin': {
        const actual = p.chips
        p.chips = 0
        p.currentRoundBet += actual
        p.totalHandBet += actual
        this.pot += actual
        p.isAllIn = true
        if (p.currentRoundBet > this.currentHighestBet) {
          this.currentHighestBet = p.currentRoundBet
          for (const s of this.seats) {
            if (s && !s.isFolded && !s.isAllIn && s !== p) {
              s.hasActedThisRound = false
            }
          }
        }
        this.addLog(`🚀 [${p.nickname}] 全下 ALL-IN! 🪙${actual}`)
        break
      }
    }

    this.checkBettingRoundComplete()
  }

  private checkBettingRoundComplete() {
    clearTimeout(this.turnTimeoutTimer)
    const alive = this.seats.filter(s => s && !s.isFolded)
    // 如果只剩 1 个人未弃牌，直接获胜
    if (alive.length <= 1) {
      if (alive.length === 1) this.concludeSoloWinner(alive[0]!)
      return
    }

    // 检查存活玩家中是否还有未 All-In 且有筹码的玩家
    const canBetPlayers = alive.filter(s => !s.isAllIn && s.chips > 0)

    // 所有能下注的玩家是否已行动且当前下注额平
    const allActed = canBetPlayers.every(s => s.hasActedThisRound && s.currentRoundBet === this.currentHighestBet)

    // 如果可行动玩家 <= 1（例如仅剩1人有筹码或全场All-In），只要当前轮下注额已平或者无人能加注，本轮下注结束
    if (canBetPlayers.length <= 1) {
      const betsMatched = alive.every(s => s.currentRoundBet === this.currentHighestBet || s.isAllIn)
      const hasAnyActed = alive.some(s => s.hasActedThisRound)
      if (betsMatched && (allActed || hasAnyActed || canBetPlayers.length === 0)) {
        this.advanceToNextStage()
        return
      }
    }

    if (allActed) {
      this.advanceToNextStage()
    } else {
      this.activeSeatIndex = this.findNextActiveSeat(this.activeSeatIndex)
      this.broadcastSnapshot()
      this.startTurnTimer()
    }
  }

  private advanceToNextStage() {
    clearTimeout(this.turnTimeoutTimer)

    // 重置本轮下注标记
    for (const s of this.seats) {
      if (s) {
        s.currentRoundBet = 0
        s.hasActedThisRound = false
      }
    }
    this.currentHighestBet = 0

    if (this.stage === 'preflop') {
      this.stage = 'flop'
      this.communityCards.push(this.deck.pop()!, this.deck.pop()!, this.deck.pop()!)
      this.addLog(`🃏 发出翻牌: ${this.communityCards.map(c => getRankDisplay(c.rank) + getSuitSymbol(c.suit)).join(' ')}`)
    } else if (this.stage === 'flop') {
      this.stage = 'turn'
      const turnCard = this.deck.pop()!
      this.communityCards.push(turnCard)
      this.addLog(`🃏 发出转牌: ${getRankDisplay(turnCard.rank) + getSuitSymbol(turnCard.suit)}`)
    } else if (this.stage === 'turn') {
      this.stage = 'river'
      const riverCard = this.deck.pop()!
      this.communityCards.push(riverCard)
      this.addLog(`🃏 发出河牌: ${getRankDisplay(riverCard.rank) + getSuitSymbol(riverCard.suit)}`)
    } else if (this.stage === 'river') {
      this.stage = 'showdown'
      this.handleShowdown()
      return
    }

    const alive = this.seats.filter(s => s && !s.isFolded)
    if (alive.length <= 1) {
      if (alive.length === 1) this.concludeSoloWinner(alive[0]!)
      return
    }

    // 检查是否还能继续下注（未 AllIn 且有筹码的存活玩家数量）
    const canBetPlayers = alive.filter(s => !s.isAllIn && s.chips > 0)

    if (canBetPlayers.length <= 1) {
      // 全场已 All-In 或仅剩 1 人有筹码（无法再有加注对决）：
      // 启动自动发牌秀牌流程 (All-In Runout)，每街等待 1.5 秒动画后自动推进
      this.activeSeatIndex = -1
      this.broadcastSnapshot()
      setTimeout(() => {
        this.advanceToNextStage()
      }, 1500)
      return
    }

    // 新一轮下注从庄家左手位第一个存活玩家开始
    this.activeSeatIndex = this.findNextActiveSeat(this.dealerSeatIndex)
    this.broadcastSnapshot()
    this.startTurnTimer()
  }

  private handleShowdown() {
    const contenders = this.seats.filter(s => s && !s.isFolded) as PlayerSeat[]
    contenders.forEach(p => {
      p.evaluatedHand = evaluateBest5OfCards([...p.cards, ...this.communityCards], this.isShortDeck)
    })

    // 按牌型分值降序排列
    contenders.sort((a, b) => b.evaluatedHand!.score - a.evaluatedHand!.score)
    const winningScore = contenders[0].evaluatedHand!.score
    const winners = contenders.filter(c => c.evaluatedHand!.score === winningScore)
    const winAmount = Math.floor(this.pot / winners.length)

    for (const w of winners) {
      w.chips += winAmount
      this.addLog(`🏆 胜出者: [${w.nickname}] 赢取 🪙${winAmount}！牌型: ${w.evaluatedHand!.rankName}`)
      if (!w.isBot) {
        this.syncDbCoins(w.userId, winAmount, 'texas_win')
      }
    }

    // 记录输家
    for (const p of contenders) {
      if (!winners.includes(p) && !p.isBot) {
        this.syncDbCoins(p.userId, -p.totalHandBet, 'texas_bet')
      }
    }

    this.stage = 'ended'
    this.broadcastSnapshot(true) // showdown 发送亮牌

    // 5秒后开启下一把
    setTimeout(() => {
      this.tryStartNewHand()
    }, 5000)
  }

  private concludeSoloWinner(winner: PlayerSeat) {
    winner.chips += this.pot
    this.addLog(`🏆 其余玩家均弃牌，[${winner.nickname}] 赢取底池 🪙${this.pot}！`)
    if (!winner.isBot) {
      this.syncDbCoins(winner.userId, this.pot, 'texas_fold_win')
    }
    this.stage = 'ended'
    this.broadcastSnapshot()
    setTimeout(() => {
      this.tryStartNewHand()
    }, 4000)
  }

  private startTurnTimer() {
    clearTimeout(this.turnTimeoutTimer)
    if (this.activeSeatIndex < 0) return
    const cur = this.seats[this.activeSeatIndex]
    if (!cur || cur.isFolded || cur.isAllIn) return

    // 真人玩家 15 秒倒计时
    this.turnTimeoutTimer = setTimeout(() => {
      const p = this.seats[this.activeSeatIndex]
      if (p && !p.isFolded && !p.isAllIn) {
        this.addLog(`⏰ [${p.nickname}] 思考超时，系统自动处理`)
        if (p.currentRoundBet >= this.currentHighestBet) {
          this.executePlayerAction(p, 'check')
        } else {
          this.executePlayerAction(p, 'fold')
        }
      }
    }, this.TURN_TIME_LIMIT * 1000)
  }

  private findNextActiveSeat(fromSeat: number): number {
    for (let step = 1; step <= 6; step++) {
      const idx = (fromSeat + step) % 6
      const s = this.seats[idx]
      if (s && !s.isFolded && !s.isAllIn && s.chips > 0) {
        return idx
      }
    }
    // 找不到下一个未 AllIn 的，返回当前或第一个存活者
    const alive = this.seats.findIndex(s => s && !s.isFolded)
    return alive !== -1 ? alive : 0
  }

  private getMaskedSeats(targetWs?: WebSocket, isShowdown = false) {
    return this.seats.map(s => {
      if (!s) return null
      const isMe = s.ws && targetWs && s.ws === targetWs
      return {
        userId: s.userId,
        nickname: s.nickname,
        avatar: s.avatar,
        chips: s.chips,
        seatIndex: s.seatIndex,
        currentRoundBet: s.currentRoundBet,
        totalHandBet: s.totalHandBet,
        isFolded: s.isFolded,
        isAllIn: s.isAllIn,
        isBot: s.isBot,
        evaluatedHand: (isShowdown || isMe) ? s.evaluatedHand : undefined,
        cards: (isMe || isShowdown || s.isFolded && false)
          ? s.cards
          : s.cards.map(() => ({ suit: 'spade', rank: 0, id: 'masked' }))
      }
    })
  }

  private sendSnapshot(ws: WebSocket, isShowdown = false) {
    if (ws.readyState !== WebSocket.OPEN) return
    ws.send(JSON.stringify({
      type: 'snapshot',
      room: {
        id: this.id,
        name: this.name,
        hostUserId: this.hostUserId,
        smallBlind: this.smallBlind,
        bigBlind: this.bigBlind,
        stage: this.stage,
        pot: this.pot,
        communityCards: this.communityCards,
        currentHighestBet: this.currentHighestBet,
        activeSeatIndex: this.activeSeatIndex,
        dealerSeatIndex: this.dealerSeatIndex,
        turnTimeLimit: this.TURN_TIME_LIMIT,
        isShortDeck: this.isShortDeck,
        seats: this.getMaskedSeats(ws, isShowdown),
        logs: this.logMessages.slice(-20)
      }
    }))
  }

  public broadcastSnapshot(isShowdown = false) {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSnapshot(ws, isShowdown)
      }
    }
  }

  public broadcast(data: any) {
    const raw = JSON.stringify(data)
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(raw)
      }
    }
  }

  private async syncDbCoins(userId: string, deltaCoins: number, type: string) {
    if (!db) return
    try {
      await db.execute({
        sql: `UPDATE wallets SET coins = MAX(0, coins + ?), updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
        args: [deltaCoins, userId]
      })
    } catch (e) {
      console.error('Failed to sync chips to Turso DB:', e)
    }
  }
}

// 房间管理器 (标准德州 + 短牌 6+ 德扑)
const rooms = new Map<string, TexasRoom>()
rooms.set('room_beginner', new TexasRoom('room_beginner', '标准·微额欢乐桌 🟢', 10, 20, false))
rooms.set('room_pro', new TexasRoom('room_pro', '标准·进阶竞技桌 🟡', 50, 100, false))
rooms.set('room_master', new TexasRoom('room_master', '标准·豪客巅峰桌 🔴', 200, 400, false))
rooms.set('room_short_1', new TexasRoom('room_short_1', '短牌6+·热血微额桌 ⚡', 10, 20, true))
rooms.set('room_short_pro', new TexasRoom('room_short_pro', '短牌6+·狂暴巅峰桌 🔥', 50, 100, true))

// 派对游戏管理器 (你画我猜 + 谁是卧底)
const drawManager = new DrawRoomManager()
const undercoverManager = new UndercoverRoomManager()

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', onlineRooms: rooms.size }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('KKGame Realtime Multiplayer Gaming Hub is running.')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const game = url.searchParams.get('game') || ''
  const roomId = url.searchParams.get('roomId') || ''

  // 1. 你画我猜
  if (game === 'draw' || roomId.startsWith('draw_') || roomId.startsWith('draw')) {
    drawManager.handleConnection(ws, url.searchParams)
    return
  }

  // 2. 谁是卧底
  if (game === 'undercover' || roomId.startsWith('undercover_') || roomId.startsWith('undercover')) {
    undercoverManager.handleConnection(ws, url.searchParams)
    return
  }

  // 3. 德州扑克 (默认)
  const targetRoomId = roomId || 'room_beginner'
  let room = rooms.get(targetRoomId)
  if (!room) {
    const sb = Number(url.searchParams.get('sb') || 10)
    const bb = Number(url.searchParams.get('bb') || 20)
    const isShort = url.searchParams.get('short') === '1' || targetRoomId.includes('short')
    const name = url.searchParams.get('name') ? decodeURIComponent(url.searchParams.get('name')!) : (isShort ? `短牌包厢 #${targetRoomId.slice(-4)}` : `私人包厢 #${targetRoomId.slice(-4)}`)
    room = new TexasRoom(targetRoomId, name, sb, bb, isShort)
    rooms.set(targetRoomId, room)
  }
  room.handleConnection(ws, url.searchParams)
})

server.listen(PORT, () => {
  console.log(`[KKGame] Texas Poker WebSocket Server running on port ${PORT}`)
})
