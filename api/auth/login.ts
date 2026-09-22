import { db, initDatabase } from '../../server/db/client'
import { comparePassword, signToken } from '../../server/utils/auth'
import { parseJsonBody, jsonResponse } from '../../server/utils/http'

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    return jsonResponse(res, 200, { ok: true })
  }
  if (req.method !== 'POST') {
    return jsonResponse(res, 405, { error: 'Method not allowed' })
  }

  try {
    await initDatabase()
    const body = await parseJsonBody(req)
    const { username, password } = body

    if (!username || !password) {
      return jsonResponse(res, 400, { error: '请输入用户名和密码' })
    }

    const result = await db.execute({
      sql: `
        SELECT u.id, u.username, u.password_hash, u.nickname, u.avatar, w.coins
        FROM users u
        LEFT JOIN wallets w ON u.id = w.user_id
        WHERE u.username = ?
        LIMIT 1
      `,
      args: [username.trim().toLowerCase()]
    })

    if (result.rows.length === 0) {
      return jsonResponse(res, 400, { error: '账号不存在，请检查或先注册' })
    }

    const row: any = result.rows[0]
    const isValid = comparePassword(password, row.password_hash)
    if (!isValid) {
      return jsonResponse(res, 400, { error: '密码错误，请重新输入' })
    }

    const token = signToken({
      userId: row.id,
      username: row.username,
      nickname: row.nickname,
      avatar: row.avatar
    })

    return jsonResponse(res, 200, {
      ok: true,
      token,
      user: {
        id: row.id,
        username: row.username,
        nickname: row.nickname,
        avatar: row.avatar,
        coins: row.coins ?? 1000
      }
    })
  } catch (err: any) {
    console.error('Login error:', err)
    return jsonResponse(res, 500, { error: err.message || '服务器内部错误' })
  }
}
