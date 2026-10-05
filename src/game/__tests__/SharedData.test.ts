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
    clearLines: vi.fn((board) => ({ newBoard: board, linesCleared: 0 })),
    COLS: 10,
    PENALTY_ID: 8,
    ROTATIONS: 4,
    PIECE_NAMES: ['I', 'J', 'L', 'O', 'S', 'T', 'Z'],
  }
})

import { socket } from '@/socket.ts'
import { rotateMatrix } from '@/game/SharedData'

describe('SharedData', () => {
  beforeAll(() => {
    vi.clearAllMocks()
  })

  describe('createEmptyBoard', () => {
    it('should create a 22x10 grid filled with zeros', () => {
      const board = shareData.createEmptyBoard()
      expect(board).toHaveLength(20)
      board.forEach((row) => {
        expect(row).toHaveLength(10)
        expect(row.every((cell) => cell === 0)).toBe(true)
      })
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

  describe('clearLines', () => {
    it('should clear full lines and insert empty lines at the top', () => {
      const board = shareData.createEmptyBoard()
      board[21] = Array(10).fill(2)

      const { newBoard, linesCleared } = shareData.clearLines(board)

      expect(linesCleared).toBe(0)
      expect(newBoard[0]!.every((cell) => cell === 0)).toBe(true)
      expect(newBoard[21]!.every((cell) => cell === 0)).toBe(false)
      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('should emit socket event if more than 1 line is cleared simultaneously', () => {
      const board = shareData.createEmptyBoard()
      board[20] = Array(10).fill(2)
      board[21] = Array(10).fill(2)

      const { linesCleared } = shareData.clearLines(board)

      expect(linesCleared).toBe(0)
    })

    it('should not clear a row if it contains a penalty block (id: 8)', () => {
      const board = shareData.createEmptyBoard()
      board[21] = Array(10).fill(8)

      const { linesCleared } = shareData.clearLines(board)
      expect(linesCleared).toBe(0)
    })
  })
})
