<template>
  <div class="poker-lobby-view">
    <!-- 巨幕尊荣牌手通行证与实时英雄区 -->
    <section class="hero-passport-section glass-panel">
      <!-- 个人牌手档案明细 -->
      <div class="player-passport">
        <div class="passport-header">
          <div class="avatar-wrapper">
            <span class="avatar-large">{{ authStore.currentUser?.avatar || userStore.avatar || '🤠' }}</span>
            <div class="vip-level-badge font-arcade">VIP {{ userLevel }}</div>
          </div>
          <div class="passport-meta">
            <div class="player-identity">
              <h2 class="player-name">{{ authStore.currentUser?.nickname || userStore.nickname || '神秘牌手' }}</h2>
              <span class="player-title font-arcade">{{ playerRankTitle }}</span>
            </div>
            <!-- 实时代币钱包 -->
            <div class="wallet-balance-row">
              <div class="balance-item font-arcade">
                <span class="lbl">筹码余额</span>
                <span class="val text-amber-400">🪙 {{ currentCoins.toLocaleString() }}</span>
              </div>
              <button 
                class="btn-claim-supply font-arcade" 
                :disabled="hasClaimedToday || isClaiming" 
                @click="handleClaimDailyBonus"
              >
                <Gift class="w-4 h-4 text-amber-300" />
                <span>{{ hasClaimedToday ? '今日补给已领' : '+300 每日筹码' }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- 战绩微概览 -->
        <div class="passport-stats font-arcade">
          <div class="stat-pill">
            <span class="stat-k">总手牌</span>
            <span class="stat-v text-slate-200">{{ gameStore.records.filter(r => r.gameId === 'texas').length + 18 }}</span>
          </div>
          <div class="stat-pill">
            <span class="stat-k">入局胜率</span>
            <span class="stat-v text-emerald-400">58.4%</span>
          </div>
          <div class="stat-pill">
            <span class="stat-k">最佳牌型</span>
            <span class="stat-v text-cyan-400">皇家同花顺 👑</span>
          </div>
        </div>
      </div>

      <!-- 快捷入口 Banner -->
      <div class="hero-quick-action">
        <div class="brand-tagline">
          <div class="live-status-pill font-arcade">
            <span class="status-dot animate-pulse"></span>
            <span>CLOUDFLARE SECURE WEBSOCKET ONLINE</span>
          </div>
          <h1 class="hero-title">
            KK POKER<br />
            <span class="gold-gradient-text">顶级竞技德扑俱乐部</span>
          </h1>
          <p class="hero-subtext">
            毫秒级云端网络同步 · 严格防窥牌机制 · 真实物理筹码音浪 · 挑战全网高手！
          </p>
        </div>

        <div class="quick-action-btns">
          <button class="btn-arcade btn-vip-primary" @click="quickJoin('room_beginner')">
            <Zap class="w-5 h-5 fill-current" />
            <span>一键极速入座 (新手欢聚)</span>
          </button>
          <button class="btn-arcade btn-vip-secondary" @click="showCreateModal = true">
            <Plus class="w-5 h-5" />
            <span>创建专属好友包厢</span>
          </button>
          <button class="btn-arcade btn-vip-outline" @click="showRulesModal = true">
            <BookOpen class="w-5 h-5" />
            <span>牌型与胜率图解</span>
          </button>
        </div>
      </div>
    </section>

    <!-- 桌台分类大厅 (Table Hub) -->
    <section class="tables-section">
      <div class="section-header">
        <div class="title-group">
          <Sparkles class="w-5 h-5 text-amber-400" />
          <h3 class="section-title">竞技桌台大厅 (POKER TABLES)</h3>
        </div>
        <span class="online-counter font-arcade">当前全桌活跃：48 位在线牌手</span>
      </div>

      <div class="tables-grid">
        <!-- 桌台卡片列表 -->
        <div 
          v-for="table in pokerTables" 
          :key="table.id" 
          class="table-card glass-panel"
          :class="table.themeClass"
        >
          <div class="table-card-header">
            <div class="badge-group">
              <span class="status-indicator" :class="table.statusClass">
                <span class="dot"></span>
                {{ table.statusText }}
              </span>
              <span class="table-type-badge font-arcade">{{ table.typeText }}</span>
            </div>
            <div class="seat-count font-arcade">
              <Users class="w-4 h-4" />
              <span>{{ table.playersCount }}/6 在席</span>
            </div>
          </div>

          <div class="table-card-body">
            <div class="table-avatar-preview">
              <div class="felt-preview-ring">
                <span class="preview-felt-icon">♠</span>
              </div>
            </div>
            <h4 class="table-name">{{ table.name }}</h4>
            <div class="blind-info font-arcade">
              盲注：<span class="text-amber-400 font-bold">{{ table.sb }} / {{ table.bb }}</span>
            </div>
            <div class="buyin-info font-arcade">
              推荐带入：🪙 {{ table.minBuyIn.toLocaleString() }} ~ {{ table.maxBuyIn.toLocaleString() }}
            </div>
          </div>

          <!-- 桌上玩家预览 -->
          <div class="table-seated-players">
            <div class="avatars-cluster">
              <span v-for="(p, i) in table.seatedAvatars" :key="i" class="mini-avatar" :title="p.name">
                {{ p.avatar }}
              </span>
              <span v-for="empty in (6 - table.seatedAvatars.length)" :key="empty" class="empty-seat-dot"></span>
            </div>
          </div>

          <div class="table-card-footer">
            <button class="btn-enter-table font-arcade" @click="enterTable(table.id, table.isSolo, table.isShort)">
              <span>{{ table.btnText }}</span>
              <ChevronRight class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 经典街机与热门游艺专区 (为其他小游戏提供精美入口) -->
    <section class="arcade-section">
      <div class="section-header">
        <div class="title-group">
          <Gamepad2 class="w-5 h-5 text-cyan-400" />
          <h3 class="section-title">经典街机与益智专区 (ARCADE & BOARD GAMES)</h3>
        </div>
        <span class="online-counter font-arcade">休闲即开 · 零延迟畅玩</span>
      </div>

      <div class="arcade-grid">
        <div 
          v-for="game in arcadeGames" 
          :key="game.id" 
          class="arcade-card glass-panel"
          @click="router.push(`/game/${game.id}`)"
        >
          <div class="arcade-card-top">
            <span class="arcade-icon">{{ game.icon }}</span>
            <div class="arcade-play-count font-arcade">🔥 {{ game.playCount }} 游玩</div>
          </div>
          <div class="arcade-card-mid">
            <h4 class="arcade-title">{{ game.title }}</h4>
            <span class="arcade-sub font-arcade">{{ game.subtitle }}</span>
            <p class="arcade-desc">{{ game.description }}</p>
          </div>
          <div class="arcade-card-btm">
            <div class="arcade-tags">
              <span v-for="tag in game.tags.slice(0, 2)" :key="tag" class="arcade-tag">#{{ tag }}</span>
            </div>
            <button class="btn-play-mini font-arcade">
              <span>立即开局</span>
              <ChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 名人堂 & 战绩排行榜 -->
    <section class="bottom-features-grid">
      <!-- 德扑富豪榜 -->
      <div class="hall-of-fame glass-panel">
        <div class="card-header">
          <div class="header-icon">
            <Trophy class="w-5 h-5 text-amber-400" />
            <h4>本周赌神榜 (HALL OF FAME)</h4>
          </div>
          <span class="text-xs text-slate-400 font-arcade">实时更新</span>
        </div>

        <div class="leader-list">
          <div v-for="(leader, idx) in leaderboard" :key="idx" class="leader-item">
            <div class="rank-num font-arcade" :class="`rank-${idx + 1}`">
              {{ idx === 0 ? '👑' : idx + 1 }}
            </div>
            <span class="leader-avatar">{{ leader.avatar }}</span>
            <div class="leader-info">
              <span class="leader-name">{{ leader.name }}</span>
              <span class="leader-title text-xs text-slate-400">{{ leader.title }}</span>
            </div>
            <div class="leader-chips font-arcade text-amber-400">
              🪙 {{ leader.chips.toLocaleString() }}
            </div>
          </div>
        </div>
      </div>

      <!-- 公平竞技与技术特性声明 -->
      <div class="security-card glass-panel">
        <div class="card-header">
          <div class="header-icon">
            <ShieldCheck class="w-5 h-5 text-emerald-400" />
            <h4>公平竞技与安全机制</h4>
          </div>
          <span class="text-xs text-emerald-400 font-arcade">100% VERIFIED</span>
        </div>

        <div class="features-list">
          <div class="feat-item">
            <Lock class="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <h5>暗牌绝对物理隔离</h5>
              <p>手牌在未摊牌前严格仅对牌手本人下发，网络数据包全面脱敏，彻底杜绝外挂与偷窥透视。</p>
            </div>
          </div>
          <div class="feat-item">
            <Database class="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h5>Turso 云端金融级持久化</h5>
              <p>对局筹码结算实时同步至分布式 libSQL 数据库，任何网络断连均有账单流水兜底，资产安全无忧。</p>
            </div>
          </div>
          <div class="feat-item">
            <Activity class="w-5 h-5 text-purple-400 shrink-0" />
            <div>
              <h5>权威 15 秒限时出牌状态机</h5>
              <p>严谨的盲注与转牌时序逻辑，超时自动过牌与防拖延惩罚，保障每局牌流畅激昂。</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 弹窗 A: 德扑牌型速查指南 -->
    <Modal v-model="showRulesModal" title="德州扑克官方标准牌型与胜率图解" width="620px">
      <div class="rules-modal-content">
        <div class="rank-explainer">
          <div v-for="r in pokerRanksList" :key="r.name" class="rank-row">
            <div class="rank-name-col">
              <span class="rank-badge font-arcade">{{ r.tier }}</span>
              <span class="rank-title font-bold">{{ r.name }}</span>
            </div>
            <div class="rank-cards-col">
              <span class="cards-preview font-arcade">{{ r.example }}</span>
            </div>
            <div class="rank-desc-col text-slate-300 text-xs">
              {{ r.desc }}
            </div>
          </div>
        </div>
      </div>
    </Modal>

    <!-- 弹窗 B: 创建专属好友包厢 -->
    <Modal v-model="showCreateModal" title="创建专属好友私人桌" width="480px">
      <div class="create-room-modal font-arcade">
        <div class="form-group">
          <label>包厢名称</label>
          <input v-model="newRoomName" placeholder="例如：皇家乐队私人局" class="custom-input" />
        </div>
        <div class="form-group">
          <label>盲注级别 (SB / BB)</label>
          <select v-model="newRoomBlind" class="custom-select">
            <option :value="[10, 20]">小盲 10 / 大盲 20 (休闲娱乐)</option>
            <option :value="[50, 100]">小盲 50 / 大盲 100 (中额竞技)</option>
            <option :value="[200, 400]">小盲 200 / 大盲 400 (豪客争霸)</option>
          </select>
        </div>
        <div class="form-actions">
          <button class="btn-arcade btn-vip-primary w-full" @click="handleCreatePrivateRoom">
            <span>立即开启包厢并进入</span>
          </button>
        </div>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { api } from '@/services/api'
import { sound } from '@/utils/soundEngine'
import Modal from '@/components/common/Modal.vue'
import confetti from 'canvas-confetti'
import { 
  Gift, Zap, Plus, BookOpen, Sparkles, Users, 
  ChevronRight, Trophy, ShieldCheck, Lock, Database, Activity, Gamepad2 
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const userStore = useUserStore()
const gameStore = useGameStore()

const arcadeGames = computed(() => gameStore.games.filter(g => g.id !== 'texas'))

const showRulesModal = ref(false)
const showCreateModal = ref(false)
const isClaiming = ref(false)
const hasClaimedToday = ref(false)
const newRoomName = ref('')
const newRoomBlind = ref([10, 20])

const currentCoins = computed(() => {
  return authStore.currentUser?.coins ?? userStore.coins ?? 2000
})

const userLevel = computed(() => {
  const coins = currentCoins.value
  if (coins > 50000) return 10
  if (coins > 20000) return 7
  if (coins > 8000) return 5
  if (coins > 3000) return 3
  return 1
})

const playerRankTitle = computed(() => {
  const lvl = userLevel.value
  if (lvl >= 10) return '👑 传奇皇家赌神'
  if (lvl >= 7) return '🦈 维加斯大白鲨'
  if (lvl >= 5) return '💎 澳门黄金主将'
  if (lvl >= 3) return '⚔️ 高级竞技牌手'
  return '🎲 锦标赛新秀'
})

// 桌台大厅配置
const pokerTables = [
  {
    id: 'room_beginner',
    name: '澳门微额欢乐桌 🟢',
    typeText: '6人常规桌',
    statusText: '火热激战',
    statusClass: 'status-hot',
    themeClass: 'theme-emerald',
    sb: 10,
    bb: 20,
    minBuyIn: 400,
    maxBuyIn: 2000,
    playersCount: 3,
    btnText: '快速就坐',
    isSolo: false,
    seatedAvatars: [
      { name: '赛博赌圣', avatar: '🤖' },
      { name: '保本岩石怪', avatar: '🪨' },
      { name: 'Poul', avatar: '🎩' }
    ]
  },
  {
    id: 'room_pro',
    name: '拉斯维加斯经典桌 🟡',
    typeText: '6人深筹桌',
    statusText: '高额角逐',
    statusClass: 'status-active',
    themeClass: 'theme-gold',
    sb: 50,
    bb: 100,
    minBuyIn: 2000,
    maxBuyIn: 10000,
    playersCount: 2,
    btnText: '进入高额桌',
    isSolo: false,
    seatedAvatars: [
      { name: '深海大白鲨', avatar: '🦈' },
      { name: '德州老猫', avatar: '🐱' }
    ]
  },
  {
    id: 'room_master',
    name: '蒙特卡洛巅峰豪客桌 🔴',
    typeText: 'VIP尊享桌',
    statusText: '豪客对决',
    statusClass: 'status-vip',
    themeClass: 'theme-crimson',
    sb: 200,
    bb: 400,
    minBuyIn: 8000,
    maxBuyIn: 50000,
    playersCount: 1,
    btnText: '豪客入场',
    isSolo: false,
    seatedAvatars: [
      { name: '冷酷老爵士', avatar: '🕶️' }
    ]
  },
  {
    id: 'room_short_1',
    name: '短牌6+·热血微额桌 ⚡',
    typeText: '短牌36张规则',
    statusText: '短牌爆款',
    statusClass: 'status-hot',
    themeClass: 'theme-gold',
    sb: 10,
    bb: 20,
    minBuyIn: 400,
    maxBuyIn: 2000,
    playersCount: 2,
    btnText: '体验短牌',
    isSolo: false,
    seatedAvatars: [
      { name: '短牌战神', avatar: '⚡' },
      { name: '快打旋风', avatar: '🌪️' }
    ]
  },
  {
    id: 'solo_ai',
    name: '单人大师AI演练场 (标准) 🤖',
    typeText: '单机练功房',
    statusText: '离线秒开',
    statusClass: 'status-solo',
    themeClass: 'theme-obsidian',
    sb: 5,
    bb: 10,
    minBuyIn: 200,
    maxBuyIn: 2000,
    playersCount: 1,
    btnText: '标准练手',
    isSolo: true,
    isShort: false,
    seatedAvatars: [
      { name: 'AI大师', avatar: '🧠' }
    ]
  },
  {
    id: 'solo_short',
    name: '单人短牌6+ 练功房 ⚡',
    typeText: '短牌单机版',
    statusText: '同花>葫芦',
    statusClass: 'status-active',
    themeClass: 'theme-gold',
    sb: 5,
    bb: 10,
    minBuyIn: 200,
    maxBuyIn: 2000,
    playersCount: 1,
    btnText: '短牌练手',
    isSolo: true,
    isShort: true,
    seatedAvatars: [
      { name: '短牌大师', avatar: '🦈' }
    ]
  }
]

// 榜单数据
const leaderboard = [
  { name: '澳门飞牌王', avatar: '🎩', title: '胜率 69.2%', chips: 185600 },
  { name: '赌圣Poul', avatar: '👑', title: '胜率 64.0%', chips: 128400 },
  { name: '深海大白鲨', avatar: '🦈', title: '胜率 61.5%', chips: 94200 },
  { name: '赛博赌圣', avatar: '🤖', title: '胜率 55.8%', chips: 63000 }
]

// 牌型列表
const pokerRanksList = [
  { tier: 'No.1', name: '皇家同花顺 (Royal Flush)', example: '♠A ♠K ♠Q ♠J ♠10', desc: '扑克之王！同花色的 A-K-Q-J-10，无坚不摧。' },
  { tier: 'No.2', name: '同花顺 (Straight Flush)', example: '♥9 ♥8 ♥7 ♥6 ♥5', desc: '同一花色的五张连续数字牌。短牌中 A-6-7-8-9 算同花顺！' },
  { tier: 'No.3', name: '四条 / 金刚 (Four of a Kind)', example: '♣8 ♠8 ♥8 ♦8 ♠K', desc: '四张相同点数的牌，外加一张任意杂牌。' },
  { tier: 'No.4', name: '短牌同花 (Short Deck Flush)', example: '♦A ♦J ♦9 ♦7 ♦6', desc: '【短牌特则】短牌无2~5，同花仅有9张，极难成牌，故短牌中同花大于葫芦！' },
  { tier: 'No.5', name: '葫芦 / 满堂红 (Full House)', example: '♠Q ♥Q ♦Q ♠7 ♥7', desc: '三张同点数牌 + 一对。' },
  { tier: 'No.6', name: '同花 (Standard Flush)', example: '♦A ♦J ♦9 ♦6 ♦3', desc: '标准德州中同一花色的任意五张非连续牌。' },
  { tier: 'No.7', name: '顺子 (Straight)', example: '♠8 ♥7 ♦6 ♣5 ♠4', desc: '五张连续点数牌。短牌中 A-6-7-8-9 为最小顺子！' },
  { tier: 'No.8', name: '三条 (Three of a Kind)', example: '♣J ♠J ♦J ♠9 ♣4', desc: '三张相同点数的牌。' },
  { tier: 'No.9', name: '两对 (Two Pair)', example: '♠K ♥K ♣9 ♦9 ♠3', desc: '两组不同点数的对子。' },
  { tier: 'No.10', name: '一对 (One Pair)', example: '♥A ♦A ♠J ♣8 ♦4', desc: '两张相同点数的牌。' }
]

function quickJoin(roomId: string) {
  sound.click()
  router.push(`/game/texas?room=${roomId}`)
}

function enterTable(tableId: string, isSolo: boolean, isShort = false) {
  sound.click()
  if (isSolo) {
    router.push(`/game/texas?mode=single${isShort ? '&variant=shortdeck' : ''}`)
  } else {
    router.push(`/game/texas?room=${tableId}&mode=multiplayer`)
  }
}

async function handleClaimDailyBonus() {
  if (hasClaimedToday.value || isClaiming.value) return
  isClaiming.value = true
  sound.click()

  try {
    const res = await api.claimDailyBonus()
    if (res.ok) {
      sound.powerup()
      hasClaimedToday.value = true
      if (authStore.currentUser && res.coins) {
        authStore.currentUser.coins = res.coins
      }
      userStore.coins = res.coins || userStore.coins + 300
      confetti({ particleCount: 50, spread: 60 })
    }
  } catch (e) {
    console.error(e)
  } finally {
    isClaiming.value = false
  }
}

function handleCreatePrivateRoom() {
  if (!newRoomName.value.trim()) {
    newRoomName.value = '皇室包厢'
  }
  const customId = `room_p_${Date.now()}`
  showCreateModal.value = false
  sound.victory()
  router.push(`/game/texas?room=${customId}&name=${encodeURIComponent(newRoomName.value)}&sb=${newRoomBlind.value[0]}&bb=${newRoomBlind.value[1]}`)
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    authStore.checkAuth()
  }
})
</script>

<style scoped>
.poker-lobby-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 0 40px;
}

/* 巨幕牌手档案区 */
.hero-passport-section {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 24px;
  padding: 24px;
  border-radius: 20px;
  background: radial-gradient(circle at top left, #0e1726 0%, #06090e 100%);
  border: 1px solid rgba(245, 158, 11, 0.2);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
}

.player-passport {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
}

.passport-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.avatar-wrapper {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.avatar-large {
  width: 64px;
  height: 64px;
  background: #1e293b;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  border: 2px solid #f59e0b;
  box-shadow: 0 0 15px rgba(245, 158, 11, 0.4);
}

.vip-level-badge {
  position: absolute;
  bottom: -6px;
  background: #d97706;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 8px;
  border: 1px solid #fde68a;
}

.passport-meta {
  flex: 1;
}

.player-name {
  font-size: 18px;
  color: #fff;
  font-weight: 700;
}

.player-title {
  font-size: 12px;
  color: #38bdf8;
}

.wallet-balance-row {
  margin-top: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.balance-item {
  display: flex;
  flex-direction: column;
}

.balance-item .lbl { font-size: 11px; color: #94a3b8; }
.balance-item .val { font-size: 16px; font-weight: 800; }

.btn-claim-supply {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fde68a;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 11px;
  transition: all 0.2s;
}

.btn-claim-supply:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.3);
  transform: translateY(-1px);
}

.passport-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 16px;
}

.stat-pill {
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 8px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-k { font-size: 10px; color: #64748b; }
.stat-v { font-size: 12px; font-weight: 700; }

/* 巨幕行动区 */
.hero-quick-action {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.live-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.3);
  color: #34d399;
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 20px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #10b981;
}

.hero-title {
  font-size: 32px;
  font-weight: 900;
  line-height: 1.15;
  margin: 10px 0;
  letter-spacing: -0.5px;
}

.gold-gradient-text {
  background: linear-gradient(135deg, #fef08a 0%, #f59e0b 50%, #b45309 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtext {
  font-size: 13px;
  color: #94a3b8;
  max-width: 540px;
}

.quick-action-btns {
  display: flex;
  gap: 12px;
  margin-top: 18px;
}

.btn-vip-primary {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fff;
  border: 1px solid #fef08a;
  box-shadow: 0 0 15px rgba(217, 119, 6, 0.4);
}

.btn-vip-secondary {
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.3);
  color: #38bdf8;
}

.btn-vip-outline {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
}

/* 桌台大厅 */
.tables-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  color: #f8fafc;
  font-weight: 800;
}

.online-counter {
  font-size: 13px;
  color: #34d399;
}

.tables-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(270px, 1fr));
  gap: 16px;
}

.table-card {
  padding: 18px;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.table-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 25px rgba(0, 0, 0, 0.6);
}

.theme-emerald {
  border: 1px solid rgba(16, 185, 129, 0.3);
  background: radial-gradient(circle at top right, #092c19 0%, #05140c 100%);
}

.theme-gold {
  border: 1px solid rgba(245, 158, 11, 0.35);
  background: radial-gradient(circle at top right, #332009 0%, #110c05 100%);
}

.theme-crimson {
  border: 1px solid rgba(239, 68, 68, 0.35);
  background: radial-gradient(circle at top right, #360d0d 0%, #140404 100%);
}

.theme-obsidian {
  border: 1px solid rgba(56, 189, 248, 0.3);
  background: radial-gradient(circle at top right, #0d2238 0%, #060d16 100%);
}

.table-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.badge-group {
  display: flex;
  gap: 6px;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 6px;
}

.status-hot { background: rgba(239, 68, 68, 0.2); color: #f87171; }
.status-active { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
.status-vip { background: rgba(168, 85, 247, 0.2); color: #c084fc; }
.status-solo { background: rgba(56, 189, 248, 0.2); color: #38bdf8; }

.status-indicator .dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.table-type-badge {
  font-size: 11px;
  color: #94a3b8;
  background: rgba(0, 0, 0, 0.4);
  padding: 2px 6px;
  border-radius: 6px;
}

.seat-count {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #cbd5e1;
  font-size: 12px;
}

.table-card-body {
  margin: 16px 0;
  text-align: center;
}

.felt-preview-ring {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  margin: 0 auto 8px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #f59e0b;
}

.table-name {
  font-size: 16px;
  color: #f8fafc;
  font-weight: 700;
  margin-bottom: 6px;
}

.blind-info { font-size: 13px; color: #cbd5e1; }
.buyin-info { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.table-seated-players {
  margin-bottom: 16px;
}

.avatars-cluster {
  display: flex;
  justify-content: center;
  gap: 6px;
}

.mini-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #1e293b;
  border: 1px solid #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.empty-seat-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.btn-enter-table {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #f8fafc;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.table-card:hover .btn-enter-table {
  background: #0284c7;
  border-color: #38bdf8;
}

/* 底部区域 */
.bottom-features-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.hall-of-fame, .security-card {
  padding: 20px;
  border-radius: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon h4 {
  font-size: 15px;
  color: #f8fafc;
  font-weight: 700;
}

.leader-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.leader-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  gap: 12px;
}

.rank-num { font-size: 14px; font-weight: 800; width: 24px; text-align: center; }
.rank-1 { color: #f59e0b; }
.rank-2 { color: #94a3b8; }
.rank-3 { color: #b45309; }

.leader-avatar { font-size: 20px; }
.leader-info { flex: 1; display: flex; flex-direction: column; }
.leader-name { font-size: 13px; color: #fff; font-weight: 600; }

.features-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.feat-item {
  display: flex;
  gap: 12px;
}

.feat-item h5 {
  font-size: 13px;
  color: #38bdf8;
  font-weight: 700;
  margin-bottom: 2px;
}

.feat-item p {
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.5;
}

/* 牌型弹窗 */
.rules-modal-content {
  max-height: 480px;
  overflow-y: auto;
  padding: 4px;
}

.rank-row {
  display: grid;
  grid-template-columns: 180px 140px 1fr;
  gap: 12px;
  align-items: center;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.rank-badge {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
  margin-right: 6px;
}

.cards-preview {
  color: #facc15;
  font-size: 12px;
}

/* 创建房间表单 */
.create-room-modal {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 12px;
  color: #94a3b8;
}

.custom-input, .custom-select {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 10px 14px;
  color: #fff;
  font-size: 14px;
}

/* 街机小游戏专区样式 */
.arcade-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.arcade-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}

.arcade-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.25s ease;
}

.arcade-card:hover {
  transform: translateY(-3px);
  border-color: rgba(6, 182, 212, 0.4);
  box-shadow: 0 10px 25px rgba(6, 182, 212, 0.15);
}

.arcade-card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arcade-icon {
  font-size: 28px;
}

.arcade-play-count {
  font-size: 11px;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
  padding: 2px 8px;
  border-radius: 12px;
}

.arcade-card-mid {
  margin: 12px 0;
}

.arcade-title {
  font-size: 16px;
  color: #f8fafc;
  font-weight: 700;
}

.arcade-sub {
  font-size: 10px;
  color: #06b6d4;
  letter-spacing: 0.5px;
}

.arcade-desc {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 6px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.arcade-card-btm {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 10px;
}

.arcade-tags {
  display: flex;
  gap: 4px;
}

.arcade-tag {
  font-size: 10px;
  color: #64748b;
}

.btn-play-mini {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #38bdf8;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px 6px;
}

.arcade-card:hover .btn-play-mini {
  color: #06b6d4;
  transform: translateX(2px);
}

@media (max-width: 900px) {
  .hero-passport-section {
    grid-template-columns: 1fr;
  }
  .bottom-features-grid {
    grid-template-columns: 1fr;
  }
}
</style>
