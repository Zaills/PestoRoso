<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import NextPiecesHandler from '@/components/game/NextPiecesHandler.vue'
import HoldComponent from '@/components/game/HoldComponent.vue'
import InputHandler from '@/components/game/InputHandler.vue'
import { socket } from '@/socket'
import { PIECE_NAMES, type PieceId, type PieceName } from '@/game/tetrisEngine'
import { useGameState } from '@/game/useGameState'
import SpectrumComponent from '@/components/game/SpectrumComponent.vue'

const CELL_SIZE = 26
const OPPONENT_CELL_SIZE = 12
const VISIBLE_ROWS = 20
const BUFFER_ROWS = 2
const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS
const COLS = 10

interface RosterEntry {
  id: number
  name: string
}

const opponents = ref<RosterEntry[]>([])
const selfName = ref<string>('')
const winnerId = ref<number | null>(null)
const winnerName = ref<string>('')
const isGameFinished = ref(false)

const props = defineProps<{
  id: number
}>()

const {
  board,
  currentPiece,
  ghostPieceY,
  heldPieceName,
  nextPieceIds,
  score,
  level,
  linesCount,
  isGameOver,
  isWinner,
  initGame,
  winGame,
  addPieces,
  penalityLine,
  moveLeft,
  moveRight,
  softDrop,
  rotate,
  hardDrop,
  hold,
} = useGameState()

function onPiecesBatch(pieces: number[]) {
  initGame(pieces)
}

function onMorePieces(pieces: number[]) {
  addPieces(pieces)
}

function onPenality(lines: number) {
  penalityLine(lines)
}

function onStart(roster: RosterEntry[]) {
  winnerId.value = null
  winnerName.value = ''
  isGameFinished.value = false
  opponents.value = roster.filter((player) => player.id !== props.id)
  selfName.value = roster.find((player) => player.id === props.id)?.name ?? ''
}

// La partie est terminée : il ne reste qu'un joueur en lice.
function onGameEnd(payload: { winnerId: number | null; winnerName: string | null }) {
  winnerId.value = payload.winnerId
  winnerName.value = payload.winnerName ?? ''
  isGameFinished.value = true
  if (payload.winnerId === props.id) winGame()
}

onMounted(() => {
  socket.on('pieces_batch', onPiecesBatch)
  socket.on('more_pieces', onMorePieces)
  socket.on('get_penality', onPenality)
  socket.on('all_player', onStart)
  socket.on('game_end', onGameEnd)
})

onUnmounted(() => {
  socket.off('pieces_batch', onPiecesBatch)
  socket.off('more_pieces', onMorePieces)
  socket.off('get_penality', onPenality)
  socket.off('all_player', onStart)
  socket.off('game_end', onGameEnd)
})

interface Cell {
  x: number
  y: number
  type: PieceName
}

const boardCells = computed<Cell[]>(() => {
  const cells: Cell[] = []
  for (let row = 0; row < TOTAL_ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const val: number = board.value[row]![col]!
      if (val !== 0) {
        cells.push({ x: col, y: row, type: PIECE_NAMES[val as PieceId] })
      }
    }
  }
  return cells
})

const currentPieceCells = computed<Cell[]>(() => {
  if (!currentPiece.value) return []
  const p = currentPiece.value
  const type = PIECE_NAMES[p.pieceId]
  const cells: Cell[] = []
  for (let r = 0; r < p.matrix.length; r++) {
    for (let c = 0; c < p.matrix[r]!.length; c++) {
      if (p.matrix[r]![c] !== 0) {
        cells.push({ x: p.x + c, y: p.y + r, type })
      }
    }
  }
  return cells
})

const ghostCells = computed<Cell[]>(() => {
  if (!currentPiece.value) return []
  const p = currentPiece.value
  const gy = ghostPieceY.value
  if (gy === p.y) return []
  const type = PIECE_NAMES[p.pieceId]
  const cells: Cell[] = []
  for (let r = 0; r < p.matrix.length; r++) {
    for (let c = 0; c < p.matrix[r]!.length; c++) {
      if (p.matrix[r]![c] !== 0) {
        cells.push({ x: p.x + c, y: gy + r, type })
      }
    }
  }
  return cells
})

const selfLabel = computed(() => selfName.value || 'YOU')

// Au delà de deux adversaires, les spectres passent en grille 2 x 2.
const opponentColumns = computed(() => (opponents.value.length > 2 ? 2 : 1))
</script>

<template>
  <div class="game-layout">
    <section class="own-column">
      <div class="board-frame">

        <div class="player-board">
          <div
            :style="{ height: CELL_SIZE * 4 + 'px', width: CELL_SIZE * 5 + 'px' }"
            class="hold-area"
          >
            <div class="label">HOLD</div>
            <HoldComponent :cell-size="CELL_SIZE" :piece-name="heldPieceName" />
          </div>

          <div
            :style="{
              height: CELL_SIZE * VISIBLE_ROWS + 'px',
              width: CELL_SIZE * COLS + 'px',
              '--cell-size': CELL_SIZE + 'px',
            }"
            class="game-area"
          >
            <BlockRenderer
              v-for="(cell, i) in boardCells"
              :key="`b-${i}`"
              :type="cell.type"
              :cell-size="CELL_SIZE"
              :x="cell.x"
              :y="cell.y - BUFFER_ROWS"
            />
            <BlockRenderer
              v-for="(cell, i) in ghostCells"
              :key="`g-${i}`"
              :type="cell.type"
              :cell-size="CELL_SIZE"
              :x="cell.x"
              :y="cell.y - BUFFER_ROWS"
              :ghost="true"
            />
            <BlockRenderer
              v-for="(cell, i) in currentPieceCells"
              :key="`p-${i}`"
              :type="cell.type"
              :cell-size="CELL_SIZE"
              :x="cell.x"
              :y="cell.y - BUFFER_ROWS"
            />

            <div v-if="isGameOver" class="game-over">GAME OVER</div>
            <div v-else-if="isWinner" class="game-win">WIN</div>
          </div>

          <div
            :style="{ height: CELL_SIZE * (5 * 3 + 1) + 'px', width: CELL_SIZE * 5 + 'px' }"
            class="next-area"
          >
            <div class="label">NEXT</div>
            <NextPiecesHandler :cell-size="CELL_SIZE" :piece-ids="nextPieceIds" />
          </div>

          <InputHandler
            :on-left="moveLeft"
            :on-right="moveRight"
            :on-down="softDrop"
            :on-rotate="rotate"
            :on-hard-drop="hardDrop"
            :on-hold="hold"
          />
        </div>
      </div>

      <div class="score-panel">
        <span>Score: {{ score }}</span>
        <span>Level: {{ level }}</span>
        <span>Lines: {{ linesCount }}</span>
      </div>

      <div v-if="isGameFinished" class="end-banner">
        <span v-if="winnerName">{{ winnerName }} WINS THE GAME</span>
        <span v-else>GAME OVER</span>
        <small>RELOAD THE PAGE TO PLAY AGAIN</small>
      </div>
    </section>

    <aside v-if="opponents.length" class="opponents">
      <div
        class="opponents-grid"
        :style="{ gridTemplateColumns: `repeat(${opponentColumns}, auto)` }"
      >
        <SpectrumComponent
          v-for="opponent in opponents"
          :key="opponent.id"
          :id="opponent.id"
          :name="opponent.name"
          :cell-size="OPPONENT_CELL_SIZE"
          :won="winnerId === opponent.id"
        />
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Trois colonnes égales sur les côtés : le plateau reste centré dans la page,
   quel que soit le nombre de spectres affichés à droite. */
.game-layout {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: start;
  column-gap: 24px;
  width: 100%;
}

.own-column {
  grid-column: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.board-frame {
  display: flex;
  flex-direction: column;
}

/* Bandeau sur toute la largeur du cadre : il ferme le haut du plateau
   au lieu de flotter au-dessus de la zone d'apparition des pièces. */
.own-name {
  color: #ffffff;
  background-color: #bf1818;
  border-radius: 10px 10px 0 0;
  padding: 4px 16px;
  font-size: 1rem;
  letter-spacing: 2px;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.player-board {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  white-space: nowrap;
}

.player-board > div {
  background-color: rgb(0 0 0 / 0.67);
  position: relative;
  overflow: visible;
  border: solid 10px white;
  border-top-width: 0;
  box-sizing: content-box;
  flex: none;
}

.game-area {
  /* Les deux lignes tampon d'apparition sont clippées : une pièce qui naît
     ne déborde plus au-dessus du cadre, sur le bandeau du joueur. */
  overflow: hidden;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: var(--cell-size) var(--cell-size);
}

.hold-area {
  border-right-width: 0;
  border-bottom-left-radius: 20px;
}

.next-area {
  border-left-width: 0;
  border-bottom-right-radius: 20px;
}

.label {
  text-align: right;
  color: black;
  background-color: white;
}

.game-over,
.game-win {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 0.7);
  color: white;
  font-size: 28px;
  font-weight: bold;
  letter-spacing: 2px;
}

.game-win {
  color: #ffd21f;
}

.score-panel {
  display: flex;
  gap: 16px;
  justify-content: center;
  color: white;
  padding: 4px;
  font-size: 14px;
}

.end-banner {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  color: #ffd21f;
  background-color: rgb(0 0 0 / 0.7);
  border: 2px solid #ffd21f;
  border-radius: 4px;
  padding: 6px 16px;
  font-size: 0.9rem;
  letter-spacing: 2px;
  text-align: center;
  max-width: 100%;
}

.end-banner small {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.65rem;
  letter-spacing: 1px;
}

/* Panneau des adversaires : collé à droite du plateau, sans cadre. */
.opponents {
  grid-column: 3;
  justify-self: start;
}

.opponents-grid {
  display: grid;
  gap: 16px;
  justify-items: center;
  align-items: start;
}
</style>
