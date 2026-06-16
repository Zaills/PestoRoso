import { socket } from '@/socket.ts'

export const PIECES: Record<number, number[][]> = {
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
  8: [
    [8]
  ]
}

export type PieceName = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z' | 'penality'

export const PIECE_NAMES: Record<number, PieceName> = {
  1: 'I',
  2: 'J',
  3: 'L',
  4: 'O',
  5: 'S',
  6: 'T',
  7: 'Z',
  8: 'penality',
}

export interface PieceState {
  matrix: number[][]
  x: number
  y: number
  pieceId: number
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

export function spawnPiece(pieceId: number): PieceState {
  const matrix = PIECES[pieceId].map((row) => [...row])
  return {
    matrix,
    x: Math.floor(10 / 2) - Math.floor(matrix[0].length / 2),
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
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        const newX = piece.x + x + dx
        const newY = piece.y + y + dy
        if (newX < 0 || newX >= 10 || newY >= 22) return true
        if (newY >= 0 && board[newY][newX] !== 0) return true
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
      rotated[x][N - 1 - y] = matrix[y][x]
    }
  }
  return rotated
}

export function lockPiece(board: number[][], piece: PieceState): number[][] {
  const newBoard = board.map((row) => [...row])
  for (let y = 0; y < piece.matrix.length; y++) {
    for (let x = 0; x < piece.matrix[y].length; x++) {
      if (piece.matrix[y][x] !== 0) {
        const boardY = piece.y + y
        const boardX = piece.x + x
        if (boardY >= 0 && boardY < 22) {
          newBoard[boardY][boardX] = piece.pieceId
        }
      }
    }
  }
  return newBoard
}

export function clearLines(board: number[][]): { newBoard: number[][]; linesCleared: number } {
  const kept = board.filter((row) => !row.every((cell) => (cell !== 0 && cell !== 8)))
  const linesCleared = 22 - kept.length
  if (linesCleared > 1) {
    socket.emit('clearLines', linesCleared - 1)
  }
  const empty = Array.from({ length: linesCleared }, () => Array(10).fill(0))
  return { newBoard: [...empty, ...kept], linesCleared }
}

export function getGhostY(board: number[][], piece: PieceState): number {
  let ghostY = piece.y
  while (!checkCollision(board, { ...piece, y: ghostY }, 0, 1)) {
    ghostY++
  }
  return ghostY
}
