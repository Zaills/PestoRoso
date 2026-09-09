// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { Piece, type PieceId } from './PieceClass.ts'

/**
 * Pure Tetris engine, shared by the browser and the game server.
 *
 * The client runs it to play locally with zero network latency. The server runs the
 * exact same code to replay what the client reports and reject anything impossible.
 * Both sides must therefore agree bit for bit, which is why this module holds no
 * side effect, no browser or Node API, and no source of randomness.
 */

/** Board geometry shared by the engine, the player board and the opponent spectra. */
export const COLS = 10
export const VISIBLE_ROWS = 20
/** Hidden rows above the visible board where a new piece spawns. */
export const BUFFER_ROWS = 2
export const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS

/** Id 8 is the indestructible penalty block; it is never spawned as a playable piece. */
export const PENALTY_ID = 8

/** A piece returns to its initial shape after four quarter turns. */
export const ROTATIONS = 4


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

// export interface PieceState {
//   matrix: number[][]
//   x: number
//   y: number
//   pieceId: PieceId
//   /** Quarter turns applied to the base shape, kept in sync with `matrix`. */
//   rotation: number
// }

/** Points awarded for clearing 0 to 4 lines at once, before the level multiplier. */
const LINE_POINTS = [0, 100, 300, 500, 800]

export function createEmptyBoard(): number[][] {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0))
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

/**
 * Shape of a piece for a given rotation, always rebuilt from the base tetrimino.
 *
 * Deriving the matrix from `(pieceId, rotation)` rather than carrying it over the
 * network is what makes a placement unforgeable: the server never trusts a shape,
 * it recomputes it.
 */
export function getPieceMatrix(pieceId: PieceId, rotation: number): number[][] {
  const turns = ((Math.trunc(rotation) % ROTATIONS) + ROTATIONS) % ROTATIONS
  let matrix = PIECES[pieceId].map((row) => [...row])
  for (let i = 0; i < turns; i++) {
    matrix = rotateMatrix(matrix)
  }
  return matrix
}

export function spawnPiece(pieceId: PieceId, rotation = 0): Piece {
  const matrix = getPieceMatrix(pieceId, rotation)
  const matrixWidth = matrix[0]?.length ?? 0
  return new Piece(
    pieceId,
    Math.floor(COLS / 2) - Math.floor(matrixWidth / 2),
    0,
    rotation,
    matrix
  )
}

export function checkCollision(
  board: number[][],
  piece: Piece,
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

export function lockPiece(board: number[][], piece: Piece): number[][] {
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
  const empty = Array.from({ length: linesCleared }, () => Array(COLS).fill(0))
  return { newBoard: [...empty, ...kept], linesCleared }
}

export function getGhostY(board: number[][], piece: Piece): number {
  let ghostY = piece.y
  while (!checkCollision(board, { ...piece, y: ghostY }, 0, 1)) {
    ghostY++
  }
  return ghostY
}

/** Pushes the stack up and appends `lines` indestructible rows at the bottom. */
export function applyPenaltyLines(board: number[][], lines: number): number[][] {
  let next = board.map((row) => [...row])
  for (let i = 0; i < lines; i++) {
    next = [...next.slice(1), Array(COLS).fill(PENALTY_ID)]
  }
  return next
}

/**
 * Whether a piece could legitimately have been locked at this exact spot: it must
 * overlap nothing, and it must rest on the stack rather than float above it.
 */
export function isValidPlacement(board: number[][], piece: Piece): boolean {
  if (!Number.isInteger(piece.x) || !Number.isInteger(piece.y)) return false
  if (checkCollision(board, piece, 0, 0)) return false
  return checkCollision(board, piece, 0, 1)
}

export function scoreForLines(linesCleared: number, level: number): number {
  return (LINE_POINTS[linesCleared] ?? 0) * level
}

export function levelForLines(linesCount: number): number {
  return Math.floor(linesCount / 10) + 1
}
