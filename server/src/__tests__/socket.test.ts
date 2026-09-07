import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import { io as Client, type Socket as ClientSocket } from 'socket.io-client'
import { createServer } from 'http'
import { getLocalIpAddress, initSocket } from '../socket.ts'
import type { AddressInfo } from 'node:net'

import * as gamesManager from '../../assets/gamesManager.ts'

vi.mock('../../assets/gamesManager', () => ({
  joinOrCreateGame: vi.fn(),
  leaveRoom: vi.fn(),
  changeTeam: vi.fn(),
  startGame: vi.fn(),
  handleBoardUpdate: vi.fn(),
  handleMorePiecesRequest: vi.fn(),
  sendPenalty: vi.fn(),
}))

vi.mock('./socket', () => ({
  initSocket: vi.fn(),
}))

const { mockNetworkInterfaces } = vi.hoisted(() => {
  return { mockNetworkInterfaces: vi.fn() }
})
vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>()
  return {
    ...actual,
    networkInterfaces: () => mockNetworkInterfaces(),
    default: {
      ...actual,
      networkInterfaces: () => mockNetworkInterfaces(),
    },
  }
})

describe('Socket Server', () => {
  describe('getLocalIpAddress()', () => {
    it('should return the first non-internal IPv4 address found', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: [
          { family: 'IPv6', internal: false, address: 'fe80::1' },
          { family: 'IPv4', internal: true, address: '127.0.0.1' },
          { family: 'IPv4', internal: false, address: '192.168.1.50' },
        ],
      })

      const ip = getLocalIpAddress()
      expect(ip).toBe('192.168.1.50')
    })

    it('should safely skip when a network interface key exists but its value is undefined', () => {
      mockNetworkInterfaces.mockReturnValue({
        brokenInterface: undefined,
        eth0: [{ family: 'IPv4', internal: false, address: '192.168.1.50' }],
      })

      const ip = getLocalIpAddress()

      expect(ip).toBe('192.168.1.50')
    })

    it('should return "localhost" if all interfaces are undefined', () => {
      mockNetworkInterfaces.mockReturnValue({
        eth0: undefined,
        wlan0: undefined,
      })

      const ip = getLocalIpAddress()
      expect(ip).toBe('localhost')
    })
  })

  describe('socket.io server', () => {
    let io: Server, clientSocket: ClientSocket
    let port: number

    beforeAll(() => {
      const httpServer = createServer()
      io = initSocket(httpServer)
      return new Promise<void>((resolve) => {
        httpServer.listen(() => {
          port = (httpServer.address() as AddressInfo).port
          resolve()
        })
      })
    })

    afterAll(() => {
      io.close()
    })

    beforeEach(() => {
      vi.clearAllMocks()
      return new Promise<void>((resolve) => {
        clientSocket = Client(`http://localhost:${port}`)
        clientSocket.on('connect', resolve)
      })
    })

    it('should call joinOrCreateGame on "join_room"', () => {
      const data = { room: 'roomA', name: 'Alex' }
      clientSocket.emit('join_room', data)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.joinOrCreateGame).toHaveBeenCalledWith(
            'roomA',
            'Alex',
            expect.any(Object),
          )
          resolve()
        }, 50)
      })
    })

    it('should call leaveRoom when client disconnects', () => {
      clientSocket.disconnect()

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.leaveRoom).toHaveBeenCalled()
          resolve()
        }, 50)
      })
    })

    it('should call changeTeam when client changed team', () => {
      clientSocket.emit('change_team', { room: 'roomA' })

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.changeTeam).toHaveBeenCalledWith('roomA', expect.any(Object))
          resolve()
        }, 50)
      })
    })

    it('should call startGame when client emits "start_game"', () => {
      const data = { room: 'roomA', name: 'Alex' }
      clientSocket.emit('start_game', data)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.startGame).toHaveBeenCalledWith('roomA', 'Alex', expect.any(Object))
          resolve()
        }, 50)
      })
    })

    it('should call handleBoardUpdate when client emits "board_update"', () => {
      const data = {
        board: [
          [0, 1],
          [1, 0],
        ],
        score: 100,
        isGameOver: false,
      }
      clientSocket.emit('board_update', data)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.handleBoardUpdate).toHaveBeenCalledWith(
            expect.any(Object), // The socket instance
            data,
          )
          resolve()
        }, 50)
      })
    })

    it('should call handleMorePiecesRequest when client emits "request_more_pieces"', () => {
      clientSocket.emit('request_more_pieces')

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.handleMorePiecesRequest).toHaveBeenCalledWith(
            expect.any(Object), // The socket instance
          )
          resolve()
        }, 50)
      })
    })

    it('should call sendPenalty when client emits "clearLines"', () => {
      const linesCleared = 3
      clientSocket.emit('clearLines', linesCleared)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.sendPenalty).toHaveBeenCalledWith(
            linesCleared,
            expect.any(Object), // The socket instance
          )
          resolve()
        }, 50)
      })
    })
  })
})
