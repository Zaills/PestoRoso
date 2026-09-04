import type { DefaultEventsMap, Socket } from 'socket.io'

/** Every room currently alive on this server, keyed by its name. */
const games = new Map()

export const MAX_PLAYERS = 5

const COLS = 10
const TOTAL_ROWS = 22

interface Player {
  name: string
  socket: Socket
  board: number[][]
  score: number
  isGameOver: boolean
  room: string
  id: number
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: TOTAL_ROWS }, () => Array(COLS).fill(0))
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const runningGame = games.get(room)
  // A running round cannot be joined: the client is sent back to the home page.
  if (runningGame && runningGame.started) {
    socket.emit('room_denied', 'game_in_progress')
    return
  }

  const player: Player = {
    name,
    socket,
    board: createEmptyBoard(),
    score: 0,
    isGameOver: false,
    room: room,
    id: 1,
  }
  if (games.has(room)) joinRoom(room, player)
  else createRoom(room, player)
  updateGameRoom(room)
  socket.emit('you_join', Number(player.id))
}

export function updateGameRoom(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom) return
  const playerList: string[] = []
  const spectatorList: string[] = []

  gameRoom.players.forEach((player: { name: string }) => {
    playerList.push(player.name)
  })
  gameRoom.spectators.forEach((player: { name: string }) => {
    spectatorList.push(player.name)
  })

  // Role and host flag are pushed before the lists. The host is identified by its
  // seat in the room, not by its name, so a namesake cannot take the role over.
  gameRoom.players.forEach((player: Player, index: number) => {
    player.socket.emit('role_update', 'player')
    player.socket.emit('host_update', index === 0)
    player.socket.emit('room_update', playerList, spectatorList)
  })
  gameRoom.spectators.forEach((player: Player) => {
    player.socket.emit('role_update', 'spectator')
    player.socket.emit('host_update', false)
    player.socket.emit('room_update', playerList, spectatorList)
  })
}

function createRoom(room: string, player: Player) {
  games.set(room, {
    players: [player],
    spectators: [],
    started: false,
    pieces: [],
    ids: 2,
    playersAtStart: 0,
  })
}

function joinRoom(room: string, player: Player) {
  const gameRoom = games.get(room)
  player.id = gameRoom.ids++
  if (gameRoom.players.length >= MAX_PLAYERS) {
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
      checkForWinner(key)
    }
    socket.leave(key)
  })
  toDelete.forEach((game) => games.delete(game))
}

/** A shuffled bag of the seven tetriminoes, so every player gets the same sequence. */
export function generateRandomBag(): number[] {
  const pieces = [1, 2, 3, 4, 5, 6, 7]
  for (let i = pieces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pieces[i]!, pieces[j]!] = [pieces[j]!, pieces[i]!]
  }
  return pieces
}

export function getBags(numBags: number): number[] {
  const pieces: number[] = []
  for (let i = 0; i < numBags; i++) {
    pieces.push(...generateRandomBag())
  }
  return pieces
}

export function startGame(room: string, name: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (!gameRoom) return
  if (gameRoom.players.length === 0) return
  if (gameRoom.players[0].name !== name || gameRoom.players[0].socket !== socket) return

  gameRoom.started = true
  gameRoom.pieces = getBags(3)
  gameRoom.playersAtStart = gameRoom.players.length

  const roster: { id: number; name: string }[] = []
  gameRoom.players.forEach((player: Player) => {
    player.isGameOver = false
    player.board = createEmptyBoard()
    player.score = 0
    roster.push({ id: player.id, name: player.name })
  })

  socket.nsp.to(room).emit('game_status', true)
  socket.nsp.to(room).emit('pieces_batch', gameRoom.pieces)
  socket.nsp.to(room).emit('all_player', roster)
}

// The round ends as soon as a single player is left standing.
// The survivor is declared the winner and everyone is notified.
function checkForWinner(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom || !gameRoom.started) return

  const alive = gameRoom.players.filter((player: Player) => !player.isGameOver)
  const soloGame = gameRoom.playersAtStart <= 1
  if (alive.length > 1) return
  if (alive.length === 1 && soloGame) return

  const winner: Player | undefined = alive.length === 1 ? alive[0] : undefined
  // The room goes back to the waiting state: reloading starts a fresh game.
  gameRoom.started = false
  gameRoom.playersAtStart = 0

  const payload = {
    winnerId: winner ? winner.id : null,
    winnerName: winner ? winner.name : null,
  }
  const everyone: Player[] = [...gameRoom.players, ...gameRoom.spectators]
  everyone.forEach((player) => {
    player.socket.emit('game_end', payload)
  })
}

export function handleBoardUpdate(
  socket: Socket,
  data: { board: number[][]; score: number; isGameOver: boolean },
) {
  games.forEach((game, room: string) => {
    if (!game.started) return
    const player = game.players.find((p: Player) => p.socket === socket)
    if (!player) return

    player.board = data.board
    player.score = data.score
    player.isGameOver = data.isGameOver

    const gameData = {
      name: player.name,
      board: player.board,
      isGameOver: data.isGameOver,
      id: player.id,
    }
    socket.broadcast.to(player.room).emit('game_update', gameData)
    if (data.isGameOver) checkForWinner(room)
  })
}

export function handleMorePiecesRequest(socket: Socket) {
  games.forEach((game) => {
    if (!game.started) return
    const player = game.players.find((p: Player) => p.socket === socket)
    if (!player) return
    const newPieces = getBags(2)

    socket.nsp.to(player.room).emit('more_pieces', newPieces)
  })
}

export function changeTeam(room: string, socket: Socket) {
  if (!games.has(room)) return
  const gameRoom = games.get(room)
  if (gameRoom.started) return
  // A player moves to the viewers, a viewer takes a free seat among the players.
  const player = gameRoom.players.find((player: { socket: Socket }) => player.socket === socket)
  if (player !== undefined) {
    gameRoom.spectators.push(player)
    gameRoom.players = gameRoom.players.filter(
      (player: { socket: Socket }) => player.socket !== socket,
    )
  } else {
    if (gameRoom.players.length >= MAX_PLAYERS) return
    const player = gameRoom.spectators.find(
      (player: { socket: Socket }) => player.socket === socket,
    )
    if (player === undefined) return
    gameRoom.players.push(player)
    gameRoom.spectators = gameRoom.spectators.filter(
      (player: { socket: Socket }) => player.socket !== socket,
    )
  }
  updateGameRoom(room)
}

/** Forwards the penalty lines cleared by one player to all its opponents. */
export function sendPenalty(lines: number, socket: Socket) {
  games.forEach((game) => {
    if (!game.started) return
    const player = game.players.find((p: Player) => p.socket === socket)
    if (!player) return

    socket.broadcast.to(player.room).emit('get_penalty', lines)
  })
}
