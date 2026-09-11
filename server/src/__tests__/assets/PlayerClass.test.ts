import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Socket } from 'socket.io'
import { Player } from '../../../assets/PlayerClass'
import { Game } from '../../../assets/GameClass'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as tetrisEngine from '../../../../shared/tetrisEngine'
import * as gamesManager from '../../../assets/gamesManager'

// Mock external modules
vi.mock('../../../assets/gamesManager', () => ({
  checkForWinner: vi.fn(),
}))

vi.mock('../../../../shared/tetrisEngine', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../../shared/tetrisEngine', { with: { 'resolution-mode': 'require' } })
    >()
  return {
    ...actual,
    isValidPlacement: vi.fn().mockReturnValue(true),
    lockPiece: vi.fn().mockReturnValue([[0]]),
    clearLines: vi.fn().mockReturnValue({ newBoard: [[0]], linesCleared: 0 }),
    isBoardOverflowed: vi.fn().mockReturnValue(false),
    checkCollision: vi.fn().mockReturnValue(false),
    getPieceMatrix: vi.fn().mockReturnValue([[1]]),
    spawnPiece: vi.fn().mockReturnValue([[1]]),
    applyPenaltyLines: vi.fn().mockReturnValue([[0]]),
  }
})

function createMockSocket(id: string) {
  return {
    id,
    emit: vi.fn(),
    leave: vi.fn(),
    broadcast: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
    nsp: {
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
    },
  } as unknown as Socket
}

function createMockGame(started = true, pieces: number[] | undefined[] = [1, 2, 3, 4, 5]) {
  return {
    started,
    pieces,
    ensurePieceSupply: vi.fn(),
    sendPenaltyToOpponents: vi.fn(),
  } as unknown as Game
}

describe('PlayerClass', () => {
  let game: Game
  let hostPlayer: Player
  let hostSocket: Socket
  const room = 'testRoom'

  beforeEach(() => {
    vi.clearAllMocks()
    hostSocket = createMockSocket('HostPlayer')
    game = createMockGame(true)
    hostPlayer = new Player('Host', hostSocket, room, 1)

    hostPlayer.takeNextPiece(hostSocket, game, room)
  })

  describe('handlePieceHeld', () => {
    it('should takeNextPiece for the first held', () => {
      const spy = vi.spyOn(hostPlayer, 'takeNextPiece')

      hostPlayer.handlePieceHeld(game, room)

      expect(spy).toHaveBeenCalled()
    })

    it('should not takeNextPiece for the first held', () => {
      hostPlayer.handlePieceHeld(game, room)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 2,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      const spy = vi.spyOn(hostPlayer, 'takeNextPiece')

      hostPlayer.handlePieceHeld(game, room)

      expect(spy).not.toHaveBeenCalled()
    })

    it('should return when currentPieceId is null', () => {
      game = createMockGame(true)
      hostPlayer = new Player('Host', hostSocket, room, 1)
      hostPlayer.handlePieceHeld(game, room)
    })
  })

  describe('Guard Condition', () => {
    it('should ignore lock request if game has not started', () => {
      game = createMockGame(false)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(tetrisEngine.isValidPlacement).not.toHaveBeenCalled()
    })

    it('should ignore lock request if player is game over', () => {
      hostPlayer.isGameOver = true
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(tetrisEngine.isValidPlacement).not.toHaveBeenCalled()
    })

  })

  describe('Invalid Placement', () => {
    it('should not place if pieceId does not match currentPieceId', () => {
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 9999,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(hostSocket.emit).toHaveBeenCalledWith('board_resync', expect.anything())
      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
    })

    it('should not place if rotation is not an int', () => {
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 1.5,
        penaltyCount: 0,
      })

      expect(hostSocket.emit).toHaveBeenCalledWith('board_resync', expect.anything())
      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
    })

    it('should not place if isValidPlacement is false', () => {
      vi.mocked(tetrisEngine.isValidPlacement).mockReturnValueOnce(false)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(hostSocket.emit).toHaveBeenCalledWith('board_resync', expect.anything())
      expect(tetrisEngine.lockPiece).not.toHaveBeenCalled()
    })

    it('should game over after 5 consecutive violations', () => {

      for (let i = 0; i < 5; i++) {
        vi.mocked(tetrisEngine.isValidPlacement).mockReturnValueOnce(false)
        hostPlayer.handlePieceLocked(game, room, {
          pieceId: 1,
          x: 0,
          y: 0,
          rotation: 0,
          penaltyCount: 0,
        })
      }

      expect(hostPlayer.isGameOver).toBe(true)

      expect(gamesManager.checkForWinner).toHaveBeenCalledWith(room)
    })
  })

  describe('Placement, Scoring / Penalities', () => {
    it('should lock piece, broadcast update, advance piece', () => {
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(tetrisEngine.lockPiece).toHaveBeenCalled()
      expect(tetrisEngine.clearLines).toHaveBeenCalled()
      expect(hostSocket.broadcast.to(room).emit).toHaveBeenCalledWith(
        'game_update',
        expect.objectContaining({
          name: 'Host',
          isGameOver: false,
        }),
      )
    })

    it('should send penality to opponents if lines clear', () => {
      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: [[0]],
        linesCleared: 3,
      })
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(game.sendPenaltyToOpponents).toHaveBeenCalledWith(hostPlayer, 2)
    })

    it('should syncPenalties', () => {
      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: [[0]],
        linesCleared: 3,
      })
      vi.spyOn(Math, 'min').mockReturnValue(10)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(tetrisEngine.applyPenaltyLines).toHaveBeenCalled()
    })

    it('should syncPenalties return if report is not integer', () => {
      vi.mocked(tetrisEngine.clearLines).mockReturnValueOnce({
        newBoard: [[0]],
        linesCleared: 3,
      })
      vi.spyOn(Number, 'isInteger').mockReturnValueOnce(false)
      vi.spyOn(Math, 'min').mockReturnValue(10)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(tetrisEngine.applyPenaltyLines).not.toHaveBeenCalled()
    })

    it('should gameOver if overflows after placement', () => {
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValueOnce(true)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(hostPlayer.isGameOver).toBe(true)
      expect(gamesManager.checkForWinner).toHaveBeenCalled()

    })

    it('should gameOver if overflows after sendPenaltyToOpponents', () => {
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValue(true)
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValueOnce(false)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(hostPlayer.isGameOver).toBe(true)
      expect(gamesManager.checkForWinner).toHaveBeenCalled()

    })

    describe('advanceToNextPiece', () => {
      it('should gameOver if spawnPiece Collide immediately', () => {
        vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)
        hostPlayer.handlePieceLocked(game, room, {
          pieceId: 1,
          x: 0,
          y: 0,
          rotation: 0,
          penaltyCount: 0,
        })

        expect(hostPlayer.isGameOver).toBe(true)
        expect(gamesManager.checkForWinner).toHaveBeenCalledWith(room)
      })
    })
    it('should set isGameOver to true when the next spawned piece collides (line 193)', () => {
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValue(false)
      vi.mocked(tetrisEngine.checkCollision).mockReturnValueOnce(true)
      expect(hostPlayer.isGameOver).toBe(false)
      hostPlayer.handlePieceLocked(game, room, {
        pieceId: 1,
        x: 0,
        y: 0,
        rotation: 0,
        penaltyCount: 0,
      })

      expect(hostPlayer.isGameOver).toBe(true)
      expect(tetrisEngine.checkCollision).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        0,
        0,
      )
    })

  })

  it('should takeNextPiece return when pieceId is undefined ', () => {
    game = createMockGame(true, [undefined, undefined])
    hostPlayer.takeNextPiece(hostSocket, game, room)

    expect(game.ensurePieceSupply).not.toHaveBeenCalled()
  })

  describe('handlePenaltyGameOver', () => {
    it('should cancel if pending is 0', () => {
      hostPlayer.handlePenaltyGameOver(game, room)

      expect(tetrisEngine.applyPenaltyLines).not.toHaveBeenCalled()
    })

    it('should applyPenaltyLines', () => {
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValue(true)
      hostPlayer.penaltiesSent = 10
      hostPlayer.handlePenaltyGameOver(game, room)

      expect(tetrisEngine.applyPenaltyLines).toHaveBeenCalled()
      expect(gamesManager.checkForWinner).toHaveBeenCalled()
    })

    it('should not check for winner if overflow', () => {
      vi.mocked(tetrisEngine.isBoardOverflowed).mockReturnValue(false)
      hostPlayer.penaltiesSent = 10
      hostPlayer.handlePenaltyGameOver(game, room)

      expect(tetrisEngine.applyPenaltyLines).toHaveBeenCalled()
      expect(gamesManager.checkForWinner).not.toHaveBeenCalled()
    })
  })
})
