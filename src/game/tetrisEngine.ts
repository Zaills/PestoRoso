import { socket } from '@/socket.ts'

/** Board geometry shared by the engine, the player board and the opponent spectra. */
export const COLS = 10
export const VISIBLE_ROWS = 20
/** Hidden rows above the visible board where a new piece spawns. */
export const BUFFER_ROWS = 2
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS

/** Id 8 is the indestructible penalty block; it is never spawned as a playable piece. */
export const PENALTY_ID = 8

export type PieceId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const PIECES: Record<PieceId, number[][]> = {
  1: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  2: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  3: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
  4: [
    [1, 1],
    [1, 1],
  ],
  5: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  6: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  7: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  8: [[8]],
}

export type TetriminoName = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z'
export type PieceName = TetriminoName | 'penalty'

export const PIECE_NAMES: Record<PieceId, PieceName> = {
  1: 'I',
  2: 'J',
  3: 'L',
  4: 'O',
  5: 'S',
  6: 'T',
  7: 'Z',
  8: 'penalty',
}

export interface PieceState {
  matrix: number[][]
  x: number
  y: number
  pieceId: PieceId
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0))
}

export function spawnPiece(pieceId: PieceId): PieceState {
  const matrix = PIECES[pieceId].map((row) => [...row])
  const matrixWidth = matrix[0]?.length ?? 0
  return {
    matrix,
    x: Math.floor(COLS / 2) - Math.floor(matrixWidth / 2),
    y: 0,
    pieceId,
  }
}

export function checkCollision(
  board: number[][],
  piece: PieceState,
  dx: number,
  dy: number,
  rotatedMatrix?: number[][],
): boolean {
  const matrix = rotatedMatrix ?? piece.matrix
  for (const [y, row] of matrix.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== 0) {
        const newX = piece.x + x + dx
        const newY = piece.y + y + dy

        if (newX < 0 || newX >= COLS || newY >= TOTAL_ROWS) return true
        if (newY >= 0 && board[newY]?.[newX] !== 0) return true
      }
    }
  }
  return false
}

export function rotateMatrix(matrix: number[][]): number[][] {
  const N = matrix.length
  const rotated = Array.from({ length: N }, () => Array(N).fill(0))
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      rotated[x]![N - 1 - y] = matrix[y]![x]
    }
  }
  return rotated
}

export function lockPiece(board: number[][], piece: PieceState): number[][] {
  const newBoard = board.map((row) => [...row])

  for (const [y, row] of piece.matrix.entries()) {
    for (const [x, cell] of row.entries()) {
      if (cell !== 0) {
        const boardY = piece.y + y
        const boardX = piece.x + x

        if (boardY >= 0 && boardY < TOTAL_ROWS) {
          const targetRow = newBoard[boardY]
          targetRow![boardX] = piece.pieceId
        }
      }
    }
  }

  return newBoard
}

export function clearLines(board: number[][]): { newBoard: number[][]; linesCleared: number } {
  // A row made only of penalty blocks can never be cleared, hence the PENALTY_ID check.
  const kept = board.filter((row) => !row.every((cell) => cell !== 0 && cell !== PENALTY_ID))
  const linesCleared = TOTAL_ROWS - kept.length
  // Clearing n lines sends n - 1 penalty lines to the opponents.
  if (linesCleared > 1) {
    socket.emit('clearLines', linesCleared - 1)
  }
  const empty = Array.from({ length: linesCleared }, () => Array(COLS).fill(0))
  return { newBoard: [...empty, ...kept], linesCleared }
}

export function getGhostY(board: number[][], piece: PieceState): number {
  let ghostY = piece.y
  while (!checkCollision(board, { ...piece, y: ghostY }, 0, 1)) {
    ghostY++
  }
  return ghostY
}
