export type GameCategory = 'all' | 'board' | 'arcade' | 'puzzle' | 'shooter' | 'party'

export interface GameInfo {
  id: string
  title: string
  subtitle: string
  category: GameCategory
  description: string
  icon: string
  tags: string[]
  color: string
  hot?: boolean
  bestScore?: number
  playCount: number
}

export interface PlayRecord {
  id: string
  gameId: string
  gameTitle: string
  score: number
  date: string
  durationSec: number
  coinsEarned: number
}

export interface LeaderboardEntry {
  rank: number
  nickname: string
  avatar: string
  score: number
  date: string
  gameId: string
}

export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  category: string
  rewardCoins: number
  unlocked: boolean
  unlockedAt?: string
  progress?: number
  maxProgress?: number
}

export interface ShopItem {
  id: string
  name: string
  type: 'theme' | 'avatar' | 'title'
  price: number
  preview: string
  description: string
  unlocked: boolean
  value: string
}
