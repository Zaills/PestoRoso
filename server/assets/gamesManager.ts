import type { Socket } from 'socket.io'
import { Game } from './GameClass'
import { Player } from './PlayerClass'


/** Every room currently alive on this server, keyed by its name. */
const games = new Map<string, Game>()

export const MAX_PLAYERS = 5

function findPlayerGame(socket: Socket): { game: Game; room: string; player: Player } | null {
  for (const [room, game] of games) {
    const player = game.players.find((candidate) => candidate.socket === socket)
    if (player) return { game, room, player }
  }
  return null
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (gameRoom && gameRoom.started) {
    socket.emit('room_denied', 'game_in_progress')
    return
  }

  if (gameRoom) gameRoom.joinRoom(name, socket, room)
  else games.set(room, new Game(name, socket, room))
}

export function leaveRoom(socket: Socket) {
  const toDelete: string[] = []
  games.forEach((game, key) => {
    if (game.leaveRoom(socket, key)) toDelete.push(key)
  })
  toDelete.forEach((game) => games.delete(game))
}


export function startGame(room: string, name: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (gameRoom) gameRoom.startGame(room, name, socket)
}

export function checkForWinner(room: string) {
  const gameRoom = games.get(room)
  if (!gameRoom) return
  gameRoom.checkForWinner()
}

export function handlePieceLocked(
  socket: Socket,
  data: { pieceId: number; x: number; y: number; rotation: number; penaltyCount: number },
) {
  const found = findPlayerGame(socket)
  if (!found) return
  const { game, room, player } = found
  player.handlePieceLocked(game, room, data)
}

/** Mirrors the client hold swap, so both sides expect the same next piece. */
export function handlePieceHeld(socket: Socket) {
  const found = findPlayerGame(socket)
  if (!found) return
  const { game, room, player } = found
  player.handlePieceHeld(game, room)
}

export function changeTeam(room: string, socket: Socket) {
  const gameRoom = games.get(room)
  if (!gameRoom) return
  gameRoom.changeTeam(socket)
}
