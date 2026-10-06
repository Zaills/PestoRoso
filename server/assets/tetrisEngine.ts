import { Piece } from './PieceClass'
import {
  COLS,
  getPieceMatrix,
  PieceId,
  TOTAL_ROWS,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
} from '../../shared/ShareData'

export {
  createEmptyBoard,
  clearLines,
  levelForLines,
  PieceId,
  applyPenaltyLines,
  isBoardOverflowed,
  getPieceMatrix,
  scoreForLines,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
} from '../../shared/ShareData'

/**
 * Pure Tetris engine, shared by the browser and the game server.
 *
 * The client runs it to play locally with zero network latency. The server runs the
 * exact same code to replay what the client reports and reject anything impossible.
 * Both sides must therefore agree bit for bit, which is why this module holds no
 * side effect, no browser or Node API, and no source of randomness.
 */


/**
 * Shape of a piece for a given rotation, always rebuilt from the base tetrimino.
 *
 * Deriving the matrix from `(pieceId, rotation)` rather than carrying it over the
 * network is what makes a placement unforgeable: the server never trusts a shape,
 * it recomputes it.
 */

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


export function getGhostY(board: number[][], piece: Piece): number {
  let ghostY = piece.y
  while (!checkCollision(board, { ...piece, y: ghostY }, 0, 1)) {
    ghostY++
  }
  return ghostY
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


