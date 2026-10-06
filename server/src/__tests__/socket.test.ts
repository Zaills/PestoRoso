import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import { io as Client, type Socket as ClientSocket } from 'socket.io-client'
import { createServer } from 'http'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { getLocalIpAddress, initSocket } from '../socket.ts'
import type { AddressInfo } from 'node:net'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import * as gamesManager from '../../assets/gamesManager.ts'

vi.mock('../../assets/gamesManager', () => ({
  joinOrCreateGame: vi.fn(),
  leaveRoom: vi.fn(),
  changeTeam: vi.fn(),
  startGame: vi.fn(),
  handleBoardUpdate: vi.fn(),
  handleMorePiecesRequest: vi.fn(),
  sendPenalty: vi.fn(),
  handlePieceLocked: vi.fn(),
  handlePieceHeld: vi.fn(),
  handlePenaltyGameOver:vi.fn(),
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

    it('should call handlePieceLocked when client emits "piece_locked"', () => {
      const data = { pieceId: 0, x: 0, y: 0, rotation: 0, penaltyCount: 0 }
      clientSocket.emit('piece_locked', data)

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.handlePieceLocked).toHaveBeenCalledWith(expect.any(Object), data)
          resolve()
        }, 50)
      })
    })

    it('should call handlePieceHeld when client emits "piece_held"', () => {
      clientSocket.emit('piece_held')

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.handlePieceHeld).toHaveBeenCalledWith(expect.any(Object))
          resolve()
        }, 50)
      })
    })

    it('should call handlePenaltyGameOver when client emits "penalty_game_over"', () => {
      clientSocket.emit('penalty_game_over')

      return new Promise<void>((resolve) => {
        setTimeout(() => {
          expect(gamesManager.handlePenaltyGameOver).toHaveBeenCalledWith(expect.any(Object))
          resolve()
        }, 50)
      })
    })
  })

})
