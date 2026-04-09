import { DefaultEventsMap, Socket } from 'socket.io'

const games = new Map()

interface player {
  name: string
  socket: Socket
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const player: player = { name, socket }
  if (games.has(room)) joinRoom(room, player)
  else createRoom(room, player)

  updateGameRoom(room)
}

function updateGameRoom(room: string) {
  const gameRoom = games.get(room)!
  const playerList = []
  const spectatorList = []
  gameRoom.players.forEach((player) => {
    playerList.push(player.name)
  })
  gameRoom.spectators.forEach((player) => {
    playerList.push(player.name)
  })

  gameRoom.players.forEach((gamePlayer) => {
    gamePlayer.socket.emit('room_update', playerList, spectatorList)
  })
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
  const toDelete = []
  games.forEach((game, key) => {
    game.players = game.players.filter(
      (players: { socket: Socket<DefaultEventsMap, DefaultEventsMap> }) =>
        players.socket !== socket,
    )
    if (game.players.length === 0) {
      toDelete.push(key)
    } else {
      updateGameRoom(key)
    }
  })
  toDelete.forEach((game) => games.delete(game))
}

function startGame(room: string, name: string) {
  if (games.has(room) && games.get(room).player[0] == name) {
    games.get(room).started = true
    //generate pieces
  }
}
