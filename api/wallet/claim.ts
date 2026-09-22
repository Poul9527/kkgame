import { db, initDatabase } from '../../server/db/client'
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
    await initDatabase()
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

    await db.executeMultiple(`
      UPDATE wallets SET coins = ${newBalance}, updated_at = CURRENT_TIMESTAMP WHERE user_id = '${payload.userId}';
      INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, note)
      VALUES ('tx_${crypto.randomUUID().replace(/-/g, '')}', '${payload.userId}', 'daily_relief', ${grantAmount}, ${newBalance}, '签到与破产救济补给');
    `)

    return jsonResponse(res, 200, {
      ok: true,
      message: `成功领取 +${grantAmount} 补给金币！`,
      coins: newBalance
    })
  } catch (err: any) {
    return jsonResponse(res, 500, { error: err.message || '领取失败' })
  }
}
