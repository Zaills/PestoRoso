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

const CELL_SIZE = 22
const VISIBLE_ROWS = 20
const BUFFER_ROWS = 2
const TOTAL_ROWS = VISIBLE_ROWS + BUFFER_ROWS
const COLS = 10
const PIDS = ref(Array(0))

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
  initGame,
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

function onStart(playerIds: number[]) {
  playerIds.forEach((playerId) => {
    if (playerId != props.id) {
      PIDS.value.push(playerId)
    }
  })
  console.log(playerIds)
  console.log(props.id)
}

onMounted(() => {
  socket.on('pieces_batch', onPiecesBatch)
  socket.on('more_pieces', onMorePieces)
  socket.on('get_penality', onPenality)
  socket.on('all_player', onStart)
})

onUnmounted(() => {
  socket.off('pieces_batch', onPiecesBatch)
  socket.off('more_pieces', onMorePieces)
  socket.off('get_penality', onPenality)
  socket.off('all_player', onStart)
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
</script>

<template>
  <div class="player-board">
    <div :style="{ height: CELL_SIZE * 4 + 'px', width: CELL_SIZE * 5 + 'px' }" class="hold-area">
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
      <!--      <div v-if="gameWin" class="game-win">WIN</div>-->
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

  <div class="score-panel">
    <span>Score: {{ score }}</span>
    <span>Level: {{ level }}</span>
    <span>Lines: {{ linesCount }}</span>
  </div>
  <template v-for="(id, Index) in PIDS" :key="Index">
    <SpectrumComponent :id="id" />
  </template>
</template>

<style scoped>
.player-board {
  white-space: nowrap;
  display: inline-block;
}

.player-board > div {
  display: inline-block;
  vertical-align: top;
  background-color: rgb(0 0 0 / 0.67);
  position: relative;
  overflow: visible;
  border: solid 10px white;
  border-top-width: 0;
}

.game-area {
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: var(--cell-size) var(--cell-size);
}

.buffer-separator {
  position: absolute;
  top: var(--buffer-height);
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
  pointer-events: none;
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

.game-over {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 0.7);
  color: white;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
}

.game-win {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 0.7);
  color: white;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
}

.score-panel {
  display: flex;
  gap: 16px;
  justify-content: center;
  color: white;
  padding: 8px;
  font-size: 14px;
}
</style>
