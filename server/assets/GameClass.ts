import { MAX_PLAYERS } from './gamesManager'
import { Player } from './PlayerClass'
import type { Socket } from 'socket.io'

const BAGS_AT_START = 4

const PIECE_LOOKAHEAD = 21

export class Game {
  players: Player[] = []
  spectators: Player[] = []
  /** The one piece sequence every player in the room draws from, in order. */
  pieces: number[] = []
  ids: number = 2
  playersAtStart: number = 0

  private _started: boolean = false

  constructor(player: Player) {
    this.players = [player]
    this._updateGameRoom()
  }

  hasStarted() {
    return this._started
  }

  // Player //
  ensurePieceSupply(socket: Socket, room: string) {
    const furthest = this.players.reduce((max, player) => Math.max(max, player.queueIndex), 0)
    const appended: number[] = []

    while (this.pieces.length - furthest < PIECE_LOOKAHEAD) {
      const bag = this._generateRandomBag()
      this.pieces.push(...bag)
      appended.push(...bag)
    }

    if (appended.length > 0) {
      socket.nsp.to(room).emit('more_pieces', appended)
    }
  }

  // GameManager //
  joinRoom(player: Player) {
    player.id = this.ids++
    if (this.players.length >= MAX_PLAYERS) {
      this.spectators.push(player)
    } else {
      this.players.push(player)
    }
    this._updateGameRoom()
  }

  leaveRoom(socket: Socket, room: string) {
    this.players = this.players.filter((player) => player.socket !== socket)
    this.spectators = this.spectators.filter((player) => player.socket !== socket)
    socket.leave(room)
    if (this.players.length === 0 && this.spectators.length === 0) {
      return true
    } else {
      this.checkForWinner()
    }
  }

  changeTeam(socket: Socket) {
    if (this._started) return
    const player = this.players.find((candidate) => candidate.socket === socket)
    if (player !== undefined) {
      this.spectators.push(player)
      this.players = this.players.filter((candidate) => candidate.socket !== socket)
    } else {
      if (this.players.length >= MAX_PLAYERS) return
      const spectator = this.spectators.find((candidate) => candidate.socket === socket)
      if (spectator === undefined) return
      this.players.push(spectator)
      this.spectators = this.spectators.filter((candidate) => candidate.socket !== socket)
    }
    this._updateGameRoom()
  }

  startGame(room: string, name: string, socket: Socket) {
    if (this.players.length === 0) return
    if (this.players[0]!.name !== name || this.players[0]!.socket !== socket) return

    this._started = true
    this.pieces = this._getBags(BAGS_AT_START)
    this.playersAtStart = this.players.length
    this.players.forEach((player) => {
      player.resetRoundState()
    })

    const roster = this.players.map((player) => ({ id: player.id, name: player.name }))

    socket.nsp.to(room).emit('game_status', true)
    socket.nsp.to(room).emit('pieces_batch', this.pieces)
    socket.nsp.to(room).emit('all_player', roster)

    this.players.forEach((player) => {
      player.takeNextPiece(socket, this, room)
    })
  }

  checkForWinner() {
    if (!this._started) return
    // this._updateGameRoom()
    const alive = this.players.filter((player) => !player.isGameOver)
    const soloGame = this.playersAtStart <= 1
    if (alive.length > 1) return
    if (alive.length === 1 && soloGame) return

    const winner = alive.length === 1 ? alive[0] : undefined
    this._started = false
    this.playersAtStart = 0

    const payload = {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.name : null,
    }
    const everyone = [...this.players, ...this.spectators]
    everyone.forEach((player) => {
      player.getSocket().emit('game_end', payload)
    })
  }

  sendPenaltyToOpponents(from: Player, lines: number) {
    this.players.forEach((opponent) => {
      if (opponent === from || opponent.isGameOver) return
      opponent.penaltiesSent += lines
      opponent.getSocket().emit('get_penalty', lines)
    })
  }

  // Private //
  private _updateGameRoom() {
    const playerList = this.players.map((player: Player) => player.name)
    const spectatorList = this.spectators.map((player: Player) => player.name)

    this.players.forEach((player, index) => {
      if (player.socket) {
        player.socket.emit('role_update', 'player')
        player.socket.emit('host_update', index === 0)
        player.socket.emit('room_update', playerList, spectatorList)
      }
    })
    this.spectators.forEach((player: Player) => {
      if (player.socket) {
        player.socket.emit('role_update', 'spectator')
        player.socket.emit('host_update', false)
        player.socket.emit('room_update', playerList, spectatorList)
      }
    })
  }

  private _getBags(numBags: number): number[] {
    const pieces: number[] = []
    for (let i = 0; i < numBags; i++) {
      pieces.push(...this._generateRandomBag())
    }
    return pieces
  }

  private _generateRandomBag(): number[] {
    const pieces = [1, 2, 3, 4, 5, 6, 7]
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pieces[i]!, pieces[j]!] = [pieces[j]!, pieces[i]!]
    }
    return pieces
  }
}
