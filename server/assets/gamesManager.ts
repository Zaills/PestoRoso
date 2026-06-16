import type { DefaultEventsMap, Socket } from 'socket.io'
const games = new Map()

interface player {
  name: string
  socket: Socket
  board: number[][]
  score: number
  isGameOver: boolean
  room: string
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const player: player = {
    name,
    socket,
    board: createEmptyBoard(),
    score: 0,
    isGameOver: false,
    room: room,
  }
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
    socket.leave(game.room)
  })
  toDelete.forEach((game) => games.delete(game))
}

export function generateRandomBag(): number[] {
  const pieces = [1, 2, 3, 4, 5, 6, 7]
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pieces[i], pieces[j]] = [pieces[j], pieces[i]]
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
  const gameRoom = games.get(room)
  if (!gameRoom) return
  if (gameRoom.players[0].name !== name || gameRoom.players[0].socket !== socket) return

  gameRoom.started = true
  gameRoom.pieces = getBags(10)

  socket.nsp.to(room).emit('game_status', true)
  socket.nsp.to(room).emit('pieces_batch', gameRoom.pieces)
}

export function handleBoardUpdate(
  socket: Socket,
  data: { board: number[][]; score: number; isGameOver: boolean },
) {
  games.forEach((game) => {
    if (!game.started) return
    const player = game.players.find((p: player) => p.socket === socket)
    if (!player) return

    player.board = data.board
    player.score = data.score
    player.isGameOver = data.isGameOver

    const gameData = {
      name: player.name,
      board: player.board,
      isGameOver: data.isGameOver,
    }
    socket.broadcast.to(player.room).emit('game_update', gameData)
  })
}

export function handleMorePiecesRequest(socket: Socket) {
  for (const [, gameRoom] of games.entries()) {
    if (!gameRoom.started) continue
    const player = gameRoom.players.find((p: player) => p.socket === socket)
    if (!player) continue
    const newPieces = getBags(5)
    socket.emit('more_pieces', newPieces)
    break
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

export function sendPenality(lines: number, socket: Socket) {
  games.forEach((game) => {
    if (!game.started) return
    const player = game.players.find((p: player) => p.socket === socket)
    if (!player) return

    socket.broadcast.to(player.room).emit('get_penality', lines)
  })
}
