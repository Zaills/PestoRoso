import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { socket } from '@/socket'
import * as tetrisEngine from '../SharedData.ts'
import { useGameState } from '../useGameState'
import { nextTick } from 'vue'

// --- MOCKS ---
vi.mock('@/socket', () => ({
  socket: { emit: vi.fn() },
}))

vi.mock('../tetrisEngine', () => ({
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
  clearLines: vi.fn((board) => ({ newBoard: board, linesCleared: 0 })),
  getGhostY: vi.fn(() => 18),
  scoreForLines: vi.fn(() => 0),
  levelForLines: vi.fn(() => 0),
  isBoardOverflowed: vi.fn(() => false),
  applyPenaltyLines: vi.fn((board) => board),
  COLS: 10,
  PENALTY_ID: 8,
  ROTATIONS: 4,
  PIECE_NAMES: ['I', 'J', 'L', 'O', 'S', 'T', 'Z'],
}))

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('sets correct initial states on initGame', () => {
      const state = useGameState()
      state.initGame([1, 2, 3, 4, 5])

      expect(state.score.value).toBe(0)
      expect(state.level.value).toBe(1)
      expect(state.linesCount.value).toBe(0)
      expect(state.isGameOver.value).toBe(false)
      expect(state.isWinner.value).toBe(false)
      expect(state.currentPiece.value).toEqual({
        pieceId: 1,
        x: 5,
        y: 0,
        matrix: [
          [1, 1],
          [1, 1],
        ],
      })
      expect(state.nextPieceIds.value).toEqual([2, 3, 4, 5])
    })

    it('does not request more pieces if queue has 14 or more pieces', () => {
      const state = useGameState()
      const largeQueue = Array(15).fill(1)
      state.initGame(largeQueue)

      expect(socket.emit).not.toHaveBeenCalledWith('request_more_pieces')
    })

    it('handles empty piece queue gracefully on init', () => {
      const state = useGameState()
      state.initGame([])
      expect(state.currentPiece.value).toBeNull()
    })
  })

  describe('Computed Properties Edge Cases', () => {
    it('returns 0 for ghostPieceY when currentPiece is null', () => {
      const state = useGameState()
      expect(state.ghostPieceY.value).toBe(0)
    })

    it('returns null for heldPieceName when heldPieceId is null', () => {
      const state = useGameState()
      expect(state.heldPieceName.value).toBeNull()
    })
  })

  describe('Movement & Actions', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      vi.useFakeTimers()
    })
    it('moves left if no collision', () => {
      const state = useGameState()
      state.initGame([1])
      state.moveLeft()
      expect(state.currentPiece.value?.x).toBe(4)
    })

    it('prevents move left if collision', () => {
      const state = useGameState()
      state.initGame([1])
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)
      state.moveLeft()
      expect(state.currentPiece.value?.x).toBe(5)
    })

    it('moves right if no collision', () => {
      const state = useGameState()
      state.initGame([1])
      state.moveRight()
      expect(state.currentPiece.value?.x).toBe(6)
    })

    it('prevents move right if collision', () => {
      const state = useGameState()
      state.initGame([1])
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)
      state.moveRight()
      expect(state.currentPiece.value?.x).toBe(5)
    })

    it('performs soft drop and increases score', () => {
      const state = useGameState()
      state.initGame([1])
      state.softDrop()
      expect(state.currentPiece.value?.y).toBe(1)
      expect(state.score.value).toBe(1)
    })

    it('locks piece on soft drop collision', () => {
      const state = useGameState()
      state.initGame([1, 2])
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)
      state.softDrop()

      expect(tetrisEngine.lockPiece).toHaveBeenCalled()
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })

    it('performs hard drop, updates score and locks piece', () => {
      const state = useGameState()
      state.initGame([1, 2])
      vi.mocked(tetrisEngine.getGhostY).mockReturnValue(10)

      state.hardDrop()

      expect(state.score.value).toBe(20)
      expect(tetrisEngine.lockPiece).toHaveBeenCalled()
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })


    it('ignores movement actions when currentPiece is null', () => {
      const state = useGameState()
      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()
      expect(state.currentPiece.value).toBeNull()
    })

    it('ignores movement actions when game is over or won', () => {
      const state = useGameState()
      state.initGame([1])
      state.isGameOver.value = true

      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()

      expect(state.currentPiece.value?.x).toBe(5)
      expect(state.currentPiece.value?.y).toBe(0)

      state.isGameOver.value = false
      state.winGame()

      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()

      expect(state.currentPiece.value?.x).toBe(5)
      expect(state.currentPiece.value?.y).toBe(0)
    })
  })

  describe('Game Mechanics', () => {
    it('holds piece successfully', () => {
      const state = useGameState()
      state.initGame([1, 2])

      state.hold()

      expect(state.heldPieceName.value).toBe(tetrisEngine.PIECE_NAMES[1])
      expect(state.currentPiece.value?.pieceId).toBe(2)

      state.hold()
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })

    it('adds pieces to queue', () => {
      const state = useGameState()
      state.addPieces([9, 8])
      expect(state.nextPieceIds.value).toContain(9)
      expect(state.nextPieceIds.value).toContain(8)
    })

    it('updates score and level on line clears', () => {
      const state = useGameState()
      state.initGame([1, 2])
      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: [],
        linesCleared: 2,
      })
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)

      state.softDrop()

      expect(state.linesCount.value).toBe(2)
    })


    it('ignores penaltyLine when lines <= 0, game over, or game won', () => {
      const state = useGameState()
      state.initGame([1])
      const originalBoard = [...state.board.value]

      state.penaltyLine(0)
      state.penaltyLine(-2)
      expect(state.board.value).toEqual(originalBoard)

      state.isGameOver.value = true
      state.penaltyLine(1)
      expect(state.board.value).toEqual(originalBoard)

      state.isGameOver.value = false
      state.isWinner.value = true
      state.penaltyLine(1)
      expect(state.board.value).toEqual(originalBoard)
    })

    it('applies penalty lines correctly when valid', () => {
      const state = useGameState()
      state.initGame([1])
      const mockPenaltyBoard = Array(20).fill(Array(10).fill(8))
      vi.mocked(tetrisEngine.applyPenaltyLines).mockReturnValueOnce(mockPenaltyBoard)

      state.penaltyLine(2)

      expect(tetrisEngine.applyPenaltyLines).toHaveBeenCalledWith(expect.any(Array), 2)
      expect(state.board.value).toEqual(mockPenaltyBoard)
    })

    it('resyncs board from server payload', () => {
      const state = useGameState()
      const serverBoard = Array(20).fill(Array(10).fill(1))

      state.resyncBoard({
        board: serverBoard,
        pieceId: 3,
        penaltyCount: 4,
      })

      expect(state.board.value).toEqual(serverBoard)
      expect(tetrisEngine.spawnPiece).toHaveBeenCalledWith(3)
      expect(state.currentPiece.value?.pieceId).toBe(3)
    })

    it('triggers game over on spawn collision', () => {
      const state = useGameState()
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)

      state.initGame([1])

      expect(state.isGameOver.value).toBe(true)
    })

    it('wins game', () => {
      const state = useGameState()
      state.initGame([1])
      state.winGame()

      expect(state.isWinner.value).toBe(true)
    })

    it('does not win game if game over', () => {
      const state = useGameState()
      state.initGame([1])
      state.isGameOver.value = true

      state.winGame()
      expect(state.isWinner.value).toBe(false)
    })
  })

  describe('Gravity & Timers', () => {
    it('applies gravity over time', () => {
      const state = useGameState()
      state.initGame([1])

      expect(state.currentPiece.value?.y).toBe(0)

      vi.advanceTimersByTime(1000)
      expect(state.currentPiece.value?.y).toBe(1)

      vi.advanceTimersByTime(1000)
      expect(state.currentPiece.value?.y).toBe(2)
    })

    it('does not process gravity if currentPiece is null', () => {
      const state = useGameState()
      state.initGame([])

      vi.advanceTimersByTime(1000)

      expect(tetrisEngine.checkCollision).not.toHaveBeenCalled()
    })

    it('stops gravity on unmount', () => {
      const state = useGameState()
      state.initGame([1])

      state.stopGravity()
      vi.advanceTimersByTime(1000)

      expect(state.currentPiece.value?.y).toBe(0)
    })
  })

  describe('Gravity & Piece Locking (lockCurrentPiece)', () => {
    it('triggers lockCurrentPiece via gravity when a collision occurs below', () => {
      const state = useGameState()
      state.initGame([1, 2])

      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_board, _piece, _dx, dy) => {
        return dy === 1
      })

      // Lock delay: the first tick only flags the piece as landed, the second locks it.
      vi.advanceTimersByTime(1000)
      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
      vi.advanceTimersByTime(1000)

      expect(tetrisEngine.lockPiece).toHaveBeenCalledWith(
        state.board.value,
        expect.objectContaining({ pieceId: 1 }),
      )

      expect(socket.emit).toHaveBeenCalledWith('piece_locked', {
        "penaltyCount": 0,
        "pieceId": 1,
        "rotation": undefined,
        "x": 5,
        "y": 0,
      })

      expect(state.currentPiece.value?.pieceId).toBe(2)
    })

    it('triggers game over when board overflows upon piece lock', () => {
      const state = useGameState()
      state.initGame([1, 2])

      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValueOnce(true)
      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_b, _p, _dx, dy) => dy === 1)

      vi.advanceTimersByTime(2000)

      expect(state.isGameOver.value).toBe(true)
      expect(state.currentPiece.value).toBeNull()
    })

    it('updates board, lines cleared, and score when locking a piece', () => {
      const state = useGameState()
      state.initGame([1, 2])

      const fakeClearedBoard = Array(20).fill(Array(10).fill(0))
      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: fakeClearedBoard,
        linesCleared: 2,
      })

      vi.mocked(tetrisEngine.checkCollision).mockImplementation(
        (_board, _piece, _dx, dy) => dy === 1,
      )

      vi.advanceTimersByTime(2000)

      expect(state.board.value).toEqual(fakeClearedBoard)
      expect(state.linesCount.value).toBe(2)
      expect(socket.emit).toHaveBeenCalledWith('piece_locked', {
        penaltyCount: 0,
        pieceId: 1,
        rotation: undefined,
        x: 5,
        y: 0,
      })
    })

    it('exits early in lockCurrentPiece if currentPiece becomes null', () => {
      const state = useGameState()
      state.initGame([1, 2])

      vi.mocked(tetrisEngine.checkCollision).mockImplementationOnce(() => {
        state.currentPiece.value = null
        return true
      })

      state.softDrop()

      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
    })

    it('prevents gravity execution if game is over or won', () => {
      const state = useGameState()
      state.initGame([1, 2])

      state.winGame()

      vi.advanceTimersByTime(1000)

      expect(state.currentPiece.value?.y).toBe(0)
      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
    })
  })

  describe('Level Watcher & Dynamic Gravity Rates', () => {
    it('restarts gravity with a faster speed when level increases', async () => {
      const state = useGameState()
      state.initGame([1, 2, 3])

      expect(state.level.value).toBe(1)

      state.level.value = 2
      await nextTick()

      vi.advanceTimersByTime(890)
      expect(state.currentPiece.value?.y).toBe(0)

      vi.advanceTimersByTime(10)
      expect(state.currentPiece.value?.y).toBe(0)
    })

    it('does NOT restart gravity when level changes if game is over', async () => {
      const state = useGameState()
      state.initGame([1, 2])

      state.isGameOver.value = true
      state.stopGravity()

      state.level.value = 5
      await nextTick()

      vi.advanceTimersByTime(1000)

      expect(state.currentPiece.value?.y).toBe(0)
    })

    it('does NOT restart gravity when level changes if game is won', async () => {
      const state = useGameState()
      state.initGame([1, 2])

      state.winGame()

      state.level.value = 3
      await nextTick()

      vi.advanceTimersByTime(1000)

      expect(state.currentPiece.value?.y).toBe(0)
    })

    it('calculates level automatically from clearing lines and updates gravity', async () => {
      const state = useGameState()
      state.initGame([1, 2])

      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: Array(20).fill(Array(10).fill(0)),
        linesCleared: 10,
      })

      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_b, _p, _x, dy) => dy === 1)
      vi.advanceTimersByTime(2000)

      expect(state.linesCount.value).toBe(10)

      await nextTick()

      vi.advanceTimersByTime(900)
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })
  })

  describe('Rotation Wall Kicks', () => {
    beforeEach(() => {
      vi.mocked(tetrisEngine.checkCollision).mockReturnValue(false)
    })

    it('applies standard rotation when no collision occurs', () => {
      const state = useGameState()
      state.initGame([1])

      const fakeRotatedMatrix = [
        [0, 1],
        [0, 1],
      ]
      vi.mocked(tetrisEngine.getPieceMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(NaN)
      expect(state.currentPiece.value?.matrix).toEqual(fakeRotatedMatrix)
      expect(state.currentPiece.value?.x).toBe(5)
    })

    it('applies wall kick to the left (dx = -1) when standard rotation collides', () => {
      const state = useGameState()
      state.initGame([1])

      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.getPieceMatrix).mockReturnValueOnce(fakeRotatedMatrix)
      vi.mocked(tetrisEngine.checkCollision).mockImplementation(
        (_b, _p, dx) => dx === 0
        )

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(NaN)
      expect(state.currentPiece.value?.matrix).toEqual(fakeRotatedMatrix)
      expect(state.currentPiece.value?.x).toBe(4)
    })

    it('applies wall kick to the right (dx = 1) when dx = -1 fails', () => {
      const state = useGameState()
      state.initGame([1])

      const initialX = state.currentPiece.value!.x
      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.getPieceMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_b, _p, dx) => {
        return dx === 0 || dx === -1
      })

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(initialX + 1)
      expect(state.currentPiece.value?.matrix).toEqual(fakeRotatedMatrix)
    })

    it('applies wall kick for 2-tile offset (dx = 2)', () => {
      const state = useGameState()
      state.initGame([1])

      const initialX = state.currentPiece.value!.x
      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.getPieceMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_b, _p, dx) => dx !== 2)

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(initialX + 2)
      expect(state.currentPiece.value?.matrix).toEqual(fakeRotatedMatrix)
    })

    it('cancels rotation completely when dx = 0 and all kick offsets collide', () => {
      const state = useGameState()
      state.initGame([1])

      const initialX = state.currentPiece.value!.x
      const originalMatrix = state.currentPiece.value!.matrix

      vi.mocked(tetrisEngine.checkCollision).mockReturnValue(true)

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(initialX)
      expect(state.currentPiece.value?.matrix).toEqual(originalMatrix)
    })
  })

  describe('penaltyLine', () => {
    it('updates board.value and increments penaltyCount sent to server', () => {
      const state = useGameState()
      state.initGame([1, 2])

      const mockPenaltyBoard = Array(20).fill(Array(10).fill(0))
      vi.mocked(tetrisEngine.applyPenaltyLines).mockReturnValueOnce(mockPenaltyBoard)
      vi.mocked(tetrisEngine.checkCollision).mockReturnValue(false)

      state.penaltyLine(3)

      expect(state.board.value).toEqual(mockPenaltyBoard)

      state.hardDrop()
    })

    it('shifts currentPiece upwards (y - 1) repeatedly while checkCollision is true', () => {
      const state = useGameState()
      state.initGame([1])

      state.currentPiece.value!.y = 10

      let collisionCount = 0
      vi.mocked(tetrisEngine.checkCollision).mockImplementation(() => {
        collisionCount++
        return collisionCount <= 2
      })

      state.penaltyLine(2)

      expect(state.currentPiece.value?.y).toBe(8)
      expect(tetrisEngine.checkCollision).toHaveBeenCalledTimes(4)
    })

    it('should end game if overflowed', () => {
      const state = useGameState()
      state.initGame([1])

      vi.mocked(tetrisEngine.isBoardOverflowed).mockImplementationOnce(() => {
        return true
      })

      state.penaltyLine(2)

      expect(socket.emit).toHaveBeenCalledWith('penalty_game_over')

    })
  })

  describe('hold', () => {
    it('swaps currentPiece with heldPiece when hold slot is already occupied', () => {
      const state = useGameState()
      state.initGame([1, 2, 3, 4])

      state.hold()
      expect(state.currentPiece.value?.pieceId).toBe(2)
      expect(state.heldPieceName.value).toBe(tetrisEngine.PIECE_NAMES[1])

      state.hardDrop()
      expect(state.currentPiece.value?.pieceId).toBe(3)

      vi.mocked(tetrisEngine.spawnPiece).mockClear()

      state.hold()

      expect(tetrisEngine.spawnPiece).toHaveBeenCalledWith(1)
      expect(state.heldPieceName.value).toBe(tetrisEngine.PIECE_NAMES[3])
      expect(state.currentPiece.value?.pieceId).toBe(1)
    })
  })

  describe('resyncBoard', () => {
    it('sets currentPiece to null when pieceId is null in payload', () => {
      const state = useGameState()

      state.initGame([1])
      expect(state.currentPiece.value).not.toBeNull()

      vi.mocked(tetrisEngine.spawnPiece).mockClear()

      const mockBoard = Array(20).fill(Array(10).fill(0))
      state.resyncBoard({
        board: mockBoard,
        pieceId: null,
        penaltyCount: 2,
      })

      expect(tetrisEngine.spawnPiece).not.toHaveBeenCalled()
      expect(state.currentPiece.value).toBeNull()
    })
  })
})
