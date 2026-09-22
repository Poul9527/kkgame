/**
 * 极智五子棋启发式博弈 AI 算法
 * 棋盘 15 x 15
 * 1: 黑子 (玩家默认)
 * 2: 白子 (AI)
 * 0: 空位
 */

export type BoardState = number[][]

const BOARD_SIZE = 15

// 方向向量：横、竖、正斜、反斜
const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
]

// 单个方向的棋型评分评估
function evaluateDirection(
  board: BoardState,
  row: number,
  col: number,
  dr: number,
  dc: number,
  player: number
): number {
  let count = 1
  let openEnds = 0

  // 正向探测
  let r = row + dr
  let c = col + dc
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count++
    r += dr
    c += dc
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === 0) {
    openEnds++
  }

  // 反向探测
  r = row - dr
  c = col - dc
  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) {
    count++
    r -= dr
    c -= dc
  }
  if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === 0) {
    openEnds++
  }

  if (count >= 5) return 100000 // 连五获胜
  if (count === 4) {
    if (openEnds === 2) return 10000 // 活四（必胜）
    if (openEnds === 1) return 2500  // 冲四
  }
  if (count === 3) {
    if (openEnds === 2) return 3000  // 活三
    if (openEnds === 1) return 500   // 眠三
  }
  if (count === 2) {
    if (openEnds === 2) return 400   // 活二
    if (openEnds === 1) return 50    // 眠二
  }
  return 10
}

// 评估某一个位置对于特定玩家的得分
function evaluatePosition(board: BoardState, r: number, c: number, player: number): number {
  let score = 0
  for (const [dr, dc] of DIRECTIONS) {
    score += evaluateDirection(board, r, c, dr, dc, player)
  }
  // 离中心越近略微加分
  const centerDist = Math.abs(r - 7) + Math.abs(c - 7)
  score += Math.max(0, 14 - centerDist) * 2
  return score
}

// 寻找 AI 最佳落子位置
export function getBestMove(
  board: BoardState,
  difficulty: 'easy' | 'normal' | 'master' = 'normal',
  aiPlayer: number = 2
): [number, number] | null {
  const humanPlayer = aiPlayer === 1 ? 2 : 1
  const candidates: { r: number; c: number; score: number }[] = []

  // 棋盘是否全空
  let hasPieces = false
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) {
        hasPieces = true
        break
      }
    }
    if (hasPieces) break
  }

  if (!hasPieces) {
    return [7, 7]
  }

  // 仅评估已有棋子周围 2 格以内的空位，大幅提升搜索速度与智能度
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[r][c] !== 0) continue

      let isNear = false
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] !== 0) {
            isNear = true
            break
          }
        }
        if (isNear) break
      }
      if (!isNear) continue

      const attackScore = evaluatePosition(board, r, c, aiPlayer)
      const defenseScore = evaluatePosition(board, r, c, humanPlayer)

      // 根据难度调整进攻与防守系数
      let totalScore = 0
      if (difficulty === 'easy') {
        totalScore = attackScore * 0.7 + defenseScore * 0.5 + Math.random() * 50
      } else if (difficulty === 'normal') {
        totalScore = attackScore * 1.0 + defenseScore * 0.95 + Math.random() * 10
      } else {
        // master 模式：绝不给对手留活四或冲四机会
        const defenseWeight = defenseScore >= 2500 ? 1.4 : 1.1
        totalScore = attackScore * 1.2 + defenseScore * defenseWeight
      }

      candidates.push({ r, c, score: totalScore })
    }
  }

  if (candidates.length === 0) return null

  candidates.sort((a, b) => b.score - a.score)

  if (difficulty === 'easy' && candidates.length > 3) {
    // 简单模式在最优的前 3~4 个候选中随机选
    const idx = Math.floor(Math.random() * Math.min(candidates.length, 4))
    return [candidates[idx].r, candidates[idx].c]
  }

  return [candidates[0].r, candidates[0].c]
}

// 检查是否出现 5 连子并返回获胜连线坐标
export function checkWin(board: BoardState): { winner: number; line: [number, number][] } | null {
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const player = board[r][c]
      if (player === 0) continue

      for (const [dr, dc] of DIRECTIONS) {
        const line: [number, number][] = [[r, c]]
        for (let i = 1; i < 5; i++) {
          const nr = r + dr * i
          const nc = c + dc * i
          if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === player) {
            line.push([nr, nc])
          } else {
            break
          }
        }
        if (line.length === 5) {
          return { winner: player, line }
        }
      }
    }
  }
  return null
}
