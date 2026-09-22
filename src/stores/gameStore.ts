import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameInfo, PlayRecord, LeaderboardEntry } from '@/types'
import { storage } from '@/utils/storage'
import { useUserStore } from './userStore'
import { useAchievementStore } from './achievementStore'

export const useGameStore = defineStore('game', () => {
  const games = ref<GameInfo[]>([
    {
      id: 'gomoku',
      title: '极智五子棋',
      subtitle: 'GOMOKU AI BATTLE',
      category: 'board',
      description: '内置高强度启发式博弈 AI，支持三种挑战难度与双人线下对弈，黑白交错的智慧交锋。',
      icon: '♟️',
      tags: ['博弈对弈', 'AI挑战', '双人模式'],
      color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      hot: true,
      playCount: storage.get('plays_gomoku', 12)
    },
    {
      id: 'snake',
      title: '霓虹贪吃蛇',
      subtitle: 'NEON SNAKE ARCADE',
      category: 'arcade',
      description: '街机复古霓虹风，多重特色道具吃出高分，键盘与移动端虚拟按键全面适配。',
      icon: '🐍',
      tags: ['经典街机', '敏捷反应', '道具掉落'],
      color: 'linear-gradient(135deg, #10b981, #059669)',
      hot: true,
      playCount: storage.get('plays_snake', 28)
    },
    {
      id: '2048',
      title: '2048 极速版',
      subtitle: '2048 NEON BLAST',
      category: 'puzzle',
      description: '丝滑动画、滑动碰撞与数字狂飙！挑战 2048、4096 甚至终极数字极限。',
      icon: '🔢',
      tags: ['经典数字', '极简益智', '连击消除'],
      color: 'linear-gradient(135deg, #f59e0b, #d97706)',
      hot: true,
      playCount: storage.get('plays_2048', 45)
    },
    {
      id: 'shooter',
      title: '星际雷霆战机',
      subtitle: 'GALAXY STRIKER',
      category: 'shooter',
      description: '60FPS Canvas 弹幕空战！敌机编队、多级火炮升级、护盾战力与高燃 Boss 决战。',
      icon: '🚀',
      tags: ['弹幕射击', 'Boss挑战', '炫酷粒子'],
      color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      hot: true,
      playCount: storage.get('plays_shooter', 33)
    },
    {
      id: 'minesweeper',
      title: '扫雷先锋',
      subtitle: 'MINESWEEPER ELITE',
      category: 'puzzle',
      description: '经典Windows扫雷升级体验，首击必空不踩雷，连锁大开辟，三种标准难度随心切换。',
      icon: '💣',
      tags: ['脑力推演', '经典复刻', '计时挑战'],
      color: 'linear-gradient(135deg, #ef4444, #b91c1c)',
      hot: false,
      playCount: storage.get('plays_minesweeper', 19)
    },
    {
      id: 'zhajinhua',
      title: '欢乐炸金花',
      subtitle: 'GOLDEN FLOWER POKER',
      category: 'board',
      description: '经典四人扑克博弈对决！闷牌看牌、加注偷鸡、1v1 绝杀比牌，考验心智与运气的巅峰之战。',
      icon: '🎴',
      tags: ['经典扑克', '心理博弈', '底池对决'],
      color: 'linear-gradient(135deg, #b45309, #78350f)',
      hot: true,
      playCount: storage.get('plays_zhajinhua', 42)
    },
    {
      id: 'texas',
      title: '德州扑克',
      subtitle: 'TEXAS HOLDEM POKER',
      category: 'board',
      description: '国际顶级智慧扑克博弈！7选5最优牌型组合，四轮加注博弈，过牌、跟注与孤注一掷 All-In。',
      icon: '♠️',
      tags: ['竞技扑克', '策略博弈', '国际规则'],
      color: 'linear-gradient(135deg, #1e3a8a, #0f172a)',
      hot: true,
      playCount: storage.get('plays_texas', 58)
    },
    {
      id: 'baquepai',
      title: '百变八雀牌',
      subtitle: 'BA QUE PAI ARCADE',
      category: 'board',
      description: '腾讯欢乐斗地主经典模式！84张特色牌库，开局换两张，摸一打一；打出问号牌触发牌堆顶4选1，更有当忍则忍多倍博弈与打空牌库多次胡牌！',
      icon: '🀄️',
      tags: ['腾讯特色', '开局换两张', '牌堆4选1', '当忍则忍'],
      color: 'linear-gradient(135deg, #059669, #065f46)',
      hot: true,
      playCount: storage.get('plays_baquepai', 66)
    }
  ])

  // 最高分持久化字典
  const highScores = ref<Record<string, number>>(storage.get('high_scores', {
    gomoku: 1,
    snake: 120,
    '2048': 1024,
    shooter: 8500,
    minesweeper: 45,
    zhajinhua: 280,
    texas: 360,
    baquepai: 420
  }))

  // 游玩记录历史
  const records = ref<PlayRecord[]>(storage.get('play_records', []))

  // 获取特定游戏的最高分
  const getBestScore = (gameId: string) => highScores.value[gameId] || 0

  // 记录游戏结算
  const recordGame = (gameId: string, score: number, durationSec: number = 60) => {
    const userStore = useUserStore()
    const achievementStore = useAchievementStore()
    const game = games.value.find(g => g.id === gameId)
    if (!game) return

    // 更新游玩次数
    game.playCount++
    storage.set(`plays_${gameId}`, game.playCount)

    // 计算金币与经验收益
    let coins = Math.max(5, Math.floor(score / 10))
    if (gameId === 'gomoku') coins = score > 0 ? 50 : 10
    if (gameId === 'minesweeper') coins = score > 0 ? 40 : 5
    if (gameId === 'zhajinhua' || gameId === 'texas') coins = score > 0 ? Math.min(score, 350) : 5
    if (coins > 350) coins = 350

    const expGained = Math.floor(coins * 1.5)
    userStore.addCoins(coins)
    userStore.addExp(expGained)

    // 检查是否打破历史最高
    const currentBest = highScores.value[gameId] || 0
    let isNewRecord = false
    if (gameId === 'minesweeper') {
      // 扫雷以耗时越短越佳（当 score > 0）
      if (score > 0 && (currentBest === 0 || score < currentBest)) {
        highScores.value[gameId] = score
        isNewRecord = true
      }
    } else {
      if (score > currentBest) {
        highScores.value[gameId] = score
        isNewRecord = true
      }
    }
    storage.set('high_scores', highScores.value)

    // 新增记录
    const newRecord: PlayRecord = {
      id: Date.now().toString(),
      gameId,
      gameTitle: game.title,
      score,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }),
      durationSec,
      coinsEarned: coins
    }

    records.value.unshift(newRecord)
    if (records.value.length > 50) records.value.pop()
    storage.set('play_records', records.value)

    // 触发成就检查
    achievementStore.checkGameAchievements(gameId, score, isNewRecord, records.value.length)

    return { coins, expGained, isNewRecord }
  }

  // 模拟全服排行榜数据
  const getLeaderboard = (gameId: string): LeaderboardEntry[] => {
    const userStore = useUserStore()
    const userScore = highScores.value[gameId] || 0
    
    // 假定的街机名人堂玩家
    const mockPlayers: Record<string, { name: string; avatar: string; baseScore: number }[]> = {
      gomoku: [
        { name: 'AlphaMaster', avatar: '🤖', baseScore: 28 },
        { name: '棋圣九段', avatar: '🧙‍♂️', baseScore: 21 },
        { name: '黑白玄机', avatar: '🐱', baseScore: 16 },
        { name: '弈星客', avatar: '🦊', baseScore: 11 }
      ],
      snake: [
        { name: '贪食魔神', avatar: '🐍', baseScore: 680 },
        { name: 'ViperKing', avatar: '⚡', baseScore: 540 },
        { name: '无影游蛇', avatar: '🚀', baseScore: 390 },
        { name: '小苹果杀手', avatar: '🍎', baseScore: 260 }
      ],
      '2048': [
        { name: '数字狂魔', avatar: '🔥', baseScore: 32768 },
        { name: 'MathWizard', avatar: '🧙‍♂️', baseScore: 16384 },
        { name: '方块滑铲', avatar: '🧊', baseScore: 8192 },
        { name: '合体大师', avatar: '🎯', baseScore: 4096 }
      ],
      shooter: [
        { name: '银河王牌', avatar: '🚀', baseScore: 62000 },
        { name: 'StarLord', avatar: '⭐', baseScore: 45000 },
        { name: '光速僚机', avatar: '🛸', baseScore: 28000 },
        { name: '弹幕回避者', avatar: '👾', baseScore: 18000 }
      ],
      minesweeper: [
        { name: '排雷神探', avatar: '🕵️', baseScore: 18 },
        { name: 'ZeroExplode', avatar: '🛡️', baseScore: 29 },
        { name: '雷区信步', avatar: '🕶️', baseScore: 41 },
        { name: '盲盒终结者', avatar: '📦', baseScore: 56 }
      ],
      zhajinhua: [
        { name: '赌神高进', avatar: '🎩', baseScore: 1600 },
        { name: '冷面千王', avatar: '🕶️', baseScore: 980 },
        { name: '偷鸡狂客', avatar: '🃏', baseScore: 560 },
        { name: '顺金仙子', avatar: '🌺', baseScore: 380 }
      ],
      texas: [
        { name: 'Phil Ivey', avatar: '🦁', baseScore: 2400 },
        { name: 'Dwan狂魔', avatar: '🌪️', baseScore: 1850 },
        { name: 'Negreanu', avatar: '🎩', baseScore: 1320 },
        { name: '筹码收割机', avatar: '🪙', baseScore: 780 }
      ],
      baquepai: [
        { name: '雀圣阿强', avatar: '😎', baseScore: 1880 },
        { name: '百变仙子', avatar: '🧚‍♀️', baseScore: 1350 },
        { name: '地主老财', avatar: '🎩', baseScore: 920 },
        { name: '忍界宗师', avatar: '🔥', baseScore: 680 }
      ]
    }

    const list: LeaderboardEntry[] = (mockPlayers[gameId] || []).map((p, idx) => ({
      rank: idx + 1,
      nickname: p.name,
      avatar: p.avatar,
      score: p.baseScore,
      date: '今日',
      gameId
    }))

    // 加入当前玩家
    list.push({
      rank: 0,
      nickname: `${userStore.nickname} (我)`,
      avatar: userStore.avatar,
      score: userScore,
      date: '刚才',
      gameId
    })

    // 排序（扫雷时间越小越好，其他游戏分数越大越好）
    if (gameId === 'minesweeper') {
      list.sort((a, b) => (a.score === 0 ? 999999 : a.score) - (b.score === 0 ? 999999 : b.score))
    } else {
      list.sort((a, b) => b.score - a.score)
    }

    // 重赋排名
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }))
  }

  return {
    games,
    highScores,
    records,
    getBestScore,
    recordGame,
    getLeaderboard
  }
})
