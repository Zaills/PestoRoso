import { DefaultEventsMap, Socket } from 'socket.io'

const games = new Map()

interface player {
  name: string
  socket: Socket
}

export function joinOrCreateGame(room: string, name: string, socket: Socket) {
  const player: player = { name, socket }
  if (games.has(room)) joinRoom(room, player)
  else games.set(room, { player: [player], spectators: [], started: false, pieces: [] })
}

function startGame(room: string, name: string) {
  if (games.has(room) && games.get(room).player[0] == name) {
    games.get(room).started = true
    //generate pieces
  }
}

function joinRoom(room: string, player: player) {
  const gameRoom = games.get(room)
  if (gameRoom.started) {
    gameRoom.spectators.push(player)
  } else {
    gameRoom.player.push(player)
  }
}

export function leaveRoom(socket: Socket) {
  const toDelete = []
  games.forEach((game, key) => {
    game.player = game.player.filter(
      (player: { socket: Socket<DefaultEventsMap, DefaultEventsMap> }) =>
        player.socket !== socket,
    )
    if (game.player.length === 0) {
       toDelete.push(key)
    }
  })
  toDelete.forEach(game => games.delete(game))
}

