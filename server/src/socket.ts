import { Server } from 'socket.io'
import { Server as HttpServer } from 'http'
import {
  joinOrCreateGame,
  leaveRoom,
  changeTeam,
  startGame,
  handleBoardUpdate,
  handleMorePiecesRequest,
  sendPenality,
} from '../assets/gamesManager'
import os from 'node:os'

interface ClientToServerEvents {
  send_message: (message: string) => void
  join_room: (payload: { room: string; name: string }) => void
  change_team: (payload: { room: string; name: string }) => void
  start_game: (payload: { room: string; name: string }) => void
  board_update: (data: { board: number[][]; score: number; isGameOver: boolean }) => void
  request_more_pieces: () => void
  clearLines: (lines: number) => void
}

interface ServerToClientEvents {
  receive_message: (message: string) => void
  room_update: (Player: string[], Spectator: string[]) => void
  game_status: (started: boolean) => void
  pieces_batch: (pieces: number[]) => void
  more_pieces: (pieces: number[]) => void
  game_update: (gameData: {
    name: string
    board: number[][]
    isGameOver: boolean
    id: number
  }) => void
  get_penalty: (lines: number) => void
  you_join: (id: number) => void
  all_player: (playerIds: number[]) => void
}

export let io: Server<ClientToServerEvents, ServerToClientEvents>
export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces()
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName]
    if (networkInterface) {
      for (const net of networkInterface) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
  }
  return 'localhost'
}
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  `http://${getLocalIpAddress()}:5173`,
]

export const initSocket = (httpServer: HttpServer) => {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: allowedOrigins,
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

    socket.on('join_room', ({ room, name }) => {
      joinOrCreateGame(room, name, socket)
      socket.join(room)
    })

    socket.on('change_team', ({ room, name }) => {
      changeTeam(room, name, socket)
    })

    socket.on('start_game', ({ room, name }) => {
      startGame(room, name, socket)
    })

    socket.on('board_update', (data) => {
      handleBoardUpdate(socket, data)
      // console.log(data.board)
      // socket.broadcast.emit('receive_message', 'Polo')
    })

    socket.on('request_more_pieces', () => {
      handleMorePiecesRequest(socket)
    })

    socket.on('clearLines', (lines: number)=> {
      sendPenality(lines, socket)
    })
  })

  return io
}
