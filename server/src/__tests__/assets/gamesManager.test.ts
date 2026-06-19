import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  changeTeam,
  createEmptyBoard,
  generateRandomBag,
  getBags,
  handleBoardUpdate,
  handleMorePiecesRequest,
  joinOrCreateGame,
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

    it('should add joining players to spectators if the game is already started', () => {
      const socket1 = createMockSocket('socket1')
      const socket2 = createMockSocket('socket2')

      joinOrCreateGame('roomD', 'Alex', socket1)
      startGame('roomD', 'Alex', socket1)
      joinOrCreateGame('roomD', 'Bob', socket2)

      expect(socket2.emit).toHaveBeenCalledWith('room_update', ['Alex'], ['Bob'])
    })

    it('should not crash if changeTeam is called on a non-existent room', () => {
      const socket = createMockSocket('socket-null')
      expect(() => changeTeam('room-Null', 'Alex', socket)).not.toThrow()
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

    it('should handle player disconnects cleanly', () => {
      const socket = createMockSocket('socket-7')
      const room = 'room-7'

      joinOrCreateGame(room, 'Grace', socket)
      leaveRoom(socket)

      expect(socket.leave).toHaveBeenCalledWith(room)
    })
  })
})
