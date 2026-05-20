import type { DefaultEventsMap, Socket } from 'socket.io'
import { spawnPiece, checkCollision, rotateMatrix, type PieceState } from './tetrisEngine'
const games = new Map()

interface player {
  name: string
  socket: Socket
  board: number[][]
  score: number
  isGameOver: boolean
  currentPiece: PieceState | null
  pieceIndex: number
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const player: player = { name, socket, board: createEmptyBoard(), score: 0, isGameOver: false, currentPiece: null, pieceIndex: 0 }
  if (games.has(room)) joinRoom(room, player)
  else createRoom(room, player)

  updateGameRoom(room)
}

function updateGameRoom(room: string) {
  const gameRoom = games.get(room)!
  const playerList: string[] = []
  const spectatorList: string[] = []

  gameRoom.players.forEach((player: { name: string } | undefined) => {
    if (player !== undefined) playerList.push(player.name)
  })
  gameRoom.spectators.forEach((player: { name: string } | undefined) => {
    if (player !== undefined) spectatorList.push(player.name)
  })

  gameRoom.players.forEach(
    (
      player:
        | { socket: { emit: (arg0: string, arg1: string[], arg2: string[]) => void } }
        | undefined,
    ) => {
      if (player !== undefined) player.socket.emit('room_update', playerList, spectatorList)
    },
  )
  gameRoom.spectators.forEach(
    (
      player:
        | { socket: { emit: (arg0: string, arg1: string[], arg2: string[]) => void } }
        | undefined,
    ) => {
      if (player !== undefined) player.socket.emit('room_update', playerList, spectatorList)
    },
  )
}

function createRoom(room: string, player: player) {
  games.set(room, { players: [player], spectators: [], started: false, pieces: [] })
}

function joinRoom(room: string, player: player) {
  const gameRoom = games.get(room)
  if (gameRoom.started) {
    gameRoom.spectators.push(player)
  } else {
    gameRoom.players.push(player)
  }
}

export function leaveRoom(socket: Socket) {
  const toDelete: string[] = []
  games.forEach((game, key: string) => {
    game.players = game.players.filter(
      (players: { socket: Socket<DefaultEventsMap, DefaultEventsMap> }) =>
        players.socket !== socket,
    )
    game.spectators = game.spectators.filter(
      (players: { socket: Socket<DefaultEventsMap, DefaultEventsMap> }) =>
        players.socket !== socket,
    )
    if (game.players.length === 0 && game.spectators.length === 0) {
      toDelete.push(key)
    } else {
      updateGameRoom(key)
    }
  })
  toDelete.forEach((game) => games.delete(game))
}

export function generateRandomBag(): number[] {
  const pieces = [1, 2, 3, 4, 5, 6, 7]
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pieces[i], pieces[j]] = [pieces[j], pieces[i]]
  }
  return pieces
}

export function getBags(numBags: number = 5): number[] {
  const pieces: number[] = []
  for (let i = 0; i < numBags; i++) {
    pieces.push(...generateRandomBag())
  }
  return pieces
}

export function startGame(room: string, name: string, socket: Socket) {
  if (games.has(room) && games.get(room).players[0].name == name && games.get(room).players[0].socket == socket) {
    const gameRoom = games.get(room)
    gameRoom.started = true
    
    // Generate initial pieces
    gameRoom.pieces = getBags(10) // 70 pieces pour commencer

    gameRoom.players.forEach((p: player) => {
      if (p) {
        p.currentPiece = spawnPiece(gameRoom.pieces[0])
        p.pieceIndex = 1
      }
    })

    gameRoom.players.forEach(
      (
        player:
          | { socket: { emit: (arg0: string, arg1: boolean) => void } }
          | undefined,
      ) => {
        if (player !== undefined) player.socket.emit('game_status', true)
      },
    )
    gameRoom.spectators.forEach(
      (player: { socket: { emit: (arg0: string, arg1: boolean) => void } } | undefined) => {
        if (player !== undefined) player.socket.emit('game_status', true)
      },
    )
    broadcastGameState(room)
  }
}

export function broadcastGameState(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom || !gameRoom.started) return

  const gameData = gameRoom.players.map((p: player) => ({
    name: p.name,
    board: p.board,
    currentPiece: p.currentPiece,
    score: p.score,
    isGameOver: p.isGameOver
  }))

  const broadcastTo = (p: any) => {
    if (p && p.socket) p.socket.emit('game_update', gameData)
  }
  gameRoom.players.forEach(broadcastTo)
  gameRoom.spectators.forEach(broadcastTo)
}

export function handleKeyPress(socket: Socket, key: string) {
  let foundRoom: string | null = null
  let foundPlayer: player | null = null

  for (const [roomName, gameRoom] of games.entries()) {
    if (gameRoom.started) {
      const p = gameRoom.players.find((p: player) => p.socket === socket)
      if (p) {
        foundRoom = roomName
        foundPlayer = p
        break
      }
    }
  }

  if (!foundRoom || !foundPlayer || foundPlayer.isGameOver || !foundPlayer.currentPiece) return

  let moved = false
  const p = foundPlayer
  const piece = p.currentPiece!

  if (key === 'ArrowLeft' && !checkCollision(p.board, piece, -1, 0)) {
    piece.x -= 1
    moved = true
  } else if (key === 'ArrowRight' && !checkCollision(p.board, piece, 1, 0)) {
    piece.x += 1
    moved = true
  } else if (key === 'ArrowDown' && !checkCollision(p.board, piece, 0, 1)) {
    piece.y += 1
    moved = true
  } else if (key === 'ArrowUp') {
    const rotated = rotateMatrix(piece.matrix)
    if (!checkCollision(p.board, piece, 0, 0, rotated)) {
      piece.matrix = rotated
      moved = true
    }
  } else if (key === ' ') { // Space for hard drop
    while (!checkCollision(p.board, piece, 0, 1)) {
      piece.y += 1
    }
    moved = true
    // Le verrouillage (lock) sera géré plus tard
  }

  if (moved) {
    broadcastGameState(foundRoom)
  }
}

export function changeTeam(room: string, name: string, socket: Socket) {
  if (!games.has(room) && name != null) return
  const gameRoom = games.get(room)!
  const player = gameRoom.players.find((player: { socket: Socket }) => player.socket === socket)
  if (player !== undefined) {
    gameRoom.spectators.push(player)
    gameRoom.players = gameRoom.players.filter(
      (player: { socket: Socket }) => player.socket !== socket,
    )
  } else {
    const player = gameRoom.spectators.find(
      (player: { socket: Socket }) => player.socket === socket,
    )
    if (player !== undefined) {
      gameRoom.players.push(player)
      gameRoom.spectators = gameRoom.spectators.filter(
        (player: { socket: Socket }) => player.socket !== socket,
      )
    } else {
      return
    }
  }
  updateGameRoom(room)
}
