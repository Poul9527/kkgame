import { ref, computed } from 'vue'

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

export interface DrawPlayerSeat {
  userId: string
  nickname: string
  avatar: string
  seatIndex: number
  score: number
  hasGuessed: boolean
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
  secretWord?: string
  timeLeft: number
  round: number
  totalRounds: number
  seats: (DrawPlayerSeat | null)[]
  logs: { id: string; time: string; text: string; sender?: string }[]
}

const DEFAULT_WS_URL = import.meta.env.VITE_TEXAS_WS_URL || 'wss://prefer-premier-haven-under.trycloudflare.com'

export function useDrawMultiplayer() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const roomState = ref<DrawRoomSnapshot | null>(null)
  const logs = ref<{ id: string; time: string; text: string; sender?: string }[]>([])
  const currentUser = ref<{ userId: string; nickname: string; avatar: string } | null>(null)
  const currentRoomId = ref('draw_1')

  // 回调事件
  let onRemoteStrokeCb: ((stroke: DrawStroke) => void) | null = null
  let onRemoteClearCb: (() => void) | null = null
  let onRemoteHistoryCb: ((strokes: DrawStroke[]) => void) | null = null

  const mySeat = computed<DrawPlayerSeat | null>(() => {
    if (!roomState.value || !currentUser.value) return null
    return roomState.value.seats.find(s => s && s.userId === currentUser.value?.userId) || null
  })

  const isDrawer = computed(() => {
    if (!roomState.value || !mySeat.value) return false
    return roomState.value.stage === 'drawing' && roomState.value.currentDrawerIndex === mySeat.value.seatIndex
  })

  const isHost = computed(() => {
    if (!roomState.value || !currentUser.value) return false
    return roomState.value.hostUserId === currentUser.value.userId
  })

  function connect(roomId: string, user: { userId: string; nickname: string; avatar: string }, customRoomName?: string) {
    disconnect()
    currentRoomId.value = roomId
    currentUser.value = user

    try {
      let url = `${DEFAULT_WS_URL}?game=draw&roomId=${roomId}&userId=${user.userId}`
      if (customRoomName) {
        url += `&name=${encodeURIComponent(customRoomName)}`
      }
      const socket = new WebSocket(url)

      socket.onopen = () => {
        isConnected.value = true
        logs.value.push({
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          text: '✅ 成功连接画猜对战房间',
          sender: '系统'
        })
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'snapshot') {
            roomState.value = msg.room
            if (msg.room.logs) logs.value = msg.room.logs
          } else if (msg.type === 'log') {
            logs.value.push(msg.log)
            if (logs.value.length > 50) logs.value.shift()
          } else if (msg.type === 'draw_stroke') {
            if (onRemoteStrokeCb) onRemoteStrokeCb(msg.stroke)
          } else if (msg.type === 'draw_clear') {
            if (onRemoteClearCb) onRemoteClearCb()
          } else if (msg.type === 'draw_history') {
            if (onRemoteHistoryCb) onRemoteHistoryCb(msg.strokes)
          } else if (msg.type === 'time_tick') {
            if (roomState.value) roomState.value.timeLeft = msg.timeLeft
          } else if (msg.type === 'error') {
            logs.value.push({
              id: Math.random().toString(),
              time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
              text: `⚠️ ${msg.message}`,
              sender: '系统'
            })
          }
        } catch (e) {
          console.error(e)
        }
      }

      socket.onclose = () => {
        isConnected.value = false
        logs.value.push({
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          text: '❌ 与画猜房间已断开连接',
          sender: '系统'
        })
      }

      ws.value = socket
    } catch (e) {
      console.error(e)
    }
  }

  function sit(seatIndex?: number) {
    if (!ws.value || !currentUser.value) return
    ws.value.send(JSON.stringify({
      type: 'sit',
      userId: currentUser.value.userId,
      nickname: currentUser.value.nickname,
      avatar: currentUser.value.avatar,
      seatIndex
    }))
  }

  function stand() {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ type: 'stand' }))
  }

  function startGame() {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ type: 'start_game' }))
  }

  function sendStroke(stroke: DrawStroke) {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
    ws.value.send(JSON.stringify({ type: 'draw_stroke', stroke }))
  }

  function sendClear() {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
    ws.value.send(JSON.stringify({ type: 'draw_clear' }))
  }

  function sendUndo() {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) return
    ws.value.send(JSON.stringify({ type: 'draw_undo' }))
  }

  function chat(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      logs.value.push({
        id: Math.random().toString(),
        time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        text: '⚠️ 当前未连入房间，无法发言',
        sender: '系统'
      })
      return
    }
    ws.value.send(JSON.stringify({
      type: 'chat',
      text: trimmed,
      sender: currentUser.value?.nickname || '画友'
    }))
  }

  function onRemoteStroke(cb: (stroke: DrawStroke) => void) {
    onRemoteStrokeCb = cb
  }

  function onRemoteClear(cb: () => void) {
    onRemoteClearCb = cb
  }

  function onRemoteHistory(cb: (strokes: DrawStroke[]) => void) {
    onRemoteHistoryCb = cb
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
    startGame,
    sendStroke,
    sendClear,
    sendUndo,
    chat,
    onRemoteStroke,
    onRemoteClear,
    onRemoteHistory,
    isConnected,
    roomState,
    logs,
    mySeat,
    isDrawer,
    isHost
  }
}
