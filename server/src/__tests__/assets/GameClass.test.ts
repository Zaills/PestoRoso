import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Game } from '../../../assets/GameClass'
import { Socket } from 'socket.io'
import { Player } from '../../../assets/PlayerClass'

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

describe('GameClass', () => {
  let game: Game
  let hostSocket: Socket

  beforeEach(() => {
    vi.resetAllMocks()
    hostSocket = createMockSocket('HostPlayer')
    game = new Game('Host', createMockSocket('socket'), 'testRoom')
  })

  it('should emit to room when more piece are requested', () => {
    const socket = createMockSocket('socket-1')

    game.ensurePieceSupply(socket, 'testRoom')

    expect(socket.nsp.to('testRoom').emit).to.have.been.calledWith('more_pieces', expect.any(Array))
  })

  describe('sendPenaltyToOpponents', () => {
    it('should emit to opponent get_penality', () => {
      const opSocket = createMockSocket('opponent')
      const player = new Player('Host', hostSocket, 'testRoom', 2)
      game.joinRoom('op', opSocket, 'testRoom')

      game.startGame('testRoom', 'HostPlayer', hostSocket)

      game.sendPenaltyToOpponents(player, 3)

      expect(opSocket.emit).to.have.been.calledWith('get_penalty', 3)
    })

    it('should not throw if gameOver', () => {
      const opSocket = createMockSocket('opponent')
      const player = new Player('Host', hostSocket, 'testRoom', 2)
      game.joinRoom('op', opSocket, 'testRoom')
      game.players[1].isGameOver = true

      game.sendPenaltyToOpponents(player, 3)

      expect(opSocket.emit).not.to.have.been.calledWith('get_penalty', 3)
    })
  })

  describe('checkForWinner', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      hostSocket = createMockSocket('HostPlayer')
      game = new Game('HostPlayer', hostSocket, 'testRoom')
    })

    it('should end game and declare winner when only one player remains alive', () => {
      const p2Socket = createMockSocket('socket-2')
      game.joinRoom('Player2', p2Socket, 'HostPlayer')
      game.startGame('testRoom', 'HostPlayer', hostSocket)

      game.players[1].isGameOver = true
      game.checkForWinner()

      expect(game.started).toBe(false)
      expect(hostSocket.emit).toHaveBeenCalledWith('game_end', {
        winnerId: game.players[0].id,
        winnerName: 'HostPlayer',
      })
    })

    it('should not throw if no one is alive', () => {
      const p2Socket = createMockSocket('socket-2')
      game.joinRoom('Player2', p2Socket, 'testRoom')
      game.startGame('testRoom', 'HostPlayer', hostSocket)


      game.players[1].isGameOver = true
      game.players[0].isGameOver = true
      game.checkForWinner()

      expect(hostSocket.emit).toHaveBeenCalledWith('game_end', {
        winnerId: null,
        winnerName: null,
      })
    })
  })
})
