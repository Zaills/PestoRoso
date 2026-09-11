import pieceMatrix from './PiecesMatrix.json'

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

/** Points awarded for clearing 0 to 4 lines at once, before the level multiplier. */
const LINE_POINTS = [0, 100, 300, 500, 800]

export type PieceId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export const PIECES: Record<PieceId, number[][]> = pieceMatrix

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

export function createEmptyBoard(): number[][] {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0))
}

export function clearLines(board: number[][]): { newBoard: number[][]; linesCleared: number } {
  const kept = board.filter((row) => !row.every((cell) => cell !== 0 && cell !== PENALTY_ID))
  const linesCleared = TOTAL_ROWS - kept.length
  const empty = Array.from({ length: linesCleared }, () => Array(COLS).fill(0))
  return { newBoard: [...empty, ...kept], linesCleared }
}

export function levelForLines(linesCount: number): number {
  return Math.floor(linesCount / 10) + 1
}


export function getPieceMatrix(pieceId: PieceId, rotation: number): number[][] {
  const turns = ((Math.trunc(rotation) % ROTATIONS) + ROTATIONS) % ROTATIONS
  let matrix = PIECES[pieceId].map((row) => [...row])
  for (let i = 0; i < turns; i++) {
    matrix = rotateMatrix(matrix)
  }
  return matrix
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

export function isBoardOverflowed(board: number[][]): boolean {
  return board.slice(0, BUFFER_ROWS).some((row) => row.some((cell) => cell !== 0))
}

export function scoreForLines(linesCleared: number, level: number): number {
  return (LINE_POINTS[linesCleared] ?? 0) * level
}

/** Pushes the stack up and appends `lines` indestructible rows at the bottom. */
export function applyPenaltyLines(board: number[][], lines: number): number[][] {
  let next = board.map((row) => [...row])
  for (let i = 0; i < lines; i++) {
    next = [...next.slice(1), Array(COLS).fill(PENALTY_ID)]
  }
  return next
}
