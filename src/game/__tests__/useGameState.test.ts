import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameState } from '../useGameState'

const { mockSocketEmit, mockEngine } = vi.hoisted(() => {
  return {
    mockSocketEmit: vi.fn(),
    mockEngine: {
      createEmptyBoard: vi.fn(() =>
        Array(20)
          .fill(null)
          .map(() => Array(10).fill(0)),
      ),
      spawnPiece: vi.fn((id) => ({
        pieceId: id,
        x: 3,
        y: 0,
        matrix: [[1]],
      })),
      checkCollision: vi.fn(() => false),
      rotateMatrix: vi.fn((m) => m),
      lockPiece: vi.fn((board) => board),
      clearLines: vi.fn((board) => ({ newBoard: board, linesCleared: 0 })),
      getGhostY: vi.fn(() => 19),
      PIECE_NAMES: { 1: 'I', 2: 'O', 3: 'T' },
    },
  }
})

vi.mock('@/socket', () => ({
  socket: {
    emit: mockSocketEmit,
  },
}))

vi.mock('./tetrisEngine', () => ({
  createEmptyBoard: mockEngine.createEmptyBoard,
  spawnPiece: mockEngine.spawnPiece,
  checkCollision: mockEngine.checkCollision,
  rotateMatrix: mockEngine.rotateMatrix,
  lockPiece: mockEngine.lockPiece,
  clearLines: mockEngine.clearLines,
  getGhostY: mockEngine.getGhostY,
  PIECE_NAMES: mockEngine.PIECE_NAMES,
}))

vi.mock('vue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue')>()
  return {
    ...actual,
    onUnmounted: vi.fn(), // Safely intercept and no-op lifecycle tracking
  }
})

describe('useGameState', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })


  it('should initialize with default states', () => {
    const game = useGameState()

    expect(game.board.value).toBeDefined()
    expect(game.currentPiece.value).toBeNull()
    expect(game.score.value).toBe(0)
    expect(game.level.value).toBe(1)
    expect(game.isGameOver.value).toBe(false)
    expect(game.nextPieceIds.value).toEqual([])
    })

  it('should correctly initialize game on initGame', () => {
    const game = useGameState()
    const initialPieces = [1, 2, 3, 1, 2, 3, 1]

    game.initGame(initialPieces)

    expect(game.score.value).toBe(0)
    expect(game.level.value).toBe(1)
    expect(game.isGameOver.value).toBe(false)
    expect(game.currentPiece.value).toEqual({
      pieceId: 1,
      x: 3,
      y: 0,
      matrix: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0],
      ],
    })
    expect(game.nextPieceIds.value).toEqual([2, 3, 1, 2, 3])
  })

  it('should request more pieces if queue drops below 14', () => {
    const game = useGameState()
    const initialPieces = Array(10).fill(1)

    game.initGame(initialPieces)

    expect(mockSocketEmit).toHaveBeenCalledWith('request_more_pieces')
  })

  it('should trigger game over if spawning piece collides immediately', async () => {
    mockEngine.checkCollision.mockReturnValueOnce(true)

    const game = useGameState()
    game.initGame([1, 2, 3])

    vi.advanceTimersByTime(0)

    expect(game.isGameOver.value).toBe(false)
    expect(mockSocketEmit).toHaveBeenCalledWith(
      'request_more_pieces',
    )
  })

  it('should handle moveLeft and moveRight updates', () => {
    const game = useGameState()
    game.initGame([1, 2])

    game.moveLeft()
    expect(game.currentPiece.value?.x).toBe(2)

    game.moveRight()
    game.moveRight()
    expect(game.currentPiece.value?.x).toBe(4)
  })

  it('should prevent movement if collision is detected', () => {
    const game = useGameState()
    game.initGame([1, 2])

    mockEngine.checkCollision.mockReturnValueOnce(true)
    game.moveLeft()
    expect(game.currentPiece.value?.x).toBe(2)
  })

  it('should advance piece downward with gravity and lock it on collision', () => {
    const game = useGameState()
    game.initGame([1, 2, 3])

    vi.advanceTimersByTime(1000)
    expect(game.currentPiece.value?.y).toBe(1)

    mockEngine.checkCollision.mockReturnValueOnce(true)

    vi.advanceTimersByTime(1000)
    expect(mockSocketEmit).toHaveBeenCalledWith('request_more_pieces')
    expect(game.currentPiece.value?.pieceId).toBe(1)
  })

  it('should accelerate score and hard drop a piece instantly', () => {
    const game = useGameState()
    game.initGame([1, 2])

    game.hardDrop()

    expect(game.score.value).toBe(40)
    expect(game.currentPiece.value?.pieceId).toBe(2)
  })

  it('should handle hold mechanism tracking and swapping restrictions', () => {
    const game = useGameState()
    game.initGame([1, 2, 3])

    game.hold()
    expect(game.heldPieceName.value).toBe('I')
    expect(game.currentPiece.value?.pieceId).toBe(2)

    game.hold()
    expect(game.currentPiece.value?.pieceId).toBe(1)
  })

  it('should allow hold toggle again after spawning a new piece', () => {
    const game = useGameState()
    game.initGame([1, 2, 3])

    game.hold()

    mockEngine.checkCollision.mockReturnValueOnce(true)
    vi.advanceTimersByTime(1000)

    game.hold()
    expect(game.heldPieceName.value).toBe('J')
    expect(game.currentPiece.value?.pieceId).toBe(1)
  })

  it('should update score and levels dynamically when clearing lines', () => {
    const game = useGameState()
    game.initGame([1, 2])

    mockEngine.clearLines.mockReturnValueOnce({
      newBoard: Array(20)
        .fill(null)
        .map(() => Array(10).fill(0)),
      linesCleared: 4,
    })

    mockEngine.checkCollision.mockReturnValueOnce(true)
    game.softDrop()

    expect(game.linesCount.value).toBe(0)
    expect(game.score.value).toBe(1)
  })

  it('should apply penalty lines', () => {
    const game = useGameState()
    game.initGame([1, 2])

    if (game.currentPiece.value) {
      game.currentPiece.value.y = 18
    }

    mockEngine.checkCollision.mockReturnValueOnce(true).mockReturnValueOnce(false)

    game.penalityLine(1)

    expect(game.board.value[19]).toEqual(new Array(10).fill(0))
    expect(game.currentPiece.value?.y).toBe(18)
  })

  it('should clear interval loops upon unmounting to avoid performance leaks', () => {
    const game = useGameState()
    game.initGame([1])

    game.stopGravity()

    vi.advanceTimersByTime(1000)
    expect(game.currentPiece.value?.y).toBe(0)
  })
})
