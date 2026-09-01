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

    it('should not crash if changeTeam is called on a non-existent room', () => {
      const socket = createMockSocket('socket-null')
      expect(() => changeTeam('room-Null', 'Alex', socket)).not.toThrow()
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

    it('should not throw if room not define', () => {
      const socket = createMockSocket('socket-4')
      const room = 'room-3.5'

      startGame(room, 'Dave', socket)
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

      // Le joueur recharge sa page : il repart de la salle d'attente, pas des spectateurs.
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

    it('should handle player disconnects cleanly', () => {
      const socket = createMockSocket('socket-7')
      const room = 'room-7'

      joinOrCreateGame(room, 'Grace', socket)
      leaveRoom(socket)

      expect(socket.leave).toHaveBeenCalledWith(room)
    })
  })
})
