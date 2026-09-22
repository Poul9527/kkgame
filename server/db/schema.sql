-- KK Arcade Hub Turso / SQLite 数据库 Schema

-- 1. 用户表
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

-- 2. 玩家钱包资产表
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  coins INTEGER NOT NULL DEFAULT 1000,
  frozen_chips INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. 金币流水明细表 (用于对账与防作弊)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'signup_bonus' | 'daily_relief' | 'texas_win' | 'texas_loss' | 'shop_buy'
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  note TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. 德州扑克历史战绩表 (牌谱存档)
CREATE TABLE IF NOT EXISTS hand_histories (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  total_pot INTEGER NOT NULL,
  community_cards TEXT NOT NULL, -- JSON string: ["As", "Kh", "Qd", "Jc", "10s"]
  winner_ids TEXT NOT NULL, -- JSON string: ["userId1"]
  win_hand_name TEXT NOT NULL,
  hand_summary TEXT, -- 完整对局流水快照 JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 索引加速
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_hands_room ON hand_histories(room_id);
