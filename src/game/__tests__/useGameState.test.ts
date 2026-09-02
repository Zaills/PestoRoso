import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { socket } from '@/socket'
import * as tetrisEngine from '../tetrisEngine'
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
  rotateMatrix: vi.fn((m) => m),
  lockPiece: vi.fn((board) => board),
  clearLines: vi.fn((board) => ({ newBoard: board, linesCleared: 0 })),
  getGhostY: vi.fn(() => 18),
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

    it('requests more pieces if queue is less than 14', () => {
      const state = useGameState()
      state.initGame([1, 2])
      expect(socket.emit).toHaveBeenCalledWith('request_more_pieces')
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
      expect(socket.emit).toHaveBeenCalledWith('board_update', expect.any(Object))
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

    it('rotates matrix if no collision', () => {
      const state = useGameState()
      state.initGame([1])
      const fakeRotatedMatrix = [
        [2, 2],
        [2, 2],
      ]
      vi.mocked(tetrisEngine.rotateMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      state.rotate()
      expect(state.currentPiece.value?.matrix).toStrictEqual(fakeRotatedMatrix)
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
      expect(state.currentPiece.value?.pieceId).toBe(1)
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

      expect(state.score.value).toBe(300)
      expect(state.linesCount.value).toBe(2)
    })

    it('applies penalty lines and shifts current piece up if colliding', () => {
      const state = useGameState()
      state.initGame([1])

      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true).mockReturnValueOnce(false)

      state.penalityLine(1)

      expect(state.currentPiece.value?.y).toBe(-1)
      expect(state.board.value.length).toBe(20)
      expect(state.board.value[19]).toEqual(Array(10).fill(8))
    })

    it('ignores penalityLine when lines <= 0, game over, or game won', () => {
      const state = useGameState()
      state.initGame([1])
      const originalBoard = [...state.board.value]

      state.penalityLine(0)
      state.penalityLine(-2)
      expect(state.board.value).toEqual(originalBoard)

      state.isGameOver.value = true
      state.penalityLine(1)
      expect(state.board.value).toEqual(originalBoard)

      state.isGameOver.value = false
      state.isWinner.value = true
      state.penalityLine(1)
      expect(state.board.value).toEqual(originalBoard)
    })

    it('triggers game over on spawn collision', () => {
      const state = useGameState()
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)

      state.initGame([1])

      expect(state.isGameOver.value).toBe(true)
      expect(socket.emit).toHaveBeenCalledWith(
        'board_update',
        expect.objectContaining({
          isGameOver: true,
        }),
      )
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

      vi.advanceTimersByTime(1000)

      expect(tetrisEngine.lockPiece).toHaveBeenCalledWith(
        state.board.value,
        expect.objectContaining({ pieceId: 1 }),
      )

      expect(socket.emit).toHaveBeenCalledWith('board_update', {
        board: state.board.value,
        score: 0,
        isGameOver: false,
      })

      expect(state.currentPiece.value?.pieceId).toBe(2)
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

      vi.advanceTimersByTime(1000)

      expect(state.board.value).toEqual(fakeClearedBoard)
      expect(state.linesCount.value).toBe(2)
      expect(state.score.value).toBe(300)
      expect(socket.emit).toHaveBeenCalledWith('board_update', {
        board: fakeClearedBoard,
        score: 300,
        isGameOver: false,
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
      vi.advanceTimersByTime(1000)

      expect(state.linesCount.value).toBe(10)
      expect(state.level.value).toBe(2)

      await nextTick()

      vi.advanceTimersByTime(900)
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })
  })

  describe('Rotation Wall Kicks', () => {
    beforeEach(() => {
      vi.mocked(tetrisEngine.checkCollision).mockReturnValue(false)
    })

    it('applies wall kick to the left (dx = -1) when standard rotation collides', () => {
      const state = useGameState()
      state.initGame([1])

      const initialX = state.currentPiece.value!.x
      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.rotateMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      vi.mocked(tetrisEngine.checkCollision).mockImplementation((_b, _p, dx) => dx === 0)

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(initialX - 1)
      expect(state.currentPiece.value?.matrix).toEqual(fakeRotatedMatrix)
    })

    it('applies wall kick to the right (dx = 1) when dx = -1 fails', () => {
      const state = useGameState()
      state.initGame([1])

      const initialX = state.currentPiece.value!.x
      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.rotateMatrix).mockReturnValueOnce(fakeRotatedMatrix)

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
      vi.mocked(tetrisEngine.rotateMatrix).mockReturnValueOnce(fakeRotatedMatrix)

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
      const fakeRotatedMatrix = [
        [1, 0],
        [1, 0],
      ]
      vi.mocked(tetrisEngine.rotateMatrix).mockReturnValueOnce(fakeRotatedMatrix)

      vi.mocked(tetrisEngine.checkCollision).mockReturnValue(true)

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(initialX)
      expect(state.currentPiece.value?.matrix).toEqual(originalMatrix)
    })
  })
})
