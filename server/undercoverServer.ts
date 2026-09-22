import { WebSocket } from 'ws'

export interface UndercoverPlayer {
  userId: string
  nickname: string
  avatar: string
  seatIndex: number
  isUndercover: boolean
  isAlive: boolean
  hasSpoken: boolean
  votedTargetIndex: number | null
  receivedVotes: number
  lastSpeech: string
  ws: WebSocket
}

export interface UndercoverRoomSnapshot {
  id: string
  name: string
  hostUserId: string
  stage: 'waiting' | 'revealing' | 'speaking' | 'voting' | 'spy_guess' | 'ended'
  activeSpeakerIndex: number
  speakerNickname?: string
  myWord?: string
  myRole?: 'civilian' | 'undercover'
  round: number
  turnTimeLeft: number
  eliminatedPlayerName?: string
  winnerSide?: 'civilians' | 'undercover'
  civilianWord?: string // 仅在 ended 阶段公开
  spyWord?: string      // 仅在 ended 阶段公开
  seats: (Omit<UndercoverPlayer, 'ws' | 'isUndercover'> & { isUndercover?: boolean })[]
  logs: { id: string; time: string; text: string; sender?: string }[]
}

const UNDERCOVER_WORD_PAIRS = [
  { civilian: '麦当劳', spy: '肯德基' },
  { civilian: '微信', spy: 'QQ' },
  { civilian: '可口可乐', spy: '百事可乐' },
  { civilian: '火锅', spy: '麻辣烫' },
  { civilian: '蓝牙', spy: 'WiFi' },
  { civilian: '自行车', spy: '电动车' },
  { civilian: '降落伞', spy: '热气球' },
  { civilian: '班主任', spy: '辅导员' },
  { civilian: '牛奶', spy: '豆浆' },
  { civilian: '蜘蛛侠', spy: '蝙蝠侠' },
  { civilian: '支付宝', spy: '微信支付' },
  { civilian: '眉毛', spy: '睫毛' },
  { civilian: '口红', spy: '唇膏' },
  { civilian: '玫瑰', spy: '月季' },
  { civilian: '水盆', spy: '水桶' },
  { civilian: '围巾', spy: '领带' },
  { civilian: '辣椒', spy: '芥末' },
  { civilian: '羽毛球', spy: '网球' },
  { civilian: '晴天', spy: '阴天' },
  { civilian: '烤肉', spy: '烧烤' }
]

export class UndercoverRoom {
  public id: string
  public name: string
  public hostUserId: string = ''
  public seats: (UndercoverPlayer | null)[] = Array(6).fill(null)
  public clients: Set<WebSocket> = new Set()
  public stage: 'waiting' | 'revealing' | 'speaking' | 'voting' | 'spy_guess' | 'ended' = 'waiting'
  public civilianWord: string = ''
  public spyWord: string = ''
  public activeSpeakerIndex: number = -1
  public round: number = 0
  public turnTimeLeft: number = 20
  public timer: any = null
  public eliminatedPlayer: UndercoverPlayer | null = null
  public winnerSide: 'civilians' | 'undercover' | null = null
  public logs: { id: string; time: string; text: string; sender?: string }[] = []

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
    this.addLog(`🕵️ 房间 [${name}] 已开启，等待探员入座，房主可开启暗号对决！`)
  }

  public addLog(text: string, sender?: string) {
    const time = new Date().toLocaleTimeString('zh-CN', { hour12: false })
    this.logs.push({
      id: Math.random().toString(36).slice(2),
      time,
      text,
      sender
    })
    if (this.logs.length > 50) this.logs.shift()
    this.broadcast({
      type: 'log',
      log: { time, text, sender }
    })
  }

  public handleConnection(ws: WebSocket, query: URLSearchParams) {
    this.clients.add(ws)
    this.sendSnapshot(ws)

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString())
        switch (msg.type) {
          case 'sit':
            this.handleSitDown(ws, msg)
            break
          case 'stand':
            this.handleStandUp(ws)
            break
          case 'start_game':
            this.handleStartGame(ws)
            break
          case 'speak':
            this.handlePlayerSpeech(ws, msg.text)
            break
          case 'vote':
            this.handleVote(ws, msg.targetIndex)
            break
          case 'spy_guess':
            this.handleSpyGuess(ws, msg.guess)
            break
          case 'chat':
            this.handleChat(ws, msg)
            break
        }
      } catch (e: any) {
        ws.send(JSON.stringify({ type: 'error', message: e.message }))
      }
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      const idx = this.seats.findIndex(s => s && s.ws === ws)
      if (idx !== -1) {
        const player = this.seats[idx]!
        this.addLog(`🚪 [${player.nickname}] 离开了房间`)
        this.seats[idx] = null

        // 移交房主
        if (player.userId === this.hostUserId) {
          const nextHost = this.seats.find(Boolean)
          this.hostUserId = nextHost ? nextHost.userId : ''
          if (nextHost) {
            this.addLog(`👑 [${nextHost.nickname}] 继承为新房主`)
          }
        }

        // 如果游戏中玩家掉线，检查是否影响胜负
        if (this.stage !== 'waiting' && this.stage !== 'ended') {
          this.checkGameWinCondition()
        } else {
          this.broadcastSnapshot()
        }
      }
    })
  }

  private handleSitDown(ws: WebSocket, msg: { userId: string; nickname: string; avatar: string; seatIndex?: number }) {
    if (!this.hostUserId) {
      this.hostUserId = msg.userId
    }

    const existingIdx = this.seats.findIndex(s => s && s.userId === msg.userId)
    if (existingIdx !== -1) {
      const player = this.seats[existingIdx]!
      player.ws = ws
      // 随时换座
      const target = msg.seatIndex
      if (target !== undefined && target >= 0 && target < 6 && target !== existingIdx && this.seats[target] === null) {
        this.seats[existingIdx] = null
        player.seatIndex = target
        this.seats[target] = player
        if (this.activeSpeakerIndex === existingIdx) {
          this.activeSpeakerIndex = target
        }
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
      ws.send(JSON.stringify({ type: 'error', message: '房间座位已满' }))
      return
    }

    this.seats[target] = {
      userId: msg.userId,
      nickname: msg.nickname || '探员',
      avatar: msg.avatar || '🕵️',
      seatIndex: target,
      isUndercover: false,
      isAlive: true,
      hasSpoken: false,
      votedTargetIndex: null,
      receivedVotes: 0,
      lastSpeech: '',
      ws
    }

    this.addLog(`👋 [${msg.nickname}] 坐下了 ${target + 1} 号座`)
    this.broadcastSnapshot()
  }

  private handleStandUp(ws: WebSocket) {
    const idx = this.seats.findIndex(s => s && s.ws === ws)
    if (idx !== -1) {
      const p = this.seats[idx]!
      this.addLog(`🚪 [${p.nickname}] 离座起立`)
      this.seats[idx] = null
      if (p.userId === this.hostUserId) {
        const nextHost = this.seats.find(Boolean)
        this.hostUserId = nextHost ? nextHost.userId : ''
      }
      this.broadcastSnapshot()
    }
  }

  private handleStartGame(ws: WebSocket) {
    const p = this.seats.find(s => s && s.ws === ws)
    if (!p || p.userId !== this.hostUserId) {
      ws.send(JSON.stringify({ type: 'error', message: '只有房主可以开启对局！' }))
      return
    }

    const seated = this.seats.filter(Boolean) as UndercoverPlayer[]
    if (seated.length < 3) {
      ws.send(JSON.stringify({ type: 'error', message: '谁是卧底至少需要 3 名在席真人玩家！' }))
      return
    }

    // 随机分配 1 个卧底
    const pair = UNDERCOVER_WORD_PAIRS[Math.floor(Math.random() * UNDERCOVER_WORD_PAIRS.length)]
    this.civilianWord = pair.civilian
    this.spyWord = pair.spy

    const spyIndexInSeated = Math.floor(Math.random() * seated.length)

    seated.forEach((player, i) => {
      player.isUndercover = (i === spyIndexInSeated)
      player.isAlive = true
      player.hasSpoken = false
      player.votedTargetIndex = null
      player.receivedVotes = 0
      player.lastSpeech = ''
    })

    this.round = 1
    this.stage = 'revealing'
    this.eliminatedPlayer = null
    this.winnerSide = null
    this.addLog(`🚀 房主 [${p.nickname}] 开启了暗号派对！绝密词汇已下发，请点击卡片查看！`)
    this.broadcastSnapshot()

    // 5 秒后自动进入首位玩家发言阶段
    clearInterval(this.timer)
    this.timer = setTimeout(() => {
      this.startSpeakingRound()
    }, 5000)
  }

  private startSpeakingRound() {
    this.stage = 'speaking'
    // 重置本轮发言
    this.seats.forEach(s => {
      if (s) {
        s.hasSpoken = false
        s.votedTargetIndex = null
        s.receivedVotes = 0
      }
    })

    const aliveIndices = this.seats
      .map((s, idx) => (s && s.isAlive ? idx : -1))
      .filter(i => i !== -1)

    this.activeSpeakerIndex = aliveIndices[0]
    const speaker = this.seats[this.activeSpeakerIndex]!
    this.addLog(`📢 第 ${this.round} 轮发言开始！请 [${speaker.nickname}] 描述你的词汇！`)
    this.startSpeakerTimer()
    this.broadcastSnapshot()
  }

  private startSpeakerTimer() {
    clearInterval(this.timer)
    this.turnTimeLeft = 25
    this.timer = setInterval(() => {
      this.turnTimeLeft--
      if (this.turnTimeLeft <= 0) {
        clearInterval(this.timer)
        this.nextSpeaker()
      }
    }, 1000)
  }

  private handlePlayerSpeech(ws: WebSocket, text: string) {
    if (this.stage !== 'speaking') return
    const speaker = this.seats[this.activeSpeakerIndex]
    if (!speaker || speaker.ws !== ws) return

    speaker.lastSpeech = text.trim()
    speaker.hasSpoken = true
    this.addLog(`🗣️ [${speaker.nickname}]: "${speaker.lastSpeech}"`)
    this.nextSpeaker()
  }

  private nextSpeaker() {
    clearInterval(this.timer)
    const speaker = this.seats[this.activeSpeakerIndex]
    if (speaker) speaker.hasSpoken = true

    const aliveIndices = this.seats
      .map((s, idx) => (s && s.isAlive ? idx : -1))
      .filter(i => i !== -1)

    const currentPos = aliveIndices.indexOf(this.activeSpeakerIndex)
    if (currentPos !== -1 && currentPos < aliveIndices.length - 1) {
      // 下一位存活玩家发言
      this.activeSpeakerIndex = aliveIndices[currentPos + 1]
      const nextP = this.seats[this.activeSpeakerIndex]!
      this.addLog(`👉 轮到 [${nextP.nickname}] 发言描述！`)
      this.startSpeakerTimer()
      this.broadcastSnapshot()
    } else {
      // 全员发言完毕，进入投票淘汰阶段
      this.startVotingStage()
    }
  }

  private startVotingStage() {
    clearInterval(this.timer)
    this.stage = 'voting'
    this.turnTimeLeft = 20
    this.addLog(`🗳️ 全员发言完毕！请大家投票指认心中的潜伏卧底！(限时20秒)`)
    this.broadcastSnapshot()

    this.timer = setInterval(() => {
      this.turnTimeLeft--
      if (this.turnTimeLeft <= 0) {
        clearInterval(this.timer)
        this.tallyVotesAndEliminate()
      }
    }, 1000)
  }

  private handleVote(ws: WebSocket, targetIndex: number) {
    if (this.stage !== 'voting') return
    const voter = this.seats.find(s => s && s.ws === ws)
    if (!voter || !voter.isAlive) return
    const target = this.seats[targetIndex]
    if (!target || !target.isAlive) return

    voter.votedTargetIndex = targetIndex
    // 重新统计票数
    this.seats.forEach(s => {
      if (s) s.receivedVotes = 0
    })
    this.seats.forEach(s => {
      if (s && s.isAlive && s.votedTargetIndex !== null) {
        const t = this.seats[s.votedTargetIndex]
        if (t) t.receivedVotes++
      }
    })

    this.broadcastSnapshot()

    // 如果所有存活玩家都已经投了票，提前结算
    const alivePlayers = this.seats.filter(s => s && s.isAlive) as UndercoverPlayer[]
    const allVoted = alivePlayers.every(s => s.votedTargetIndex !== null)
    if (allVoted) {
      clearInterval(this.timer)
      this.tallyVotesAndEliminate()
    }
  }

  private tallyVotesAndEliminate() {
    const alivePlayers = this.seats.filter(s => s && s.isAlive) as UndercoverPlayer[]
    if (alivePlayers.length === 0) return

    // 找出得票最多者
    alivePlayers.sort((a, b) => b.receivedVotes - a.receivedVotes)
    const highest = alivePlayers[0]

    // 检查是否有平票
    const isTie = alivePlayers.length > 1 && alivePlayers[0].receivedVotes === alivePlayers[1].receivedVotes && alivePlayers[0].receivedVotes > 0

    if (isTie || highest.receivedVotes === 0) {
      this.addLog(`⚖️ 票数持平或无人被投出，本轮无人被放逐！`)
      this.round++
      setTimeout(() => this.startSpeakingRound(), 3000)
      return
    }

    highest.isAlive = false
    this.eliminatedPlayer = highest
    this.addLog(`💥 [${highest.nickname}] 以 ${highest.receivedVotes} 票被全场公投放逐出局！`)

    // 判断被淘汰的是否是卧底
    if (highest.isUndercover) {
      this.addLog(`⚡ 卧底被揪出！进入【卧底绝地反猜】环节！`)
      this.stage = 'spy_guess'
      this.turnTimeLeft = 20
      this.broadcastSnapshot()

      this.timer = setInterval(() => {
        this.turnTimeLeft--
        if (this.turnTimeLeft <= 0) {
          clearInterval(this.timer)
          this.endGame('civilians', '卧底超时未反猜成功！平民大获全胜！')
        }
      }, 1000)
    } else {
      this.addLog(`😭 惨剧！[${highest.nickname}] 是无辜平民！卧底仍在潜伏！`)
      this.checkGameWinCondition()
    }
  }

  private handleSpyGuess(ws: WebSocket, guess: string) {
    if (this.stage !== 'spy_guess' || !this.eliminatedPlayer) return
    if (this.eliminatedPlayer.ws !== ws) return

    clearInterval(this.timer)
    const cleanGuess = guess.trim().toLowerCase()
    const cleanWord = this.civilianWord.trim().toLowerCase()

    if (cleanGuess === cleanWord) {
      this.endGame('undercover', `🔥 卧底 [${this.eliminatedPlayer.nickname}] 成功猜出平民词【${this.civilianWord}】！绝地逆袭胜利！`)
    } else {
      this.endGame('civilians', `❌ 卧底猜词错误（猜了【${guess}】）！正确词为【${this.civilianWord}】！平民胜利！`)
    }
  }

  private checkGameWinCondition() {
    const aliveUndercovers = this.seats.filter(s => s && s.isAlive && s.isUndercover).length
    const aliveCivilians = this.seats.filter(s => s && s.isAlive && !s.isUndercover).length

    if (aliveUndercovers === 0) {
      this.endGame('civilians', `🎉 潜伏卧底已全数出局！平民阵营胜利！`)
    } else if (aliveUndercovers >= aliveCivilians) {
      this.endGame('undercover', `👿 卧底人数已追平或超越平民！卧底阵营取得完全胜利！`)
    } else {
      // 继续下一轮
      this.round++
      setTimeout(() => this.startSpeakingRound(), 3000)
    }
  }

  private endGame(winner: 'civilians' | 'undercover', reason: string) {
    clearInterval(this.timer)
    this.stage = 'ended'
    this.winnerSide = winner
    this.addLog(`🏆 游戏结束：${reason}`)
    this.addLog(`📖 平民词：【${this.civilianWord}】 | 卧底词：【${this.spyWord}】`)
    this.broadcastSnapshot()
  }

  private handleChat(ws: WebSocket, msg: { text: string; sender?: string }) {
    if (!msg.text || !msg.text.trim()) return
    const p = this.seats.find(s => s && s.ws === ws)
    const sender = p ? p.nickname : (msg.sender || '观众')
    this.addLog(msg.text.trim(), sender)
  }

  public sendSnapshot(ws: WebSocket) {
    if (ws.readyState !== WebSocket.OPEN) return
    const me = this.seats.find(s => s && s.ws === ws)
    const isGameOver = this.stage === 'ended'
    const speaker = this.activeSpeakerIndex >= 0 ? this.seats[this.activeSpeakerIndex] : null

    const snapshot: UndercoverRoomSnapshot = {
      id: this.id,
      name: this.name,
      hostUserId: this.hostUserId,
      stage: this.stage,
      activeSpeakerIndex: this.activeSpeakerIndex,
      speakerNickname: speaker ? speaker.nickname : undefined,
      myWord: me ? (me.isUndercover ? this.spyWord : this.civilianWord) : undefined,
      myRole: me ? (me.isUndercover ? 'undercover' : 'civilian') : undefined,
      round: this.round,
      turnTimeLeft: this.turnTimeLeft,
      eliminatedPlayerName: this.eliminatedPlayer?.nickname,
      winnerSide: this.winnerSide || undefined,
      civilianWord: isGameOver ? this.civilianWord : undefined,
      spyWord: isGameOver ? this.spyWord : undefined,
      seats: this.seats.map(s => s ? {
        userId: s.userId,
        nickname: s.nickname,
        avatar: s.avatar,
        seatIndex: s.seatIndex,
        isAlive: s.isAlive,
        hasSpoken: s.hasSpoken,
        votedTargetIndex: s.votedTargetIndex,
        receivedVotes: s.receivedVotes,
        lastSpeech: s.lastSpeech,
        isUndercover: isGameOver ? s.isUndercover : undefined
      } : null),
      logs: this.logs.slice(-25)
    }

    ws.send(JSON.stringify({ type: 'snapshot', room: snapshot }))
  }

  public broadcastSnapshot() {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendSnapshot(ws)
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
}

export class UndercoverRoomManager {
  private rooms = new Map<string, UndercoverRoom>()

  constructor() {
    this.rooms.set('undercover_1', new UndercoverRoom('undercover_1', '🕵️ 谁是卧底 1 号包厢'))
    this.rooms.set('undercover_2', new UndercoverRoom('undercover_2', '🕵️ 烧脑推演 2 号包厢'))
  }

  public getOrCreateRoom(roomId: string, name?: string): UndercoverRoom {
    let r = this.rooms.get(roomId)
    if (!r) {
      r = new UndercoverRoom(roomId, name || `卧底包厢 #${roomId.slice(-4)}`)
      this.rooms.set(roomId, r)
    }
    return r
  }

  public handleConnection(ws: WebSocket, query: URLSearchParams) {
    const roomId = query.get('roomId') || 'undercover_1'
    const name = query.get('name') ? decodeURIComponent(query.get('name')!) : undefined
    const room = this.getOrCreateRoom(roomId, name)
    room.handleConnection(ws, query)
  }
}
