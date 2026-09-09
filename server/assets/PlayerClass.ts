import type { Socket } from 'socket.io'
import {
  applyPenaltyLines,
  checkCollision,
  clearLines,
  createEmptyBoard, isValidPlacement,
  levelForLines,
  scoreForLines,
  spawnPiece,
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
} from '../../shared/tetrisEngine'
import { Game } from './GameClass'
import { checkForWinner } from './gamesManager'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { Piece, PieceId } from '../../shared/PieceClass'

const MAX_VIOLATIONS = 5

export class Player {
  name: string
  socket: Socket
  room: string
  id: number = 1
  /** Authoritative board: rebuilt here from the placements the client reports. */
  board: number[][] = createEmptyBoard()
  score: number = 0
  linesCount: number = 0
  level: number = 1
  isGameOver: boolean = false
  /** How many pieces this player has taken from the room sequence. */
  queueIndex: number = 0
  currentPieceId: PieceId | null = null
  heldPieceId: PieceId | null = null
  canHold: boolean = true
  /** Penalty lines pushed to this client, and how many it confirmed absorbing. */
  penaltiesSent: number = 0
  penaltiesApplied: number = 0
  /** Consecutive rejected placements; an honest client resyncs and drops back to 0. */
  violations: number = 0

  constructor(name: string, socket: Socket, room: string) {
    this.name = name
    this.socket = socket
    this.room = room
  }

  getSocket(): Socket {
    return this.socket
  }

  resetRoundState() {
    this.board = createEmptyBoard()
    this.score = 0
    this.linesCount = 0
    this.level = 1
    this.isGameOver = false
    this.queueIndex = 0
    this.currentPieceId = null
    this.heldPieceId = null
    this.canHold = true
    this.penaltiesSent = 0
    this.penaltiesApplied = 0
    this.violations = 0
  }

  takeNextPiece(socket: Socket, game: Game, room: string) {
    const pieceId = game.pieces[this.queueIndex]
    if (pieceId === undefined) return null
    this.queueIndex += 1
    game.ensurePieceSupply(socket, room)
    this.currentPieceId = pieceId as PieceId
  }

  advanceToNextPiece(socket: Socket, game: Game, room: string) {
    this.canHold = true
    this.takeNextPiece(socket, game, room)
    if (
      this.currentPieceId !== null &&
      checkCollision(this.board, spawnPiece(this.currentPieceId), 0, 0)
    ) {
      this.isGameOver = true
    }
  }

  rejectPlacement(room: string) {
    this.violations += 1
    this.socket.emit('board_resync', {
      board: this.board,
      pieceId: this.currentPieceId,
      penaltyCount: this.penaltiesApplied,
    })

    if (this.violations >= MAX_VIOLATIONS) {
      console.warn(`⚠️  ${this.name} sent ${this.violations} impossible placements in a row`)
      this.isGameOver = true
      this.broadcastBoard()
      checkForWinner(room)
    }
  }

  broadcastBoard() {
    if (this.socket) {
      this.socket.broadcast.to(this.room).emit('game_update', {
        name: this.name,
        board: this.board,
        isGameOver: this.isGameOver,
        id: this.id,
      })
    }
  }

  syncPenalties(reported: number) {
    if (!Number.isInteger(reported)) return
    const confirmed = Math.min(reported, this.penaltiesSent)
    const pending = confirmed - this.penaltiesApplied
    if (pending <= 0) return
    this.applyPenaltyLines(pending)
    this.penaltiesApplied = confirmed
  }

  applyPenaltyLines(lines: number) {
    this.board = applyPenaltyLines(this.board, lines)
  }

  isValidPlacement(piece: Piece): boolean {
    return isValidPlacement(this.board, piece)
  }

  clearLines(locked: number[][]): number {
    this.violations = 0
    const { newBoard, linesCleared } = clearLines(locked)
    this.board = newBoard
    this.linesCount += linesCleared
    this.score += scoreForLines(linesCleared, this.level)
    this.level = levelForLines(this.linesCount)
    return linesCleared
  }
}
