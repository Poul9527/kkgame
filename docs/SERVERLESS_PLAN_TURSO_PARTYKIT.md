# KK Arcade Hub 方案二：全套 0 成本 Serverless 架构落地指南 (Vercel + Turso + PartyKit)

> **核心目标**：彻底告别云服务器运维与月租费用。利用 **Vercel Functions + Turso (libSQL) + PartyKit 边缘 Durable Objects**，打造全球边缘低延迟、全自动伸缩且 100% 免费的多人在线德州扑克平台。

---

## 一、 系统架构角色全景

```
                             [ 玩家浏览器 (PC / 手机) ]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │                                               │
                 ▼ [HTTPS 静态资源 & 账号资产 API]                   ▼ [WSS 实时多人对战长连接]
    ┌────────────────────────────────────────┐       ┌──────────────────────────────────────┐
    │          Vercel 边缘集群               │       │        PartyKit 边缘房间引擎         │
    │  (域名: https://kkgame.magicweb.top)   │       │   (托管于 Cloudflare 全球边缘网络)   │
    │                                        │       │                                      │
    │  • 托管 Vue 3 静态页面                 │       │  • 德州扑克实时牌桌实例 (Room Actor) │
    │  • /api/auth/register (注册送1000币)   │       │  • 权威发牌、盲注轮转、15秒思考倒计时│
    │  • /api/auth/login (JWT 鉴权)          │       │  • 严格防窥牌 (非 Showdown 不下发底牌│
    │  • /api/wallet/claim (破产救济补给)    │       │  • 摊牌裁决与主池边池分配           │
    └──────────────────┬─────────────────────┘       └──────────────────┬───────────────────┘
                       │                                                │
                       └───────────────────────┬────────────────────────┘
                                               │
                                               ▼ [SQL 读写 (libSQL 协议)]
                                ┌───────────────────────────────┐
                                │      Turso 分布式边缘数据库    │
                                │    (基于 SQLite 的 Serverless) │
                                │                               │
                                │   • users (账号与密码哈希)    │
                                │   • wallets (金币与冻结筹码)  │
                                │   • wallet_transactions (流水)│
                                │   • hand_histories (牌谱存档) │
                                └───────────────────────────────┘
```

---

## 二、 零成本服务额度对照（为什么是完全免费？）

| 平台与组件 | 免费配额 (Free Tier) | 在本游戏中的承受能力 | 费用 |
| :--- | :--- | :--- | :--- |
| **Vercel** | 每月 100GB 带宽，1,000,000 次 API 函数调用 | 支撑 10 万+ 玩家日常登录与访问 | **¥0 / 月** |
| **Turso (libSQL)** | **9GB 存储空间**，每月 10 亿次行读取，支持 500 个数据库 | 轻松存储数百万牌局历史与玩家账户 | **¥0 / 月** |
| **PartyKit (Cloudflare)** | 充裕的边缘 WebSocket 连接数与 Actor 执行额度 | 支撑几十桌德州扑克同时在线高频对战 | **¥0 / 月** |

---

## 三、 本地代码与服务已实现清单

代码库中已为您搭好全部核心模块：

### 1. 数据库层 (`server/db/`)
- `schema.sql`：包含 `users`（用户）、`wallets`（钱包）、`wallet_transactions`（对账流水）、`hand_histories`（牌谱存档）表；
- `client.ts`：采用 `@libsql/client`，**无环境变量时自动回退为本地文件 `file:local.db`**，本地开发测试零门槛，配上 Turso Token 即可直连云端。

### 2. 账号与资产 API (`api/`)
- `api/auth/register.ts`：支持账号密码注册，自动赠送 1000 体验金币并签发 7 天 JWT；
- `api/auth/login.ts`：加盐密码哈希校验并返回用户信息与金币；
- `api/auth/me.ts`：用于刷新用户登录态；
- `api/wallet/claim.ts`：破产救济与每日签到金币补给 (+300 🪙)。

### 3. PartyKit 实时德州扑克房间服 (`party/`)
- `party/texasRoom.ts`：
  - 6 人席坐席管理（支持入座、离座、观战）；
  - 服务端权威发牌与洗牌；
  - 强制 15 秒玩家思考倒计时（超时自动判定 Check 或 Fold）；
  - **防作弊机制**：向非本人玩家只广播底牌数量占位符 `{ count: 2 }`，严防网络抓包作弊；
  - 局末自动调用 Turso 数据库原子增减金币。

### 4. 前端组件与 Store (`src/`)
- `src/stores/authStore.ts`：Pinia 登录态管理与本地持久化；
- `src/components/auth/AuthModal.vue`：赛博街机风登录与注册弹窗；
- `src/components/common/Navbar.vue`：导航栏新增登录/注册按钮、玩家昵称展示与注销入口。

---

## 四、 3 分钟上线操作指引

### 步骤 1：获取免费 Turso 数据库
1. 打开 [Turso 官网 (turso.tech)](https://turso.tech/)，使用 GitHub 登录；
2. 点击 **Create Database**，输入名称 `kkgame`，选择靠近国内的区域（例如 `Tokyo (nrt)` 或 `Hong Kong`）；
3. 创建完成后，复制页面上的两个参数：
   - **Database URL**：类似 `libsql://kkgame-xxxx.turso.io`
   - **Auth Token**：点击 "Create Token" 生成长期访问密钥。

### 步骤 2：在 Vercel 填写环境变量
1. 进入 Vercel 控制台 `kkgame` 项目；
2. 进入 **Settings** -> **Environment Variables**，添加以下三个环境变量：
   - `TURSO_DATABASE_URL`：填入步骤 1 复制的 Database URL
   - `TURSO_AUTH_TOKEN`：填入步骤 1 复制的 Auth Token
   - `JWT_SECRET`：任意填写一串随机字符串（如 `kkgame_jwt_key_2026_xyz`）
3. 保存后，下次推送或点击 Redeploy 即可生效。

### 步骤 3：一键部署 PartyKit 实时对战引擎
在本地终端执行以下命令（首次执行会弹出 GitHub 授权）：
```bash
npx partykit deploy
```
部署完成后，PartyKit 会分配给您一个全球边缘访问域名，例如：
`kkgame-party.yourname.partykit.dev`
前端在连接牌桌时，直接填入该域名即可开始多人联网对战！
