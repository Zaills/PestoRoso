import type { Socket } from 'socket.io'
import {
  checkCollision,
  createEmptyBoard,
  getPieceMatrix,
  lockPiece,
  spawnPiece,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
} from '../../shared/tetrisEngine'

import { Game } from './GameClass'
import { Player } from './PlayerClass'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { Piece } from '../../shared/PieceClass'

export { createEmptyBoard }

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

  const player = new Player(name, socket, room)
  if (gameRoom) gameRoom.joinRoom(player)
  else games.set(room, new Game(player))

  player.getSocket().emit('you_join', Number(player.id))
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

  player.syncPenalties(data.penaltyCount)

  if (data.pieceId !== player.currentPieceId || !Number.isInteger(data.rotation)) {
    player.rejectPlacement(room)
    return
  }

  const piece = new Piece(
    player.currentPieceId,
    data.x,
    data.y,
    data.rotation,
    getPieceMatrix(player.currentPieceId, data.rotation)
  )

  if (!player.isValidPlacement(piece)) {
    player.rejectPlacement(room)
    return
  }
  const linesCleared = player.clearLines(lockPiece(player.board, piece))

  if (linesCleared > 1) game.sendPenaltyToOpponents(player, linesCleared - 1)

  player.advanceToNextPiece(socket, game, room)
  player.broadcastBoard()
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
    player.takeNextPiece(socket, game, room)
    if (
      checkCollision(player.board, spawnPiece(player.currentPieceId), 0, 0)
    ) {
      player.isGameOver = true
      player.broadcastBoard()
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
  if (!gameRoom) return
  gameRoom.changeTeam(socket)
}
