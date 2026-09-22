# KK Arcade Hub 全栈多人在线重构技术方案

详细架构设计书已生成，可查看项目规划文档或直接参考本方案。

## 一、方案核心要点

1. **技术栈架构**
   - **前端**：现有的 Vue 3 + Pinia + Vite（保留在 Vercel 静态托管加速）。
   - **后端**：Node.js (TypeScript) + Fastify / NestJS + Socket.IO。
   - **数据库**：PostgreSQL 16（Prisma ORM）负责用户信息、钱包余额与牌局回放账本。
   - **缓存与状态**：Redis 7 负责房间分布式锁、牌桌内存快照、会话 Token 与实时排行榜。

2. **德州扑克权威服务端设计**
   - **绝对权威**：洗牌、发牌、倒计时、比牌裁判全由后端执行。
   - **防窥牌机制**：玩家未到摊牌前，网络层绝不下发对手真实底牌。
   - **主池与边池拆分**：支持多位玩家同时 All-In 的多级边池算法。
   - **断线托管与重连快照**：网络断开 60 秒内托管自动 Check/Fold，重连下发全量快照秒级同步。

3. **双端协同拓扑**
   - 前端静态页：`kkgame.magicweb.top` (Vercel CDN)
   - 游戏服网关：`api.magicweb.top` (阿里云轻量云或 ECS，Docker 编排 Node + Redis + PostgreSQL)
