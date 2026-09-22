import { db, initDatabase } from '../../server/db/client'
import { hashPassword, signToken } from '../../server/utils/auth'
import { parseJsonBody, jsonResponse } from '../../server/utils/http'
import crypto from 'crypto'

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
    const { username, password, nickname, avatar } = body

    if (!username || !password || username.trim().length < 3 || password.length < 6) {
      return jsonResponse(res, 400, { error: '用户名需不少于3字符，密码不少于6字符' })
    }

    // 检查用户名是否重复
    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE username = ? LIMIT 1',
      args: [username.trim().toLowerCase()]
    })

    if (existing.rows.length > 0) {
      return jsonResponse(res, 400, { error: '该用户名已被注册，请尝试其他账号' })
    }

    const userId = 'usr_' + crypto.randomUUID().replace(/-/g, '')
    const walletId = 'wal_' + crypto.randomUUID().replace(/-/g, '')
    const pwdHash = hashPassword(password)
    const finalNickname = nickname?.trim() || username.trim()
    const finalAvatar = avatar || '🎮'
    const initialCoins = 1000 // 注册赠送 1000 体验金币

    // 开启事务或连续执行入库
    await db.executeMultiple(`
      INSERT INTO users (id, username, password_hash, nickname, avatar)
      VALUES ('${userId}', '${username.trim().toLowerCase()}', '${pwdHash}', '${finalNickname}', '${finalAvatar}');

      INSERT INTO wallets (id, user_id, coins)
      VALUES ('${walletId}', '${userId}', ${initialCoins});

      INSERT INTO wallet_transactions (id, user_id, type, amount, balance_after, note)
      VALUES ('tx_${crypto.randomUUID().replace(/-/g, '')}', '${userId}', 'signup_bonus', ${initialCoins}, ${initialCoins}, '新用户注册启航礼金');
    `)

    const token = signToken({
      userId,
      username: username.trim().toLowerCase(),
      nickname: finalNickname,
      avatar: finalAvatar
    })

    return jsonResponse(res, 200, {
      ok: true,
      message: '注册成功，已获赠 1000 金币！',
      token,
      user: {
        id: userId,
        username: username.trim().toLowerCase(),
        nickname: finalNickname,
        avatar: finalAvatar,
        coins: initialCoins
      }
    })
  } catch (err: any) {
    console.error('Register error:', err)
    return jsonResponse(res, 500, { error: err.message || '服务器内部错误' })
  }
}
