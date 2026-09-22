import { ref, computed } from 'vue'

export interface UndercoverPlayerSeat {
  userId: string
  nickname: string
  avatar: string
  seatIndex: number
  isAlive: boolean
  hasSpoken: boolean
  votedTargetIndex: number | null
  receivedVotes: number
  lastSpeech: string
  isUndercover?: boolean
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
  civilianWord?: string
  spyWord?: string
  seats: (UndercoverPlayerSeat | null)[]
  logs: { id: string; time: string; text: string; sender?: string }[]
}

const DEFAULT_WS_URL = import.meta.env.VITE_TEXAS_WS_URL || 'wss://prefer-premier-haven-under.trycloudflare.com'

export function useUndercoverMultiplayer() {
  const ws = ref<WebSocket | null>(null)
  const isConnected = ref(false)
  const roomState = ref<UndercoverRoomSnapshot | null>(null)
  const logs = ref<{ id: string; time: string; text: string; sender?: string }[]>([])
  const currentUser = ref<{ userId: string; nickname: string; avatar: string } | null>(null)
  const currentRoomId = ref('undercover_1')

  const mySeat = computed<UndercoverPlayerSeat | null>(() => {
    if (!roomState.value || !currentUser.value) return null
    return roomState.value.seats.find(s => s && s.userId === currentUser.value?.userId) || null
  })

  const isSpeaker = computed(() => {
    if (!roomState.value || !mySeat.value) return false
    return roomState.value.stage === 'speaking' && roomState.value.activeSpeakerIndex === mySeat.value.seatIndex
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
      let url = `${DEFAULT_WS_URL}?game=undercover&roomId=${roomId}&userId=${user.userId}`
      if (customRoomName) {
        url += `&name=${encodeURIComponent(customRoomName)}`
      }
      const socket = new WebSocket(url)

      socket.onopen = () => {
        isConnected.value = true
        logs.value.push({
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
          text: '✅ 成功连入谁是卧底房间',
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
          text: '❌ 与卧底对战房间已断开连接',
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

  function speak(text: string) {
    if (!ws.value || !text.trim()) return
    ws.value.send(JSON.stringify({ type: 'speak', text: text.trim() }))
  }

  function vote(targetIndex: number) {
    if (!ws.value) return
    ws.value.send(JSON.stringify({ type: 'vote', targetIndex }))
  }

  function spyGuess(guess: string) {
    if (!ws.value || !guess.trim()) return
    ws.value.send(JSON.stringify({ type: 'spy_guess', guess: guess.trim() }))
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
      sender: currentUser.value?.nickname || '探员'
    }))
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
    speak,
    vote,
    spyGuess,
    chat,
    isConnected,
    roomState,
    logs,
    mySeat,
    isSpeaker,
    isHost
  }
}
