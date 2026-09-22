<template>
  <div class="shooter-container">
    <!-- 仪表盘 -->
    <div class="game-dashboard glass-panel">
      <div class="stat-card">
        <span class="stat-label">战绩积分</span>
        <span class="stat-value font-arcade text-purple-400">{{ score }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">历史最高</span>
        <span class="stat-value font-arcade text-amber-400">{{ bestScore }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">战机火炮</span>
        <span class="stat-value font-arcade text-cyan-400">Lv.{{ weaponLevel }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">EMP大招</span>
        <span class="stat-value font-arcade text-amber-400">⚡ ×{{ bombs }}</span>
      </div>

      <div class="stat-card">
        <span class="stat-label">当前波次</span>
        <span class="stat-value font-arcade text-rose-400">Wave {{ wave }}</span>
      </div>
    </div>

    <!-- 游戏主画布 -->
    <div 
      class="canvas-wrapper glass-panel"
      @mousemove="handlePointerMove"
      @touchmove.prevent="handleTouchMove"
    >
      <canvas 
        ref="canvasRef" 
        :width="CANVAS_WIDTH" 
        :height="CANVAS_HEIGHT" 
        class="shooter-canvas"
      ></canvas>

      <!-- Boss 血条 -->
      <div v-if="boss && boss.hp > 0" class="boss-bar-container">
        <div class="boss-info">
          <span class="boss-name">⚠️ 机械母舰毁灭者 BOSS ⚠️</span>
          <span class="boss-hp">{{ boss.hp }} / {{ boss.maxHp }}</span>
        </div>
        <div class="boss-hp-track">
          <div class="boss-hp-fill" :style="{ width: (boss.hp / boss.maxHp * 100) + '%' }"></div>
        </div>
      </div>

      <!-- 快捷大招悬浮按钮 (手机/触控端专用) -->
      <button 
        class="float-bomb-btn font-arcade" 
        :disabled="bombs <= 0 || isGameOver || isPaused"
        @click.stop="useBomb"
        title="释放 EMP 离子全屏大招"
      >
        <Zap class="w-5 h-5 text-amber-300" />
        <span>EMP ({{ bombs }})</span>
      </button>

      <!-- 暂停提示 -->
      <div v-if="isPaused && !isGameOver" class="overlay">
        <div class="overlay-box">
          <Pause class="w-12 h-12 text-purple-400 mb-2" />
          <h3>作战暂停</h3>
          <button class="btn-arcade btn-primary mt-4" @click="togglePause">重返战场</button>
        </div>
      </div>
    </div>

    <!-- 底部控制面板 -->
    <div class="control-panel glass-panel">
      <div class="control-tips">
        <span>键盘 <kbd>WASD</kbd> / 拖拽战机 · 自动开火 · 按 <kbd>B</kbd> 释放 EMP 全屏清屏</span>
        <span>拾取 <b class="text-cyan-400">[P]</b> 升级火炮 · 拾取 <b class="text-amber-400">[B]</b> 补充大招</span>
      </div>
      <div class="actions">
        <button class="ctrl-btn emp-action-btn" @click="useBomb" :disabled="bombs <= 0 || isGameOver || isPaused">
          <Zap class="w-4 h-4 text-amber-400" />
          <span>EMP核弹 ({{ bombs }})</span>
        </button>
        <button class="ctrl-btn" @click="togglePause" :disabled="isGameOver">
          <Pause v-if="!isPaused" class="w-4 h-4" />
          <Play v-else class="w-4 h-4 fill-current" />
          <span>{{ isPaused ? '继续' : '暂停' }}</span>
        </button>
        <button class="ctrl-btn reset" @click="restartGame">
          <RefreshCw class="w-4 h-4" />
          <span>重新出击</span>
        </button>
      </div>
    </div>

    <!-- 结算弹窗 -->
    <Modal v-model="isGameOver" title="战斗结束" width="400px">
      <div class="modal-settle-body">
        <div class="settle-trophy animate-float">
          <Trophy v-if="isNewRecord" class="w-16 h-16 text-amber-400" />
          <AlertCircle v-else class="w-16 h-16 text-rose-500" />
        </div>
        <h2 class="settle-status">{{ isNewRecord ? '刷新最高歼敌记录！' : '战机坠毁' }}</h2>
        <p class="settle-desc">歼敌总积分：<b class="text-purple-400">{{ score }}</b> (推进至第 {{ wave }} 波)</p>

        <div class="settle-reward">
          <div class="reward-box">
            <Coins class="w-5 h-5 text-amber-400" />
            <span>获得金币: +{{ earnedCoins }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-arcade btn-primary" @click="restartGame">再次出击</button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Pause, Play, RefreshCw, Trophy, AlertCircle, Coins, Zap } from 'lucide-vue-next'
import { sound } from '@/utils/soundEngine'
import { useGameStore } from '@/stores/gameStore'
import confetti from 'canvas-confetti'
import Modal from '@/components/common/Modal.vue'

const gameStore = useGameStore()

const CANVAS_WIDTH = 460
const CANVAS_HEIGHT = 600

const canvasRef = ref<HTMLCanvasElement | null>(null)
let animId: number = 0

// 游戏状态
const score = ref(0)
const bestScore = computed(() => gameStore.getBestScore('shooter'))
const wave = ref(1)
const weaponLevel = ref(1)
const bombs = ref(2)
const isPaused = ref(false)
const isGameOver = ref(false)
const isNewRecord = ref(false)
const earnedCoins = ref(0)
const shockwave = ref<{ radius: number; alpha: number } | null>(null)

// 实体结构
interface Player {
  x: number
  y: number
  w: number
  h: number
  hp: number
  maxHp: number
  shield: number // 护盾剩余秒数
}

interface Bullet {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  damage: number
  isEnemy?: boolean
}

interface Enemy {
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  hp: number
  maxHp: number
  type: 'scout' | 'heavy' | 'boss'
  shootCooldown: number
}

interface DropItem {
  x: number
  y: number
  vy: number
  type: 'power' | 'shield' | 'heal' | 'bomb'
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  alpha: number
  color: string
}

interface Star {
  x: number
  y: number
  speed: number
  size: number
  color: string
}

const player = ref<Player>({
  x: CANVAS_WIDTH / 2,
  y: CANVAS_HEIGHT - 80,
  w: 36,
  h: 36,
  hp: 3,
  maxHp: 3,
  shield: 0
})

const boss = ref<Enemy | null>(null)
const bullets: Bullet[] = []
const enemies: Enemy[] = []
const drops: DropItem[] = []
const particles: Particle[] = []
const stars: Star[] = []

// 星空背景初始化
for (let i = 0; i < 70; i++) {
  stars.push({
    x: Math.random() * CANVAS_WIDTH,
    y: Math.random() * CANVAS_HEIGHT,
    speed: Math.random() * 2 + 0.8,
    size: Math.random() * 2 + 1,
    color: Math.random() > 0.3 ? '#ffffff' : '#38bdf8'
  })
}

// 控制相关
const keys: Record<string, boolean> = {}
let shootTimer = 0

// 鼠标/触控位置同步
const handlePointerMove = (e: MouseEvent) => {
  if (isPaused.value || isGameOver.value) return
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_WIDTH / rect.width
  const scaleY = CANVAS_HEIGHT / rect.height
  const px = (e.clientX - rect.left) * scaleX
  const py = (e.clientY - rect.top) * scaleY

  player.value.x = Math.max(player.value.w / 2, Math.min(CANVAS_WIDTH - player.value.w / 2, px))
  player.value.y = Math.max(CANVAS_HEIGHT * 0.4, Math.min(CANVAS_HEIGHT - player.value.h / 2, py))
}

const handleTouchMove = (e: TouchEvent) => {
  if (isPaused.value || isGameOver.value || !e.touches[0]) return
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const scaleX = CANVAS_WIDTH / rect.width
  const scaleY = CANVAS_HEIGHT / rect.height
  const touch = e.touches[0]
  const px = (touch.clientX - rect.left) * scaleX
  const py = (touch.clientY - rect.top) * scaleY - 30 // 略微偏移避免手指遮挡

  player.value.x = Math.max(player.value.w / 2, Math.min(CANVAS_WIDTH - player.value.w / 2, px))
  player.value.y = Math.max(CANVAS_HEIGHT * 0.4, Math.min(CANVAS_HEIGHT - player.value.h / 2, py))
}

// 粒子特效
const createExplosion = (x: number, y: number, color: string = '#f59e0b', count: number = 18) => {
  sound.explosion()
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 4 + 1
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: Math.random() * 3 + 1,
      alpha: 1,
      color
    })
  }
}

// 生成敌机
let spawnEnemyTimer = 0
const spawnEnemies = () => {
  spawnEnemyTimer++
  if (spawnEnemyTimer > 75) {
    spawnEnemyTimer = 0
    const rand = Math.random()
    if (rand < 0.7) {
      // 侦察机
      enemies.push({
        x: Math.random() * (CANVAS_WIDTH - 40) + 20,
        y: -30,
        w: 28,
        h: 28,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 1.2 + 2,
        hp: 2,
        maxHp: 2,
        type: 'scout',
        shootCooldown: 90
      })
    } else {
      // 重装巡洋舰
      enemies.push({
        x: Math.random() * (CANVAS_WIDTH - 60) + 30,
        y: -40,
        w: 44,
        h: 44,
        vx: (Math.random() - 0.5) * 0.8,
        vy: Math.random() * 0.6 + 1.2,
        hp: 6,
        maxHp: 6,
        type: 'heavy',
        shootCooldown: 60
      })
    }
  }

  // Boss 生成逻辑（当分数超过特定门槛且当前没有 Boss 时）
  if (score.value >= wave.value * 4000 && !boss.value) {
    boss.value = {
      x: CANVAS_WIDTH / 2,
      y: -80,
      w: 80,
      h: 60,
      vx: 2,
      vy: 0.8,
      hp: 60 + wave.value * 25,
      maxHp: 60 + wave.value * 25,
      type: 'boss',
      shootCooldown: 40
    }
  }
}

// 战机开火
const shoot = () => {
  shootTimer++
  if (shootTimer % 11 === 0) {
    sound.shoot()
    const px = player.value.x
    const py = player.value.y - 15

    if (weaponLevel.value === 1) {
      bullets.push({ x: px, y: py, vx: 0, vy: -12, color: '#38bdf8', damage: 1 })
    } else if (weaponLevel.value === 2) {
      bullets.push({ x: px - 10, y: py, vx: 0, vy: -12, color: '#38bdf8', damage: 1 })
      bullets.push({ x: px + 10, y: py, vx: 0, vy: -12, color: '#38bdf8', damage: 1 })
    } else {
      // 3 发散射火炮
      bullets.push({ x: px, y: py, vx: 0, vy: -13, color: '#c084fc', damage: 1.5 })
      bullets.push({ x: px - 12, y: py, vx: -2, vy: -12, color: '#38bdf8', damage: 1 })
      bullets.push({ x: px + 12, y: py, vx: 2, vy: -12, color: '#38bdf8', damage: 1 })
    }
  }
}

// 掉落物生成
const maybeSpawnDrop = (x: number, y: number) => {
  const rand = Math.random()
  if (rand < 0.28) {
    let type: DropItem['type'] = 'power'
    if (rand < 0.1) type = 'power'
    else if (rand < 0.17) type = 'shield'
    else if (rand < 0.23) type = 'heal'
    else type = 'bomb'
    drops.push({ x, y, vy: 1.8, type })
  }
}

// 释放全屏 EMP 毁灭核弹 (Bomb)
const useBomb = () => {
  if (bombs.value <= 0 || isGameOver.value || isPaused.value) return
  bombs.value--
  sound.explosion()
  shockwave.value = { radius: 10, alpha: 1.0 }

  // 引爆普通敌机
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    createExplosion(e.x, e.y, '#f59e0b', 24)
    score.value += e.type === 'scout' ? 120 : 350
    enemies.splice(i, 1)
  }

  // 清除全部敌机子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (bullets[i].isEnemy) {
      createExplosion(bullets[i].x, bullets[i].y, '#f43f5e', 4)
      bullets.splice(i, 1)
    }
  }

  // 重创 Boss
  if (boss.value) {
    createExplosion(boss.value.x, boss.value.y, '#ec4899', 40)
    boss.value.hp -= Math.floor(boss.value.maxHp * 0.35)
    if (boss.value.hp <= 0) {
      createExplosion(boss.value.x, boss.value.y, '#ec4899', 55)
      score.value += 2000
      wave.value++
      maybeSpawnDrop(boss.value.x, boss.value.y)
      boss.value = null
      sound.victory()
    }
  }
}

// 游戏主渲染与物理循环
const loop = () => {
  if (isPaused.value || isGameOver.value) {
    animId = requestAnimationFrame(loop)
    return
  }

  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // 1. 绘制背景星空
  ctx.fillStyle = '#070a14'
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  for (const star of stars) {
    star.y += star.speed
    if (star.y > CANVAS_HEIGHT) {
      star.y = 0
      star.x = Math.random() * CANVAS_WIDTH
    }
    ctx.fillStyle = star.color
    ctx.fillRect(star.x, star.y, star.size, star.size)
  }

  // 2. 键盘控制移动
  const speed = 6
  if (keys['w'] || keys['W'] || keys['ArrowUp']) player.value.y = Math.max(CANVAS_HEIGHT * 0.4, player.value.y - speed)
  if (keys['s'] || keys['S'] || keys['ArrowDown']) player.value.y = Math.min(CANVAS_HEIGHT - 30, player.value.y + speed)
  if (keys['a'] || keys['A'] || keys['ArrowLeft']) player.value.x = Math.max(20, player.value.x - speed)
  if (keys['d'] || keys['D'] || keys['ArrowRight']) player.value.x = Math.min(CANVAS_WIDTH - 20, player.value.x + speed)

  // 3. 发射子弹
  shoot()

  // 4. 更新子弹
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i]
    b.x += b.vx
    b.y += b.vy

    // 绘制子弹
    ctx.fillStyle = b.color
    ctx.shadowColor = b.color
    ctx.shadowBlur = 8
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.isEnemy ? 4 : 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // 边界销毁
    if (b.y < -10 || b.y > CANVAS_HEIGHT + 10 || b.x < -10 || b.x > CANVAS_WIDTH + 10) {
      bullets.splice(i, 1)
      continue
    }

    // 玩家子弹打击敌人
    if (!b.isEnemy) {
      // 打击普通敌机
      for (let j = enemies.length - 1; j >= 0; j--) {
        const e = enemies[j]
        if (Math.abs(b.x - e.x) < e.w / 2 && Math.abs(b.y - e.y) < e.h / 2) {
          e.hp -= b.damage
          bullets.splice(i, 1)
          if (e.hp <= 0) {
            createExplosion(e.x, e.y, '#f59e0b', 16)
            score.value += e.type === 'scout' ? 100 : 250
            maybeSpawnDrop(e.x, e.y)
            enemies.splice(j, 1)
          }
          break
        }
      }

      // 打击 Boss
      if (boss.value && Math.abs(b.x - boss.value.x) < boss.value.w / 2 && Math.abs(b.y - boss.value.y) < boss.value.h / 2) {
        boss.value.hp -= b.damage
        bullets.splice(i, 1)
        if (boss.value.hp <= 0) {
          createExplosion(boss.value.x, boss.value.y, '#ec4899', 45)
          score.value += 2000
          wave.value++
          maybeSpawnDrop(boss.value.x, boss.value.y)
          boss.value = null
          sound.victory()
        }
      }
    } else {
      // 敌机子弹击中玩家
      if (Math.abs(b.x - player.value.x) < player.value.w / 2 && Math.abs(b.y - player.value.y) < player.value.h / 2) {
        bullets.splice(i, 1)
        hitPlayer()
      }
    }
  }

  // 5. 生成与更新敌机
  spawnEnemies()
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i]
    e.x += e.vx
    e.y += e.vy
    if (e.x < e.w / 2 || e.x > CANVAS_WIDTH - e.w / 2) e.vx = -e.vx

    // 敌机开火
    e.shootCooldown--
    if (e.shootCooldown <= 0 && e.type === 'heavy') {
      e.shootCooldown = 80
      bullets.push({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: 5, color: '#f43f5e', damage: 1, isEnemy: true })
    }

    // 绘制敌机
    ctx.fillStyle = e.type === 'scout' ? '#ec4899' : '#f59e0b'
    ctx.beginPath()
    ctx.moveTo(e.x, e.y + e.h / 2)
    ctx.lineTo(e.x - e.w / 2, e.y - e.h / 2)
    ctx.lineTo(e.x + e.w / 2, e.y - e.h / 2)
    ctx.closePath()
    ctx.fill()

    // 碰撞玩家
    if (Math.abs(e.x - player.value.x) < (e.w + player.value.w) / 3 && Math.abs(e.y - player.value.y) < (e.h + player.value.h) / 3) {
      createExplosion(e.x, e.y, '#f59e0b', 15)
      enemies.splice(i, 1)
      hitPlayer()
      continue
    }

    if (e.y > CANVAS_HEIGHT + 50) {
      enemies.splice(i, 1)
    }
  }

  // 6. 更新 Boss
  if (boss.value) {
    const b = boss.value
    if (b.y < 90) {
      b.y += b.vy
    } else {
      b.x += b.vx
      if (b.x < b.w / 2 + 20 || b.x > CANVAS_WIDTH - b.w / 2 - 20) {
        b.vx = -b.vx
      }
    }

    b.shootCooldown--
    if (b.shootCooldown <= 0) {
      b.shootCooldown = 50
      // 扇形弹幕
      for (let angle = -0.4; angle <= 0.4; angle += 0.2) {
        bullets.push({
          x: b.x,
          y: b.y + b.h / 2,
          vx: Math.sin(angle) * 4,
          vy: Math.cos(angle) * 4,
          color: '#f43f5e',
          damage: 1,
          isEnemy: true
        })
      }
    }

    // 绘制 Boss
    ctx.fillStyle = '#dc2626'
    ctx.beginPath()
    ctx.ellipse(b.x, b.y, b.w / 2, b.h / 2, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fbbf24'
    ctx.beginPath()
    ctx.arc(b.x, b.y, 12, 0, Math.PI * 2)
    ctx.fill()
  }

  // 7. 更新掉落物
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.y += d.vy

    // 绘制掉落晶体
    ctx.save()
    ctx.translate(d.x, d.y)
    ctx.fillStyle = d.type === 'power' ? '#06b6d4' : d.type === 'shield' ? '#3b82f6' : d.type === 'heal' ? '#10b981' : '#f59e0b'
    ctx.beginPath()
    ctx.arc(0, 0, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 12px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(d.type === 'power' ? 'P' : d.type === 'shield' ? 'S' : d.type === 'heal' ? '+' : 'B', 0, 0)
    ctx.restore()

    // 玩家拾取
    if (Math.abs(d.x - player.value.x) < 26 && Math.abs(d.y - player.value.y) < 26) {
      sound.powerup()
      if (d.type === 'power') {
        weaponLevel.value = Math.min(3, weaponLevel.value + 1)
      } else if (d.type === 'shield') {
        player.value.shield = 360 // 约 6 秒护盾
      } else if (d.type === 'heal') {
        player.value.hp = Math.min(player.value.maxHp, player.value.hp + 1)
      } else if (d.type === 'bomb') {
        bombs.value = Math.min(3, bombs.value + 1)
      }
      drops.splice(i, 1)
      continue
    }

    if (d.y > CANVAS_HEIGHT + 20) drops.splice(i, 1)
  }

  // 8. 绘制与更新玩家战机
  if (player.value.shield > 0) {
    player.value.shield--
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.arc(player.value.x, player.value.y, player.value.w * 0.8, 0, Math.PI * 2)
    ctx.stroke()
  }

  // 绘制战机主体 (矢量科技三角形战机)
  const px = player.value.x
  const py = player.value.y
  ctx.fillStyle = '#38bdf8'
  ctx.beginPath()
  ctx.moveTo(px, py - player.value.h / 2)
  ctx.lineTo(px - player.value.w / 2, py + player.value.h / 2)
  ctx.lineTo(px, py + player.value.h / 3)
  ctx.lineTo(px + player.value.w / 2, py + player.value.h / 2)
  ctx.closePath()
  ctx.fill()

  // 战机尾焰
  ctx.fillStyle = '#f59e0b'
  ctx.beginPath()
  ctx.moveTo(px - 5, py + player.value.h / 3)
  ctx.lineTo(px + 5, py + player.value.h / 3)
  ctx.lineTo(px, py + player.value.h / 2 + Math.random() * 8 + 4)
  ctx.closePath()
  ctx.fill()

  // 9. 更新粒子特效
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.alpha -= 0.02
    if (p.alpha <= 0) {
      particles.splice(i, 1)
      continue
    }
    ctx.fillStyle = p.color
    ctx.globalAlpha = p.alpha
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // 10. 绘制生命值心形
  for (let i = 0; i < player.value.maxHp; i++) {
    ctx.fillStyle = i < player.value.hp ? '#ef4444' : '#334155'
    ctx.font = '16px sans-serif'
    ctx.fillText('❤️', 16 + i * 22, 28)
  }

  // 11. 绘制 EMP 离子全屏冲击波
  if (shockwave.value) {
    ctx.save()
    ctx.strokeStyle = `rgba(245, 158, 11, ${shockwave.value.alpha})`
    ctx.lineWidth = 8
    ctx.beginPath()
    ctx.arc(player.value.x, player.value.y, shockwave.value.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.fillStyle = `rgba(255, 255, 255, ${shockwave.value.alpha * 0.3})`
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    ctx.restore()

    shockwave.value.radius += 26
    shockwave.value.alpha -= 0.05
    if (shockwave.value.alpha <= 0) {
      shockwave.value = null
    }
  }

  animId = requestAnimationFrame(loop)
}

const hitPlayer = () => {
  if (player.value.shield > 0) return
  player.value.hp--
  sound.explosion()

  if (player.value.hp <= 0) {
    isGameOver.value = true
    sound.gameover()
    const settle = gameStore.recordGame('shooter', score.value)
    earnedCoins.value = settle?.coins || 20
    isNewRecord.value = settle?.isNewRecord || false
    if (isNewRecord.value) {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } })
    }
  } else {
    // 扣血后附赠短暂 2 秒无敌护盾
    player.value.shield = 120
  }
}

const togglePause = () => {
  if (isGameOver.value) return
  isPaused.value = !isPaused.value
  sound.click()
}

const restartGame = () => {
  sound.click()
  score.value = 0
  wave.value = 1
  weaponLevel.value = 1
  bombs.value = 2
  shockwave.value = null
  player.value = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 80,
    w: 36,
    h: 36,
    hp: 3,
    maxHp: 3,
    shield: 120
  }
  boss.value = null
  bullets.length = 0
  enemies.length = 0
  drops.length = 0
  particles.length = 0
  isPaused.value = false
  isGameOver.value = false
  isNewRecord.value = false
}

const onKeyDown = (e: KeyboardEvent) => {
  keys[e.key] = true
  if (e.key === ' ') {
    togglePause()
    e.preventDefault()
  } else if (e.key === 'b' || e.key === 'B' || e.key === 'e' || e.key === 'E') {
    useBomb()
    e.preventDefault()
  }
}

const onKeyUp = (e: KeyboardEvent) => {
  keys[e.key] = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  restartGame()
  loop()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  cancelAnimationFrame(animId)
})
</script>

<style scoped>
.shooter-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
}

.game-dashboard {
  display: flex;
  align-items: center;
  justify-content: space-around;
  width: 100%;
  padding: 12px 18px;
  border-radius: 14px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 0.72rem;
  color: var(--text-dim);
}

.stat-value {
  font-size: 1.15rem;
  font-weight: 800;
}

.canvas-wrapper {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
  border: 2px solid var(--border-color);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.6);
  line-height: 0;
  cursor: crosshair;
}

.shooter-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.boss-bar-container {
  position: absolute;
  top: 14px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid #ef4444;
  border-radius: 10px;
  padding: 6px 12px;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
}

.boss-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  color: #ef4444;
  margin-bottom: 4px;
}

.boss-hp-track {
  width: 100%;
  height: 8px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  overflow: hidden;
}

.boss-hp-fill {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, #ef4444);
  transition: width 0.15s;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(11, 15, 25, 0.85);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.overlay-box h3 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
}

.control-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 12px 18px;
  border-radius: 14px;
}

.control-tips {
  font-size: 0.78rem;
  color: var(--text-dim);
  text-align: center;
}

.control-tips kbd {
  background: rgba(255, 255, 255, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.actions {
  display: flex;
  gap: 10px;
}

.ctrl-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.ctrl-btn:hover {
  color: var(--accent-cyan);
  border-color: var(--accent-cyan);
}

.ctrl-btn.reset:hover {
  color: #f43f5e;
  border-color: #f43f5e;
}

.emp-action-btn {
  background: rgba(245, 158, 11, 0.15);
  border-color: rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.emp-action-btn:hover:not(:disabled) {
  background: rgba(245, 158, 11, 0.3);
  border-color: #f59e0b;
  color: #fff;
  box-shadow: 0 0 14px rgba(245, 158, 11, 0.5);
}

.float-bomb-btn {
  position: absolute;
  right: 14px;
  bottom: 18px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.85);
  backdrop-filter: blur(8px);
  border: 2px solid #fbbf24;
  color: #1e1b4b;
  font-weight: 800;
  padding: 8px 14px;
  border-radius: 24px;
  cursor: pointer;
  box-shadow: 0 0 16px rgba(245, 158, 11, 0.6);
  transition: all 0.2s ease;
}

.float-bomb-btn:hover:not(:disabled) {
  transform: scale(1.08);
  background: #f59e0b;
}

.float-bomb-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
  box-shadow: none;
}

.modal-settle-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 10px 0;
}

.settle-trophy {
  margin-bottom: 12px;
}

.settle-status {
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
  margin-bottom: 6px;
}

.settle-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
  margin-bottom: 20px;
}

.reward-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  padding: 8px 18px;
  border-radius: 12px;
  color: #fbbf24;
  font-weight: 700;
  font-size: 1rem;
}
</style>
