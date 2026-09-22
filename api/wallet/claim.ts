import { getDb, initDatabase } from '../../server/db/client'
import { verifyToken } from '../../server/utils/auth'
import { jsonResponse } from '../../server/utils/http'
import crypto from 'crypto'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true })
  }
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return jsonResponse(res, 401, { error: '请先登录账号' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return jsonResponse(res, 401, { error: '登录失效，请重新登录' })
  }

  try {
    const db = getDb()
    if (!db) {
      return jsonResponse(res, 503, {
        ok: false,
        error: '未连接云端 Turso 数据库。请在 Vercel 环境变量中配置 TURSO_DATABASE_URL 和 TURSO_AUTH_TOKEN。'
      })
    }

    await initDatabase(db)
    const walletRes = await db.execute({
      sql: 'SELECT id, coins FROM wallets WHERE user_id = ? LIMIT 1',
      args: [payload.userId]
    })

    if (walletRes.rows.length === 0) {
      return jsonResponse(res, 404, { error: '钱包不存在' })
    }

    const currentCoins = Number(walletRes.rows[0].coins)
    const grantAmount = 300
    const newBalance = currentCoins + grantAmount

    await db.batch([
      {
        sql: 'UPDATE wallets SET coins = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
        args: [newBalance, payload.userId]
      },
      {
        sql: 'INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, note) VALUES (?, ?, ?, ?, ?, ?)',
        args: ['tx_' + crypto.randomUUID().replace(/-/g, ''), payload.userId, 'daily_relief', grantAmount, newBalance, '签到与破产救济补给']
      }
    ], 'write')

    return jsonResponse(res, 200, {
      ok: true,
      message: `成功领取 +${grantAmount} 补给金币！`,
      coins: newBalance
    })
  } catch (err: any) {
    return jsonResponse(res, 500, { ok: false, error: err.message || '领取失败' })
  }
}
