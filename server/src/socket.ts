import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import { joinOrCreateGame, leaveRoom, changeTeam } from '../assets/gamesManager'

interface ClientToServerEvents {
  send_message: (message: string) => void
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  join_room: ({ room, name }) => void
  key_press: (key: string) => void
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  change_team: ({ room, name }) => void
}

interface ServerToClientEvents {
  receive_message: (message: string) => void
  room_update: (Player: string[], Spectator: string[]) => void
}

export let io: Server<ClientToServerEvents, ServerToClientEvents>

export const initSocket = (httpServer: HttpServer) => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: 'http://localhost:5173',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`🟢 User connected: ${socket.id}`)

    socket.on('send_message', (message) => {
      console.log(`Message from ${socket.id}: ${message}`)

      socket.emit('receive_message', message)
    })

    socket.on('disconnect', () => {
      leaveRoom(socket)
      console.log(`🔴 User disconnected: ${socket.id}`)
    })

    socket.on('key_press', (key) => {
      socket.emit('receive_message', `Valid Key pressed: ${key}`)
    })

    socket.on('join_room', ({ room, name }) => {
      joinOrCreateGame(room, name, socket)
    })

    socket.on('change_team', ({ room, name }) => {
      changeTeam(room, name, socket)
    })
  })

  return io
}
