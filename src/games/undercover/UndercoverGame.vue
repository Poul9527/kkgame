<template>
  <div class="undercover-container">
    <!-- 顶部 HUD 栏 -->
    <header class="hud-bar glass-panel">
      <div class="hud-left">
        <span class="game-tag font-arcade">🕵️ 谁是卧底 · 真人暗号对决</span>

        <!-- 房间切换器 -->
        <div class="room-selector">
          <button 
            v-for="r in presetRooms" 
            :key="r.id"
            class="room-chip"
            :class="{ active: currentRoomId === r.id }"
            @click="switchRoom(r.id)"
          >
            {{ r.name }}
          </button>
          <button class="room-chip btn-create-chip" @click="showCreateModal = true">
            <Plus class="w-3.5 h-3.5" />
            <span>自建包厢</span>
          </button>
        </div>
      </div>

      <div class="hud-center">
        <!-- 阶段状态信息 -->
        <div v-if="roomState?.stage === 'revealing'" class="stage-pill font-arcade revealing">
          <Eye class="w-4 h-4 text-cyan-400" />
          <span>暗号已生成，请点击牌桌中央查看您的专属词汇！</span>
        </div>
        <div v-else-if="roomState?.stage === 'speaking'" class="stage-pill font-arcade speaking">
          <Volume2 class="w-4 h-4 animate-pulse text-amber-400" />
          <span>第 {{ roomState.round }} 轮描述：请 [{{ roomState.speakerNickname }}] 发言 ({{ roomState.turnTimeLeft }}s)</span>
        </div>
        <div v-else-if="roomState?.stage === 'voting'" class="stage-pill font-arcade voting">
          <ShieldAlert class="w-4 h-4 text-rose-400 animate-bounce" />
          <span>全员发言完毕！请点击目标头像投票淘汰卧底！({{ roomState.turnTimeLeft }}s)</span>
        </div>
        <div v-else-if="roomState?.stage === 'spy_guess'" class="stage-pill font-arcade spy-guess">
          <Flame class="w-4 h-4 text-amber-400 animate-spin" />
          <span>卧底绝地反猜环节！({{ roomState.turnTimeLeft }}s)</span>
        </div>
        <div v-else-if="roomState?.stage === 'ended'" class="stage-pill font-arcade ended">
          <Trophy class="w-4 h-4 text-amber-400" />
          <span>{{ roomState.winnerSide === 'undercover' ? '👿 卧底阵营获胜！' : '🎉 平民阵营获胜！' }}</span>
        </div>
        <div v-else class="stage-pill font-arcade waiting">
          <span>⏳ 等待玩家入座 (满3人房主可发车，推荐4~6人)</span>
        </div>
      </div>

      <div class="hud-right">
        <!-- 房主开局按钮 -->
        <button 
          v-if="multiplayer.isHost.value && (roomState?.stage === 'waiting' || roomState?.stage === 'ended')"
          class="btn-host-action font-arcade"
          @click="handleStartGame"
          :disabled="seatedCount < 3"
        >
          <Sparkles class="w-4 h-4" />
          <span>{{ seatedCount >= 3 ? '👑 房主开启暗号对决' : '👑 至少需3人入座' }}</span>
        </button>

        <button class="btn-tool" @click="handleCopyInvite" title="复制房间邀请">
          <Share2 class="w-4 h-4 text-cyan-400" />
          <span>{{ copySuccess ? '已复制！' : '邀请' }}</span>
        </button>
      </div>
    </header>

    <!-- 主圆桌舞台：左侧圆桌席位与暗号卡，右侧常驻发言/战报聊天 -->
    <div class="main-arena">
      <div class="table-workspace">
        <!-- 圆桌核心 -->
        <div class="poker-round-table glass-panel">
          <!-- 6 个在席真人玩家展示 (支持随时点击空座换座！) -->
          <div class="seats-ring">
            <div 
              v-for="(seat, idx) in seatsDisplay" 
              :key="idx" 
              class="round-seat"
              :class="[
                `pos-${idx}`,
                {
                  'is-empty': !seat,
                  'is-me': seat && seat.userId === authStore.currentUser?.id,
                  'is-speaking': roomState?.stage === 'speaking' && roomState?.activeSpeakerIndex === idx,
                  'is-dead': seat && !seat.isAlive,
                  'has-voted': seat?.votedTargetIndex !== null && seat?.votedTargetIndex !== undefined
                }
              ]"
            >
              <!-- 席位有人 -->
              <template v-if="seat">
                <!-- 投票得票数指示 -->
                <div v-if="roomState?.stage === 'voting' && seat.receivedVotes > 0" class="vote-count-pill font-arcade">
                  🗳️ {{ seat.receivedVotes }} 票
                </div>

                <div class="seat-avatar-wrap">
                  <span class="seat-avatar">{{ seat.isAlive ? seat.avatar : '☠️' }}</span>
                  <span v-if="roomState?.hostUserId === seat.userId" class="host-crown" title="房主">👑</span>
                  <span v-if="roomState?.stage === 'speaking' && roomState?.activeSpeakerIndex === idx" class="speaking-mic">🎙️</span>
                </div>

                <div class="seat-meta">
                  <div class="seat-name">
                    {{ seat.nickname }}
                    <span v-if="seat.userId === authStore.currentUser?.id" class="me-tag">(我)</span>
                  </div>
                  <div class="seat-status font-arcade">
                    <span v-if="!seat.isAlive" class="text-rose-400 font-bold">已出局</span>
                    <span v-else-if="roomState?.stage === 'speaking' && roomState?.activeSpeakerIndex === idx" class="text-amber-300 animate-pulse">发言中...</span>
                    <span v-else-if="seat.lastSpeech" class="text-cyan-300 font-bold">已发言</span>
                    <span v-else class="text-slate-400">存活</span>
                  </div>
                </div>

                <!-- 玩家最新一句发言气泡 -->
                <div v-if="seat.lastSpeech && seat.isAlive" class="speech-bubble">
                  “{{ seat.lastSpeech }}”
                </div>

                <!-- 投票按钮 (投票阶段可见) -->
                <div v-if="canVoteFor(seat, idx)" class="vote-action-wrap">
                  <button class="btn-vote-target font-arcade" @click="handleVoteClick(idx)">
                    <span>指认 TA</span>
                  </button>
                </div>
              </template>

              <!-- 席位为空：点击直接坐下或换座 -->
              <template v-else>
                <button 
                  class="btn-switch-seat font-arcade" 
                  @click="handleSeatClick(idx)"
                  :title="multiplayer.mySeat.value ? '点击切换到该座位' : '入座该席位'"
                >
                  <Plus class="w-3.5 h-3.5" />
                  <span>{{ multiplayer.mySeat.value ? '换座' : '坐下' }}</span>
                </button>
              </template>
            </div>
          </div>

          <!-- 圆桌正中央：我的专属暗号卡片 / 卧底反猜区 / 阶段信息 -->
          <div class="table-center-hub">
            <!-- 阶段 A：查看我的暗号 -->
            <div v-if="multiplayer.mySeat.value && (roomState?.stage === 'revealing' || roomState?.stage === 'speaking' || roomState?.stage === 'voting')" class="secret-card-box">
              <div 
                class="secret-card" 
                :class="{ flipped: isCardRevealed }"
                @click="isCardRevealed = !isCardRevealed"
              >
                <div class="card-face front">
                  <Lock class="w-6 h-6 text-amber-400 mb-1" />
                  <span class="font-arcade text-xs text-amber-200">点击翻开我的绝密暗号</span>
                </div>
                <div class="card-face back">
                  <span class="font-arcade text-xs text-slate-300">您的暗号词汇：</span>
                  <span class="secret-word-display font-bold text-amber-300 text-lg">{{ roomState?.myWord || '保密中' }}</span>
                  <span class="font-arcade text-[10px] text-cyan-300 mt-1">切勿直接念出原词！</span>
                </div>
              </div>
            </div>

            <!-- 阶段 B：卧底绝地反猜控制区 (仅被淘汰且为卧底的玩家操作) -->
            <div v-else-if="roomState?.stage === 'spy_guess'" class="spy-guess-box glass-panel">
              <Flame class="w-8 h-8 text-amber-400 animate-spin mb-1" />
              <h4 class="font-arcade text-white text-sm">【卧底绝地反猜】</h4>
              <p class="text-xs text-slate-300">
                被放逐玩家 [{{ roomState.eliminatedPlayerName }}] 是卧底！
              </p>
              <div v-if="isEliminatedSpyMe" class="mt-2 w-full flex flex-col items-center gap-2">
                <input 
                  v-model="spyGuessInput" 
                  placeholder="猜猜平民手里的词汇是什么..." 
                  class="custom-input text-center"
                  @keyup.enter="handleSendSpyGuess"
                />
                <button class="btn-arcade btn-primary w-full" @click="handleSendSpyGuess">
                  <span>确认反猜！</span>
                </button>
              </div>
              <p v-else class="text-xs text-cyan-300 mt-2 font-arcade">
                等待卧底反猜中 ({{ roomState.turnTimeLeft }}s)...
              </p>
            </div>

            <!-- 阶段 C：终局公布所有身份词 -->
            <div v-else-if="roomState?.stage === 'ended'" class="game-over-box glass-panel">
              <Trophy class="w-8 h-8 text-amber-400 mb-1" />
              <h4 class="font-arcade text-lg font-bold text-amber-300">
                {{ roomState.winnerSide === 'undercover' ? '👿 卧底阵营取得最终胜利！' : '🎉 平民阵营大获全胜！' }}
              </h4>
              <div class="words-reveal mt-2">
                <span class="font-arcade text-sm">平民词：<b class="text-emerald-400">【{{ roomState.civilianWord }}】</b></span>
                <span class="font-arcade text-sm">卧底词：<b class="text-rose-400">【{{ roomState.spyWord }}】</b></span>
              </div>
            </div>

            <!-- 阶段 D：等待大厅 -->
            <div v-else class="waiting-box">
              <ShieldCheck class="w-10 h-10 text-cyan-400 mb-1 animate-bounce" />
              <span class="font-arcade text-white text-sm">谁是卧底 · 6人圆桌</span>
              <span class="font-arcade text-xs text-slate-400 mt-1">
                {{ seatedCount >= 3 ? '已就绪，房主可点击上方开始！' : '请点击座位入座，满3人即可开始！' }}
              </span>
            </div>
          </div>
        </div>

        <!-- 底部轮到我发言时的操作栏 -->
        <footer class="bottom-action-dock glass-panel">
          <div v-if="multiplayer.isSpeaker.value" class="speaker-controller">
            <span class="font-arcade text-xs text-amber-300">🎙️ 轮到您用一句话描述暗号：</span>
            <input 
              v-model="mySpeechInput" 
              placeholder="用一句巧妙的话描述，切忌出现原词..." 
              class="speech-input font-arcade"
              @keyup.enter="handleFinishSpeech"
            />
            <button class="btn-arcade btn-primary btn-submit-speech" @click="handleFinishSpeech">
              <Send class="w-4 h-4" />
              <span>提交发言</span>
            </button>
          </div>
          <div v-else class="speaker-idle-tip font-arcade">
            <template v-if="roomState?.stage === 'speaking'">
              <span>👀 当前由 [{{ roomState?.speakerNickname }}] 描述发言中，请仔细甄别蛛丝马迹...</span>
            </template>
            <template v-else-if="roomState?.stage === 'voting'">
              <span>🗳️ 投票指认阶段进行中，请在上方圆桌点击玩家头像下方的【指认 TA】！</span>
            </template>
            <template v-else>
              <span>自由换座：点击圆桌任意空白席位，即可立即移至该座位！</span>
            </template>
          </div>
        </footer>
      </div>

      <!-- 右侧：常驻战报与玩家交流面板 -->
      <aside class="sidebar-chat-panel glass-panel">
        <div class="sidebar-header">
          <div class="header-tab">
            <MessageSquare class="w-4 h-4 text-cyan-400" />
            <span class="font-arcade text-xs text-cyan-300">探员对决 · 战报记录</span>
          </div>
          <span class="conn-dot" :class="{ online: multiplayer.isConnected.value }">
            {{ multiplayer.isConnected.value ? '● 实时' : '○ 断开' }}
          </span>
        </div>

        <div class="sidebar-body" ref="logContainer">
          <div v-for="(l, i) in multiplayer.logs.value" :key="i" class="log-item">
            <span class="log-time font-arcade">[{{ l.time }}]</span>
            <span v-if="l.sender" class="log-sender font-bold">{{ l.sender }}: </span>
            <span class="log-text">{{ l.text }}</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="emoji-bar">
            <button v-for="e in ['🕵️', '🔥', '👀', '🤫', '😭', '🎉', '😎']" :key="e" @click="sendQuickEmoji(e)">
              {{ e }}
            </button>
          </div>
          <div class="chat-input-row">
            <input 
              v-model="chatInput" 
              placeholder="交流分析或发表看法..." 
              @keyup.enter="handleSendChat"
            />
            <button class="btn-send-chat font-arcade" @click="handleSendChat">
              <span>发送</span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- 自建房间弹窗 -->
    <Modal v-model="showCreateModal" title="自建卧底专属包厢" width="460px">
      <div class="create-room-box font-arcade">
        <div class="form-group">
          <label>包厢名称</label>
          <input v-model="customRoomName" placeholder="例如：福尔摩斯推理局" class="custom-input" />
        </div>
        <div class="form-group mt-3">
          <label>包厢房号 (ID)</label>
          <input v-model="customRoomId" placeholder="例如：my_spy_666" class="custom-input" />
        </div>
        <button class="btn-arcade btn-primary w-full mt-4" @click="handleCreateRoom">
          <span>立即开房并就任房主</span>
        </button>
      </div>
    </Modal>

    <!-- 未登录入场遮罩 -->
    <div v-if="!authStore.isLoggedIn" class="unlogged-gate-overlay">
      <div class="unlogged-card glass-panel">
        <ShieldAlert class="w-12 h-12 text-purple-400 mb-2" />
        <h3 class="text-lg font-bold text-white font-arcade">谁是卧底 · 需登录入场</h3>
        <p class="text-xs text-slate-300 mt-2 text-center max-w-sm">
          参与真人实时卧底圆桌对决需登录专属账号以同步暗号推理战绩。新用户注册即送 🪙 1,000 启航金币！
        </p>
        <div class="gate-actions mt-4 flex gap-3">
          <button class="btn-arcade btn-primary" @click="authStore.openAuthModal('login')">
            <span>已有账号，立即登录</span>
          </button>
          <button class="btn-arcade btn-secondary" @click="authStore.openAuthModal('register')">
            <span>免费注册 (送1000)</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useUndercoverMultiplayer, type UndercoverPlayerSeat } from './useUndercoverMultiplayer'
import { sound } from '@/utils/soundEngine'
import Modal from '@/components/common/Modal.vue'
import confetti from 'canvas-confetti'
import { 
  Plus, Share2, Sparkles, MessageSquare, Eye, Lock, 
  Volume2, ShieldAlert, Flame, Trophy, ShieldCheck, Send 
} from 'lucide-vue-next'

const authStore = useAuthStore()
const userStore = useUserStore()
const multiplayer = useUndercoverMultiplayer()

const currentRoomId = ref('undercover_1')
const showCreateModal = ref(false)
const customRoomName = ref('')
const customRoomId = ref(`undercover_${Date.now().toString().slice(-4)}`)
const copySuccess = ref(false)
const chatInput = ref('')
const mySpeechInput = ref('')
const spyGuessInput = ref('')
const isCardRevealed = ref(false)
const logContainer = ref<HTMLElement | null>(null)

const presetRooms = [
  { id: 'undercover_1', name: '🕵️ 卧底 1 号包厢' },
  { id: 'undercover_2', name: '🕵️ 推理 2 号包厢' }
]

const roomState = computed(() => multiplayer.roomState.value)

const seatedCount = computed(() => {
  if (!roomState.value?.seats) return 0
  return roomState.value.seats.filter(Boolean).length
})

const seatsDisplay = computed(() => {
  if (!roomState.value?.seats) return Array(6).fill(null)
  return roomState.value.seats
})

const isEliminatedSpyMe = computed(() => {
  if (!roomState.value?.eliminatedPlayerName) return false
  return roomState.value.eliminatedPlayerName === (authStore.currentUser?.nickname || userStore.nickname)
})

function canVoteFor(seat: UndercoverPlayerSeat, idx: number) {
  if (roomState.value?.stage !== 'voting') return false
  const mySeat = multiplayer.mySeat.value
  if (!mySeat || !mySeat.isAlive) return false
  // 不能投自己，且目标必须存活
  return mySeat.seatIndex !== idx && seat.isAlive
}

function switchRoom(roomId: string, name?: string) {
  currentRoomId.value = roomId
  if (!authStore.isLoggedIn || !authStore.currentUser) {
    return
  }
  const user = {
    userId: authStore.currentUser.id,
    nickname: authStore.currentUser.nickname,
    avatar: authStore.currentUser.avatar
  }
  multiplayer.connect(roomId, user, name)
}

watch(() => authStore.isLoggedIn, (logged) => {
  if (logged) {
    switchRoom(currentRoomId.value)
  } else {
    multiplayer.disconnect()
  }
})

function handleCreateRoom() {
  const roomId = customRoomId.value.trim() || `undercover_${Date.now()}`
  const name = customRoomName.value.trim() || '自建卧底包厢'
  showCreateModal.value = false
  switchRoom(roomId, name)
}

function handleSeatClick(idx: number) {
  if (!authStore.isLoggedIn) {
    authStore.openAuthModal('login')
    return
  }
  sound.click()
  multiplayer.sit(idx)
}

function handleStartGame() {
  sound.victory()
  isCardRevealed.value = false
  multiplayer.startGame()
}

function handleCopyInvite() {
  const shareUrl = `${window.location.origin}/game/undercover?room=${currentRoomId.value}`
  navigator.clipboard.writeText(shareUrl).then(() => {
    copySuccess.value = true
    setTimeout(() => { copySuccess.value = false }, 2500)
  })
}

function handleFinishSpeech() {
  if (!mySpeechInput.value.trim()) return
  sound.click()
  multiplayer.speak(mySpeechInput.value.trim())
  mySpeechInput.value = ''
}

function handleVoteClick(targetIdx: number) {
  sound.click()
  multiplayer.vote(targetIdx)
}

function handleSendSpyGuess() {
  if (!spyGuessInput.value.trim()) return
  multiplayer.spyGuess(spyGuessInput.value.trim())
  spyGuessInput.value = ''
}

function handleSendChat() {
  if (!chatInput.value.trim()) return
  multiplayer.chat(chatInput.value)
  chatInput.value = ''
}

function sendQuickEmoji(e: string) {
  multiplayer.chat(e)
}

watch(() => multiplayer.logs.value.length, async () => {
  await nextTick()
  if (logContainer.value) {
    logContainer.value.scrollTop = logContainer.value.scrollHeight
  }
})

watch(() => roomState.value?.stage, (newStage) => {
  if (newStage === 'ended') {
    confetti({ particleCount: 70, spread: 80 })
    sound.victory()
  } else if (newStage === 'revealing') {
    isCardRevealed.value = false
  }
})

onMounted(() => {
  switchRoom('undercover_1')
})

onUnmounted(() => {
  multiplayer.disconnect()
})
</script>

<style scoped>
.undercover-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at center, #0d1222 0%, #030712 100%);
  user-select: none;
  overflow: hidden;
}

.hud-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: rgba(15, 23, 42, 0.9);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  gap: 12px;
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-tag {
  font-size: 13px;
  font-weight: bold;
  color: #a78bfa;
}

.room-selector {
  display: flex;
  gap: 6px;
}

.room-chip {
  padding: 4px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.room-chip.active {
  background: rgba(167, 139, 250, 0.2);
  border-color: #a78bfa;
  color: #fff;
}

.btn-create-chip {
  background: rgba(236, 72, 153, 0.15);
  border-color: rgba(236, 72, 153, 0.4);
  color: #f472b6;
}

.hud-center {
  display: flex;
  align-items: center;
  gap: 12px;
}

.stage-pill {
  padding: 4px 14px;
  border-radius: 20px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.stage-pill.revealing { border-color: #38bdf8; color: #7dd3fc; }
.stage-pill.speaking { border-color: #f59e0b; color: #fde68a; }
.stage-pill.voting { border-color: #f43f5e; color: #fda4af; }
.stage-pill.spy-guess { border-color: #eab308; color: #fde047; }
.stage-pill.ended { border-color: #22c55e; color: #86efac; }
.stage-pill.waiting { color: #94a3b8; }

.hud-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-host-action {
  padding: 5px 14px;
  border-radius: 8px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border: 1px solid #fef08a;
  color: #1e1b4b;
  font-weight: 800;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
}

.btn-host-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-tool {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  font-size: 12px;
  cursor: pointer;
}

/* 主竞技场分栏 */
.main-arena {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.table-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 10px;
  gap: 10px;
  overflow: hidden;
}

/* 扑克圆桌容器 */
.poker-round-table {
  flex: 1;
  position: relative;
  border-radius: 24px;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #090916 100%);
  border: 2px solid rgba(167, 139, 250, 0.2);
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(124, 58, 237, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.seats-ring {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.round-seat {
  position: absolute;
  pointer-events: auto;
  width: 140px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: all 0.25s;
}

/* 6 席位环绕坐标布局 */
.round-seat.pos-0 { bottom: 15px; left: 50%; transform: translateX(-50%); }
.round-seat.pos-1 { bottom: 90px; left: 40px; }
.round-seat.pos-2 { top: 90px; left: 40px; }
.round-seat.pos-3 { top: 15px; left: 50%; transform: translateX(-50%); }
.round-seat.pos-4 { top: 90px; right: 40px; }
.round-seat.pos-5 { bottom: 90px; right: 40px; }

.round-seat.is-me {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.12);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.3);
}

.round-seat.is-speaking {
  border-color: #f59e0b;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.6);
  animation: pulse 1.5s infinite;
}

.round-seat.is-dead {
  opacity: 0.5;
  filter: grayscale(80%);
}

.vote-count-pill {
  position: absolute;
  top: -12px;
  background: #f43f5e;
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  padding: 1px 8px;
  border-radius: 10px;
  box-shadow: 0 0 8px rgba(244, 63, 94, 0.8);
}

.seat-avatar-wrap {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.host-crown {
  position: absolute;
  top: -8px;
  right: -6px;
  font-size: 14px;
}

.speaking-mic {
  position: absolute;
  bottom: -4px;
  right: -4px;
  font-size: 12px;
}

.seat-meta {
  text-align: center;
}

.seat-name {
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}

.me-tag {
  color: #38bdf8;
  font-size: 10px;
}

.seat-status {
  font-size: 10px;
}

.speech-bubble {
  position: absolute;
  bottom: -32px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid #38bdf8;
  color: #7dd3fc;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 8px;
  white-space: nowrap;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
  z-index: 5;
}

.vote-action-wrap {
  margin-top: 4px;
  width: 100%;
}

.btn-vote-target {
  width: 100%;
  padding: 3px 0;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  border: 1px solid #fca5a5;
  color: #fff;
  font-size: 10px;
  font-weight: bold;
  border-radius: 6px;
  cursor: pointer;
  transition: transform 0.15s;
}

.btn-vote-target:hover {
  transform: scale(1.05);
}

.btn-switch-seat {
  width: 100%;
  height: 60px;
  background: transparent;
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  color: #64748b;
  border-radius: 8px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s;
}

.btn-switch-seat:hover {
  border-color: #a78bfa;
  color: #a78bfa;
  background: rgba(167, 139, 250, 0.1);
}

/* 圆桌正中心 HUB */
.table-center-hub {
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 280px;
  text-align: center;
}

/* 翻转暗号卡片 */
.secret-card-box {
  perspective: 800px;
}

.secret-card {
  width: 220px;
  height: 120px;
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
}

.secret-card.flipped {
  transform: rotateY(180deg);
}

.card-face {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
}

.card-face.front {
  background: linear-gradient(135deg, #1e293b, #0f172a);
}

.card-face.back {
  background: linear-gradient(135deg, #312e81, #1e1b4b);
  transform: rotateY(180deg);
  border-color: #fbbf24;
}

.spy-guess-box, .game-over-box {
  padding: 16px 20px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.waiting-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 底部操作控制台 */
.bottom-action-dock {
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 54px;
}

.speaker-controller {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  max-width: 650px;
}

.speech-input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 8px 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.speech-input:focus {
  border-color: #38bdf8;
}

.btn-submit-speech {
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.speaker-idle-tip {
  font-size: 12px;
  color: #94a3b8;
}

/* 右侧常驻面板 */
.sidebar-chat-panel {
  width: 290px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.85);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-tab {
  display: flex;
  align-items: center;
  gap: 6px;
}

.conn-dot {
  font-size: 10px;
  color: #64748b;
}

.conn-dot.online {
  color: #34d399;
}

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.log-time { color: #64748b; font-size: 10px; margin-right: 4px; }
.log-sender { color: #a78bfa; }
.log-text { color: #cbd5e1; line-height: 1.3; }

.sidebar-footer {
  padding: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
}

.emoji-bar {
  display: flex;
  gap: 5px;
  margin-bottom: 6px;
}

.emoji-bar button {
  background: rgba(255, 255, 255, 0.05);
  border: none;
  font-size: 14px;
  padding: 2px 5px;
  border-radius: 4px;
  cursor: pointer;
}

.chat-input-row {
  display: flex;
  gap: 5px;
}

.chat-input-row input {
  flex: 1;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  padding: 6px 8px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.chat-input-row input:focus {
  border-color: #a78bfa;
}

.btn-send-chat {
  background: #7c3aed;
  color: #fff;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
}

.btn-send-chat:hover {
  background: #6d28d9;
}

/* 建房弹窗 */
.custom-input {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
}

.unlogged-gate-overlay {
  position: absolute;
  inset: 0;
  background: rgba(3, 7, 18, 0.88);
  backdrop-filter: blur(8px);
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.unlogged-card {
  max-width: 440px;
  width: 100%;
  padding: 28px;
  background: rgba(15, 23, 42, 0.95);
  border: 1px solid rgba(167, 139, 250, 0.4);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(167, 139, 250, 0.2);
}
</style>
