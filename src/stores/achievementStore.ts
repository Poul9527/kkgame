import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Achievement } from '@/types'
import { storage } from '@/utils/storage'
import { useUserStore } from './userStore'
import { sound } from '@/utils/soundEngine'
import confetti from 'canvas-confetti'

export const useAchievementStore = defineStore('achievement', () => {
  const achievements = ref<Achievement[]>([
    {
      id: 'first_blood',
      title: '初入街机',
      description: '在大厅中完成任意一局游戏。',
      icon: '🎮',
      category: '大厅探索',
      rewardCoins: 50,
      unlocked: false
    },
    {
      id: 'gomoku_winner',
      title: '黑白棋圣',
      description: '在五子棋对弈中战胜电脑 AI。',
      icon: '♟️',
      category: '极智五子棋',
      rewardCoins: 100,
      unlocked: false
    },
    {
      id: 'snake_50',
      title: '贪食狂蟒',
      description: '贪吃蛇单局长度突破 15 节或得分超 150。',
      icon: '🐍',
      category: '霓虹贪吃蛇',
      rewardCoins: 80,
      unlocked: false
    },
    {
      id: 'tile_2048',
      title: '合体大师',
      description: '在 2048 中成功合成出 2048 方块。',
      icon: '🏆',
      category: '2048 极速版',
      rewardCoins: 200,
      unlocked: false
    },
    {
      id: 'shooter_ace',
      title: '星际王牌',
      description: '在星际战机中击毁第 1 只机械母舰 Boss。',
      icon: '🚀',
      category: '星际雷霆战机',
      rewardCoins: 150,
      unlocked: false
    },
    {
      id: 'minesweeper_pro',
      title: '拆弹专家',
      description: '成功通关一次扫雷对局。',
      icon: '💣',
      category: '扫雷先锋',
      rewardCoins: 100,
      unlocked: false
    },
    {
      id: 'play_10',
      title: '街机常客',
      description: '累计游玩次数达到 10 局。',
      icon: '⏱️',
      category: '大厅探索',
      rewardCoins: 120,
      unlocked: false
    },
    {
      id: 'rich_man',
      title: '金币大亨',
      description: '金币储蓄达到 300 枚。',
      icon: '🪙',
      category: '财富资产',
      rewardCoins: 150,
      unlocked: false
    },
    {
      id: 'zhajinhua_set',
      title: '天赐豹子',
      description: '在炸金花中拿到一副传说豹子（三张相同点数）。',
      icon: '💥',
      category: '欢乐炸金花',
      rewardCoins: 200,
      unlocked: false
    },
    {
      id: 'zhajinhua_winner',
      title: '赌神降临',
      description: '在炸金花中赢得单局超过 200 金币的巨额底池。',
      icon: '👑',
      category: '欢乐炸金花',
      rewardCoins: 160,
      unlocked: false
    },
    {
      id: 'zhajinhua_bluff',
      title: '以小博大',
      description: '在 1v1 比牌中以散牌单张逆风取胜。',
      icon: '🃏',
      category: '欢乐炸金花',
      rewardCoins: 120,
      unlocked: false
    },
    {
      id: 'texas_royal',
      title: '皇家荣光',
      description: '在德州扑克中组成传说级同花顺或皇家同花顺！',
      icon: '👑',
      category: '德州扑克',
      rewardCoins: 300,
      unlocked: false
    },
    {
      id: 'texas_fullhouse',
      title: '满堂红',
      description: '在德州扑克中组成强力葫芦 (Full House) 或四条牌型。',
      icon: '🏰',
      category: '德州扑克',
      rewardCoins: 180,
      unlocked: false
    },
    {
      id: 'texas_allin',
      title: '孤注一掷',
      description: '在 All-In 全下搏杀中力克对手并卷走底池。',
      icon: '🔥',
      category: '德州扑克',
      rewardCoins: 150,
      unlocked: false
    },
    {
      id: 'baque_dragon',
      title: '八雀龙神',
      description: '在百变八雀牌中达成「一条龙」80番顶级同花连顺胡牌！',
      icon: '🐉',
      category: '百变八雀牌',
      rewardCoins: 300,
      unlocked: false
    },
    {
      id: 'baque_ren',
      title: '当忍则忍',
      description: '在百变八雀牌中单局内累计累积 3 次及以上「忍」，倍数狂飙！',
      icon: '🔥',
      category: '百变八雀牌',
      rewardCoins: 160,
      unlocked: false
    },
    {
      id: 'baque_multi',
      title: '雀坛霸主',
      description: '在百变八雀牌中单局内累计胡牌达到 3 次及以上。',
      icon: '🀄️',
      category: '百变八雀牌',
      rewardCoins: 200,
      unlocked: false
    },
    {
      id: 'baque_god_draw',
      title: '问号神抽',
      description: '打出问号牌触发「牌堆顶 4 选 1」并成功补入心仪好牌！',
      icon: '❓',
      category: '百变八雀牌',
      rewardCoins: 120,
      unlocked: false
    }
  ])

  // 恢复本地已解锁记录
  const savedUnlocked = storage.get<string[]>('unlocked_achievements', [])
  achievements.value.forEach(a => {
    if (savedUnlocked.includes(a.id)) {
      a.unlocked = true
    }
  })

  // 当前触发弹出的成就通知
  const activeToast = ref<Achievement | null>(null)
  let toastTimer: number | null = null

  const unlock = (id: string) => {
    const ach = achievements.value.find(a => a.id === id)
    if (ach && !ach.unlocked) {
      ach.unlocked = true
      ach.unlockedAt = new Date().toISOString()
      
      const current = storage.get<string[]>('unlocked_achievements', [])
      if (!current.includes(id)) {
        current.push(id)
        storage.set('unlocked_achievements', current)
      }

      // 奖励金币与经验
      const userStore = useUserStore()
      userStore.addCoins(ach.rewardCoins)
      userStore.addExp(ach.rewardCoins)

      // 视听盛宴：胜利音效 + 彩带粒子
      sound.victory()
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 }
      })

      // 显示弹窗
      activeToast.value = ach
      if (toastTimer) clearTimeout(toastTimer)
      toastTimer = window.setTimeout(() => {
        activeToast.value = null
      }, 4000)
    }
  }

  // 统一的成就触发检查入口
  const checkGameAchievements = (gameId: string, score: number, isNewRecord: boolean, totalPlays: number) => {
    unlock('first_blood')
    if (totalPlays >= 10) unlock('play_10')

    const userStore = useUserStore()
    if (userStore.coins >= 300) unlock('rich_man')

    if (gameId === 'gomoku' && score > 0) {
      unlock('gomoku_winner')
    }
    if (gameId === 'snake' && score >= 150) {
      unlock('snake_50')
    }
    if (gameId === '2048' && score >= 2048) {
      unlock('tile_2048')
    }
    if (gameId === 'shooter' && score >= 10000) {
      unlock('shooter_ace')
    }
    if (gameId === 'minesweeper' && score > 0) {
      unlock('minesweeper_pro')
    }
  }

  return {
    achievements,
    activeToast,
    unlock,
    checkGameAchievements
  }
})
