# KK Poker - Impeccable Design System (设计规范体系)

## 1. 调色盘规范 (Perceptual Color Space)
- **底色层 (Void & Obsidian)**:
  - `--bg-obsidian-950`: `#05080c` (深渊黑曜石，沉浸式背景)
  - `--bg-obsidian-900`: `#0a0f16` (卡片与侧栏底色)
  - `--bg-obsidian-800`: `#121a24` (悬浮卡片高光层)
- **台呢呢绒层 (Monaco Emerald Felt)**:
  - `--felt-core`: `#0d3a24` (皇家台呢中心漫反射)
  - `--felt-edge`: `#051b10` (台呢边缘暗角投影)
  - `--felt-rail`: `#2c1b10` (实木包边外圈皮革)
  - `--felt-trim`: `#b45309` (黄铜金属固定圈)
- **金属拉丝金 (Champagne & Gold Accents)**:
  - `--gold-primary`: `#f59e0b`
  - `--gold-light`: `#fde68a`
  - `--gold-gradient`: `linear-gradient(135deg, #fef08a 0%, #d97706 50%, #78350f 100%)`
- **红桃与方块强调红 (Royal Crimson)**:
  - `--crimson-red`: `#ef4444`
  - `--crimson-deep`: `#991b1b`
- **黑桃与梅花深墨 (Onyx Black)**:
  - `--onyx-black`: `#0f172a`
- **操作按钮语义色**:
  - 弃牌 (Fold): `#e11d48` (冷感绛红)
  - 看牌 (Check): `#10b981` (稳重松石绿)
  - 跟注 (Call): `#0ea5e9` (理智海洋蓝)
  - 加注 (Raise): `#f59e0b` (激进琥珀金)
  - 全下 (All-In): `linear-gradient(135deg, #f43f5e 0%, #881337 100%)` (血色烈焰)

## 2. 字体与微排版 (Typography & Spacing)
- **数字与注额**: 等宽数字字体，保证筹码、倒计时、盲注变化时不产生横向抖动。
- **4pt 黄金间距倍率**: 严格遵循 4px, 8px, 12px, 16px, 20px, 24px, 32px 间距阶梯。
- **微交互与质感**:
  - 手牌抽取有 0.2s 的微妙高光抬起与景深变化。
  - 倒计时环伴随脉冲呼吸呼吸灯（最后 5 秒变为急速红光警报）。
  - 底池收拢（Pot Collection）带粒子与声效回馈。
