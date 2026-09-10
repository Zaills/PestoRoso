import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  changeTeam,
  joinOrCreateGame,
  MAX_PLAYERS,
  leaveRoom,
  startGame,
  handlePieceLocked,
  handlePieceHeld, checkForWinner,
} from '../../../assets/gamesManager'
import { Socket } from 'socket.io'
import { Player } from '../../../assets/PlayerClass'
import { Game } from '../../../assets/GameClass'

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

describe('Server Game Manager', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('Room Management and Player Actions', () => {
    it('should allow a player to create a room and receive their ID', () => {
      const socket = createMockSocket('socket-1')
      const room = 'room-1'

      joinOrCreateGame(room, 'Alice', socket)

      expect(socket.emit).to.have.been.calledWith('you_join', 2)
      expect(socket.emit).to.have.been.calledWith('room_update', ['Alice'], [])
    })

    it('should handle team changes between player and spectator roles', () => {
      const socket = createMockSocket('socket-2')
      const room = 'room-2'

      joinOrCreateGame(room, 'Bob', socket)

      changeTeam(room, socket)
      expect(socket.emit).to.have.been.calledWith('room_update', [], ['Bob'])

      changeTeam(room, socket)
      expect(socket.emit).to.have.been.calledWith('room_update', ['Bob'], [])
    })

    it('should start the game if the host requests it', () => {
      const socket = createMockSocket('socket-3')
      const room = 'room-3'

      joinOrCreateGame(room, 'Charlie', socket)
      startGame(room, 'Charlie', socket)

      expect(socket.nsp.to).toHaveBeenCalledWith(room)
      expect(socket.nsp.to(room).emit).toHaveBeenCalledWith('game_status', true)
      expect(socket.nsp.to(room).emit).toHaveBeenCalledWith('pieces_batch', expect.any(Array))
    })

    it('should not throw if start the game but not the host requests it', () => {
      const socket1 = createMockSocket('socket-3')
      const socket2 = createMockSocket('socket-4')
      const room = 'room-3.1'

      joinOrCreateGame(room, 'Charlie', socket1)
      joinOrCreateGame(room, 'Bob', socket2)
      expect(() => startGame(room, 'Bob', socket2)).not.toThrow()
      expect(socket2.nsp.to(room).emit).not.toHaveBeenCalled()
    })

    it('should not start the game if players list is empty', () => {
      const socket = createMockSocket('socket-empty')
      const room = 'room-empty-players'

      joinOrCreateGame(room, 'SoloSpectator', socket)
      changeTeam(room, socket)

      vi.mocked(socket.nsp.to(room).emit).mockClear()
      startGame(room, 'SoloSpectator', socket)

      expect(socket.nsp.to(room).emit).not.toHaveBeenCalled()
    })

    it('should add new player to the list', () => {
      const socket1 = createMockSocket('socket1')
      const socket2 = createMockSocket('socket2')

      joinOrCreateGame('roomB', 'Alex', socket1)
      joinOrCreateGame('roomB', 'Bob', socket2)

      expect(socket2.emit).toHaveBeenCalledWith('room_update', ['Alex', 'Bob'], [])
      expect(socket1.emit).toHaveBeenLastCalledWith('room_update', ['Alex', 'Bob'], [])
    })

    it('should refuse joining players while the game is running', () => {
      const socket1 = createMockSocket('socket1')
      const socket2 = createMockSocket('socket2')

      joinOrCreateGame('roomD', 'Alex', socket1)
      joinOrCreateGame('roomD', 'Zoe', createMockSocket('socketZ'))
      startGame('roomD', 'Alex', socket1)
      joinOrCreateGame('roomD', 'Bob', socket2)

      expect(socket2.emit).toHaveBeenCalledWith('room_denied', 'game_in_progress')
      expect(socket2.emit).not.toHaveBeenCalledWith('you_join', expect.anything())
    })

    it('should handle changeTeam edge cases (non-existent room, started game, unknown socket)', () => {
      const socket = createMockSocket('socket-null')

      // Non-existent room
      expect(() => changeTeam('room-Null', socket)).not.toThrow()

      // Room with game already started
      const socketStart = createMockSocket('socket-start')
      joinOrCreateGame('room-started-change', 'Alex', socketStart)
      startGame('room-started-change', 'Alex', socketStart)

      vi.mocked(socketStart.emit).mockClear()
      changeTeam('room-started-change', socketStart)
      expect(socketStart.emit).not.toHaveBeenCalledWith(
        'room_update',
        expect.anything(),
        expect.anything(),
      )

      // Socket not in players nor in spectators
      const socketOther = createMockSocket('socket-other')
      joinOrCreateGame('room-team-other', 'Host', socketStart)
      changeTeam('room-team-other', socketOther)
      expect(socketOther.emit).not.toHaveBeenCalled()
    })

    it(`should cap a room at ${MAX_PLAYERS} players and send the extra ones to the spectators`, () => {
      const room = 'room-full'
      const names = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']
      const sockets = names.map((name) => createMockSocket(`full-${name}`))

      names.forEach((name, index) => joinOrCreateGame(room, name, sockets[index]!))

      expect(sockets[6]!.emit).toHaveBeenCalledWith(
        'room_update',
        ['P1', 'P2', 'P3', 'P4', 'P5'],
        ['P6', 'P7'],
      )
    })

    it('should tell every socket whether it plays or watches', () => {
      const room = 'room-roles'
      const socket1 = createMockSocket('role-1')
      const socket2 = createMockSocket('role-2')

      joinOrCreateGame(room, 'R1', socket1)
      joinOrCreateGame(room, 'R2', socket2)
      expect(socket2.emit).toHaveBeenCalledWith('role_update', 'player')

      changeTeam(room, socket2)
      expect(socket2.emit).toHaveBeenCalledWith('role_update', 'spectator')
      expect(socket1.emit).toHaveBeenLastCalledWith('room_update', ['R1'], ['R2'])
    })

    it('should flag only the first player as host, whatever the names are', () => {
      const room = 'room-namesakes'
      const host = createMockSocket('host-1')
      const namesake = createMockSocket('host-2')

      joinOrCreateGame(room, 'Alex', host)
      joinOrCreateGame(room, 'Alex', namesake)

      expect(host.emit).toHaveBeenCalledWith('host_update', true)
      expect(namesake.emit).toHaveBeenCalledWith('host_update', false)
      expect(namesake.emit).not.toHaveBeenCalledWith('host_update', true)
    })

    it('should hand the host flag over when the host leaves', () => {
      const room = 'room-host-left'
      const host = createMockSocket('left-1')
      const next = createMockSocket('left-2')

      joinOrCreateGame(room, 'Alex', host)
      joinOrCreateGame(room, 'Bob', next)
      expect(next.emit).toHaveBeenCalledWith('host_update', false)

      leaveRoom(host)

      expect(next.emit).toHaveBeenCalledWith('host_update', false)
    })

    it('should refuse a namesake trying to start the game', () => {
      const room = 'room-fake-host'
      const host = createMockSocket('fake-1')
      const namesake = createMockSocket('fake-2')

      joinOrCreateGame(room, 'Alex', host)
      joinOrCreateGame(room, 'Alex', namesake)
      startGame(room, 'Alex', namesake)

      expect(namesake.nsp.emit).not.toHaveBeenCalledWith('game_status', true)
    })

    it('should refuse to move a spectator back to the players when the room is full', () => {
      const room = 'room-full-2'
      const names = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']
      const sockets = names.map((name) => createMockSocket(`full2-${name}`))

      names.forEach((name, index) => joinOrCreateGame(room, name, sockets[index]!))
      vi.mocked(sockets[5]!.emit).mockClear()

      changeTeam(room, sockets[5]!)

      expect(sockets[5]!.emit).not.toHaveBeenCalled()
    })

    it('should let a spectator take a freed slot once a player leaves the roster', () => {
      const room = 'room-full-3'
      const names = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']
      const sockets = names.map((name) => createMockSocket(`full3-${name}`))

      names.forEach((name, index) => joinOrCreateGame(room, name, sockets[index]!))

      changeTeam(room, sockets[4]!)
      changeTeam(room, sockets[5]!)

      expect(sockets[5]!.emit).toHaveBeenLastCalledWith(
        'room_update',
        ['B1', 'B2', 'B3', 'B4', 'B6'],
        ['B5'],
      )
    })

    it('should delete game if all player left', () => {
      const room = 'delete'
      const name = 'leaver'
      const socket = createMockSocket('leave-socket')

      joinOrCreateGame(room, name, socket)

      const spy = vi.spyOn(Map.prototype, 'delete')

      leaveRoom(socket)

      expect(spy).toHaveBeenCalledOnce()
    })
  })

  describe('In-Game Interactions', () => {
    it('should not throw if room not defined when starting game', () => {
      const socket = createMockSocket('socket-4')
      const room = 'room-3.5'

      expect(() => startGame(room, 'Dave', socket)).not.toThrow()
    })

    it('should crown the survivor when the last opponent disconnects', () => {
      const room = 'room-quit'
      const socket1 = createMockSocket('quit-1')
      const socket2 = createMockSocket('quit-2')

      joinOrCreateGame(room, 'Stayer', socket1)
      joinOrCreateGame(room, 'Quitter', socket2)
      startGame(room, 'Stayer', socket1)

      leaveRoom(socket2)

      expect(socket1.emit).toHaveBeenCalledWith('game_end', {
        winnerId: 2,
        winnerName: 'Stayer',
      })
    })

    it('should checkForWinner return null if winner not found', () => {
      expect(() => checkForWinner("test")).not.toThrow()
    })

    it('should checkForWinner delegate to game', () => {
      joinOrCreateGame("test", "test",createMockSocket('winner'))
      const winCheckSpy = vi.spyOn(Game.prototype, 'checkForWinner')

      checkForWinner("test")

      expect(winCheckSpy).toHaveBeenCalledOnce()
    })
  })

  describe('Handle Sockets', () => {
    let socket: Socket
    const room = 'room-1'
    const playerName = 'Alice'

    beforeEach(() => {
      socket = createMockSocket('socket-1')
    })

    afterEach(() => {
      leaveRoom(socket)
      vi.restoreAllMocks()
    })

    it('should findPlayerGame return null if player not found ', () => {
      expect(() => handlePieceHeld(socket)).not.toThrow()
    })


    describe('handlePieceLocked', () => {
      it('should do nothing if socket is not in any room', () => {
        const lockSpy = vi.spyOn(Player.prototype, 'handlePieceLocked')
        const dummyData = { pieceId: 1, x: 0, y: 0, rotation: 0, penaltyCount: 0 }

        handlePieceLocked(socket, dummyData)

        expect(lockSpy).not.toHaveBeenCalled()
      })

      it('should delegate to player.handlePieceLocked when socket is in a game', () => {
        joinOrCreateGame(room, playerName, socket)

        const lockSpy = vi
          .spyOn(Player.prototype, 'handlePieceLocked')
          .mockImplementation(() => {})
        const dummyData = { pieceId: 1, x: 0, y: 0, rotation: 0, penaltyCount: 0 }

        handlePieceLocked(socket, dummyData)

        expect(lockSpy).toHaveBeenCalledOnce()
        expect(lockSpy).toHaveBeenCalledWith(expect.anything(), room, dummyData)
      })
    })

    describe('handlePieceHeld', () => {
      it('should do nothing if socket is not in any room', () => {
        const holdSpy = vi.spyOn(Player.prototype, 'handlePieceHeld')

        handlePieceHeld(socket)

        expect(holdSpy).not.toHaveBeenCalled()
      })

      it('should delegate to player.handlePieceHeld when socket is in a game', () => {
        joinOrCreateGame(room, playerName, socket)

        const holdSpy = vi.spyOn(Player.prototype, 'handlePieceHeld')

        handlePieceHeld(socket)

        expect(holdSpy).toHaveBeenCalledOnce()
        expect(holdSpy).toHaveBeenCalledWith(expect.anything(), room)
      })
    })
  })
})
