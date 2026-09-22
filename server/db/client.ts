import { createClient, type Client } from '@libsql/client'

// 环境变量优先使用 Turso 远端 URL，未配置时自动回退为本地 sqlite 数据库文件
const url = process.env.TURSO_DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN || undefined

export const db: Client = createClient({
  url,
  authToken
})

let isInitialized = false

/**
 * 自动初始化表结构（幂等创建）
 */
export async function initDatabase(): Promise<void> {
  if (isInitialized) return

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      nickname TEXT NOT NULL,
      avatar TEXT DEFAULT '🎮',
      role TEXT DEFAULT 'user',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wallets (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      coins INTEGER NOT NULL DEFAULT 1000,
      frozen_chips INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wallet_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      balance_after INTEGER NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS hand_histories (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      total_pot INTEGER NOT NULL,
      community_cards TEXT NOT NULL,
      winner_ids TEXT NOT NULL,
      win_hand_name TEXT NOT NULL,
      hand_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_user ON wallet_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_hands_room ON hand_histories(room_id);
  `)

  isInitialized = true
}
