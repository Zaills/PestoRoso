import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import { io as Client, type Socket as ClientSocket } from 'socket.io-client'
import { createServer } from 'http'
import { initSocket } from '../socket.ts'
import type { AddressInfo } from 'node:net'

import * as gamesManager from '../../assets/gamesManager.ts'

vi.mock('../../assets/gamesManager', () => ({
  joinOrCreateGame: vi.fn(),
  leaveRoom: vi.fn(),
  changeTeam: vi.fn(),
}))

describe('Socket Server', () => {
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

  it('should handle "send_message" and echo it back', () => {
    return new Promise<void>((resolve) => {
      clientSocket.emit('send_message', 'Hello World')
      clientSocket.on('receive_message', (msg) => {
        expect(msg).toBe('Hello World')
        resolve()
      })
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
    const data = { room: 'roomA', name: 'Alex' }
    clientSocket.emit('change_team', data)

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(gamesManager.changeTeam).toHaveBeenCalledWith('roomA', 'Alex', expect.any(Object))
        resolve()
      }, 50)
    })
  })
})
