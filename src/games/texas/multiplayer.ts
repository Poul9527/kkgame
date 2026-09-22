import { ref, computed } from 'vue'
import type { Card, EvaluatedTexasHand } from './types'

export interface RemoteSeat {
  userId: string
  nickname: string
  avatar: string
  chips: number
  seatIndex: number
  currentRoundBet: number
  totalHandBet: number
  isFolded: boolean
  isAllIn: boolean
  isBot: boolean
  cards: Card[]
  evaluatedHand?: EvaluatedTexasHand
}

export interface TexasRoomSnapshot {
  id: string
  name: string
  hostUserId?: string
  smallBlind: number
  bigBlind: number
  stage: 'idle' | 'preflop' | 'flop' | 'turn' | 'river' | 'showdown' | 'ended'
  pot: number
  communityCards: Card[]
  currentHighestBet: number
  activeSeatIndex: number
  dealerSeatIndex: number
  turnTimeLimit: number
  isShortDeck?: boolean
  seats: (RemoteSeat | null)[]
  logs: { time: string; text: string; sender?: string }[]
}

const DEFAULT_WS_URL = import.meta.env.VITE_TEXAS_WS_URL || 'wss://prefer-premier-haven-under.trycloudflare.com'

export function useTexasMultiplayer() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const connectionError = ref<string | null>(null)
  const roomState = ref<TexasRoomSnapshot | null>(null)
  const logs = ref<{ time: string; text: string; sender?: string }[]>([])
  const currentUser = ref<{ userId: string; nickname: string; avatar: string; chips: number } | null>(null)
  const currentRoomId = ref('room_beginner')

  // 计算属性：当前登录玩家入座的席位
  const mySeat = computed<RemoteSeat | null>(() => {
    if (!roomState.value || !currentUser.value) return null
    return roomState.value.seats.find(s => s && s.userId === currentUser.value?.userId) || null
  })

  // 计算属性：是否轮到当前玩家操作
  const isMyTurn = computed(() => {
    if (!roomState.value || !mySeat.value) return false
    return roomState.value.activeSeatIndex === mySeat.value.seatIndex &&
      !mySeat.value.isFolded &&
      !mySeat.value.isAllIn &&
      roomState.value.stage !== 'idle' &&
      roomState.value.stage !== 'ended' &&
      roomState.value.stage !== 'showdown'
  })

  // 计算属性：当前跟注所需补齐的差额
  const callAmount = computed(() => {
    if (!roomState.value || !mySeat.value) return 0
    return Math.max(0, roomState.value.currentHighestBet - mySeat.value.currentRoundBet)
  })

  // 计算属性：是否可以免费看牌 (Check)
  const canCheck = computed(() => {
    return callAmount.value === 0
  })

  // 连接到多人房间
  function connect(roomId = 'room_beginner', user: { userId: string; nickname: string; avatar: string; chips: number }) {
    if (ws.value && isConnected.value && currentRoomId.value === roomId) return

    disconnect()
    currentRoomId.value = roomId
    currentUser.value = user
    isConnecting.value = true
    connectionError.value = null

    try {
      const url = `${DEFAULT_WS_URL}?roomId=${roomId}&userId=${user.userId}`
      const socket = new WebSocket(url)

      socket.onopen = () => {
        isConnected.value = true
        isConnecting.value = false
        logs.value.push({ time: new Date().toLocaleTimeString(), text: '✅ 成功连线多人对战服务器' })
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'snapshot') {
            roomState.value = msg.room
            if (msg.room.logs) {
              logs.value = msg.room.logs
            }
          } else if (msg.type === 'log') {
            logs.value.push(msg.log)
            if (logs.value.length > 50) logs.value.shift()
          } else if (msg.type === 'error') {
            logs.value.push({ time: new Date().toLocaleTimeString(), text: `⚠️ ${msg.message}` })
          }
        } catch (e) {
          console.error('Failed to parse websocket message:', e)
        }
      }

      socket.onerror = (e) => {
        console.warn('WebSocket connection error:', e)
        connectionError.value = '服务器连接异常'
        isConnecting.value = false
      }

      socket.onclose = () => {
        isConnected.value = false
        isConnecting.value = false
        logs.value.push({ time: new Date().toLocaleTimeString(), text: '❌ 已断开与多人房间的连接' })
      }

      ws.value = socket
    } catch (e: any) {
      isConnecting.value = false
      connectionError.value = e.message
    }
  }

  function sit(seatIndex?: number, buyInChips?: number) {
    if (!ws.value || !currentUser.value) return
    const chips = buyInChips || currentUser.value.chips
    ws.value.send(JSON.stringify({
      type: 'sit',
      userId: currentUser.value.userId,
      nickname: currentUser.value.nickname,
      avatar: currentUser.value.avatar,
      chips,
      seatIndex
    }))
  }

  function stand() {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ type: 'stand' }))
  }

  function action(type: 'fold' | 'check' | 'call' | 'raise' | 'allin', amount?: number) {
    if (!ws.value) return
    ws.value.send(JSON.stringify({
      type: 'action',
      action: type,
      amount
    }))
  }

  function chat(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    const nickname = currentUser.value?.nickname || '牌友'
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify({
        type: 'chat',
        text: trimmed,
        sender: nickname
      }))
    } else {
      logs.value.push({
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        text: '⚠️ 当前未连入多人房间，无法发送消息',
        sender: '系统'
      })
    }
  }

  function startGame() {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ type: 'start_hand' }))
  }

  function disconnect() {
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    isConnected.value = false
    roomState.value = null
  }

  return {
    connect,
    disconnect,
    sit,
    stand,
    action,
    chat,
    startGame,
    isConnected,
    isConnecting,
    connectionError,
    roomState,
    logs,
    mySeat,
    isMyTurn,
    callAmount,
    canCheck
  }
}
