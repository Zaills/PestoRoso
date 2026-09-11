import type { Socket } from 'socket.io'
import {
  applyPenaltyLines,
  checkCollision,
  clearLines,
  createEmptyBoard, getPieceMatrix, isBoardOverflowed, isValidPlacement,
  levelForLines, lockPiece,
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
  private readonly _name: string
  private readonly _socket: Socket
  private readonly _room: string
  private readonly _id: number = 1
  /** Authoritative board: rebuilt here from the placements the client reports. */
  private _board: number[][] = createEmptyBoard()
  private _score: number = 0
  private _linesCount: number = 0
  private _level: number = 1
  private _isGameOver: boolean = false
  /** How many pieces this player has taken from the room sequence. */
  private _queueIndex: number = 0
  private _currentPieceId: PieceId | null = null
  private _heldPieceId: PieceId | null = null
  private _canHold: boolean = true
  /** Penalty lines pushed to this client, and how many it confirmed absorbing. */
  penaltiesSent: number = 0
  private _penaltiesApplied: number = 0
  /** Consecutive rejected placements; an honest client resyncs and drops back to 0. */
  private _violations: number = 0

  constructor(name: string, socket: Socket, room: string, id: number) {
    this._name = name
    this._socket = socket
    this._room = room
    this._id = id
  }

  // getter //
  get socket(): Socket {
    return this._socket
  }

  get name(): string {
    return this._name
  }

  get id(): number {
    return this._id
  }

  get isGameOver(): boolean {
    return this._isGameOver
  }

  get queueIndex(): number {
    return this._queueIndex
  }

  // setter //
  set isGameOver(value: boolean) {
    this._isGameOver = value
  }

  // method //
  resetRoundState() {
    this._board = createEmptyBoard()
    this._score = 0
    this._linesCount = 0
    this._level = 1
    this._isGameOver = false
    this._queueIndex = 0
    this._currentPieceId = null
    this._heldPieceId = null
    this._canHold = true
    this.penaltiesSent = 0
    this._penaltiesApplied = 0
    this._violations = 0
  }

  takeNextPiece(socket: Socket, game: Game, room: string) {
    const pieceId = game.pieces[this._queueIndex]
    if (pieceId === undefined) return null
    this._queueIndex += 1
    game.ensurePieceSupply(socket, room)
    this._currentPieceId = pieceId as PieceId
  }

  handlePieceHeld(game: Game, room: string) {
    if (!game.started || this._isGameOver || !this._canHold) return
    if (this._currentPieceId === null) return

    if (this._heldPieceId === null) {
      this._heldPieceId = this._currentPieceId
      this.takeNextPiece(this._socket, game, room)
    } else {
      const swapped = this._heldPieceId
      this._heldPieceId = this._currentPieceId
      this._currentPieceId = swapped
    }
    this._canHold = false
  }

  handlePieceLocked(
    game: Game,
    room: string,
    data: { pieceId: number; x: number; y: number; rotation: number; penaltyCount: number },
  ) {
    if (!game.started || this._isGameOver || this._currentPieceId === null) return

    this.syncPenalties(data.penaltyCount)

    if (isBoardOverflowed(this._board)) {
      this._isGameOver = true
      this.broadcastBoard()
      checkForWinner(room)
      return
    }

    if (data.pieceId !== this._currentPieceId || !Number.isInteger(data.rotation)) {
      this.rejectPlacement(room)
      return
    }

    const piece = new Piece(
      this._currentPieceId,
      data.x,
      data.y,
      data.rotation,
      getPieceMatrix(this._currentPieceId, data.rotation),
    )

    if (!isValidPlacement(this._board, piece)) {
      this.rejectPlacement(room)
      return
    }
    const linesCleared = this.clearLines(lockPiece(this._board, piece))

    if (linesCleared > 1) game.sendPenaltyToOpponents(this, linesCleared - 1)

    if (isBoardOverflowed(this._board)) {
      this._isGameOver = true
    } else {
      this.advanceToNextPiece(this._socket, game, room)
    }

    this.broadcastBoard()
    if (this._isGameOver) checkForWinner(room)
  }

  /**
   * The client reports it was buried by the penalty lines it received. It never
   * locks another piece, so nothing else would make the server replay them: the
   * pending penalties are applied here and the claim is only honoured if the
   * server board really overflows.
   */
  handlePenaltyGameOver(game: Game, room: string) {
    if (!game.started || this._isGameOver) return

    const pending = this.penaltiesSent - this.penaltiesApplied
    if (pending <= 0) return

    const board = applyPenaltyLines(this._board, pending)
    if (!isBoardOverflowed(board)) return

    this._board = board
    this.penaltiesApplied = this.penaltiesSent
    this._isGameOver = true
    this.broadcastBoard()
    checkForWinner(room)
  }

  // Private Method //

  private advanceToNextPiece(socket: Socket, game: Game, room: string) {
    this._canHold = true
    this.takeNextPiece(socket, game, room)
    if (
      this._currentPieceId !== null &&
      checkCollision(this._board, spawnPiece(this._currentPieceId), 0, 0)
    ) {
      this._isGameOver = true
    }
  }

  private rejectPlacement(room: string) {
    this._violations += 1
    this._socket.emit('board_resync', {
      board: this._board,
      pieceId: this._currentPieceId,
      penaltyCount: this._penaltiesApplied,
    })

    if (this._violations >= MAX_VIOLATIONS) {
      console.warn(`⚠️  ${this._name} sent ${this._violations} impossible placements in a row`)
      this._isGameOver = true
      this.broadcastBoard()
      checkForWinner(room)
    }
  }

  private broadcastBoard() {
    this._socket.broadcast.to(this._room).emit('game_update', {
      name: this._name,
      board: this._board,
      isGameOver: this._isGameOver,
      id: this._id,
    })
  }

  private syncPenalties(reported: number) {
    if (!Number.isInteger(reported)) return
    const confirmed = Math.min(reported, this.penaltiesSent)
    const pending = confirmed - this._penaltiesApplied
    if (pending <= 0) return
    this._board = applyPenaltyLines(this._board, pending)
    this._penaltiesApplied = confirmed
  }

  private clearLines(locked: number[][]): number {
    this._violations = 0
    const { newBoard, linesCleared } = clearLines(locked)
    this._board = newBoard
    this._linesCount += linesCleared
    this._score += scoreForLines(linesCleared, this._level)
    this._level = levelForLines(this._linesCount)
    return linesCleared
  }
}
