import { MAX_PLAYERS } from './gamesManager'
import { Player } from './PlayerClass'
import type { Socket } from 'socket.io'

const BAGS_AT_START = 4

const PIECE_LOOKAHEAD = 21

export class Game {
  private _players: Player[] = []
  private _spectators: Player[] = []
  /** The one piece sequence every player in the room draws from, in order. */
  private _pieces: number[] = []
  private _ids: number = 2
  private _playersAtStart: number = 0

  private _started: boolean = false

  constructor(player: Player) {
    this._players = [player]
    this._updateGameRoom()
  }

  // Getter //
  get started() {
    return this._started
  }

  get players(): Player[] {
    return this._players
  }

  get pieces(): number[] {
    return this._pieces
  }

  // Method //
  // Player //
  ensurePieceSupply(socket: Socket, room: string) {
    const furthest = this._players.reduce((max, player) => Math.max(max, player.queueIndex), 0)
    const appended: number[] = []

    while (this._pieces.length - furthest < PIECE_LOOKAHEAD) {
      const bag = this._generateRandomBag()
      this._pieces.push(...bag)
      appended.push(...bag)
    }

    if (appended.length > 0) {
      socket.nsp.to(room).emit('more_pieces', appended)
    }
  }

  // GameManager //
  joinRoom(player: Player) {
    player.id = this._ids++
    if (this._players.length >= MAX_PLAYERS) {
      this._spectators.push(player)
    } else {
      this._players.push(player)
    }
    this._updateGameRoom()
  }

  leaveRoom(socket: Socket, room: string) {
    this._players = this._players.filter((player) => player.socket !== socket)
    this._spectators = this._spectators.filter((player) => player.socket !== socket)
    socket.leave(room)
    if (this._players.length === 0 && this._spectators.length === 0) {
      return true
    } else {
      this.checkForWinner()
    }
  }

  changeTeam(socket: Socket) {
    if (this._started) return
    const player = this._players.find((candidate) => candidate.socket === socket)
    if (player !== undefined) {
      this._spectators.push(player)
      this._players = this._players.filter((candidate) => candidate.socket !== socket)
    } else {
      if (this._players.length >= MAX_PLAYERS) return
      const spectator = this._spectators.find((candidate) => candidate.socket === socket)
      if (spectator === undefined) return
      this._players.push(spectator)
      this._spectators = this._spectators.filter((candidate) => candidate.socket !== socket)
    }
    this._updateGameRoom()
  }

  startGame(room: string, name: string, socket: Socket) {
    if (this._players.length === 0) return
    if (this._players[0]!.name !== name || this._players[0]!.socket !== socket) return

    this._started = true
    this._pieces = this._getBags(BAGS_AT_START)
    this._playersAtStart = this._players.length
    this._players.forEach((player) => {
      player.resetRoundState()
    })

    const roster = this._players.map((player) => ({ id: player.id, name: player.name }))

    socket.nsp.to(room).emit('game_status', true)
    socket.nsp.to(room).emit('pieces_batch', this._pieces)
    socket.nsp.to(room).emit('all_player', roster)

    this._players.forEach((player) => {
      player.takeNextPiece(socket, this, room)
    })
  }

  checkForWinner() {
    if (!this._started) return
    // this._updateGameRoom()
    const alive = this._players.filter((player) => !player.isGameOver)
    const soloGame = this._playersAtStart <= 1
    if (alive.length > 1) return
    if (alive.length === 1 && soloGame) return

    const winner = alive.length === 1 ? alive[0] : undefined
    this._started = false
    this._playersAtStart = 0

    const payload = {
      winnerId: winner ? winner.id : null,
      winnerName: winner ? winner.name : null,
    }
    const everyone = [...this._players, ...this._spectators]
    everyone.forEach((player) => {
      player.getSocket().emit('game_end', payload)
    })
  }

  sendPenaltyToOpponents(from: Player, lines: number) {
    this._players.forEach((opponent) => {
      if (opponent === from || opponent.isGameOver) return
      opponent.penaltiesSent += lines
      opponent.getSocket().emit('get_penalty', lines)
    })
  }

  // Private //
  private _updateGameRoom() {
    const playerList = this._players.map((player: Player) => player.name)
    const spectatorList = this._spectators.map((player: Player) => player.name)

    this._players.forEach((player, index) => {
      if (player.socket) {
        player.socket.emit('role_update', 'player')
        player.socket.emit('host_update', index === 0)
        player.socket.emit('room_update', playerList, spectatorList)
      }
    })
    this._spectators.forEach((player: Player) => {
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
