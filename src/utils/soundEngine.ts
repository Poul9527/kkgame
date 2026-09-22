/**
 * Web Audio API 原生音效合成引擎
 * 无需任何外部音频文件，零网络加载延迟，纯代码实时合成街机 8-bit 音效
 */

class SoundEngine {
  private ctx: AudioContext | null = null
  public soundEnabled: boolean = true
  public musicEnabled: boolean = false
  public volume: number = 0.5
  private bgmInterval: number | null = null

  private initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContextClass) {
        this.ctx = new AudioContextClass()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
  }

  // 基础音调生成工具
  private playTone(
    freq: number,
    type: OscillatorType,
    duration: number,
    opt?: { rampTo?: number; gain?: number; delay?: number }
  ) {
    if (!this.soundEnabled) return
    this.initCtx()
    if (!this.ctx) return

    const now = this.ctx.currentTime + (opt?.delay || 0)
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()

    osc.type = type
    osc.frequency.setValueAtTime(freq, now)
    if (opt?.rampTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(10, opt.rampTo), now + duration)
    }

    const maxGain = (opt?.gain ?? 0.2) * this.volume
    gain.gain.setValueAtTime(maxGain, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)

    osc.connect(gain)
    gain.connect(this.ctx.destination)

    osc.start(now)
    osc.stop(now + duration)
  }

  // 噪声生成工具（用于爆炸、打击音效）
  private playNoise(duration: number, gainVal: number = 0.3) {
    if (!this.soundEnabled) return
    this.initCtx()
    if (!this.ctx) return

    const bufferSize = this.ctx.sampleRate * duration
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }

    const noise = this.ctx.createBufferSource()
    noise.buffer = buffer

    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(800, this.ctx.currentTime)
    filter.frequency.linearRampToValueAtTime(100, this.ctx.currentTime + duration)

    const gain = this.ctx.createGain()
    const maxGain = gainVal * this.volume
    gain.gain.setValueAtTime(maxGain, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration)

    noise.connect(filter)
    filter.connect(gain)
    gain.connect(this.ctx.destination)

    noise.start()
  }

  // 按钮点击
  public click() {
    this.playTone(600, 'sine', 0.05, { rampTo: 400, gain: 0.15 })
  }

  // 棋子落子 (五子棋)
  public placePiece() {
    this.playTone(320, 'triangle', 0.1, { rampTo: 160, gain: 0.25 })
  }

  // 吃食物 (贪吃蛇)
  public eat() {
    this.playTone(440, 'square', 0.08, { rampTo: 880, gain: 0.2 })
  }

  // 合并成功 (2048)
  public merge(level: number = 1) {
    const baseFreq = 220 * Math.pow(1.1, Math.min(level, 15))
    this.playTone(baseFreq, 'sine', 0.15, { rampTo: baseFreq * 1.5, gain: 0.25 })
  }

  // 战机发射子弹 (雷霆战机)
  public shoot() {
    this.playTone(900, 'sawtooth', 0.09, { rampTo: 150, gain: 0.12 })
  }

  // 爆炸 (战机击落 / 扫雷踩雷)
  public explosion() {
    this.playNoise(0.35, 0.4)
  }

  // 金币掉落 / 拾取
  public coin() {
    this.playTone(987.77, 'sine', 0.08, { gain: 0.2 })
    this.playTone(1318.51, 'sine', 0.2, { delay: 0.08, gain: 0.25 })
  }

  // 获得道具 / Buff
  public powerup() {
    const notes = [330, 392, 493, 659]
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.1, { delay: idx * 0.06, gain: 0.2 })
    })
  }

  // 获得胜利 / 通关
  public victory() {
    const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'triangle', 0.25, { delay: idx * 0.09, gain: 0.25 })
    })
  }

  // 游戏失败
  public gameover() {
    const notes = [400, 370, 340, 300]
    notes.forEach((freq, idx) => {
      this.playTone(freq, 'sawtooth', 0.2, { delay: idx * 0.12, rampTo: freq * 0.8, gain: 0.25 })
    })
  }

  // 扫雷插旗
  public flag() {
    this.playTone(520, 'sine', 0.06, { rampTo: 650, gain: 0.15 })
  }

  // 扫雷翻开格子
  public reveal() {
    this.playTone(450, 'sine', 0.04, { gain: 0.1 })
  }

  // 扑克发牌刷牌声
  public cardDeal() {
    this.playTone(800, 'triangle', 0.06, { rampTo: 300, gain: 0.15 })
  }

  // 筹码下注碰撞声
  public chips() {
    this.playTone(1200, 'sine', 0.04, { rampTo: 800, gain: 0.15 })
    this.playTone(1500, 'sine', 0.05, { delay: 0.03, rampTo: 1100, gain: 0.18 })
  }

  // 比牌绝杀对决声 (高燃雷电交击)
  public pkClash() {
    this.playTone(440, 'sawtooth', 0.25, { rampTo: 110, gain: 0.3 })
    this.playNoise(0.2, 0.3)
  }

  // 弃牌声
  public fold() {
    this.playTone(280, 'sine', 0.08, { rampTo: 140, gain: 0.12 })
  }

  // 复古 8-bit 背景音乐（可选开启）
  public toggleBgm() {
    this.musicEnabled = !this.musicEnabled
    if (this.musicEnabled) {
      this.startBgm()
    } else {
      this.stopBgm()
    }
    return this.musicEnabled
  }

  public startBgm() {
    if (this.bgmInterval) return
    this.initCtx()
    const melody = [
      261.63, 293.66, 329.63, 349.23, 392.00, 349.23, 329.63, 293.66,
      329.63, 392.00, 440.00, 392.00, 329.63, 293.66, 261.63, 196.00
    ]
    let step = 0
    this.bgmInterval = window.setInterval(() => {
      if (!this.musicEnabled) return
      const freq = melody[step % melody.length]
      this.playTone(freq, 'sine', 0.18, { gain: 0.04 })
      step++
    }, 220)
  }

  public stopBgm() {
    if (this.bgmInterval) {
      clearInterval(this.bgmInterval)
      this.bgmInterval = null
    }
  }
}

export const sound = new SoundEngine()
