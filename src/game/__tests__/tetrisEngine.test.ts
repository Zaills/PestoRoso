import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  createEmptyBoard,
  spawnPiece,
  checkCollision,
  rotateMatrix,
  lockPiece,
  clearLines,
  getGhostY,
  PIECES,
  type PieceState,
  type PieceId,
} from '@/game/tetrisEngine.ts'

vi.mock('@/socket.ts', () => ({
  socket: {
    emit: vi.fn(),
  },
}))

import { socket } from '@/socket.ts'


describe('tetrisEngine', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('createEmptyBoard', () => {
    it('should create a 22x10 grid filled with zeros', () => {
      const board = createEmptyBoard()
      expect(board).toHaveLength(22)
      board.forEach((row) => {
        expect(row).toHaveLength(10)
        expect(row.every((cell) => cell === 0)).toBe(true)
      })
    })
  })

  describe('spawnPiece', () => {
    it('should correctly initialize a piece state in the top-center', () => {
      const pieceId = 4
      const spawned = spawnPiece(pieceId)

      expect(spawned.pieceId).toBe(pieceId)
      expect(spawned.matrix).toEqual(PIECES[pieceId])
      expect(spawned.y).toBe(0)
      expect(spawned.x).toBe(4)
    })

    it('should fall back to matrixWidth 0 if piece matrix is empty', () => {
      const emptyPieceId = 999 as PieceId
      PIECES[emptyPieceId] = []

      const spawned = spawnPiece(emptyPieceId)
      expect(spawned.x).toBe(5)

      delete PIECES[emptyPieceId]
    })
  })

  describe('rotateMatrix', () => {
    it('should rotate a 3x3 matrix 90 degrees clockwise', () => {
      const original = [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0],
      ]
      const expected = [
        [0, 1, 1],
        [0, 1, 0],
        [0, 1, 0],
      ]
      expect(rotateMatrix(original)).toEqual(expected)
    })
  })

  describe('checkCollision', () => {
    it('should return false if there is no collision', () => {
      const board = createEmptyBoard()
      const piece: PieceState = { matrix: [[1, 1], [1, 1]], x: 4, y: 0, pieceId: 4 }
      expect(checkCollision(board, piece, 0, 0)).toBe(false)
    })

    it('should return true if piece goes out of left bounds', () => {
      const board = createEmptyBoard()
      const piece: PieceState = { matrix: [[1, 1], [1, 1]], x: 0, y: 0, pieceId: 4 }
      expect(checkCollision(board, piece, -1, 0)).toBe(true)
    })

    it('should return true if piece goes out of right bounds', () => {
      const board = createEmptyBoard()
      const piece: PieceState = { matrix: [[1, 1], [1, 1]], x: 9, y: 0, pieceId: 4 }
      expect(checkCollision(board, piece, 0, 0)).toBe(true)
    })

    it('should return true if piece hits the bottom', () => {
      const board = createEmptyBoard()
      const piece: PieceState = { matrix: [[1, 1], [1, 1]], x: 4, y: 20, pieceId: 4 }
      expect(checkCollision(board, piece, 0, 1)).toBe(true)
    })

    it('should return true if piece collides with an existing block', () => {
      const board = createEmptyBoard()
      board[5]![5] = 2
      const piece: PieceState = { matrix: [[1]], x: 5, y: 4, pieceId: 1 }

      expect(checkCollision(board, piece, 0, 1)).toBe(true)
    })

    it('checkCollision should ignore empty spaces (0) inside a piece matrix', () => {
      const board = createEmptyBoard()
      board[0]![0] = 2

      const piece: PieceState = {
        matrix: [
          [0, 1, 0],
          [1, 1, 1],
          [0, 0, 0],
        ],
        x: 0,
        y: 0,
        pieceId: 6,
      }

      expect(checkCollision(board, piece, 0, 0)).toBe(false)
    })

  })

  describe('lockPiece', () => {
    it('should burn the piece onto the board matrix without mutating the original board', () => {
      const board = createEmptyBoard()
      const piece: PieceState = {
        matrix: [
          [1, 1],
          [1, 1],
        ],
        x: 0,
        y: 0,
        pieceId: 4,
      }

      const newBoard = lockPiece(board, piece)

      expect(newBoard[0]![0]).toBe(4)
      expect(newBoard[0]![1]).toBe(4)
      expect(newBoard[1]![0]).toBe(4)
      expect(newBoard[1]![1]).toBe(4)
      expect(board[0]![0]).toBe(0)
    })

    it('lockPiece should safely ignore blocks that freeze above the board (y < 0)', () => {
      const board = createEmptyBoard()

      const piece: PieceState = {
        matrix: [
          [1, 0],
          [1, 1],
        ],
        x: 4,
        y: -1,
        pieceId: 4,
      }

      expect(() => lockPiece(board, piece)).not.toThrow()

      const newBoard = lockPiece(board, piece)
      expect(newBoard[0]![4]).toBe(4)
      expect(newBoard[0]![5]).toBe(4)
    })

    it('lockPiece should not write to board and not crash if targetRow is undefined', () => {
      const board = createEmptyBoard()
      const piece: PieceState = {
        matrix: [[1]],
        x: 0,
        y: 50,
        pieceId: 1,
      }

      expect(() => lockPiece(board, piece)).not.toThrow()
      const newBoard = lockPiece(board, piece)
      expect(newBoard).toEqual(board)
    })
  })

  describe('clearLines', () => {
    it('should clear full lines and insert empty lines at the top', () => {
      const board = createEmptyBoard()
      board[21] = Array(10).fill(2)

      const { newBoard, linesCleared } = clearLines(board)

      expect(linesCleared).toBe(1)
      expect(newBoard[0]!.every((cell) => cell === 0)).toBe(true)
      expect(newBoard[21]!.every((cell) => cell === 0)).toBe(true)
      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('should emit socket event if more than 1 line is cleared simultaneously', () => {
      const board = createEmptyBoard()
      board[20] = Array(10).fill(2)
      board[21] = Array(10).fill(2)

      const { linesCleared } = clearLines(board)

      expect(linesCleared).toBe(2)
      expect(socket.emit).toHaveBeenCalledWith('clearLines', 1)
    })

    it('should not clear a row if it contains a penalty block (id: 8)', () => {
      const board = createEmptyBoard()
      board[21] = Array(10).fill(8)

      const { linesCleared } = clearLines(board)
      expect(linesCleared).toBe(0)
    })
  })

  describe('getGhostY', () => {
    it('should find the lowest valid y coordinate before collision', () => {
      const board = createEmptyBoard()
      board[15]![4] = 2
      const piece: PieceState = { matrix: [[1]], x: 4, y: 0, pieceId: 1 }

      const ghostY = getGhostY(board, piece)
      expect(ghostY).toBe(14)
    })
  })
})
