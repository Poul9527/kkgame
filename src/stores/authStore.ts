import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, type ApiResponse } from '@/services/api'
import { useUserStore } from './userStore'
import { sound } from '@/utils/soundEngine'

export interface UserInfo {
  id: string
  username: string
  nickname: string
  avatar: string
  coins: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('kk_token') || '')
  const currentUser = ref<UserInfo | null>(
    localStorage.getItem('kk_user') ? JSON.parse(localStorage.getItem('kk_user')!) : null
  )
  const isAuthModalOpen = ref(false)
  const authModalTab = ref<'login' | 'register'>('login')

  const isLoggedIn = computed(() => !!token.value && !!currentUser.value)

  // 打开弹窗
  const openAuthModal = (tab: 'login' | 'register' = 'login') => {
    authModalTab.value = tab
    isAuthModalOpen.value = true
  }

  const closeAuthModal = () => {
    isAuthModalOpen.value = false
  }

  // 同步用户数据到全局 userStore
  const syncToUserStore = (user: UserInfo) => {
    const userStore = useUserStore()
    userStore.nickname = user.nickname
    userStore.avatar = user.avatar
    userStore.coins = user.coins
    localStorage.setItem('user_nickname', user.nickname)
    localStorage.setItem('user_avatar', user.avatar)
    localStorage.setItem('user_coins', String(user.coins))
  }

  // 登录
  const login = async (data: { username: string; password: string }): Promise<ApiResponse> => {
    const res = await api.login(data)
    if (res.ok && res.token && res.user) {
      token.value = res.token
      currentUser.value = res.user
      localStorage.setItem('kk_token', res.token)
      localStorage.setItem('kk_user', JSON.stringify(res.user))
      syncToUserStore(res.user)
      sound.victory()
      closeAuthModal()
    }
    return res
  }

  // 注册
  const register = async (data: { username: string; password: string; nickname?: string; avatar?: string }): Promise<ApiResponse> => {
    const res = await api.register(data)
    if (res.ok && res.token && res.user) {
      token.value = res.token
      currentUser.value = res.user
      localStorage.setItem('kk_token', res.token)
      localStorage.setItem('kk_user', JSON.stringify(res.user))
      syncToUserStore(res.user)
      sound.powerup()
      closeAuthModal()
    }
    return res
  }

  // 退出登录
  const logout = async () => {
    token.value = ''
    currentUser.value = null
    localStorage.removeItem('kk_token')
    localStorage.removeItem('kk_user')
    try {
      await api.logout()
    } catch {}
    sound.click()
  }

  // 尝试恢复并刷新当前用户信息 (优先读 Authorization 或 HttpOnly Cookie)
  const checkAuth = async () => {
    try {
      const res = await api.getProfile()
      if (res.ok && res.user) {
        currentUser.value = res.user
        if (res.token) {
          token.value = res.token
          localStorage.setItem('kk_token', res.token)
        }
        localStorage.setItem('kk_user', JSON.stringify(res.user))
        syncToUserStore(res.user)
      } else {
        if (token.value) {
          token.value = ''
          currentUser.value = null
          localStorage.removeItem('kk_token')
          localStorage.removeItem('kk_user')
        }
      }
    } catch (e) {
      console.warn('Check auth failed:', e)
    }
  }

  return {
    token,
    currentUser,
    isLoggedIn,
    isAuthModalOpen,
    authModalTab,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    logout,
    checkAuth
  }
})
