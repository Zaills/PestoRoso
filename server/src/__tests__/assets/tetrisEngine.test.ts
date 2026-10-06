import { beforeAll, describe, expect, it, vi } from 'vitest'
import * as shareData from '@/game/SharedData'

vi.mock('@/socket.ts', () => ({
  socket: {
    emit: vi.fn(),
  },
}))

vi.mock('@/game/SharedData', async () => {
  const actual = await vi.importActual<typeof import('@/game/SharedData')>('@/game/SharedData')

  return {
    ...actual,
    createEmptyBoard: vi.fn(() => Array(20).fill(Array(10).fill(0))),
    spawnPiece: vi.fn((id) => ({
      pieceId: id,
      x: 5,
      y: 0,
      matrix: [
        [1, 1],
        [1, 1],
      ],
    })),
    checkCollision: vi.fn(() => false),
    getPieceMatrix: vi.fn(() => [
      [1, 1],
      [1, 1],
    ]),
    lockPiece: vi.fn((board) => board),
    getGhostY: vi.fn(() => 18),
    scoreForLines: vi.fn(() => 0),
    levelForLines: vi.fn(() => 0),
    isBoardOverflowed: vi.fn(() => false),
    applyPenaltyLines: vi.fn((board) => board),
    COLS: 10,
    PENALTY_ID: 8,
    ROTATIONS: 4,
    PIECE_NAMES: ['I', 'J', 'L', 'O', 'S', 'T', 'Z'],
  }
})

import { Piece } from '../../../assets/PieceClass'
import {
  checkCollision,
  getGhostY, isValidPlacement,
  lockPiece,
  spawnPiece,
} from '../../../assets/tetrisEngine'

describe('tetrisEngine', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('spawnPiece', () => {
    it('should correctly initialize a piece state in the top-center', () => {
      const pieceId = 4
      const spawned = spawnPiece(pieceId)

      expect(spawned.pieceId).toBe(pieceId)
      expect(spawned.matrix).toEqual(shareData.PIECES[pieceId])
      expect(spawned.y).toBe(0)
      expect(spawned.x).toBe(4)
    })

    it('should fall back to matrixWidth 0 if piece matrix is empty', () => {
      const emptyPieceId = 999 as shareData.PieceId
      shareData.PIECES[emptyPieceId] = []

      const spawned = spawnPiece(emptyPieceId)
      expect(spawned.x).toBe(5)

      // delete shareData.PIECES[emptyPieceId]
    })
  })

  describe('checkCollision', () => {
    it('should return false if there is no collision', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 4, 0, 0, [
        [1, 1],
        [1, 1],
      ])
      expect(checkCollision(board, piece, 0, 0)).toBe(false)
    })

    it('should return true if piece goes out of left bounds', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 0, 0, 0, [
        [1, 1],
        [1, 1],
      ])
      expect(checkCollision(board, piece, -1, 0)).toBe(true)
    })

    it('should return true if piece goes out of right bounds', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 9, 0, 0, [
        [1, 1],
        [1, 1],
      ])
      expect(checkCollision(board, piece, 0, 0)).toBe(true)
    })

    it('should return true if piece hits the bottom', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 4, 20, 0, [
        [1, 1],
        [1, 1],
      ])

      expect(checkCollision(board, piece, 0, 1)).toBe(true)
    })

    it('should return true if piece collides with an existing block', () => {
      const board = shareData.createEmptyBoard()
      board[5]![5] = 2
      const piece: Piece = new Piece(1, 5, 4, 0, [[1]])

      expect(checkCollision(board, piece, 0, 1)).toBe(true)
    })

    it('checkCollision should ignore empty spaces (0) inside a piece matrix', () => {
      const board = shareData.createEmptyBoard()
      board[0]![0] = 2
      const piece: Piece = new Piece(6, 0, 0, 0, [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0],
      ])

      expect(checkCollision(board, piece, 0, 0)).toBe(true)
    })
  })

  describe('lockPiece', () => {
    it('should burn the piece onto the board matrix without mutating the original board', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 0, 0, 0, [
        [1, 1],
        [1, 1],
      ])

      const newBoard = lockPiece(board, piece)

      expect(newBoard[0]![0]).toBe(4)
      expect(newBoard[0]![1]).toBe(4)
      expect(newBoard[1]![0]).toBe(4)
      expect(newBoard[1]![1]).toBe(4)
      expect(board[0]![0]).toBe(0)
    })

    it('lockPiece should safely ignore blocks that freeze above the board (y < 0)', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(4, 4, -1, 0, [
        [1, 0],
        [1, 1],
      ])

      expect(() => lockPiece(board, piece)).not.toThrow()

      const newBoard = lockPiece(board, piece)
      expect(newBoard[0]![4]).toBe(4)
      expect(newBoard[0]![5]).toBe(4)
    })

    it('lockPiece should not write to board and not crash if targetRow is undefined', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(1, 0, 50, 0, [[1]])

      expect(() => lockPiece(board, piece)).not.toThrow()
      const newBoard = lockPiece(board, piece)
      expect(newBoard).toEqual(board)
    })
  })

  describe('getGhostY', () => {
    it('should find the lowest valid y coordinate before collision', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(1, 4, 0, 0, [[1]])

      const ghostY = getGhostY(board, piece)
      expect(ghostY).toBe(19)
    })
  })

  describe('isValidPlacement', () => {
    it('should return true if work correctly', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(1, 0, 0, 0, [[1]])
      expect(isValidPlacement(board, piece)).toBe(false)
    })

    it('should return false if piece pos are not int', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(1, 0.5, 0.5, 0, [[1]])
      expect(isValidPlacement(board, piece)).toBe(false)
    })

    it('should return false if piece collide', () => {
      const board = shareData.createEmptyBoard()
      const piece: Piece = new Piece(1, 110, 110, 0, [[1]])
      expect(isValidPlacement(board, piece)).toBe(false)
    })
  })
})
