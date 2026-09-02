import type { DefaultEventsMap, Socket } from 'socket.io'
const games = new Map()

export const MAX_PLAYERS = 5

interface player {
  name: string
  socket: Socket
  board: number[][]
  score: number
  isGameOver: boolean
  room: string
  id: number
}

export function createEmptyBoard(): number[][] {
  return Array.from({ length: 22 }, () => Array(10).fill(0))
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const runningGame = games.get(room)
  // Une manche en cours ne se rejoint pas : le client est renvoyé sur l'accueil.
  if (runningGame && runningGame.started) {
    socket.emit('room_denied', 'game_in_progress')
    return
  }

  const player: player = {
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

  // Rôle et qualité d'hôte sont poussés avant la liste. L'hôte est identifié par
  // sa place dans la room, pas par son pseudo : un homonyme ne peut pas s'y substituer.
  gameRoom.players.forEach((player: player, index: number) => {
    player.socket.emit('role_update', 'player')
    player.socket.emit('host_update', index === 0)
    player.socket.emit('room_update', playerList, spectatorList)
  })
  gameRoom.spectators.forEach((player: player) => {
    player.socket.emit('role_update', 'spectator')
    player.socket.emit('host_update', false)
    player.socket.emit('room_update', playerList, spectatorList)
  })
}

function createRoom(room: string, player: player) {
  games.set(room, {
    players: [player],
    spectators: [],
    started: false,
    pieces: [],
    ids: 2,
    playersAtStart: 0,
  })
}

function joinRoom(room: string, player: player) {
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
  gameRoom.players.forEach((player: player) => {
    player.isGameOver = false
    player.board = createEmptyBoard()
    player.score = 0
    roster.push({ id: player.id, name: player.name })
  })

  socket.nsp.to(room).emit('game_status', true)
  socket.nsp.to(room).emit('pieces_batch', gameRoom.pieces)
  socket.nsp.to(room).emit('all_player', roster)
}

// La partie s'arrête dès qu'il ne reste qu'un seul joueur en lice.
// Le survivant reçoit la victoire, tout le monde est notifié de la fin.
function checkForWinner(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom || !gameRoom.started) return

  const alive = gameRoom.players.filter((player: player) => !player.isGameOver)
  const soloGame = gameRoom.playersAtStart <= 1
  if (alive.length > 1) return
  if (alive.length === 1 && soloGame) return

  const winner: player | undefined = alive.length === 1 ? alive[0] : undefined
  // La room repasse en salle d'attente : un rechargement relance une nouvelle partie.
  gameRoom.started = false
  gameRoom.playersAtStart = 0

  const payload = {
    winnerId: winner ? winner.id : null,
    winnerName: winner ? winner.name : null,
  }
  const everyone: player[] = [...gameRoom.players, ...gameRoom.spectators]
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
    const player = game.players.find((p: player) => p.socket === socket)
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
    const player = game.players.find((p: player) => p.socket === socket)
    if (!player) return
    const newPieces = getBags(2)

    socket.nsp.to(player.room).emit('more_pieces', newPieces)
  })
}

export function changeTeam(room: string, name: string, socket: Socket) {
  if (!games.has(room) && name != null) return
  const gameRoom = games.get(room)!
  if (gameRoom.started) return
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

export function sendPenality(lines: number, socket: Socket) {
  games.forEach((game) => {
    if (!game.started) return
    const player = game.players.find((p: player) => p.socket === socket)
    if (!player) return

    socket.broadcast.to(player.room).emit('get_penality', lines)
  })
}
