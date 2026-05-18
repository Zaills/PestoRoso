import type { DefaultEventsMap, Socket } from 'socket.io'

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
  const playerList: string[] = []
  const spectatorList: string[] = []

  gameRoom.players.forEach((player: { name: string } | undefined) => {
    if (player !== undefined) playerList.push(player.name)
  })
  gameRoom.spectators.forEach((player: { name: string } | undefined) => {
    if (player !== undefined) spectatorList.push(player.name)
  })

  gameRoom.players.forEach(
    (
      player:
        | { socket: { emit: (arg0: string, arg1: string[], arg2: string[]) => void } }
        | undefined,
    ) => {
      if (player !== undefined) player.socket.emit('room_update', playerList, spectatorList)
    },
  )
  gameRoom.spectators.forEach(
    (
      player:
        | { socket: { emit: (arg0: string, arg1: string[], arg2: string[]) => void } }
        | undefined,
    ) => {
      if (player !== undefined) player.socket.emit('room_update', playerList, spectatorList)
    },
  )
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
    }
  })
  toDelete.forEach((game) => games.delete(game))
}

export function startGame(room: string, name: string, socket: Socket) {
  if (games.has(room) && games.get(room).players[0].name == name && games.get(room).players[0].socket == socket) {
    const gameRoom = games.get(room)
    gameRoom.started = true
    //generate pieces

    gameRoom.players.forEach(
      (
        player:
          | { socket: { emit: (arg0: string, arg1: boolean) => void } }
          | undefined,
      ) => {
        if (player !== undefined) player.socket.emit('game_status', true)
      },
    )
    gameRoom.spectators.forEach(
      (player: { socket: { emit: (arg0: string, arg1: boolean) => void } } | undefined) => {
        if (player !== undefined) player.socket.emit('game_status', true)
      },
    )
  }
}

export function changeTeam(room: string, name: string, socket: Socket) {
  if (!games.has(room) && name != null) return
  const gameRoom = games.get(room)!
  const player = gameRoom.players.find((player: { name: string }) => player.name === name)
  if (player !== undefined) {
    gameRoom.spectators.push(player)
    gameRoom.players = gameRoom.players.filter(
      (player: { socket: Socket }) => player.socket !== socket,
    )
  } else {
    const player = gameRoom.spectators.find((player: { name: string }) => player.name === name)
    if (player !== undefined) {
      gameRoom.players.push(player)
      gameRoom.spectators = gameRoom.spectators.filter(
        (player: { socket: Socket }) => player.socket !== socket,
      )
    } else {
      return
    }
  }
  updateGameRoom(room)
}
