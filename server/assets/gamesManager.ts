import type { Socket } from 'socket.io'
import {
  applyPenaltyLines,
  checkCollision,
  clearLines,
  createEmptyBoard,
  getPieceMatrix,
  isValidPlacement,
  levelForLines,
  lockPiece,
  scoreForLines,
  spawnPiece,
  type PieceId,
  type PieceState,
} from '../../shared/tetrisEngine'

export { createEmptyBoard }

/** Every room currently alive on this server, keyed by its name. */
const games = new Map<string, Game>()

export const MAX_PLAYERS = 5

/** Pieces handed out when a round starts, enough to never starve the first bags. */
const BAGS_AT_START = 4
/** The shared sequence always stays this many pieces ahead of the furthest player. */
const PIECE_LOOKAHEAD = 21
/** Consecutive impossible placements tolerated before a client is dropped. */
const MAX_VIOLATIONS = 5

interface Player {
  name: string
  socket: Socket
  room: string
  id: number
  /** Authoritative board: rebuilt here from the placements the client reports. */
  board: number[][]
  score: number
  linesCount: number
  level: number
  isGameOver: boolean
  /** How many pieces this player has taken from the room sequence. */
  queueIndex: number
  currentPieceId: PieceId | null
  heldPieceId: PieceId | null
  canHold: boolean
  /** Penalty lines pushed to this client, and how many it confirmed absorbing. */
  penaltiesSent: number
  penaltiesApplied: number
  /** Consecutive rejected placements; an honest client resyncs and drops back to 0. */
  violations: number
}

interface Game {
  players: Player[]
  spectators: Player[]
  started: boolean
  /** The one piece sequence every player in the room draws from, in order. */
  pieces: number[]
  ids: number
  playersAtStart: number
}

function createPlayer(name: string, socket: Socket, room: string): Player {
  return {
    name,
    socket,
    room,
    id: 1,
    board: createEmptyBoard(),
    score: 0,
    linesCount: 0,
    level: 1,
    isGameOver: false,
    queueIndex: 0,
    currentPieceId: null,
    heldPieceId: null,
    canHold: true,
    penaltiesSent: 0,
    penaltiesApplied: 0,
    violations: 0,
  }
}

/** Wipes everything that belongs to a single round, keeping the seat in the room. */
function resetRoundState(player: Player) {
  player.board = createEmptyBoard()
  player.score = 0
  player.linesCount = 0
  player.level = 1
  player.isGameOver = false
  player.queueIndex = 0
  player.currentPieceId = null
  player.heldPieceId = null
  player.canHold = true
  player.penaltiesSent = 0
  player.penaltiesApplied = 0
  player.violations = 0
}

function findPlayerGame(socket: Socket): { game: Game; room: string; player: Player } | null {
  for (const [room, game] of games) {
    const player = game.players.find((candidate) => candidate.socket === socket)
    if (player) return { game, room, player }
  }
  return null
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const runningGame = games.get(room)
  // A running round cannot be joined: the client is sent back to the home page.
  if (runningGame && runningGame.started) {
    socket.emit('room_denied', 'game_in_progress')
    return
  }

  const player = createPlayer(name, socket, room)
  if (runningGame) joinRoom(runningGame, player)
  else createRoom(room, player)
  updateGameRoom(room)
  socket.emit('you_join', Number(player.id))
}

export function updateGameRoom(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom) return

  const playerList = gameRoom.players.map((player) => player.name)
  const spectatorList = gameRoom.spectators.map((player) => player.name)

  // Role and host flag are pushed before the lists. The host is identified by its
  // seat in the room, not by its name, so a namesake cannot take the role over.
  gameRoom.players.forEach((player, index) => {
    player.socket.emit('role_update', 'player')
    player.socket.emit('host_update', index === 0)
    player.socket.emit('room_update', playerList, spectatorList)
  })
  gameRoom.spectators.forEach((player) => {
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

function joinRoom(gameRoom: Game, player: Player) {
  player.id = gameRoom.ids++
  if (gameRoom.players.length >= MAX_PLAYERS) {
    gameRoom.spectators.push(player)
  } else {
    gameRoom.players.push(player)
  }
}

export function leaveRoom(socket: Socket) {
  const toDelete: string[] = []
  games.forEach((game, key) => {
    game.players = game.players.filter((player) => player.socket !== socket)
    game.spectators = game.spectators.filter((player) => player.socket !== socket)
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

/**
 * Grows the shared sequence when the furthest player gets close to its end.
 *
 * The room is topped up once, from the server's own bookkeeping, and the new pieces
 * are broadcast a single time. Clients never ask for more, so the sequence cannot
 * grow faster than it is consumed however many players are connected.
 */
function ensurePieceSupply(socket: Socket, game: Game, room: string) {
  const furthest = game.players.reduce((max, player) => Math.max(max, player.queueIndex), 0)
  const appended: number[] = []

  while (game.pieces.length - furthest < PIECE_LOOKAHEAD) {
    const bag = generateRandomBag()
    game.pieces.push(...bag)
    appended.push(...bag)
  }

  if (appended.length > 0) {
    socket.nsp.to(room).emit('more_pieces', appended)
  }
}

function takeNextPiece(socket: Socket, game: Game, room: string, player: Player): PieceId | null {
  const pieceId = game.pieces[player.queueIndex]
  if (pieceId === undefined) return null
  player.queueIndex += 1
  ensurePieceSupply(socket, game, room)
  return pieceId as PieceId
}

export function startGame(room: string, name: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (!gameRoom) return
  if (gameRoom.players.length === 0) return
  if (gameRoom.players[0]!.name !== name || gameRoom.players[0]!.socket !== socket) return

  gameRoom.started = true
  gameRoom.pieces = getBags(BAGS_AT_START)
  gameRoom.playersAtStart = gameRoom.players.length
  gameRoom.players.forEach(resetRoundState)

  const roster = gameRoom.players.map((player) => ({ id: player.id, name: player.name }))

  socket.nsp.to(room).emit('game_status', true)
  socket.nsp.to(room).emit('pieces_batch', gameRoom.pieces)
  socket.nsp.to(room).emit('all_player', roster)

  // Handed out after the batch so every client already holds the sequence.
  gameRoom.players.forEach((player) => {
    player.currentPieceId = takeNextPiece(socket, gameRoom, room, player)
  })
}

// The round ends as soon as a single player is left standing.
// The survivor is declared the winner and everyone is notified.
function checkForWinner(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom || !gameRoom.started) return

  const alive = gameRoom.players.filter((player) => !player.isGameOver)
  const soloGame = gameRoom.playersAtStart <= 1
  if (alive.length > 1) return
  if (alive.length === 1 && soloGame) return

  const winner = alive.length === 1 ? alive[0] : undefined
  // The room goes back to the waiting state: reloading starts a fresh game.
  gameRoom.started = false
  gameRoom.playersAtStart = 0

  const payload = {
    winnerId: winner ? winner.id : null,
    winnerName: winner ? winner.name : null,
  }
  const everyone = [...gameRoom.players, ...gameRoom.spectators]
  everyone.forEach((player) => {
    player.socket.emit('game_end', payload)
  })
}

function broadcastBoard(player: Player) {
  player.socket.broadcast.to(player.room).emit('game_update', {
    name: player.name,
    board: player.board,
    isGameOver: player.isGameOver,
    id: player.id,
  })
}

/**
 * Catches the server board up with the penalty lines the client had already absorbed
 * when it locked this piece.
 *
 * Penalties travel asynchronously, so a placement can cross one on the wire. Replaying
 * them in the order the client saw them is what keeps both boards identical. A client
 * cannot gain by lying: claiming fewer penalties leaves the server board cleaner than
 * its own, and its next placement would then look like it floats.
 */
function syncPenalties(player: Player, reported: number) {
  if (!Number.isInteger(reported)) return
  const confirmed = Math.min(reported, player.penaltiesSent)
  const pending = confirmed - player.penaltiesApplied
  if (pending <= 0) return
  player.board = applyPenaltyLines(player.board, pending)
  player.penaltiesApplied = confirmed
}

/** Sends n - 1 penalty lines to every opponent still in the round. */
function sendPenaltyToOpponents(game: Game, from: Player, lines: number) {
  game.players.forEach((opponent) => {
    if (opponent === from || opponent.isGameOver) return
    opponent.penaltiesSent += lines
    opponent.socket.emit('get_penalty', lines)
  })
}

/** Rejects a placement, hands the client the authoritative board, and counts the strike. */
function rejectPlacement(player: Player, room: string) {
  player.violations += 1
  player.socket.emit('board_resync', {
    board: player.board,
    pieceId: player.currentPieceId,
    penaltyCount: player.penaltiesApplied,
  })

  if (player.violations >= MAX_VIOLATIONS) {
    console.warn(`⚠️  ${player.name} sent ${player.violations} impossible placements in a row`)
    player.isGameOver = true
    broadcastBoard(player)
    checkForWinner(room)
  }
}

function advanceToNextPiece(socket: Socket, game: Game, room: string, player: Player) {
  player.canHold = true
  const nextId = takeNextPiece(socket, game, room, player)
  player.currentPieceId = nextId
  // Game over is decided here, on the server board, not announced by the client.
  if (nextId !== null && checkCollision(player.board, spawnPiece(nextId), 0, 0)) {
    player.isGameOver = true
  }
}

/**
 * Replays one placement reported by a client.
 *
 * The client is only allowed to say *where* it put the piece; which piece it was comes
 * from the room sequence, and the resulting lines, penalties, score and elimination are
 * all computed here.
 */
export function handlePieceLocked(
  socket: Socket,
  data: { pieceId: number; x: number; y: number; rotation: number; penaltyCount: number },
) {
  const found = findPlayerGame(socket)
  if (!found) return
  const { game, room, player } = found
  if (!game.started || player.isGameOver || player.currentPieceId === null) return

  syncPenalties(player, data.penaltyCount)

  if (data.pieceId !== player.currentPieceId || !Number.isInteger(data.rotation)) {
    rejectPlacement(player, room)
    return
  }

  const piece: PieceState = {
    pieceId: player.currentPieceId,
    x: data.x,
    y: data.y,
    rotation: data.rotation,
    matrix: getPieceMatrix(player.currentPieceId, data.rotation),
  }
  if (!isValidPlacement(player.board, piece)) {
    rejectPlacement(player, room)
    return
  }

  player.violations = 0
  const { newBoard, linesCleared } = clearLines(lockPiece(player.board, piece))
  player.board = newBoard
  player.linesCount += linesCleared
  player.score += scoreForLines(linesCleared, player.level)
  player.level = levelForLines(player.linesCount)

  if (linesCleared > 1) sendPenaltyToOpponents(game, player, linesCleared - 1)

  advanceToNextPiece(socket, game, room, player)
  broadcastBoard(player)
  if (player.isGameOver) checkForWinner(room)
}

/** Mirrors the client hold swap, so both sides expect the same next piece. */
export function handlePieceHeld(socket: Socket) {
  const found = findPlayerGame(socket)
  if (!found) return
  const { game, room, player } = found
  if (!game.started || player.isGameOver || !player.canHold) return
  if (player.currentPieceId === null) return

  if (player.heldPieceId === null) {
    player.heldPieceId = player.currentPieceId
    const nextId = takeNextPiece(socket, game, room, player)
    player.currentPieceId = nextId
    if (nextId !== null && checkCollision(player.board, spawnPiece(nextId), 0, 0)) {
      player.isGameOver = true
      broadcastBoard(player)
      checkForWinner(room)
    }
  } else {
    const swapped = player.heldPieceId
    player.heldPieceId = player.currentPieceId
    player.currentPieceId = swapped
  }
  player.canHold = false
}

export function changeTeam(room: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (!gameRoom || gameRoom.started) return

  // A player moves to the viewers, a viewer takes a free seat among the players.
  const player = gameRoom.players.find((candidate) => candidate.socket === socket)
  if (player !== undefined) {
    gameRoom.spectators.push(player)
    gameRoom.players = gameRoom.players.filter((candidate) => candidate.socket !== socket)
  } else {
    if (gameRoom.players.length >= MAX_PLAYERS) return
    const spectator = gameRoom.spectators.find((candidate) => candidate.socket === socket)
    if (spectator === undefined) return
    gameRoom.players.push(spectator)
    gameRoom.spectators = gameRoom.spectators.filter((candidate) => candidate.socket !== socket)
  }
  updateGameRoom(room)
}
