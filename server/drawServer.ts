import { WebSocket } from 'ws'

export interface DrawStroke {
  x1: number
  y1: number
  x2: number
  y2: number
  color: string
  size: number
  isEraser: boolean
  isNew?: boolean
}

export interface DrawPlayer {
  userId: string
  nickname: string
  avatar: string
  seatIndex: number
  score: number
  hasGuessed: boolean
  ws: WebSocket
}

export interface DrawRoomSnapshot {
  id: string
  name: string
  hostUserId: string
  stage: 'waiting' | 'drawing' | 'round_end' | 'game_over'
  currentDrawerIndex: number
  drawerNickname?: string
  currentWordLength: number
  currentHint: string
  // 只有画师自己能看到真实题目，其他人为 undefined
  secretWord?: string
  timeLeft: number
  round: number
  totalRounds: number
  seats: (Omit<DrawPlayer, 'ws'> | null)[]
  logs: { id: string; time: string; text: string; sender?: string }[]
}

const DRAW_WORDS_BANK = [
  { word: '皮卡丘', hint: '3个字 · 动漫角色' },
  { word: '火锅', hint: '2个字 · 美食佳肴' },
  { word: '奥特曼', hint: '3个字 · 超级英雄' },
  { word: '大熊猫', hint: '3个字 · 国宝动物' },
  { word: '奶茶', hint: '2个字 · 快乐饮品' },
  { word: '汉堡包', hint: '3个字 · 西式快餐' },
  { word: '蜘蛛侠', hint: '3个字 · 漫威超级英雄' },
  { word: '小猪佩奇', hint: '4个字 · 动画萌物' },
  { word: '冰淇淋', hint: '3个字 · 夏日甜品' },
  { word: '长颈鹿', hint: '3个字 · 陆地长脖动物' },
  { word: '海绵宝宝', hint: '4个字 · 海底搞笑角色' },
  { word: '自行车', hint: '3个字 · 绿色交通工具' },
  { word: '东方明珠', hint: '4个字 · 著名建筑地标' },
  { word: '孙悟空', hint: '3个字 · 神话齐天大圣' },
  { word: '哆啦A梦', hint: '4个字 · 万能机器猫' },
  { word: '小龙虾', hint: '3个字 · 宵夜顶流美食' },
  { word: '吉他', hint: '2个字 · 弹拨乐器' },
  { word: '埃菲尔铁塔', hint: '5个字 · 世界浪漫地标' },
  { word: '烤鸭', hint: '2个字 · 北京地标名菜' },
  { word: '企鹅', hint: '2个字 · 南极绅士' },
  { word: '披萨', hint: '2个字 · 意式烘焙美食' },
  { word: '袋鼠', hint: '2个字 · 澳洲有袋动物' },
  { word: '柯南', hint: '2个字 · 名侦探小学生' },
  { word: '向日葵', hint: '3个字 · 追逐太阳的植物' }
]

export class DrawRoom {
  public id: string
  public name: string
  public hostUserId: string = ''
  public seats: (DrawPlayer | null)[] = Array(6).fill(null)
  public clients: Set<WebSocket> = new Set()
  public stage: 'waiting' | 'drawing' | 'round_end' | 'game_over' = 'waiting'
  public currentDrawerIndex: number = -1
  public currentWord: string = ''
  public currentHint: string = ''
  public strokes: DrawStroke[] = []
  public round: number = 0
  public totalRounds: number = 2
  public timeLeft: number = 60
  public timer: any = null
  public logs: { id: string; time: string; text: string; sender?: string }[] = []

  constructor(id: string, name: string) {
    this.id = id
    this.name = name
    this.addLog(`🎨 房间 [${name}] 已开启，等待玩家入座与房主发车！`)
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

    // 发送画板已有全部历史笔画
    if (this.strokes.length > 0) {
      ws.send(JSON.stringify({ type: 'draw_history', strokes: this.strokes }))
    }

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
          case 'draw_stroke':
            this.handleStroke(ws, msg.stroke)
            break
          case 'draw_clear':
            this.handleClear(ws)
            break
          case 'draw_undo':
            this.handleUndo(ws)
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
        this.addLog(`👋 [${player.nickname}] 离开了房间`)
        this.seats[idx] = null

        // 移交房主
        if (player.userId === this.hostUserId) {
          const nextHost = this.seats.find(Boolean)
          this.hostUserId = nextHost ? nextHost.userId : ''
          if (nextHost) {
            this.addLog(`👑 [${nextHost.nickname}] 继承为新房主`)
          }
        }

        // 如果掉线的是正在画画的画师，提前结算并切下一人
        if (this.stage === 'drawing' && idx === this.currentDrawerIndex) {
          this.addLog(`⚠️ 当前画师断开，跳过本轮进入下一位！`)
          this.nextTurn()
        } else {
          this.broadcastSnapshot()
        }
      }
    })
  }

  private handleSitDown(ws: WebSocket, msg: { userId: string; nickname: string; avatar: string; seatIndex?: number }) {
    // 检查是否已经是房主
    if (!this.hostUserId) {
      this.hostUserId = msg.userId
    }

    const existingIdx = this.seats.findIndex(s => s && s.userId === msg.userId)
    if (existingIdx !== -1) {
      const player = this.seats[existingIdx]!
      player.ws = ws
      // 自由换座：点击另一个空座位
      const target = msg.seatIndex
      if (target !== undefined && target >= 0 && target < 6 && target !== existingIdx && this.seats[target] === null) {
        this.seats[existingIdx] = null
        player.seatIndex = target
        this.seats[target] = player
        if (this.currentDrawerIndex === existingIdx) {
          this.currentDrawerIndex = target
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
      nickname: msg.nickname || '画友',
      avatar: msg.avatar || '🎨',
      seatIndex: target,
      score: 0,
      hasGuessed: false,
      ws
    }

    this.addLog(`👋 [${msg.nickname}] 坐下了 ${target + 1} 号座`)
    this.broadcastSnapshot()
  }

  private handleStandUp(ws: WebSocket) {
    const idx = this.seats.findIndex(s => s && s.ws === ws)
    if (idx !== -1) {
      const p = this.seats[idx]!
      this.addLog(`🚪 [${p.nickname}] 站起离座成为观众`)
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
      ws.send(JSON.stringify({ type: 'error', message: '只有房主可以发起开始游戏' }))
      return
    }

    const seated = this.seats.filter(Boolean) as DrawPlayer[]
    if (seated.length < 2) {
      ws.send(JSON.stringify({ type: 'error', message: '至少需要 2 名在席真人玩家才能开启对局！' }))
      return
    }

    // 重置积分与状态
    this.seats.forEach(s => {
      if (s) {
        s.score = 0
        s.hasGuessed = false
      }
    })

    this.round = 1
    this.totalRounds = seated.length >= 4 ? 1 : 2
    this.currentDrawerIndex = -1
    this.addLog(`🚀 房主 [${p.nickname}] 宣布游戏正式开始！全场共 ${this.totalRounds} 轮对决！`)
    this.nextTurn()
  }

  private nextTurn() {
    clearInterval(this.timer)
    this.strokes = []
    this.broadcast({ type: 'draw_clear' })

    const seatedIndices = this.seats
      .map((s, i) => (s ? i : -1))
      .filter(i => i !== -1)

    if (seatedIndices.length < 2) {
      this.stage = 'waiting'
      this.addLog(`⏳ 在席玩家不足 2 人，游戏回到等待大厅`)
      this.broadcastSnapshot()
      return
    }

    // 寻找下一个画师
    let nextIdx = -1
    const currentPos = seatedIndices.indexOf(this.currentDrawerIndex)
    if (currentPos === -1 || currentPos === seatedIndices.length - 1) {
      // 开启新一轮或者游戏结束
      if (currentPos === seatedIndices.length - 1) {
        this.round++
        if (this.round > this.totalRounds) {
          this.endGame()
          return
        }
      }
      nextIdx = seatedIndices[0]
    } else {
      nextIdx = seatedIndices[currentPos + 1]
    }

    this.currentDrawerIndex = nextIdx
    const drawer = this.seats[nextIdx]!

    // 抽取题目
    const item = DRAW_WORDS_BANK[Math.floor(Math.random() * DRAW_WORDS_BANK.length)]
    this.currentWord = item.word
    this.currentHint = item.hint

    // 重置猜对状态
    this.seats.forEach(s => {
      if (s) s.hasGuessed = false
    })

    this.stage = 'drawing'
    this.timeLeft = 60
    this.addLog(`🎨 轮到 [${drawer.nickname}] 执笔作画！提示：【${this.currentHint}】`)

    this.broadcastSnapshot()

    // 启动 60 秒倒计时
    this.timer = setInterval(() => {
      this.timeLeft--
      if (this.timeLeft <= 0) {
        clearInterval(this.timer)
        this.addLog(`⏰ 时间到！正确答案是：【${this.currentWord}】`)
        this.stage = 'round_end'
        this.broadcastSnapshot()
        setTimeout(() => this.nextTurn(), 3500)
      } else if (this.timeLeft % 10 === 0 || this.timeLeft <= 5) {
        this.broadcast({ type: 'time_tick', timeLeft: this.timeLeft })
      }
    }, 1000)
  }

  private endGame() {
    clearInterval(this.timer)
    this.stage = 'game_over'
    // 找出得分最高的玩家
    const seated = this.seats.filter(Boolean) as DrawPlayer[]
    seated.sort((a, b) => b.score - a.score)
    const winner = seated[0]
    if (winner) {
      this.addLog(`🏆 游戏结束！恭喜 [${winner.nickname}] 以 ${winner.score} 分斩获画王宝座！`)
    }
    this.broadcastSnapshot()
  }

  private handleStroke(ws: WebSocket, stroke: DrawStroke) {
    if (this.stage !== 'drawing') return
    const drawer = this.seats[this.currentDrawerIndex]
    if (!drawer || drawer.ws !== ws) return

    this.strokes.push(stroke)
    // 实时广播给房间其他所有人
    this.broadcast({ type: 'draw_stroke', stroke }, ws)
  }

  private handleClear(ws: WebSocket) {
    if (this.stage !== 'drawing') return
    const drawer = this.seats[this.currentDrawerIndex]
    if (!drawer || drawer.ws !== ws) return

    this.strokes = []
    this.broadcast({ type: 'draw_clear' })
  }

  private handleUndo(ws: WebSocket) {
    if (this.stage !== 'drawing') return
    const drawer = this.seats[this.currentDrawerIndex]
    if (!drawer || drawer.ws !== ws) return

    // 撤销到上一个 isNew 笔触
    let removeCount = 0
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      removeCount++
      if (this.strokes[i].isNew) break
    }
    this.strokes.splice(this.strokes.length - removeCount, removeCount)
    this.broadcast({ type: 'draw_history', strokes: this.strokes })
  }

  private handleChat(ws: WebSocket, msg: { text: string; sender?: string }) {
    if (!msg.text || !msg.text.trim()) return
    const trimmed = msg.text.trim()
    const p = this.seats.find(s => s && s.ws === ws)
    const sender = p ? p.nickname : (msg.sender || '观众')

    // 检查是否是在游戏中猜词
    if (this.stage === 'drawing' && p) {
      const isDrawer = p.seatIndex === this.currentDrawerIndex

      if (isDrawer) {
        // 画师不可在聊天中打出包含答案的字眼
        if (trimmed.includes(this.currentWord)) {
          ws.send(JSON.stringify({ type: 'error', message: '⚠️ 画师不能在聊天中泄露答案！' }))
          return
        }
      } else if (!p.hasGuessed) {
        // 玩家猜词
        const cleanWord = this.currentWord.trim().toLowerCase()
        const cleanGuess = trimmed.toLowerCase()
        if (cleanGuess === cleanWord) {
          p.hasGuessed = true
          // 第一个猜对 +100，后续 +60，画师每有人猜对 +30
          const guessedCount = this.seats.filter(s => s && s.hasGuessed).length
          const guesserScore = guessedCount === 1 ? 100 : 60
          p.score += guesserScore

          const drawer = this.seats[this.currentDrawerIndex]
          if (drawer) {
            drawer.score += 30
          }

          this.addLog(`🎉 [${p.nickname}] 率先猜出了正确答案！(+${guesserScore}分)`)
          this.broadcastSnapshot()

          // 检查是否全员非画师都猜出了
          const nonDrawers = this.seats.filter((s, idx) => s && idx !== this.currentDrawerIndex)
          const allGuessed = nonDrawers.length > 0 && nonDrawers.every(s => s && s.hasGuessed)
          if (allGuessed) {
            clearInterval(this.timer)
            this.addLog(`🌟 全体牌友全部答对！答案：【${this.currentWord}】`)
            this.stage = 'round_end'
            this.broadcastSnapshot()
            setTimeout(() => this.nextTurn(), 2500)
          }
          return
        }
      }
    }

    this.addLog(trimmed, sender)
  }

  public sendSnapshot(ws: WebSocket) {
    if (ws.readyState !== WebSocket.OPEN) return
    const drawer = this.currentDrawerIndex >= 0 ? this.seats[this.currentDrawerIndex] : null
    const isMeDrawer = drawer && drawer.ws === ws

    const snapshot: DrawRoomSnapshot = {
      id: this.id,
      name: this.name,
      hostUserId: this.hostUserId,
      stage: this.stage,
      currentDrawerIndex: this.currentDrawerIndex,
      drawerNickname: drawer ? drawer.nickname : undefined,
      currentWordLength: this.currentWord.length,
      currentHint: this.currentHint,
      secretWord: isMeDrawer || this.stage === 'round_end' || this.stage === 'game_over' ? this.currentWord : undefined,
      timeLeft: this.timeLeft,
      round: this.round,
      totalRounds: this.totalRounds,
      seats: this.seats.map(s => s ? {
        userId: s.userId,
        nickname: s.nickname,
        avatar: s.avatar,
        seatIndex: s.seatIndex,
        score: s.score,
        hasGuessed: s.hasGuessed
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

  public broadcast(data: any, excludeWs?: WebSocket) {
    const raw = JSON.stringify(data)
    for (const ws of this.clients) {
      if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
        ws.send(raw)
      }
    }
  }
}

export class DrawRoomManager {
  private rooms = new Map<string, DrawRoom>()

  constructor() {
    // 预设公共房间
    this.rooms.set('draw_1', new DrawRoom('draw_1', '🎨 欢乐画猜 1 号大厅'))
    this.rooms.set('draw_2', new DrawRoom('draw_2', '🎨 灵魂画手 2 号大厅'))
  }

  public getOrCreateRoom(roomId: string, name?: string): DrawRoom {
    let r = this.rooms.get(roomId)
    if (!r) {
      r = new DrawRoom(roomId, name || `画猜包厢 #${roomId.slice(-4)}`)
      this.rooms.set(roomId, r)
    }
    return r
  }

  public handleConnection(ws: WebSocket, query: URLSearchParams) {
    const roomId = query.get('roomId') || 'draw_1'
    const name = query.get('name') ? decodeURIComponent(query.get('name')!) : undefined
    const room = this.getOrCreateRoom(roomId, name)
    room.handleConnection(ws, query)
  }
}
