import { getDb, initDatabase } from '../../server/db/client'
import { verifyToken } from '../../server/utils/auth'
import { jsonResponse } from '../../server/utils/http'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true })
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    return jsonResponse(res, 401, { error: '未登录或登录已失效' })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return jsonResponse(res, 401, { error: '登录凭证已过期，请重新登录' })
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
    const result = await db.execute({
      sql: `
        SELECT u.id, u.username, u.nickname, u.avatar, w.coins
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.id = ?
        LIMIT 1
      `,
      args: [payload.userId]
    })

    if (result.rows.length === 0) {
      return jsonResponse(res, 404, { error: '用户不存在' })
    }

    const row: any = result.rows[0]
    return jsonResponse(res, 200, {
      ok: true,
      user: {
        id: row.id,
        username: row.username,
        nickname: row.nickname,
        avatar: row.avatar,
        coins: row.coins ?? 1000
      }
    })
  } catch (err: any) {
    return jsonResponse(res, 500, { ok: false, error: err.message || '获取个人资料失败' })
  }
}
