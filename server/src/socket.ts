import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'

interface ClientToServerEvents {
  send_message: (message: string) => void;
  join_room: (roomName: string) => void;
}

interface ServerToClientEvents {
  receive_message: (message: string) => void;
  user_joined: (username: string, currentUsers: number) => void;
}

export let io: Server<ClientToServerEvents, ServerToClientEvents>;

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

      io.emit('receive_message', message)
    })

    socket.on('disconnect', () => {
      console.log(`🔴 User disconnected: ${socket.id}`)
    })
  })

  return io;
};
