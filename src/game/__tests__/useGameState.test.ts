import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope, nextTick, watch, type EffectScope } from 'vue'
import { socket } from '@/socket'
import * as shared from '../SharedData.ts'
import { useGameState, checkCollision, spawnPiece, lockPiece } from '../useGameState'

type Piece = Parameters<typeof lockPiece>[1]

vi.mock('@/socket', () => ({
  socket: { emit: vi.fn() },
}))


vi.mock('../SharedData.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../SharedData.ts')>()
  return {
    ...actual,
    clearLines: vi.fn(actual.clearLines),
    isBoardOverflowed: vi.fn(actual.isBoardOverflowed),
    getPieceMatrix: vi.fn(actual.getPieceMatrix),
  }
})


let scope: EffectScope | undefined

/** Runs the composable inside an effect scope so onScopeDispose / watch behave like in a component. */
function setup() {
  scope = effectScope()
  return scope.run(() => useGameState())!
}

const emptyBoard = () => shared.createEmptyBoard().map((row) => [...row])

/** Moves the current piece down to where it would land, without locking it. */
function placeOnStack(state: ReturnType<typeof useGameState>) {
  state.currentPiece.value = {
    ...state.currentPiece.value!,
    y: state.ghostPieceY.value,
  }
}

const snapshot = (state: ReturnType<typeof useGameState>) =>
  JSON.parse(
    JSON.stringify({
      piece: state.currentPiece.value,
      board: state.board.value,
      score: state.score.value,
    }),
  )

describe('useGameState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    scope?.stop()
    scope = undefined
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  describe('Initialization', () => {
    it('sets correct initial state on initGame', () => {
      const state = setup()
      state.initGame([4, 2, 3, 4, 5])

      expect(state.score.value).toBe(0)
      expect(state.level.value).toBe(1)
      expect(state.linesCount.value).toBe(0)
      expect(state.isGameOver.value).toBe(false)
      expect(state.isWinner.value).toBe(false)
      expect(state.board.value).toEqual(emptyBoard())
      expect(state.currentPiece.value).toMatchObject({ pieceId: 4, rotation: 0, y: 0 })
      expect(state.currentPiece.value?.matrix).toEqual(shared.getPieceMatrix(4, 0))
      expect(state.nextPieceIds.value).toEqual([2, 3, 4, 5])
    })

    it('handles an empty piece queue gracefully on init', () => {
      const state = setup()
      state.initGame([])
      expect(state.currentPiece.value).toBeNull()
    })

    it('resets a finished game when initGame is called again', () => {
      const state = setup()
      state.initGame([1, 2])
      state.winGame()
      expect(state.isWinner.value).toBe(true)

      state.initGame([3, 4])
      expect(state.isWinner.value).toBe(false)
      expect(state.currentPiece.value?.pieceId).toBe(3)
    })
  })

  describe('Computed properties', () => {
    it('returns 0 for ghostPieceY when currentPiece is null', () => {
      const state = setup()
      expect(state.ghostPieceY.value).toBe(0)
    })

    it('returns null for heldPieceName when nothing is held', () => {
      const state = setup()
      expect(state.heldPieceName.value).toBeNull()
    })

    it('puts the ghost at or below the current piece without colliding', () => {
      const state = setup()
      state.initGame([1, 2])

      const piece = state.currentPiece.value!
      const ghostY = state.ghostPieceY.value

      expect(ghostY).toBeGreaterThanOrEqual(piece.y)
      expect(checkCollision(state.board.value, { ...piece, y: ghostY }, 0, 0)).toBe(false)
      expect(checkCollision(state.board.value, { ...piece, y: ghostY }, 0, 1)).toBe(true)
    })
  })

  describe('Movement & actions', () => {
    it('moves left by one column when there is room', () => {
      const state = setup()
      state.initGame([1, 2])
      const x = state.currentPiece.value!.x

      state.moveLeft()

      expect(state.currentPiece.value?.x).toBe(x - 1)
    })

    it('moves right by one column when there is room', () => {
      const state = setup()
      state.initGame([1, 2])
      const x = state.currentPiece.value!.x

      state.moveRight()

      expect(state.currentPiece.value?.x).toBe(x + 1)
    })

    it('stops at the left wall', () => {
      const state = setup()
      state.initGame([1, 2])

      for (let i = 0; i < 15; i++) state.moveLeft()
      const x = state.currentPiece.value!.x

      expect(checkCollision(state.board.value, state.currentPiece.value!, -1, 0)).toBe(true)
      state.moveLeft()
      expect(state.currentPiece.value?.x).toBe(x)
    })

    it('stops at the right wall', () => {
      const state = setup()
      state.initGame([1, 2])

      for (let i = 0; i < 15; i++) state.moveRight()
      const x = state.currentPiece.value!.x

      expect(checkCollision(state.board.value, state.currentPiece.value!, 1, 0)).toBe(true)
      state.moveRight()
      expect(state.currentPiece.value?.x).toBe(x)
    })

    it('is blocked by pieces already on the board', () => {
      const state = setup()
      state.initGame([1, 2])
      const piece = state.currentPiece.value!

      const board = emptyBoard()
      for (let y = piece.y; y < piece.y + piece.matrix.length; y++) {
        for (let x = 0; x < piece.x; x++) board[y]![x] = 1
      }
      state.board.value = board

      const before = state.currentPiece.value!.x
      state.moveLeft()
      const blocked = checkCollision(board, piece, -1, 0)
      expect(state.currentPiece.value?.x).toBe(blocked ? before : before - 1)
    })

    it('soft drop moves down one row and adds one point', () => {
      const state = setup()
      state.initGame([1, 2])

      state.softDrop()

      expect(state.currentPiece.value?.y).toBe(1)
      expect(state.score.value).toBe(1)
    })

    it('soft drop on the stack locks the piece and spawns the next one', () => {
      const state = setup()
      state.initGame([1, 2])
      placeOnStack(state)

      state.softDrop()

      expect(socket.emit).toHaveBeenCalledWith(
        'piece_locked',
        expect.objectContaining({ pieceId: 1, penaltyCount: 0 }),
      )
      expect(state.currentPiece.value?.pieceId).toBe(2)
      expect(state.board.value.flat().some((cell) => cell !== 0)).toBe(true)
    })

    it('hard drop scores 2 points per row, locks and spawns the next piece', () => {
      const state = setup()
      state.initGame([1, 2])
      const ghostY = state.ghostPieceY.value

      state.hardDrop()

      expect(state.score.value).toBe(ghostY * 2)
      expect(socket.emit).toHaveBeenCalledWith('piece_locked', {
        pieceId: 1,
        x: expect.any(Number),
        y: ghostY,
        rotation: 0,
        penaltyCount: 0,
      })
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })

    it('ignores every action when currentPiece is null', () => {
      const state = setup()

      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()

      expect(state.currentPiece.value).toBeNull()
      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('ignores every action when the game is over', () => {
      const state = setup()
      state.initGame([1, 2])
      state.isGameOver.value = true
      const before = snapshot(state)

      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()

      expect(snapshot(state)).toEqual(before)
      expect(socket.emit).not.toHaveBeenCalled()
    })

    it('ignores every action once the game is won', () => {
      const state = setup()
      state.initGame([1, 2])
      state.winGame()
      const before = snapshot(state)

      state.moveLeft()
      state.moveRight()
      state.softDrop()
      state.rotate()
      state.hardDrop()
      state.hold()

      expect(snapshot(state)).toEqual(before)
      expect(socket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Game mechanics', () => {
    it('adds pieces to the queue', () => {
      const state = setup()
      state.addPieces([9, 8])
      expect(state.nextPieceIds.value).toEqual([9, 8])
    })

    it('wins the game and freezes gravity', () => {
      const state = setup()
      state.initGame([1, 2])

      state.winGame()

      expect(state.isWinner.value).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not win if the game is already over', () => {
      const state = setup()
      state.initGame([1, 2])
      state.isGameOver.value = true

      state.winGame()

      expect(state.isWinner.value).toBe(false)
    })

    it('ends the game when the stack reaches the top', () => {
      const state = setup()
      state.initGame([1, 2])

      const board = emptyBoard()
      for (let y = 0; y < 6; y++) {
        for (let x = 3; x <= 6; x++) board[y]![x] = 1
      }
      state.board.value = board

      state.hardDrop()

      expect(state.isGameOver.value).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('ends the game when the next piece cannot spawn (spawnNextPiece collision)', () => {
      const state = setup()
      state.initGame([1, 2])

      const board = emptyBoard()
      for (let y = 0; y < 6; y++) {
        for (let x = 3; x <= 6; x++) board[y]![x] = 1
      }
      state.board.value = board

      vi.mocked(shared.isBoardOverflowed).mockReturnValueOnce(false)

      state.hardDrop()

      expect(shared.isBoardOverflowed).toHaveBeenCalled()
      expect(state.isGameOver.value).toBe(true)
      expect(vi.getTimerCount()).toBe(0)
    })

    it('reports the board overflowing when a piece locks too high', () => {
      const state = setup()
      state.initGame([1, 2])

      vi.mocked(shared.isBoardOverflowed).mockReturnValueOnce(true)
      placeOnStack(state)
      state.softDrop()

      expect(state.isGameOver.value).toBe(true)
      expect(state.currentPiece.value).toBeNull()
    })
  })

  describe('Line clears, score and level', () => {
    it('updates lines, score and level from the cleared lines', () => {
      const state = setup()
      state.initGame([1, 2])
      const fakeBoard = emptyBoard()
      vi.mocked(shared.clearLines).mockReturnValueOnce({
        newBoard: fakeBoard,
        linesCleared: 2,
      })
      const dropPoints = state.ghostPieceY.value * 2

      state.hardDrop()

      expect(state.board.value).toEqual(fakeBoard)
      expect(state.linesCount.value).toBe(2)
      expect(state.score.value).toBe(dropPoints + shared.scoreForLines(2, 1))
      expect(state.level.value).toBe(shared.levelForLines(2))
    })

    it('derives the level from the total number of lines', () => {
      const state = setup()
      state.initGame([1, 2])
      vi.mocked(shared.clearLines).mockReturnValueOnce({
        newBoard: emptyBoard(),
        linesCleared: 10,
      })

      state.hardDrop()

      expect(state.linesCount.value).toBe(10)
      expect(state.level.value).toBe(shared.levelForLines(10))
    })
  })

  describe('Hold', () => {
    it('holds the current piece and brings in the next one', () => {
      const state = setup()
      state.initGame([1, 2, 3])

      state.hold()

      expect(state.heldPieceName.value).toBe(shared.PIECE_NAMES[1])
      expect(state.currentPiece.value?.pieceId).toBe(2)
      expect(socket.emit).toHaveBeenCalledWith('piece_held')
    })

    it('allows only one hold per piece', () => {
      const state = setup()
      state.initGame([1, 2, 3])

      state.hold()
      state.hold()

      expect(state.currentPiece.value?.pieceId).toBe(2)
      expect(state.heldPieceName.value).toBe(shared.PIECE_NAMES[1])
      expect(socket.emit).toHaveBeenCalledTimes(1)
    })

    it('swaps with the held piece once the next piece has spawned', () => {
      const state = setup()
      state.initGame([1, 2, 3, 4])

      state.hold()
      state.hardDrop()
      expect(state.currentPiece.value?.pieceId).toBe(3)

      state.hold()
      expect(state.currentPiece.value?.pieceId).toBe(1)
      expect(state.heldPieceName.value).toBe(shared.PIECE_NAMES[3])
    })
  })

  describe('Rotation & wall kicks', () => {
    const rotatingId = [1, 2, 3, 4, 5, 6].find(
      (id) =>
        JSON.stringify(shared.getPieceMatrix(id, 0)) !==
        JSON.stringify(shared.getPieceMatrix(id, 1)),
    )!

    it('rotates when there is room', () => {
      const state = setup()
      state.initGame([rotatingId, 1])

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(1)
      expect(state.currentPiece.value?.matrix).toEqual(shared.getPieceMatrix(rotatingId, 1))
    })

    it('wraps back to rotation 0 after a full turn', () => {
      const state = setup()
      state.initGame([rotatingId, 1])

      for (let i = 0; i < shared.ROTATIONS; i++) state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(0)
      expect(state.currentPiece.value?.matrix).toEqual(shared.getPieceMatrix(rotatingId, 0))
    })

    it('kicks away from the left wall and never ends up inside it', () => {
      const state = setup()
      state.initGame([rotatingId, 1])
      for (let i = 0; i < 15; i++) state.moveLeft()

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(1)
      expect(checkCollision(state.board.value, state.currentPiece.value!, 0, 0)).toBe(false)
    })

    it('kicks away from the right wall and never ends up inside it', () => {
      const state = setup()
      state.initGame([rotatingId, 1])
      for (let i = 0; i < 15; i++) state.moveRight()

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(1)
      expect(checkCollision(state.board.value, state.currentPiece.value!, 0, 0)).toBe(false)
    })

    it('applies a wall kick of dx = -1 when the plain rotation collides', () => {
      const state = setup()
      state.initGame([rotatingId, 1])
      const piece = state.currentPiece.value!
      const rotated = shared.getPieceMatrix(rotatingId, 1)

      const row = rotated.findIndex((r) => r.some((cell) => cell !== 0))
      const col = rotated[row]!.map((cell) => cell !== 0).lastIndexOf(true)
      const board = emptyBoard()
      board[piece.y + row]![piece.x + col] = 1
      state.board.value = board

      expect(checkCollision(board, piece, 0, 0, rotated)).toBe(true)
      expect(checkCollision(board, piece, -1, 0, rotated)).toBe(false)

      state.rotate()

      expect(state.currentPiece.value?.x).toBe(piece.x - 1)
      expect(state.currentPiece.value?.rotation).toBe(1)
      expect(state.currentPiece.value?.matrix).toEqual(rotated)
    })

    it('cancels the rotation when every kick collides', () => {
      const state = setup()
      state.initGame([rotatingId, 1])
      const piece = state.currentPiece.value!

      const board = emptyBoard().map((row) => row.map(() => 1))
      for (const [y, row] of piece.matrix.entries()) {
        for (const [x, cell] of row.entries()) {
          if (cell !== 0) board[piece.y + y]![piece.x + x] = 0
        }
      }
      state.board.value = board

      state.rotate()

      expect(state.currentPiece.value?.rotation).toBe(0)
      expect(state.currentPiece.value?.x).toBe(piece.x)
      expect(state.currentPiece.value?.matrix).toEqual(piece.matrix)
    })
  })

  describe('Gravity & timers', () => {
    it('moves the piece down one row per second at level 1', () => {
      const state = setup()
      state.initGame([1, 2])
      expect(state.currentPiece.value?.y).toBe(0)

      vi.advanceTimersByTime(1000)
      expect(state.currentPiece.value?.y).toBe(1)

      vi.advanceTimersByTime(1000)
      expect(state.currentPiece.value?.y).toBe(2)
    })

    it('does nothing on a tick when there is no current piece', () => {
      const state = setup()
      state.initGame([])

      expect(() => vi.advanceTimersByTime(3000)).not.toThrow()
      expect(state.currentPiece.value).toBeNull()
    })

    it('stops gravity when stopGravity is called', () => {
      const state = setup()
      state.initGame([1, 2])

      state.stopGravity()
      vi.advanceTimersByTime(5000)

      expect(state.currentPiece.value?.y).toBe(0)
    })

    it('stops gravity when the scope is disposed', () => {
      const state = setup()
      state.initGame([1, 2])
      expect(vi.getTimerCount()).toBe(1)

      scope!.stop()

      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not move pieces once the game is won', () => {
      const state = setup()
      state.initGame([1, 2])

      state.winGame()
      vi.advanceTimersByTime(5000)

      expect(state.currentPiece.value?.y).toBe(0)
    })
  })

  describe('Lock delay', () => {
    it('flags the piece as landed on the first tick and locks it on the second', () => {
      const state = setup()
      state.initGame([1, 2])
      placeOnStack(state)

      vi.advanceTimersByTime(1000)
      expect(socket.emit).not.toHaveBeenCalled()
      expect(state.currentPiece.value?.pieceId).toBe(1)

      vi.advanceTimersByTime(1000)
      expect(socket.emit).toHaveBeenCalledWith(
        'piece_locked',
        expect.objectContaining({ pieceId: 1, rotation: 0, penaltyCount: 0 }),
      )
      expect(state.currentPiece.value?.pieceId).toBe(2)
    })

    it('resets the delay if the piece can fall again before the lock tick', () => {
      const state = setup()
      state.initGame([1, 2])
      placeOnStack(state)

      vi.advanceTimersByTime(1000)
      state.currentPiece.value = {
        ...state.currentPiece.value!,
        y: state.currentPiece.value!.y - 1,
      }
      vi.advanceTimersByTime(1000)

      expect(socket.emit).not.toHaveBeenCalled()
    })
  })

  describe('Level watcher & dynamic gravity', () => {
    it('restarts gravity at the faster delay when the level increases', async () => {
      const state = setup()
      state.initGame([1, 2])

      state.level.value = 2
      await nextTick()

      vi.advanceTimersByTime(899)
      expect(state.currentPiece.value?.y).toBe(0)

      vi.advanceTimersByTime(1)
      expect(state.currentPiece.value?.y).toBe(1)
    })

    it('never goes below the minimum delay of 100 ms', async () => {
      const state = setup()
      state.initGame([1, 2])

      state.level.value = 50
      await nextTick()

      vi.advanceTimersByTime(99)
      expect(state.currentPiece.value?.y).toBe(0)

      vi.advanceTimersByTime(1)
      expect(state.currentPiece.value?.y).toBe(1)
    })

    it('does not restart gravity on a level change when the game is over', async () => {
      const state = setup()
      state.initGame([1, 2])
      state.isGameOver.value = true
      state.stopGravity()

      state.level.value = 5
      await nextTick()

      expect(vi.getTimerCount()).toBe(0)
    })

    it('does not restart gravity on a level change when the game is won', async () => {
      const state = setup()
      state.initGame([1, 2])
      state.winGame()

      state.level.value = 3
      await nextTick()

      expect(vi.getTimerCount()).toBe(0)
    })
  })

  describe('penaltyLine', () => {
    it('ignores lines <= 0', () => {
      const state = setup()
      state.initGame([1, 2])
      const before = snapshot(state)

      state.penaltyLine(0)
      state.penaltyLine(-2)

      expect(snapshot(state)).toEqual(before)
    })

    it('ignores penalties when the game is over or won', () => {
      const state = setup()
      state.initGame([1, 2])
      const before = snapshot(state)

      state.isGameOver.value = true
      state.penaltyLine(1)
      expect(snapshot(state)).toEqual(before)

      state.isGameOver.value = false
      state.isWinner.value = true
      state.penaltyLine(1)
      expect(snapshot(state)).toEqual(before)
    })

    it('adds penalty rows at the bottom of the board', () => {
      const state = setup()
      state.initGame([1, 2])

      state.penaltyLine(2)

      const rows = state.board.value
      expect(rows.at(-1)?.some((cell) => cell !== 0)).toBe(true)
      expect(rows.at(-2)?.some((cell) => cell !== 0)).toBe(true)
      expect(shared.applyPenaltyLines).toBeDefined()
    })

    it('pushes the piece up when the new rows would overlap it', () => {
      const state = setup()
      state.initGame([1, 2])
      placeOnStack(state)
      const yBefore = state.currentPiece.value!.y

      state.penaltyLine(2)

      expect(state.currentPiece.value!.y).toBeLessThan(yBefore)
      expect(checkCollision(state.board.value, state.currentPiece.value!, 0, 0)).toBe(false)
    })

    it('reports the absorbed penalties with the next placement', () => {
      const state = setup()
      state.initGame([1, 2])

      state.penaltyLine(3)
      state.hardDrop()

      expect(socket.emit).toHaveBeenCalledWith(
        'piece_locked',
        expect.objectContaining({ penaltyCount: 3 }),
      )
    })

    it('ends the game and tells the server when the board overflows', () => {
      const state = setup()
      state.initGame([1, 2])

      state.penaltyLine(shared.TOTAL_ROWS)

      expect(socket.emit).toHaveBeenCalledWith('penalty_game_over')
      expect(state.isGameOver.value).toBe(true)
      expect(state.currentPiece.value).toBeNull()
    })
  })

  describe('resyncBoard', () => {
    it('adopts the server board, piece and penalty count', () => {
      const state = setup()
      state.initGame([1, 2])

      const serverBoard = emptyBoard()
      serverBoard[serverBoard.length - 1]![0] = 1

      state.resyncBoard({ board: serverBoard, pieceId: 3, penaltyCount: 4 })

      expect(state.board.value).toEqual(serverBoard)
      expect(state.board.value).not.toBe(serverBoard)
      expect(state.currentPiece.value?.pieceId).toBe(3)
      expect(state.currentPiece.value?.y).toBe(0)

      state.hardDrop()
      expect(socket.emit).toHaveBeenCalledWith(
        'piece_locked',
        expect.objectContaining({ pieceId: 3, penaltyCount: 4 }),
      )
    })

    it('sets currentPiece to null when pieceId is null', () => {
      const state = setup()
      state.initGame([1, 2])
      expect(state.currentPiece.value).not.toBeNull()

      state.resyncBoard({ board: emptyBoard(), pieceId: null, penaltyCount: 2 })

      expect(state.currentPiece.value).toBeNull()
    })
  })

  describe('spawnPiece (exported helper)', () => {
    it('centers the piece using the width of its matrix', () => {
      const piece = spawnPiece(1)
      const width = piece.matrix[0]!.length

      expect(piece.x).toBe(Math.floor(shared.COLS / 2) - Math.floor(width / 2))
      expect(piece.y).toBe(0)
      expect(piece.rotation).toBe(0)
    })

    it('falls back to a width of 0 when the matrix is empty', () => {
      vi.mocked(shared.getPieceMatrix).mockReturnValueOnce([])

      const piece = spawnPiece(1)

      expect(piece.matrix).toEqual([])
      expect(piece.x).toBe(Math.floor(shared.COLS / 2))
    })
  })

  describe('lockPiece (exported helper)', () => {
    const vertical = (y: number): Piece => ({
      pieceId: 1,
      x: 0,
      y,
      rotation: 0,
      matrix: [[1], [1]],
    })

    it('writes every cell of a piece that is fully inside the board', () => {
      const board = emptyBoard()

      const result = lockPiece(board, vertical(5))

      expect(result[5]![0]).toBe(1)
      expect(result[6]![0]).toBe(1)
      expect(board[5]![0]).toBe(0)
    })

    it('skips cells above the board (boardY < 0)', () => {
      const result = lockPiece(emptyBoard(), vertical(-1))

      expect(result[0]![0]).toBe(1)
      expect(result.flat().filter((cell) => cell !== 0)).toHaveLength(1)
    })

    it('skips cells below the board (boardY >= TOTAL_ROWS)', () => {
      const board = emptyBoard()

      const result = lockPiece(board, vertical(shared.TOTAL_ROWS - 1))

      expect(result[shared.TOTAL_ROWS - 1]![0]).toBe(1)
      expect(result.flat().filter((cell) => cell !== 0)).toHaveLength(1)
      expect(result).toHaveLength(board.length)
    })
  })

  describe('lockCurrentPiece guard', () => {
    it('does nothing if the piece is gone by the time it is locked', () => {
      const state = setup()
      state.initGame([1, 2])
      const ghostY = state.ghostPieceY.value

      scope!.run(() =>
        watch(
          state.currentPiece,
          (piece) => {
            if (piece && piece.y === ghostY) state.currentPiece.value = null
          },
          { flush: 'sync' },
        ),
      )

      state.hardDrop()

      expect(socket.emit).not.toHaveBeenCalled()
      expect(state.currentPiece.value).toBeNull()
      expect(state.board.value.flat().every((cell) => cell === 0)).toBe(true)
    })
  })
})
