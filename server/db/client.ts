import { createClient, type Client } from '@libsql/client/web'

let dbInstance: Client | null = null
let isInitialized = false

/**
 * 获取纯 Web / fetch 版本的 Turso 客户端
 * 零 native 依赖，100% 免疫 Vercel Serverless / AWS Lambda 运行时的环境崩溃
 */
export function getDb(): Client | null {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) {
    return null
  }
  if (!dbInstance) {
    dbInstance = createClient({ url, authToken })
  }
  return dbInstance
}

/**
 * 自动初始化表结构（幂等创建）
 */
export async function initDatabase(db: Client): Promise<void> {
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
