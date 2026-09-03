import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  changeTeam,
  createEmptyBoard,
  generateRandomBag,
  getBags,
  handleBoardUpdate,
  handleMorePiecesRequest,
  joinOrCreateGame,
  MAX_PLAYERS,
  leaveRoom,
  sendPenality,
  startGame,
  updateGameRoom,
} from '../../../assets/gamesManager'
import { Socket } from 'socket.io'

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

  describe('Board and Bag Generation', () => {
    it('should create a 22x10 empty board filled with zeros', () => {
      const board = createEmptyBoard()
      expect(board.length).toBe(22)
      expect(board[0].length).toBe(10)
      expect(board[0].every((val) => val === 0)).toBe(true)
    })

    it('should generate a randomized bag of 7 distinct pieces', () => {
      const bag = generateRandomBag()
      expect(bag.length).toBe(7)
      expect(bag.sort()).toEqual([1, 2, 3, 4, 5, 6, 7])
    })

    it('should generate multiple bags stitched together', () => {
      const bags = getBags(3)
      expect(bags.length).toBe(21)
    })
  })

  describe('Room Management and Player Actions', () => {
    it('should allow a player to create a room and receive their ID', () => {
      const socket = createMockSocket('socket-1')
      const room = 'room-1'

      joinOrCreateGame(room, 'Alice', socket)

      expect(socket.emit).to.have.been.calledWith('you_join', 1)
      expect(socket.emit).to.have.been.calledWith('room_update', ['Alice'], [])
    })

    it('should handle team changes between player and spectator roles', () => {
      const socket = createMockSocket('socket-2')
      const room = 'room-2'

      joinOrCreateGame(room, 'Bob', socket)

      changeTeam(room, 'Bob', socket)
      expect(socket.emit).to.have.been.calledWith('room_update', [], ['Bob'])

      changeTeam(room, 'Bob', socket)
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
      changeTeam(room, 'SoloSpectator', socket)

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
      expect(() => changeTeam('room-Null', 'Alex', socket)).not.toThrow()

      // Room with game already started
      const socketStart = createMockSocket('socket-start')
      joinOrCreateGame('room-started-change', 'Alex', socketStart)
      startGame('room-started-change', 'Alex', socketStart)

      vi.mocked(socketStart.emit).mockClear()
      changeTeam('room-started-change', 'Alex', socketStart)
      expect(socketStart.emit).not.toHaveBeenCalledWith(
        'room_update',
        expect.anything(),
        expect.anything(),
      )

      // Socket not in players nor in spectators
      const socketOther = createMockSocket('socket-other')
      joinOrCreateGame('room-team-other', 'Host', socketStart)
      changeTeam('room-team-other', 'Other', socketOther)
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

      changeTeam(room, 'R2', socket2)
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

      expect(next.emit).toHaveBeenCalledWith('host_update', true)
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

      changeTeam(room, 'A6', sockets[5]!)

      expect(sockets[5]!.emit).not.toHaveBeenCalled()
    })

    it('should let a spectator take a freed slot once a player leaves the roster', () => {
      const room = 'room-full-3'
      const names = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6']
      const sockets = names.map((name) => createMockSocket(`full3-${name}`))

      names.forEach((name, index) => joinOrCreateGame(room, name, sockets[index]!))

      changeTeam(room, 'B5', sockets[4]!)
      changeTeam(room, 'B6', sockets[5]!)

      expect(sockets[5]!.emit).toHaveBeenLastCalledWith(
        'room_update',
        ['B1', 'B2', 'B3', 'B4', 'B6'],
        ['B5'],
      )
    })
  })

  describe('In-Game Interactions', () => {
    it('should not throw if room not defined when starting game', () => {
      const socket = createMockSocket('socket-4')
      const room = 'room-3.5'

      expect(() => startGame(room, 'Dave', socket)).not.toThrow()
    })

    it('should broadcast board updates to other room members', () => {
      const socket = createMockSocket('socket-4')
      const room = 'room-4'

      joinOrCreateGame(room, 'Dave', socket)
      startGame(room, 'Dave', socket)

      const sampleBoard = createEmptyBoard()
      handleBoardUpdate(socket, { board: sampleBoard, score: 100, isGameOver: false })

      expect(socket.broadcast.to).toHaveBeenCalledWith(room)
      expect(socket.broadcast.to(room).emit).toHaveBeenCalledWith('game_update', {
        name: 'Dave',
        board: sampleBoard,
        isGameOver: false,
        id: 1,
      })
    })

    it('should ignore handleBoardUpdate, handleMorePiecesRequest, and sendPenality when game is not started or socket is not a player', () => {
      const socket = createMockSocket('socket-unstarted')
      const room = 'room-unstarted'

      joinOrCreateGame(room, 'Unstarted', socket)

      // Game not started yet
      handleBoardUpdate(socket, { board: createEmptyBoard(), score: 0, isGameOver: false })
      expect(socket.broadcast.to).not.toHaveBeenCalled()

      handleMorePiecesRequest(socket)
      expect(socket.nsp.to).not.toHaveBeenCalled()

      sendPenality(2, socket)
      expect(socket.broadcast.to).not.toHaveBeenCalled()

      // Game started but socket is a spectator / outsider
      const spectatorSocket = createMockSocket('spectator-socket')
      startGame(room, 'Unstarted', socket)

      handleBoardUpdate(spectatorSocket, { board: createEmptyBoard(), score: 0, isGameOver: false })
      handleMorePiecesRequest(spectatorSocket)
      sendPenality(2, spectatorSocket)

      expect(spectatorSocket.broadcast.to).not.toHaveBeenCalled()
    })

    it('should request and send additional piece batches', () => {
      const socket = createMockSocket('socket-5')
      const room = 'room-5'

      joinOrCreateGame(room, 'Eve', socket)
      startGame(room, 'Eve', socket)
      handleMorePiecesRequest(socket)

      expect(socket.nsp.to).toHaveBeenCalledWith(room)
      expect(socket.nsp.to(room).emit).toHaveBeenCalledWith('more_pieces', expect.any(Array))
    })

    it('should broadcast penalties to opponents', () => {
      const socket = createMockSocket('socket-6')
      const room = 'room-6'

      joinOrCreateGame(room, 'Frank', socket)
      startGame(room, 'Frank', socket)
      sendPenality(2, socket)

      expect(socket.broadcast.to).toHaveBeenCalledWith(room)
      expect(socket.broadcast.to(room).emit).toHaveBeenCalledWith('get_penality', 2)
    })

    it('should end the game and crown the last player standing', () => {
      const room = 'room-win'
      const socket1 = createMockSocket('win-1')
      const socket2 = createMockSocket('win-2')

      joinOrCreateGame(room, 'Winner', socket1)
      joinOrCreateGame(room, 'Loser', socket2)
      startGame(room, 'Winner', socket1)

      handleBoardUpdate(socket2, { board: createEmptyBoard(), score: 0, isGameOver: true })

      const payload = { winnerId: 1, winnerName: 'Winner' }
      expect(socket1.emit).toHaveBeenCalledWith('game_end', payload)
      expect(socket2.emit).toHaveBeenCalledWith('game_end', payload)
    })

    it('should not end the game while more than one player is still alive', () => {
      const room = 'room-alive'
      const socket1 = createMockSocket('alive-1')
      const socket2 = createMockSocket('alive-2')
      const socket3 = createMockSocket('alive-3')

      joinOrCreateGame(room, 'C1', socket1)
      joinOrCreateGame(room, 'C2', socket2)
      joinOrCreateGame(room, 'C3', socket3)
      startGame(room, 'C1', socket1)

      handleBoardUpdate(socket3, { board: createEmptyBoard(), score: 0, isGameOver: true })

      expect(socket1.emit).not.toHaveBeenCalledWith('game_end', expect.anything())
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
        winnerId: 1,
        winnerName: 'Stayer',
      })
    })

    it('should free the room once the game has ended so a new one can start', () => {
      const room = 'room-freed'
      const socket1 = createMockSocket('freed-1')
      const socket2 = createMockSocket('freed-2')
      const socket3 = createMockSocket('freed-3')

      joinOrCreateGame(room, 'D1', socket1)
      joinOrCreateGame(room, 'D2', socket2)
      startGame(room, 'D1', socket1)
      handleBoardUpdate(socket2, { board: createEmptyBoard(), score: 0, isGameOver: true })

      leaveRoom(socket2)
      joinOrCreateGame(room, 'D3', socket3)

      expect(socket3.emit).toHaveBeenCalledWith('room_update', ['D1', 'D3'], [])
      expect(socket3.emit).not.toHaveBeenCalledWith('room_denied', expect.anything())
    })

    it('should let the host relaunch a game after the previous one ended', () => {
      const room = 'room-replay'
      const socket1 = createMockSocket('replay-1')
      const socket2 = createMockSocket('replay-2')

      joinOrCreateGame(room, 'E1', socket1)
      joinOrCreateGame(room, 'E2', socket2)
      startGame(room, 'E1', socket1)
      handleBoardUpdate(socket2, { board: createEmptyBoard(), score: 0, isGameOver: true })

      vi.mocked(socket1.nsp.emit).mockClear()
      startGame(room, 'E1', socket1)

      expect(socket1.nsp.to(room).emit).toHaveBeenCalledWith('game_status', true)
      expect(socket1.nsp.to(room).emit).toHaveBeenCalledWith('all_player', [
        { id: 1, name: 'E1' },
        { id: 2, name: 'E2' },
      ])
    })

    it('should end a solo game without a winner when the only player tops out', () => {
      const room = 'room-solo'
      const socket = createMockSocket('solo-1')

      joinOrCreateGame(room, 'Solo', socket)
      startGame(room, 'Solo', socket)

      handleBoardUpdate(socket, { board: createEmptyBoard(), score: 0, isGameOver: true })

      expect(socket.emit).toHaveBeenCalledWith('game_end', {
        winnerId: null,
        winnerName: null,
      })
    })

    it('should handle spectator disconnects and player disconnects cleanly', () => {
      const socket1 = createMockSocket('socket-7')
      const socket2 = createMockSocket('socket-8')
      const room = 'room-7'

      joinOrCreateGame(room, 'Grace', socket1)
      joinOrCreateGame(room, 'SpectatorGrace', socket2)
      changeTeam(room, 'SpectatorGrace', socket2)

      // Spectator disconnects
      leaveRoom(socket2)
      expect(socket2.leave).toHaveBeenCalledWith(room)

      // Player disconnects and deletes empty room
      leaveRoom(socket1)
      expect(socket1.leave).toHaveBeenCalledWith(room)
    })

    it('should return early when updating a non-existent room', () => {
      expect(() => updateGameRoom('non-existent-room')).not.toThrow()
    })
  })
})
