<template>
  <div class="profile-view">
    <!-- 用户个人名片 -->
    <div class="user-card glass-panel">
      <div class="user-card-left">
        <div class="avatar-display" @click="showAvatarPicker = true">
          <span class="avatar-char">{{ userStore.avatar }}</span>
          <span class="edit-badge"><Edit3 class="w-3.5 h-3.5" /></span>
        </div>

        <div class="user-info-text">
          <div class="nickname-row">
            <h2 v-if="!isEditingName" class="nickname">{{ userStore.nickname }}</h2>
            <input 
              v-else 
              v-model="editNameInput" 
              type="text" 
              maxlength="12" 
              class="name-input"
              @keydown.enter="saveNickname"
            />
            <button class="name-edit-btn" @click="toggleEditName">
              <Check v-if="isEditingName" class="w-4 h-4 text-emerald-400" />
              <Edit2 v-else class="w-4 h-4 text-slate-400" />
            </button>
          </div>

          <div class="level-progress-box">
            <div class="level-text">
              <span class="font-arcade">Lv.{{ userStore.getLevel() }} 极客学员</span>
              <span class="exp-num font-arcade">{{ userStore.exp }} / {{ userStore.getNextLevelExp() }} EXP</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar" :style="{ width: expPercent + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧资产与概览 -->
      <div class="user-stats-summary">
        <div class="stat-pill">
          <Coins class="w-5 h-5 text-amber-400" />
          <div class="stat-meta">
            <span class="num font-arcade text-amber-400">{{ userStore.coins }}</span>
            <span class="lbl">金币资产</span>
          </div>
        </div>

        <div class="stat-pill">
          <Gamepad2 class="w-5 h-5 text-cyan-400" />
          <div class="stat-meta">
            <span class="num font-arcade text-cyan-400">{{ totalPlays }}</span>
            <span class="lbl">累计对局</span>
          </div>
        </div>

        <div class="stat-pill">
          <Award class="w-5 h-5 text-purple-400" />
          <div class="stat-meta">
            <span class="num font-arcade text-purple-400">{{ unlockedCount }} / {{ achievementStore.achievements.length }}</span>
            <span class="lbl">成就达成</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 成就荣誉墙专区 -->
    <section class="section-block">
      <div class="section-title">
        <Award class="w-5 h-5 text-amber-400" />
        <h2>成就荣誉墙 ({{ unlockedCount }}/{{ achievementStore.achievements.length }})</h2>
      </div>

      <div class="achievements-grid">
        <div 
          v-for="ach in achievementStore.achievements" 
          :key="ach.id" 
          class="achievement-card glass-panel"
          :class="{ 'is-unlocked': ach.unlocked }"
        >
          <div class="ach-icon-box">
            <span class="ach-icon">{{ ach.icon }}</span>
          </div>

          <div class="ach-info">
            <div class="ach-header">
              <h4 class="ach-title">{{ ach.title }}</h4>
              <span class="ach-reward font-arcade">+{{ ach.rewardCoins }} 🪙</span>
            </div>
            <p class="ach-desc">{{ ach.description }}</p>
            <div class="ach-status">
              <span v-if="ach.unlocked" class="status-tag unlocked">
                <Check class="w-3.5 h-3.5" /> 已达成
              </span>
              <span v-else class="status-tag locked">
                <Lock class="w-3.5 h-3.5" /> 待解锁
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 历史对局记录流水 -->
    <section class="section-block">
      <div class="section-title">
        <History class="w-5 h-5 text-cyan-400" />
        <h2>近期游戏记录流水</h2>
      </div>

      <div v-if="gameStore.records.length > 0" class="history-table glass-panel">
        <div class="table-row head">
          <span>游戏项目</span>
          <span>获得积分</span>
          <span>金币收益</span>
          <span>时间</span>
        </div>
        <div 
          v-for="rec in gameStore.records" 
          :key="rec.id" 
          class="table-row"
        >
          <span class="rec-title">{{ rec.gameTitle }}</span>
          <span class="rec-score font-arcade">{{ rec.score }}</span>
          <span class="rec-coins font-arcade">+{{ rec.coinsEarned }} 🪙</span>
          <span class="rec-date">{{ rec.date }}</span>
        </div>
      </div>
      <div v-else class="empty-hint glass-panel">
        <span>暂无对局历史，快去大厅开一局吧！</span>
      </div>
    </section>

    <!-- 头像选择弹窗 -->
    <Modal v-model="showAvatarPicker" title="选择玩家头像" width="380px">
      <div class="avatar-select-grid">
        <button 
          v-for="av in availableAvatars" 
          :key="av" 
          class="avatar-pick-btn"
          :class="{ active: userStore.avatar === av }"
          @click="selectAvatar(av)"
        >
          <span>{{ av }}</span>
        </button>
      </div>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Edit3, Edit2, Check, Coins, Gamepad2, Award, Lock, History } from 'lucide-vue-next'
import { useUserStore } from '@/stores/userStore'
import { useGameStore } from '@/stores/gameStore'
import { useAchievementStore } from '@/stores/achievementStore'
import { sound } from '@/utils/soundEngine'
import { storage } from '@/utils/storage'
import Modal from '@/components/common/Modal.vue'

const userStore = useUserStore()
const gameStore = useGameStore()
const achievementStore = useAchievementStore()

const isEditingName = ref(false)
const editNameInput = ref(userStore.nickname)
const showAvatarPicker = ref(false)

const availableAvatars = storage.get<string[]>('unlocked_avatars', ['🎮', '🤖', '🐱', '🦊', '🧙‍♂️'])

const totalPlays = computed(() => {
  return gameStore.games.reduce((acc, g) => acc + g.playCount, 0)
})

const unlockedCount = computed(() => {
  return achievementStore.achievements.filter(a => a.unlocked).length
})

const expPercent = computed(() => {
  const current = userStore.exp % 100
  return current
})

const toggleEditName = () => {
  sound.click()
  if (isEditingName.value) {
    saveNickname()
  } else {
    editNameInput.value = userStore.nickname
    isEditingName.value = true
  }
}

const saveNickname = () => {
  userStore.setNickname(editNameInput.value)
  isEditingName.value = false
}

const selectAvatar = (av: string) => {
  sound.click()
  userStore.setAvatar(av)
  showAvatarPicker.value = false
}
</script>

<style scoped>
.profile-view {
  display: flex;
  flex-direction: column;
  gap: 28px;
  max-width: 1000px;
  width: calc(100% - 24px);
  margin: 0 auto 40px auto;
  padding-top: 12px;
}

.user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 24px;
  padding: 30px;
  border-radius: 20px;
}

.user-card-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-display {
  position: relative;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: var(--bg-tertiary);
  border: 3px solid var(--accent-cyan);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.6rem;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(6, 182, 212, 0.4);
}

.edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--accent-cyan);
  color: #0f172a;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nickname-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nickname {
  font-size: 1.5rem;
  font-weight: 800;
  color: #fff;
}

.name-input {
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid var(--accent-cyan);
  border-radius: 8px;
  padding: 4px 10px;
  color: #fff;
  font-size: 1.2rem;
  font-weight: 700;
  outline: none;
}

.name-edit-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 4px;
}

.level-progress-box {
  width: 240px;
}

.level-text {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.progress-track {
  height: 7px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent-cyan), var(--accent-blue));
  transition: width 0.3s ease;
}

.user-stats-summary {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
}

.stat-meta {
  display: flex;
  flex-direction: column;
}

.stat-meta .num {
  font-size: 1.25rem;
  font-weight: 800;
}

.stat-meta .lbl {
  font-size: 0.72rem;
  color: var(--text-dim);
}

/* 成就墙 */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.achievement-card {
  display: flex;
  gap: 14px;
  padding: 16px;
  border-radius: 16px;
  opacity: 0.55;
  filter: grayscale(80%);
  transition: all 0.25s;
}

.achievement-card.is-unlocked {
  opacity: 1;
  filter: grayscale(0%);
  border-color: rgba(245, 158, 11, 0.4);
}

.ach-icon-box {
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  flex-shrink: 0;
}

.ach-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.ach-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.ach-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
}

.ach-reward {
  font-size: 0.8rem;
  color: #fbbf24;
  font-weight: 700;
}

.ach-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 8px;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 8px;
  font-weight: 600;
}

.status-tag.unlocked {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
}

.status-tag.locked {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-dim);
}

/* 历史流水 */
.history-table {
  padding: 16px 20px;
  border-radius: 16px;
}

.history-table .table-row {
  display: flex;
  justify-content: space-between;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.88rem;
}

.history-table .table-row.head {
  color: var(--text-dim);
  font-size: 0.75rem;
  font-weight: 700;
}

.rec-title { font-weight: 600; color: #fff; }
.rec-score { color: var(--accent-cyan); font-weight: 700; }
.rec-coins { color: #fbbf24; font-weight: 700; }
.rec-date { color: var(--text-dim); font-size: 0.8rem; }

.empty-hint {
  padding: 30px;
  text-align: center;
  border-radius: 16px;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.avatar-select-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.avatar-pick-btn {
  font-size: 2.2rem;
  padding: 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
}

.avatar-pick-btn:hover {
  transform: scale(1.1);
  border-color: var(--accent-cyan);
}

.avatar-pick-btn.active {
  background: rgba(6, 182, 212, 0.2);
  border-color: var(--accent-cyan);
}
</style>
