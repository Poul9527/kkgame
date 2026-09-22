import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { storage } from '@/utils/storage'
import { sound } from '@/utils/soundEngine'

export const useUserStore = defineStore('user', () => {
  const coins = ref<number>(storage.get('user_coins', 100))
  const exp = ref<number>(storage.get('user_exp', 0))
  const nickname = ref<string>(storage.get('user_nickname', 'CyberPlayer'))
  const avatar = ref<string>(storage.get('user_avatar', '🎮'))
  const currentTheme = ref<string>(storage.get('user_theme', 'neon'))
  const unlockedThemes = ref<string[]>(storage.get('user_themes', ['neon']))
  const soundEnabled = ref<boolean>(storage.get('user_sound', true))
  const musicEnabled = ref<boolean>(storage.get('user_music', false))
  const volume = ref<number>(storage.get('user_volume', 0.5))

  // 初始化音效配置
  sound.soundEnabled = soundEnabled.value
  sound.musicEnabled = musicEnabled.value
  sound.volume = volume.value

  // 等级换算（每 100 经验升 1 级）
  const getLevel = () => Math.floor(exp.value / 100) + 1
  const getNextLevelExp = () => (getLevel()) * 100

  const addCoins = (amount: number) => {
    if (amount <= 0) return
    coins.value += amount
    storage.set('user_coins', coins.value)
    sound.coin()
  }

  const spendCoins = (amount: number): boolean => {
    if (coins.value >= amount) {
      coins.value -= amount
      storage.set('user_coins', coins.value)
      return true
    }
    return false
  }

  // 破产保护 / 领补给
  const claimReliefCoins = () => {
    const grant = 500
    coins.value += grant
    storage.set('user_coins', coins.value)
    sound.powerup()
    return grant
  }

  // 检查最低金币，如低于阈值自动发放救济
  const ensureMinimumCoins = (minAmount: number = 100): boolean => {
    if (coins.value < minAmount) {
      claimReliefCoins()
      return true
    }
    return false
  }

  const addExp = (amount: number) => {
    if (amount <= 0) return
    const prevLvl = getLevel()
    exp.value += amount
    storage.set('user_exp', exp.value)
    const newLvl = getLevel()
    if (newLvl > prevLvl) {
      sound.powerup()
    }
  }

  const setNickname = (name: string) => {
    nickname.value = name.trim() || 'CyberPlayer'
    storage.set('user_nickname', nickname.value)
  }

  const setAvatar = (newAvatar: string) => {
    avatar.value = newAvatar
    storage.set('user_avatar', avatar.value)
  }

  const setTheme = (theme: string) => {
    currentTheme.value = theme
    storage.set('user_theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  const unlockTheme = (theme: string) => {
    if (!unlockedThemes.value.includes(theme)) {
      unlockedThemes.value.push(theme)
      storage.set('user_themes', unlockedThemes.value)
    }
  }

  const toggleSound = () => {
    soundEnabled.value = !soundEnabled.value
    sound.soundEnabled = soundEnabled.value
    storage.set('user_sound', soundEnabled.value)
  }

  const toggleMusic = () => {
    musicEnabled.value = sound.toggleBgm()
    storage.set('user_music', musicEnabled.value)
  }

  // 监听并应用当前主题
  watch(currentTheme, (val) => {
    document.documentElement.setAttribute('data-theme', val)
  }, { immediate: true })

  return {
    coins,
    exp,
    nickname,
    avatar,
    currentTheme,
    unlockedThemes,
    soundEnabled,
    musicEnabled,
    volume,
    getLevel,
    getNextLevelExp,
    addCoins,
    spendCoins,
    addExp,
    setNickname,
    setAvatar,
    setTheme,
    unlockTheme,
    toggleSound,
    toggleMusic,
    claimReliefCoins,
    ensureMinimumCoins
  }
})
