/**
 * LocalStorage 封装安全存储工具
 */

export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`kkgame_${key}`)
      if (item === null) return defaultValue
      return JSON.parse(item) as T
    } catch (e) {
      console.warn(`Error reading key ${key} from localStorage:`, e)
      return defaultValue
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`kkgame_${key}`, JSON.stringify(value))
    } catch (e) {
      console.warn(`Error writing key ${key} to localStorage:`, e)
    }
  },

  remove(key: string): void {
    try {
      localStorage.removeItem(`kkgame_${key}`)
    } catch (e) {
      console.warn(`Error removing key ${key} from localStorage:`, e)
    }
  }
}
