/**
 * KK Arcade Hub 前端 API 网关封装
 * 请求 Vercel Serverless Functions (/api/*)
 */

export interface ApiResponse<T = any> {
  ok?: boolean
  error?: string
  message?: string
  token?: string
  user?: T
  coins?: number
}

const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  const authToken = token || localStorage.getItem('kk_token')
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`
  }
  return headers
}

export const api = {
  // 用户注册
  async register(data: { username: string; password: string; nickname?: string; avatar?: string }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      })
      return await res.json()
    } catch (e: any) {
      return { ok: false, error: e.message || '网络连接超时' }
    }
  },

  // 用户登录
  async login(data: { username: string; password: string }): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data)
      })
      return await res.json()
    } catch (e: any) {
      return { ok: false, error: e.message || '网络连接超时' }
    }
  },

  // 获取当前登录用户
  async getProfile(): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/auth/me', {
        method: 'GET',
        headers: getHeaders()
      })
      return await res.json()
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  },

  // 领取每日/破产补给金币
  async claimDailyBonus(): Promise<ApiResponse> {
    try {
      const res = await fetch('/api/wallet/claim', {
        method: 'POST',
        headers: getHeaders()
      })
      return await res.json()
    } catch (e: any) {
      return { ok: false, error: e.message }
    }
  }
}
