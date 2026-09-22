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

export type TexasStage = 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended'

class TexasRoom {
  public id: string
  public name: string
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
        this.addLog(`玩家 [${p.nickname}] 离开了连接`)
        if (this.stage === 'idle' || this.stage === 'ended') {
          this.seats[idx] = null
          this.broadcastSnapshot()
        } else {
          p.isFolded = true
          p.ws = undefined
          this.checkBettingRoundComplete()
        }
      }
    })
  }

  private handleSitDown(ws: WebSocket, msg: { userId: string; nickname: string; avatar: string; chips: number; seatIndex?: number }) {
    // 检查是否已坐下
    const existing = this.seats.findIndex(s => s && s.userId === msg.userId)
    if (existing !== -1) {
      this.seats[existing]!.ws = ws
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
    const activePlayers = this.seats.filter(s => s && s.chips > this.bigBlind)
    if (activePlayers.length < 2) {
      this.stage = 'idle'
      this.addLog('⏳ 牌桌等待更多真实牌手入座 (满2人自动发牌)...')
      this.broadcastSnapshot()
      return
    }

    clearTimeout(this.turnTimeoutTimer)
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
        p.isFolded = p.chips <= 0
        p.isAllIn = false
        p.hasActedThisRound = false
        delete p.evaluatedHand
      }
    }

    // 移动庄家位
    this.dealerSeatIndex = this.findNextActiveSeat(this.dealerSeatIndex)

    // 盲注位置
    const sbSeat = this.findNextActiveSeat(this.dealerSeatIndex)
    const bbSeat = this.findNextActiveSeat(sbSeat)

    this.postBet(this.seats[sbSeat]!, this.smallBlind, '小盲注')
    this.postBet(this.seats[bbSeat]!, this.bigBlind, '大盲注')
    this.currentHighestBet = this.bigBlind

    // 翻牌前首先表态：大盲注左手位 (UTG 枪口位)
    this.activeSeatIndex = this.findNextActiveSeat(bbSeat)

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
    if (!p || p.ws !== ws) {
      ws.send(JSON.stringify({ type: 'error', message: '还未轮到您操作' }))
      return
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
        const targetBet = Math.max(this.currentHighestBet + this.bigBlind, amount || (this.currentHighestBet * 2))
        const need = targetBet - p.currentRoundBet
        const actual = Math.min(p.chips, need)
        p.chips -= actual
        p.currentRoundBet += actual
        p.totalHandBet += actual
        this.pot += actual
        this.currentHighestBet = p.currentRoundBet
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
    const alive = this.seats.filter(s => s && !s.isFolded)
    // 如果只剩 1 个人未弃牌，直接获胜
    if (alive.length === 1) {
      this.concludeSoloWinner(alive[0]!)
      return
    }

    // 检查是否所有活跃玩家都已表态且下注额持平 (或已经 All In)
    const needAct = alive.filter(s => !s.isAllIn)
    const allActed = needAct.every(s => s.hasActedThisRound && s.currentRoundBet === this.currentHighestBet)

    if (allActed || needAct.length <= 1 && alive.every(s => s.hasActedThisRound || s.isAllIn)) {
      this.advanceToNextStage()
    } else {
      this.activeSeatIndex = this.findNextActiveSeat(this.activeSeatIndex)
      this.broadcastSnapshot()
      this.startTurnTimer()
    }
  }

  private advanceToNextStage() {
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
    const cur = this.seats[this.activeSeatIndex]
    if (!cur) return

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

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', onlineRooms: rooms.size }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end('KKGame Texas Hold\'em Realtime Poker Server is running.')
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws: WebSocket, req) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const roomId = url.searchParams.get('roomId') || 'room_beginner'
  let room = rooms.get(roomId)
  if (!room) {
    const sb = Number(url.searchParams.get('sb') || 10)
    const bb = Number(url.searchParams.get('bb') || 20)
    const isShort = url.searchParams.get('short') === '1' || roomId.includes('short')
    const name = url.searchParams.get('name') ? decodeURIComponent(url.searchParams.get('name')!) : (isShort ? `短牌包厢 #${roomId.slice(-4)}` : `私人包厢 #${roomId.slice(-4)}`)
    room = new TexasRoom(roomId, name, sb, bb, isShort)
    rooms.set(roomId, room)
  }
  room.handleConnection(ws, url.searchParams)
})

server.listen(PORT, () => {
  console.log(`[KKGame] Texas Poker WebSocket Server running on port ${PORT}`)
})
