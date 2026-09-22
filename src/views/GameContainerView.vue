<template>
  <div class="game-view-wrapper">
    <!-- 顶部游戏工作栏 -->
    <div class="game-header glass-panel">
      <div class="header-left">
        <button class="back-btn" @click="goBack">
          <ArrowLeft class="w-5 h-5" />
          <span>返回大厅</span>
        </button>

        <div v-if="game" class="game-meta">
          <span class="game-emoji">{{ game.icon }}</span>
          <div class="game-titles">
            <h2 class="title">{{ game.title }}</h2>
            <span class="subtitle font-arcade">{{ game.subtitle }}</span>
          </div>
        </div>
      </div>

      <div class="header-right">
        <!-- 玩法说明 -->
        <button class="tool-btn" @click="showRules = true" title="玩法规则">
          <HelpCircle class="w-5 h-5" />
          <span class="btn-text">玩法</span>
        </button>

        <!-- 音效开关 -->
        <button 
          class="tool-btn" 
          :class="{ active: userStore.soundEnabled }" 
          @click="toggleSound" 
          :title="userStore.soundEnabled ? '音效开启中' : '音效已静音'"
        >
          <Volume2 v-if="userStore.soundEnabled" class="w-5 h-5" />
          <VolumeX v-else class="w-5 h-5" />
        </button>

        <!-- 全屏切换 -->
        <button class="tool-btn" @click="toggleFullscreen" title="游戏全屏模式">
          <Maximize2 class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- 游戏舞台主体 -->
    <main class="game-stage">
      <transition name="fade" mode="out-in">
        <component :is="activeGameComponent" v-if="activeGameComponent" />
        <div v-else class="not-found glass-panel">
          <AlertCircle class="w-16 h-16 text-rose-500 mb-2" />
          <h2>未找到此游戏</h2>
          <button class="btn-arcade btn-primary mt-4" @click="goBack">返回大厅</button>
        </div>
      </transition>
    </main>

    <!-- 玩法说明弹窗 -->
    <Modal v-model="showRules" :title="`${game?.title || '游戏'} - 玩法指南`" width="460px">
      <div class="rules-body">
        <div class="rules-tags">
          <span v-for="tag in game?.tags" :key="tag" class="tag">#{{ tag }}</span>
        </div>
        <p class="rules-desc">{{ game?.description }}</p>
        
        <div class="rules-instructions">
          <h4>操作指南：</h4>
          <ul v-if="gameId === 'gomoku'">
            <li>点击任意空白交叉点放置黑子，AI 执白棋随后跟进；</li>
            <li>横向、纵向、正斜或反斜率先连成 5 子即可获胜；</li>
            <li>支持随时撤回上一步（悔棋），支持三种 AI 难度切换或双人模式。</li>
          </ul>
          <ul v-else-if="gameId === 'snake'">
            <li>使用键盘 <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> 或方向键操控蛇身游走；</li>
            <li>移动端可点击屏幕下方的十字方向盘操控；</li>
            <li>拾取红苹果增加长度与积分，金币提供大额奖励，冰晶可使速度缓减。</li>
          </ul>
          <ul v-else-if="gameId === '2048'">
            <li>使用方向键或触控在网格上滑动；</li>
            <li>相同数字方块碰撞时将合并翻倍并提供等值积分加成；</li>
            <li>合理安排布局，尝试合成出传奇 2048 及以上数字！</li>
          </ul>
          <ul v-else-if="gameId === 'shooter'">
            <li>移动鼠标或直接用手指触屏拖拽战机，战机将自动连续开火；</li>
            <li>击碎敌机有概率掉落强化晶体（[P] 弹幕升级、[S] 能量护盾、[+] 恢复生命）；</li>
            <li>注意躲避敌方红光弹幕与敌机机身碰撞，战胜强大的母舰 Boss！</li>
          </ul>
          <ul v-else-if="gameId === 'minesweeper'">
            <li>首次点击必为安全空地；</li>
            <li>鼠标左键翻开方格，鼠标右键插旗锁定地雷（触控端可点击工具栏切换模式）；</li>
            <li>翻开所有非地雷格子即可大获全胜，用最短的时间刷新记录！</li>
          </ul>
          <ul v-else-if="gameId === 'zhajinhua'">
            <li>开局所有玩家自动投入底注，每人发 3 张暗牌；</li>
            <li><b>未看牌 (暗注)</b>：跟注所需筹码为标准基数；</li>
            <li><b>已看牌 (明注)</b>：跟注所需筹码自动翻倍（暗10 = 明20）；</li>
            <li><b>比牌对决 (PK)</b>：第 2 轮起可消耗双倍筹码指定一名未弃牌对手进行 1v1 绝杀比牌，输者直接出局；</li>
            <li><b>牌型大小</b>：豹子 > 顺金 > 金花 > 顺子 > 对子 > 单张散牌（特殊不同花色 235 遇豹子逆天绝杀获胜）。</li>
          </ul>
          <ul v-else-if="gameId === 'texas'">
            <li>每人发 2 张底牌，公共区域依次发 5 张牌（翻牌 3 张、转牌 1 张、河牌 1 张）；</li>
            <li><b>四轮博弈</b>：翻牌前 (Preflop) -> 翻牌圈 (Flop) -> 转牌圈 (Turn) -> 河牌圈 (River)；</li>
            <li><b>行动选择</b>：无需补筹时可免费<b>过牌 (Check)</b>；需补齐最高下注时选择<b>跟注 (Call)</b>；看好牌势可<b>加注 (Raise)</b> 或<b>全下 (All-In)</b>；牌差可<b>弃牌 (Fold)</b>；</li>
            <li><b>7 选 5 最佳组合</b>：皇家同花顺 > 同花顺 > 四条 > 葫芦 > 同花 > 顺子 > 三条 > 两对 > 一对 > 高牌。</li>
          </ul>
          <ul v-else-if="gameId === 'baquepai'">
            <li><b>84 张特色牌库</b>：两副扑克 6~A (72张) + 4张额外主角金牌 8 + 4张百变牌 🃏 + 4张问号机会牌 ❓；</li>
            <li><b>开局换两张</b>：开局从手牌中挑选 2 张废牌与对手随机交换，迅速调整起手听牌结构；</li>
            <li><b>摸打与 8 张胡牌</b>：每轮摸入第 8 张牌，组成 3+3+2(平胡/碰碰胡)、四对子(四双飞)、一条龙(八连顺)、双炸(4+4)即可胡牌；</li>
            <li><b>问号牌 4 选 1 特权</b>：打出问号牌 ❓ 立即翻开牌堆最顶部的 4 张牌供自选 1 张补入手牌，其余 3 张归还牌堆顶！</li>
            <li><b>当忍则忍</b>：摸到胡牌时可选择“忍”放弃胡牌，累计“忍”标记使最终胡牌收益疯狂翻倍；</li>
            <li><b>打空牌库多次胡牌</b>：单局胡牌不退场，持续摸打直至 84 张牌全部摸完进行全场大盘结算。</li>
          </ul>
          <ul v-else-if="gameId === 'draw-and-guess'">
            <li><b>我画你猜模式</b>：根据题目提示词在画板上进行简笔作画，右侧观众与 AI 会根据画作实时推理竞猜；</li>
            <li><b>电脑画我来猜</b>：系统给出分类提示与字数，观察轮廓线条，输入正确的词语即可夺得分数；</li>
            <li><b>丰富画图工具</b>：支持多种颜色、画笔粗细切换、橡皮擦与一键撤销功能。</li>
          </ul>
          <ul v-else-if="gameId === 'undercover'">
            <li><b>身份分配</b>：大部分玩家拿到【平民词】，少数玩家拿到高度相似但不同的【卧底词】；</li>
            <li><b>轮流陈述</b>：每位玩家顺时针依次用一句话描述自己的暗号，切忌直接说出原词或让卧底听出破绽；</li>
            <li><b>公投放逐</b>：全员发言完毕后进行投票，票数最高者被淘汰出局；</li>
            <li><b>卧底绝地反猜</b>：卧底被淘汰后可获得 1 次机会反猜平民词，猜对则直接逆转取胜！</li>
          </ul>
        </div>
      </div>
      <template #footer>
        <button class="btn-arcade btn-primary" @click="showRules = false">了解，开始战斗</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Volume2, VolumeX, Maximize2, HelpCircle, AlertCircle } from 'lucide-vue-next'
import { useGameStore } from '@/stores/gameStore'
import { useUserStore } from '@/stores/userStore'
import { sound } from '@/utils/soundEngine'
import Modal from '@/components/common/Modal.vue'

// 动态载入游戏组件
import GomokuGame from '@/games/gomoku/GomokuGame.vue'
import SnakeGame from '@/games/snake/SnakeGame.vue'
import Game2048 from '@/games/2048/Game2048.vue'
import ShooterGame from '@/games/shooter/ShooterGame.vue'
import MinesweeperGame from '@/games/minesweeper/MinesweeperGame.vue'
import ZhajinhuaGame from '@/games/zhajinhua/ZhajinhuaGame.vue'
import TexasGame from '@/games/texas/TexasGame.vue'
import BaquepaiGame from '@/games/baquepai/BaquepaiGame.vue'
import DrawAndGuessGame from '@/games/draw-and-guess/DrawAndGuessGame.vue'
import UndercoverGame from '@/games/undercover/UndercoverGame.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()
const userStore = useUserStore()

const gameId = computed(() => route.params.id as string)
const game = computed(() => gameStore.games.find(g => g.id === gameId.value))
const showRules = ref(false)

const activeGameComponent = computed(() => {
  const map: Record<string, any> = {
    gomoku: GomokuGame,
    snake: SnakeGame,
    '2048': Game2048,
    shooter: ShooterGame,
    minesweeper: MinesweeperGame,
    zhajinhua: ZhajinhuaGame,
    texas: TexasGame,
    baquepai: BaquepaiGame,
    'draw-and-guess': DrawAndGuessGame,
    undercover: UndercoverGame
  }
  return map[gameId.value] || null
})

const goBack = () => {
  sound.click()
  router.push('/')
}

const toggleSound = () => {
  userStore.toggleSound()
  if (userStore.soundEnabled) sound.click()
}

const toggleFullscreen = () => {
  sound.click()
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {})
  } else {
    document.exitFullscreen().catch(() => {})
  }
}
</script>

<style scoped>
.game-view-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1200px;
  width: calc(100% - 24px);
  margin: 0 auto 40px auto;
  padding-top: 12px;
}

.game-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  border-radius: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-main);
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: rgba(6, 182, 212, 0.15);
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

.game-meta {
  display: flex;
  align-items: center;
  gap: 10px;
}

.game-emoji {
  font-size: 1.8rem;
}

.game-titles {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.15rem;
  font-weight: 800;
  color: #fff;
  line-height: 1.2;
}

.subtitle {
  font-size: 0.72rem;
  color: var(--accent-cyan);
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.tool-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.tool-btn.active {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.15);
}

.game-stage {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  width: 100%;
}

.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  border-radius: 18px;
  text-align: center;
}

/* 玩法说明 */
.rules-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rules-tags {
  display: flex;
  gap: 6px;
}

.tag {
  font-size: 0.75rem;
  color: var(--accent-cyan);
  background: rgba(6, 182, 212, 0.12);
  padding: 2px 8px;
  border-radius: 6px;
}

.rules-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.rules-instructions h4 {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.rules-instructions ul {
  padding-left: 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.7;
}

.rules-instructions kbd {
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

@media (max-width: 680px) {
  .btn-text, .subtitle {
    display: none;
  }
}
</style>
