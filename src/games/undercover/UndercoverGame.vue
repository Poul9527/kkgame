<template>
  <div class="undercover-container">
    <!-- 顶部 HUD 状态栏 -->
    <header class="hud-bar glass-panel">
      <div class="hud-left">
        <span class="game-tag font-arcade">🕵️ 谁是卧底 UNDERCOVER</span>
        <div class="stage-pill font-arcade">
          <span class="dot animate-pulse"></span>
          <span>{{ currentStageName }}</span>
        </div>
      </div>

      <div class="hud-center stats-row font-arcade">
        <div class="stat-badge">
          <span class="lbl">回合轮次</span>
          <span class="val text-amber-400">第 {{ roundNumber }} 轮</span>
        </div>
        <div class="stat-badge">
          <span class="lbl">场上存活</span>
          <span class="val text-cyan-400">{{ alivePlayersCount }} / {{ players.length }} 人</span>
        </div>
        <div class="stat-badge">
          <span class="lbl">卧底人数</span>
          <span class="val text-rose-400 font-bold">{{ undercoverCount }} 人</span>
        </div>
      </div>

      <div class="hud-right">
        <button class="btn-hud" @click="resetGame" title="重新开局">
          <RotateCcw class="w-4 h-4 text-cyan-400" />
          <span>新对局</span>
        </button>
      </div>
    </header>

    <!-- 主竞技场：左侧为圆桌席位舞台，右侧为常驻发言记录与推理公投 -->
    <div class="main-arena">
      <!-- 席位圆桌区域 -->
      <div class="round-table-zone">
        <div class="table-card glass-panel">
          <!-- 圆桌中央：暗号底牌/状态提示 -->
          <div class="table-center-hub">
            <transition name="flip" mode="out-in">
              <!-- 查看我的底牌暗号 -->
              <div 
                v-if="gameStage === 'ready' || gameStage === 'describe'"
                class="secret-word-card glass-panel"
                :class="{ revealed: isCardRevealed }"
                @click="isCardRevealed = !isCardRevealed"
              >
                <div class="card-inner">
                  <div class="card-front">
                    <Eye class="w-6 h-6 text-cyan-400 mb-1" />
                    <span class="tap-hint">点击翻看我的暗号词</span>
                  </div>
                  <div class="card-back font-arcade">
                    <span class="secret-word-label">我的暗号词</span>
                    <span class="secret-word-val text-amber-300 font-bold">
                      {{ humanPlayer?.role === 'whiteboard' ? '【你是白板！无词】' : humanPlayer?.word }}
                    </span>
                    <span class="secret-role-text text-xs text-slate-400">
                      身份：{{ humanPlayer?.role === 'undercover' ? '🕵️ 卧底' : (humanPlayer?.role === 'whiteboard' ? '⚪ 白板' : '👥 平民') }}
                    </span>
                  </div>
                </div>
              </div>

              <!-- 投票或结算提示 -->
              <div v-else class="center-status-box font-arcade">
                <div class="status-icon">🗳️</div>
                <h4 class="text-amber-400 font-bold">公投放逐阶段</h4>
                <p class="text-xs text-slate-400">请根据各家发言，选出你心目中的潜伏卧底！</p>
              </div>
            </transition>
          </div>

          <!-- 环形 6 位玩家席位排布 -->
          <div 
            v-for="(p, idx) in players" 
            :key="p.id"
            class="table-seat"
            :class="[
              `seat-pos-${idx}`,
              { 'is-active': activeSpeakerIndex === idx && gameStage === 'describe' },
              { 'is-eliminated': !p.isAlive },
              { 'is-human': p.isHuman },
              { 'is-selected-vote': selectedVoteId === p.id }
            ]"
            @click="handleVoteClick(p)"
          >
            <!-- 席位状态卡片 -->
            <div class="seat-badge">
              <div class="avatar-ring">
                <span class="avatar-emoji">{{ p.avatar }}</span>
                <span v-if="!p.isAlive" class="dead-tag">淘汰</span>
              </div>
              <div class="seat-info">
                <div class="seat-name">
                  {{ p.name }}
                  <span v-if="p.isHuman" class="me-tag">(我)</span>
                </div>
                <div class="seat-vote-count font-arcade" v-if="gameStage === 'vote_reveal'">
                  票数: <b class="text-amber-400">{{ p.votesReceived }}</b>
                </div>
              </div>
              <!-- 发言话筒标志 -->
              <div v-if="activeSpeakerIndex === idx && gameStage === 'describe' && p.isAlive" class="mic-badge animate-bounce">
                <Mic class="w-3 h-3 text-cyan-400" />
              </div>
            </div>

            <!-- 玩家最新发言气泡 -->
            <div v-if="p.lastSpeech" class="speech-bubble">
              <span class="speech-text">{{ p.lastSpeech }}</span>
            </div>
          </div>
        </div>

        <!-- 底部发言操作栏 -->
        <footer class="action-dock glass-panel">
          <!-- 描述阶段：轮到我发言 -->
          <div v-if="gameStage === 'describe' && activeSpeakerIndex === 0 && humanPlayer?.isAlive" class="dock-row">
            <span class="font-arcade text-xs text-cyan-300">轮到您描述手牌暗号：</span>
            <input 
              v-model="speechInput" 
              placeholder="用一句话描述你的词，切忌直接说出答案..." 
              @keyup.enter="handleHumanSpeak"
            />
            <button class="btn-arcade btn-primary" @click="handleHumanSpeak">发言完毕</button>
          </div>

          <!-- 投票阶段：我进行投票 -->
          <div v-else-if="gameStage === 'voting' && humanPlayer?.isAlive" class="dock-row">
            <span class="font-arcade text-xs text-amber-300">点击牌桌席位头像，投票指认卧底：</span>
            <button 
              class="btn-arcade btn-danger" 
              :disabled="!selectedVoteId"
              @click="submitVote"
            >
              确定投票放逐该玩家
            </button>
          </div>

          <!-- 其他等待状态 -->
          <div v-else class="dock-row waiting">
            <Loader2 class="w-4 h-4 animate-spin text-cyan-400" />
            <span class="font-arcade text-xs text-slate-300">{{ waitingPromptText }}</span>
          </div>
        </footer>
      </div>

      <!-- 右侧：常驻各轮发言记录与推理复盘 -->
      <aside class="chat-sidebar glass-panel">
        <div class="sidebar-header">
          <div class="header-tab">
            <MessageSquare class="w-4 h-4 text-cyan-400" />
            <span class="font-arcade text-xs text-cyan-300">发言记录 & 推理线索</span>
          </div>
          <span class="clue-tag font-arcade">🔍 蛛丝马迹</span>
        </div>

        <div class="sidebar-body" ref="logsContainer">
          <div v-for="(log, i) in actionLogs" :key="i" class="log-item" :class="log.type">
            <span class="log-time font-arcade">[{{ log.time }}]</span>
            <span class="log-text">{{ log.text }}</span>
          </div>
        </div>

        <div class="sidebar-footer">
          <div class="rule-hint-box text-xs text-slate-400">
            💡 规则：平民拿到相同词，卧底拿到相似词。每轮逐人描述，投票放逐可疑者。卧底出局后若猜中平民词则瞬间翻盘！
          </div>
        </div>
      </aside>
    </div>

    <!-- 卧底绝地反猜弹窗 -->
    <Modal v-model="showUndercoverGuessModal" title="🔥 卧底绝地反猜机会！" width="460px">
      <div class="undercover-guess-body">
        <p class="text-sm text-slate-300">
          卧底 <b>{{ eliminatedPlayer?.name }}</b> 被公投出局！但仍有最后 1 次机会反猜平民暗号词，若猜中则<b>反败为胜</b>！
        </p>
        <div v-if="eliminatedPlayer?.isHuman" class="guess-input-box mt-3">
          <input 
            v-model="undercoverGuessInput" 
            placeholder="输入你推测的平民暗号词..." 
            @keyup.enter="handleUndercoverGuess"
          />
          <button class="btn-arcade btn-primary mt-2" @click="handleUndercoverGuess">提交绝地反猜</button>
        </div>
        <div v-else class="bot-guessing-box mt-3 font-arcade">
          <Loader2 class="w-4 h-4 animate-spin text-amber-400" />
          <span>卧底 AI 正在绞尽脑汁分析平民发言...</span>
        </div>
      </div>
    </Modal>

    <!-- 游戏胜负大结算弹窗 -->
    <Modal v-model="showResultModal" :title="resultTitle" width="520px">
      <div class="settle-content">
        <div class="result-banner" :class="{ 'is-civilian-win': winnerRole === 'civilian' }">
          <div class="banner-icon">{{ winnerRole === 'civilian' ? '🏆' : '🕵️' }}</div>
          <div class="banner-info">
            <h3 class="banner-title font-arcade font-bold">
              {{ winnerRole === 'civilian' ? '平民阵营大获全胜！' : '卧底阵营偷天换日成功！' }}
            </h3>
            <p class="text-xs text-slate-300 font-arcade">
              奖励 🪙 100 金币 · 胜点记录入名人堂
            </p>
          </div>
        </div>

        <div class="words-reveal-box mt-4">
          <div class="reveal-row">
            <span class="reveal-lbl">平民词：</span>
            <span class="reveal-val text-emerald-400 font-bold font-arcade">{{ civilianWord }}</span>
          </div>
          <div class="reveal-row">
            <span class="reveal-lbl">卧底词：</span>
            <span class="reveal-val text-rose-400 font-bold font-arcade">{{ undercoverWord }}</span>
          </div>
        </div>

        <div class="players-identity-list mt-3">
          <div v-for="p in players" :key="p.id" class="p-identity-item">
            <span class="p-avatar">{{ p.avatar }}</span>
            <span class="p-name">{{ p.name }}</span>
            <span class="p-role-tag" :class="p.role">
              {{ p.role === 'undercover' ? '卧底' : (p.role === 'whiteboard' ? '白板' : '平民') }}
            </span>
            <span class="p-word text-xs text-slate-400">词: {{ p.word || '无' }}</span>
          </div>
        </div>
      </div>
      <template #footer>
        <button class="btn-arcade btn-primary" @click="resetGame">再来一局</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { Eye, Mic, RotateCcw, MessageSquare, Loader2 } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useUserStore } from '@/stores/userStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

interface Player {
  id: string
  name: string
  avatar: string
  role: 'civilian' | 'undercover' | 'whiteboard'
  word: string
  isHuman: boolean
  isAlive: boolean
  lastSpeech: string
  votesReceived: number
}

const userStore = useUserStore()

// 精心准备的 25 组经典相似词库
const wordPairs = [
  { civilian: '麦当劳', undercover: '肯德基', hint: '快餐巨头' },
  { civilian: '微信', undercover: 'QQ', hint: '腾讯社交软件' },
  { civilian: '玫瑰', undercover: '月季', hint: '带刺的花' },
  { civilian: '班主任', undercover: '辅导员', hint: '学校里的老师' },
  { civilian: '眉毛', undercover: '胡子', hint: '人脸上的毛发' },
  { civilian: '淘宝', undercover: '京东', hint: '国内电商网购' },
  { civilian: '奶茶', undercover: '咖啡', hint: '年轻人常喝的饮品' },
  { civilian: '自行车', undercover: '电动车', hint: '两轮代步工具' },
  { civilian: '橙子', undercover: '橘子', hint: '富含维C的酸甜水果' },
  { civilian: '辣椒', undercover: '芥末', hint: '刺激辛辣的调料' },
  { civilian: '口红', undercover: '唇膏', hint: '涂在嘴唇上的化妆品' },
  { civilian: '蜘蛛侠', undercover: '蝙蝠侠', hint: '著名超级英雄' },
  { civilian: '豆浆', undercover: '油条', hint: '传统经典中式早餐' },
  { civilian: '冰淇淋', undercover: '雪糕', hint: '夏日冰爽甜食' },
  { civilian: '跑步机', undercover: '椭圆机', hint: '健身房有氧器械' }
]

const gameStage = ref<'ready' | 'describe' | 'voting' | 'vote_reveal' | 'ended'>('ready')
const roundNumber = ref(1)
const activeSpeakerIndex = ref(0)
const isCardRevealed = ref(false)
const selectedVoteId = ref<string | null>(null)
const speechInput = ref('')
const undercoverGuessInput = ref('')
const showUndercoverGuessModal = ref(false)
const showResultModal = ref(false)
const winnerRole = ref<'civilian' | 'undercover'>('civilian')
const eliminatedPlayer = ref<Player | null>(null)

const civilianWord = ref('')
const undercoverWord = ref('')

const logsContainer = ref<HTMLElement | null>(null)
const actionLogs = ref<{ time: string; text: string; type?: string }[]>([])

function addLog(text: string, type?: string) {
  actionLogs.value.push({
    time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    text,
    type
  })
  if (actionLogs.value.length > 60) actionLogs.value.shift()
  nextTick(() => {
    if (logsContainer.value) {
      logsContainer.value.scrollTop = logsContainer.value.scrollHeight
    }
  })
}

// 6 位固定玩家 (1 人类 + 5 智能电脑)
const players = ref<Player[]>([])

const humanPlayer = computed(() => players.value.find(p => p.isHuman))
const alivePlayersCount = computed(() => players.value.filter(p => p.isAlive).length)
const undercoverCount = computed(() => players.value.filter(p => p.role === 'undercover' && p.isAlive).length)

const currentStageName = computed(() => {
  switch (gameStage.value) {
    case 'ready': return '暗号就绪'
    case 'describe': return '逐人描摹'
    case 'voting': return '全民公投'
    case 'vote_reveal': return '公投揭晓'
    case 'ended': return '对局结算'
  }
})

const waitingPromptText = computed(() => {
  if (gameStage.value === 'describe') {
    return `轮到 [${players.value[activeSpeakerIndex.value]?.name}] 斟酌陈述中...`
  }
  return '等待对局推进...'
})

const resultTitle = computed(() => {
  return winnerRole.value === 'civilian' ? '🎉 平民胜利！' : '🕵️ 卧底胜利！'
})

// 初始化与发暗号
function resetGame() {
  sound.click()
  showResultModal.value = false
  showUndercoverGuessModal.value = false
  isCardRevealed.value = false
  selectedVoteId.value = null
  speechInput.value = ''
  roundNumber.value = 1
  actionLogs.value = []

  // 随机抽取一组词汇
  const pair = wordPairs[Math.floor(Math.random() * wordPairs.length)]
  civilianWord.value = pair.civilian
  undercoverWord.value = pair.undercover

  // 6 位玩家，随机指定 1 名卧底
  const undercoverIdx = Math.floor(Math.random() * 6)

  players.value = [
    { id: 'p0', name: userStore.nickname || '我', avatar: userStore.avatar || '🤠', role: 'civilian', word: civilianWord.value, isHuman: true, isAlive: true, lastSpeech: '', votesReceived: 0 },
    { id: 'p1', name: '机灵阿强', avatar: '👦', role: 'civilian', word: civilianWord.value, isHuman: false, isAlive: true, lastSpeech: '', votesReceived: 0 },
    { id: 'p2', name: '敏锐小美', avatar: '👧', role: 'civilian', word: civilianWord.value, isHuman: false, isAlive: true, lastSpeech: '', votesReceived: 0 },
    { id: 'p3', name: '神秘客', avatar: '🎩', role: 'civilian', word: civilianWord.value, isHuman: false, isAlive: true, lastSpeech: '', votesReceived: 0 },
    { id: 'p4', name: '眼镜柯南', avatar: '👓', role: 'civilian', word: civilianWord.value, isHuman: false, isAlive: true, lastSpeech: '', votesReceived: 0 },
    { id: 'p5', name: '大侦探', avatar: '🔍', role: 'civilian', word: civilianWord.value, isHuman: false, isAlive: true, lastSpeech: '', votesReceived: 0 }
  ]

  players.value[undercoverIdx].role = 'undercover'
  players.value[undercoverIdx].word = undercoverWord.value

  addLog(`🎲 新对局开始！场上共有 6 位牌手，暗藏 1 名卧底！`)
  gameStage.value = 'describe'
  activeSpeakerIndex.value = 0
  startNextSpeaker()
}

// 推进下一位发言者
function startNextSpeaker() {
  if (activeSpeakerIndex.value >= players.value.length) {
    // 全员发言完毕，进入投票
    startVotingPhase()
    return
  }

  const p = players.value[activeSpeakerIndex.value]
  if (!p.isAlive) {
    activeSpeakerIndex.value++
    startNextSpeaker()
    return
  }

  if (p.isHuman) {
    addLog(`📢 轮到您发言，请仔细斟酌词句！`)
  } else {
    // 电脑 AI 发言
    setTimeout(() => {
      generateBotSpeech(p)
      activeSpeakerIndex.value++
      startNextSpeaker()
    }, 1800)
  }
}

// 模拟电脑幽默、模糊且符合暗号的描述
function generateBotSpeech(bot: Player) {
  const speechTemplates: Record<string, string[]> = {
    '麦当劳': ['是红黄配色的常见快餐', '全世界年轻人基本都吃过', '炸薯条和汉堡是招牌', '黄色大M很显眼'],
    '肯德基': ['白胡子爷爷是标志性门面', '炸鸡非常出名味道香脆', '经常跟竞争对手开在隔壁', '吮指原味鸡深入人心'],
    '微信': ['天天都在使用的通讯软件', '绿色的图标大家很熟悉', '发朋友圈和扫码支付必不可少', '工作生活不可或缺'],
    'QQ': ['小企鹅是吉祥物', '以前玩空间偷菜常用它', '传大文件特别方便', '功能丰富年轻人很喜欢'],
    '玫瑰': ['象征浪漫与爱情的花', '带刺但是很好看', '情人节经常脱销', '花瓣很香颜色鲜艳'],
    '月季': ['公园绿化带随处可见', '花期特别长经常盛开', '跟某种浪漫花卉长得很像', '带刺但非常顽强好养']
  }

  const pool = speechTemplates[bot.word] || ['平时生活中经常会见到这个', '大家都知道它的特征', '很多人都很喜欢它', '它具备独特的辨识度']
  const randomSpeech = pool[Math.floor(Math.random() * pool.length)]

  bot.lastSpeech = randomSpeech
  addLog(`🗣️ [${bot.name}]: "${randomSpeech}"`)
  sound.click()
}

// 人类玩家发言
function handleHumanSpeak() {
  if (!speechInput.value.trim()) return
  const me = players.value[0]
  me.lastSpeech = speechInput.value.trim()
  addLog(`🗣️ [我]: "${me.lastSpeech}"`)
  speechInput.value = ''
  sound.click()

  activeSpeakerIndex.value++
  startNextSpeaker()
}

// 开启投票阶段
function startVotingPhase() {
  gameStage.value = 'voting'
  selectedVoteId.value = null
  addLog(`🗳️ 全员发言完毕！请审视各家陈述，点击头像投票放逐可疑卧底！`)
}

function handleVoteClick(p: Player) {
  if (gameStage.value !== 'voting' || !p.isAlive || p.id === 'p0') return
  selectedVoteId.value = p.id
  sound.click()
}

// 提交投票并结算票数
function submitVote() {
  if (!selectedVoteId.value) return
  gameStage.value = 'vote_reveal'

  // 重置票数
  players.value.forEach(p => p.votesReceived = 0)

  // 人类投票
  const votedTarget = players.value.find(p => p.id === selectedVoteId.value)
  if (votedTarget) votedTarget.votesReceived++

  // 电脑玩家模拟投票
  const aliveOthers = players.value.filter(p => p.isAlive)
  players.value.forEach(bot => {
    if (!bot.isHuman && bot.isAlive) {
      // 电脑随机投向其他存活者
      const targets = aliveOthers.filter(t => t.id !== bot.id)
      const target = targets[Math.floor(Math.random() * targets.length)]
      target.votesReceived++
    }
  })

  // 找出最高得票者
  aliveOthers.sort((a, b) => b.votesReceived - a.votesReceived)
  const eliminated = aliveOthers[0]
  eliminated.isAlive = false
  eliminatedPlayer.value = eliminated

  addLog(`📢 公投揭晓：[${eliminated.name}] 以 ${eliminated.votesReceived} 票被最高票放逐！`, 'danger')
  sound.gameover()

  setTimeout(() => {
    handleAfterElimination(eliminated)
  }, 2200)
}

// 放逐后判定胜负或绝地反猜
function handleAfterElimination(eliminated: Player) {
  if (eliminated.role === 'undercover') {
    // 卧底被抓，给一次绝地反猜机会！
    showUndercoverGuessModal.value = true
    if (!eliminated.isHuman) {
      // 电脑卧底进行模拟猜测
      setTimeout(() => {
        showUndercoverGuessModal.value = false
        // 电脑有 30% 概率猜中翻盘
        if (Math.random() < 0.3) {
          addLog(`💥 卧底 [${eliminated.name}] 绝地反猜完全正确！逆风翻盘！`, 'danger')
          concludeGame('undercover')
        } else {
          addLog(`🎉 卧底猜词失败！平民大获全胜！`)
          concludeGame('civilian')
        }
      }, 2500)
    }
  } else {
    // 平民被冤枉淘汰，检查场上剩余卧底数
    const aliveUndercovers = players.value.filter(p => p.role === 'undercover' && p.isAlive)
    const aliveCivilians = players.value.filter(p => p.role === 'civilian' && p.isAlive)

    if (aliveUndercovers.length >= aliveCivilians.length) {
      // 卧底人数等于或超过平民，卧底胜！
      concludeGame('undercover')
    } else {
      // 继续下一轮
      roundNumber.value++
      gameStage.value = 'describe'
      activeSpeakerIndex.value = 0
      addLog(`🔄 幸存平民仍占多数，进入第 ${roundNumber.value} 轮发言！`)
      startNextSpeaker()
    }
  }
}

// 人类卧底反猜
function handleUndercoverGuess() {
  showUndercoverGuessModal.value = false
  if (undercoverGuessInput.value.trim() === civilianWord.value) {
    addLog(`💥 恭喜您一语中的，成功猜出平民暗号【${civilianWord.value}】！绝地反杀！`)
    concludeGame('undercover')
  } else {
    addLog(`❌ 很遗憾猜错了！平民词是【${civilianWord.value}】。平民胜利！`)
    concludeGame('civilian')
  }
}

function concludeGame(winner: 'civilian' | 'undercover') {
  gameStage.value = 'ended'
  winnerRole.value = winner
  showResultModal.value = true

  const me = humanPlayer.value
  const isMeWinner = me && me.role === winner
  if (isMeWinner) {
    sound.victory()
    confetti({ particleCount: 90, spread: 80 })
    userStore.addCoins(100)
  } else {
    sound.gameover()
  }
}

onMounted(() => {
  resetGame()
})
</script>

<style scoped>
.undercover-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: radial-gradient(circle at center, #0f172a 0%, #030712 100%);
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
}

.hud-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.game-tag {
  font-size: 13px;
  font-weight: 900;
  color: #6366f1;
}

.stage-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  color: #a5b4fc;
}

.stage-pill .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #6366f1;
}

.stats-row {
  display: flex;
  gap: 12px;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(0, 0, 0, 0.35);
  padding: 3px 12px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.stat-badge .lbl { font-size: 10px; color: #64748b; }
.stat-badge .val { font-size: 12px; font-weight: bold; }

.btn-hud {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
}

/* 主竞技场分栏 */
.main-arena {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.round-table-zone {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 12px;
  position: relative;
  overflow: hidden;
}

.table-card {
  flex: 1;
  position: relative;
  border-radius: 200px;
  background: radial-gradient(ellipse at center, #1e1b4b 0%, #0f172a 100%);
  border: 8px solid #312e81;
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.8), 0 20px 50px rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.table-center-hub {
  z-index: 2;
}

.secret-word-card {
  width: 180px;
  height: 100px;
  border-radius: 12px;
  border: 2px dashed rgba(99, 102, 241, 0.6);
  cursor: pointer;
  perspective: 600px;
  transition: all 0.3s;
}

.secret-word-card:hover {
  transform: scale(1.04);
  border-color: #818cf8;
}

.card-inner {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.card-front {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #94a3b8;
  font-size: 11px;
}

.secret-word-card.revealed .card-front { display: none; }
.secret-word-card:not(.revealed) .card-back { display: none; }

.card-back {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.secret-word-label { font-size: 10px; color: #94a3b8; }
.secret-word-val { font-size: 16px; }

.center-status-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.status-icon { font-size: 32px; }

/* 6个席位环形排布 */
.table-seat {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 5;
  cursor: pointer;
  transition: transform 0.2s;
}

.table-seat:hover { transform: scale(1.05); }

.seat-pos-0 { bottom: 15px; left: 50%; transform: translateX(-50%); }
.seat-pos-1 { bottom: 65px; left: 60px; }
.seat-pos-2 { top: 65px; left: 60px; }
.seat-pos-3 { top: 15px; left: 50%; transform: translateX(-50%); }
.seat-pos-4 { top: 65px; right: 60px; }
.seat-pos-5 { bottom: 65px; right: 60px; }

.seat-badge {
  background: rgba(15, 23, 42, 0.92);
  border: 2px solid rgba(255, 255, 255, 0.15);
  border-radius: 28px;
  padding: 3px 12px 3px 3px;
  display: flex;
  align-items: center;
  gap: 6px;
  box-shadow: 0 5px 14px rgba(0, 0, 0, 0.6);
  position: relative;
}

.table-seat.is-active .seat-badge {
  border-color: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.6);
}

.table-seat.is-selected-vote .seat-badge {
  border-color: #ef4444;
  box-shadow: 0 0 18px rgba(239, 68, 68, 0.7);
}

.table-seat.is-eliminated {
  opacity: 0.4;
  filter: grayscale(0.9);
}

.avatar-ring {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #1e293b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  position: relative;
}

.dead-tag {
  position: absolute;
  bottom: -2px;
  background: #ef4444;
  color: #fff;
  font-size: 8px;
  padding: 1px 3px;
  border-radius: 3px;
}

.seat-info { display: flex; flex-direction: column; }
.seat-name { font-size: 11px; color: #f8fafc; font-weight: 600; }
.me-tag { color: #38bdf8; }
.seat-vote-count { font-size: 10px; color: #94a3b8; }

.mic-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: #0284c7;
  padding: 3px;
  border-radius: 50%;
}

.speech-bubble {
  margin-top: 4px;
  background: rgba(0, 0, 0, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 11px;
  max-width: 140px;
  text-align: center;
}

/* 底部操作坞 */
.action-dock {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 16px;
  margin-top: 10px;
  border-radius: 10px;
}

.dock-row {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
}

.dock-row input {
  flex: 1;
  max-width: 400px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 6px 12px;
  color: #fff;
  font-size: 12px;
  outline: none;
}

.btn-arcade {
  padding: 7px 16px;
  border-radius: 6px;
  border: none;
  font-weight: bold;
  font-size: 12px;
  cursor: pointer;
  color: #fff;
}

.btn-primary { background: #0284c7; }
.btn-danger { background: #dc2626; }
.btn-danger:disabled { opacity: 0.4; cursor: not-allowed; }

/* 侧边常驻日志 */
.chat-sidebar {
  width: 300px;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.header-tab { display: flex; align-items: center; gap: 6px; }
.clue-tag { font-size: 10px; color: #818cf8; }

.sidebar-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.log-item {
  line-height: 1.35;
  color: #cbd5e1;
}

.log-item.danger { color: #f87171; font-weight: bold; }

.log-time { color: #64748b; margin-right: 4px; font-size: 10px; }

.sidebar-footer {
  padding: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.25);
}

/* 弹窗 */
.settle-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.result-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(99, 102, 241, 0.15);
  border: 1px solid rgba(99, 102, 241, 0.35);
  border-radius: 10px;
}

.result-banner.is-civilian-win {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.4);
}

.banner-icon { font-size: 32px; }

.words-reveal-box {
  display: flex;
  justify-content: space-around;
  padding: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.reveal-lbl { font-size: 12px; color: #94a3b8; }
.reveal-val { font-size: 14px; }

.players-identity-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.p-identity-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 6px;
  font-size: 12px;
}

.p-role-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}

.p-role-tag.civilian { background: #0284c7; color: #fff; }
.p-role-tag.undercover { background: #dc2626; color: #fff; }
.p-role-tag.whiteboard { background: #64748b; color: #fff; }
</style>
