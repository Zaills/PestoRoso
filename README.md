# Red Tetris

A multiplayer Tetris built as a Vue 3 single-page application on top of a Node.js
game server. Players share a room, receive the same piece sequence, and send each
other indestructible penalty lines when they clear more than one row at a time.
The last player standing wins the round.

## Stack

| Side       | Stack                                                   |
| ---------- | ------------------------------------------------------- |
| Client     | Vue 3 (`<script setup>`), TypeScript, Vue Router, Pinia |
| Server     | Node.js, Express, Socket.IO                             |
| Build/test | Vite, Vitest, ESLint, oxlint, Prettier                  |

## Layout

```
src/
  game/          Pure game logic (tetrisEngine) and composables (useGameState, useInputHandler)
  components/    Vue components: game board, waiting room, home page
  views/         Routed pages
server/
  src/           HTTP entry point and Socket.IO event wiring
  assets/        Room and game lifecycle (gamesManager)
```

The board logic in `src/game/tetrisEngine.ts` is written with pure functions and
no `this`, as required by the subject.

## Running

Install the dependencies for both the client and the server:

```sh
npm install && npm install --prefix ./server
```

Start the client and the game server together:

```sh
npm run dev-and-server
```

The client is served on `http://localhost:5173` and the game server listens on
port `3000`. A game is joined through a URL of the form:

```
http://<host>:5173/<room>/<player_name>
```

The first player to enter a room becomes the host and is the only one who can
start the round. Once a round has started, the room is locked: later joiners
watch as viewers. A room holds at most 5 players.

## Controls

| Key   | Action    |
| ----- | --------- |
| ← / → | Move      |
| ↑     | Rotate    |
| ↓     | Soft drop |
| Space | Hard drop |
| C     | Hold      |

## Development

```sh
npm run test:unit      # unit tests (watch mode)
npm run coverage       # unit tests with a coverage report
npm run type-check     # vue-tsc
npm run lint           # oxlint + eslint, with --fix
npm run format         # prettier
npm run build          # type-check and production build
```

Node `^20.19.0 || >=22.12.0` is required.
