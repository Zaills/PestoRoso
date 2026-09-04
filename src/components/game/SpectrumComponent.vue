<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  BUFFER_ROWS,
  COLS,
  createEmptyBoard,
  PIECE_NAMES,
  TOTAL_ROWS,
  type PieceId,
  type PieceName,
} from '@/game/tetrisEngine'
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import { socket } from '@/socket.ts'

const props = defineProps<{
  id: number
  name?: string
  cellSize?: number
  won?: boolean
}>()

const boardMatrix = ref<number[][]>(createEmptyBoard())
const isGameOver = ref(false)

function onGameUpdate(gameData: {
  name: string
  board: number[][]
  isGameOver: boolean
  id: number
}): void {
  if (gameData.id == props.id) {
    boardMatrix.value = gameData.board
    isGameOver.value = gameData.isGameOver
  }
}

onMounted(() => {
  socket.on('game_update', onGameUpdate)
})

onUnmounted(() => {
  socket.off('game_update', onGameUpdate)
})

const DEFAULT_CELL_SIZE = 12

const CELL_SIZE = computed(() => props.cellSize || DEFAULT_CELL_SIZE)

interface Cell {
  x: number
  y: number
  type: PieceName
}

// As on the player board, the 2D matrix is flattened into a list of blocks
// so it can be rendered with a single v-for.
const boardCells = computed<Cell[]>(() => {
  const cells: Cell[] = []
  if (!boardMatrix.value) return cells

  const totalRows = boardMatrix.value.length
  if (totalRows === 0) return cells
  const cols = boardMatrix.value[0]?.length ?? 0

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < cols; col++) {
      const val = boardMatrix.value[row]?.[col] ?? 0
      if (val !== 0) {
        cells.push({ x: col, y: row, type: PIECE_NAMES[val as PieceId] })
      }
    }
  }
  return cells
})

// The opponent grid is sized from the board actually received over the socket.
const boardWidth = computed(() => {
  const cols = boardMatrix.value?.[0]?.length || COLS
  return cols * CELL_SIZE.value
})

const boardHeight = computed(() => {
  const totalRows = boardMatrix.value?.length || TOTAL_ROWS
  const visibleRows = totalRows - BUFFER_ROWS
  return visibleRows * CELL_SIZE.value
})

const displayName = computed(() => props.name || `PLAYER ${props.id}`)
</script>

<template>
  <div class="opponent" :class="{ dead: isGameOver, winner: won }">
    <span class="opponent-name" :style="{ maxWidth: boardWidth + 'px' }">{{ displayName }}</span>
    <div
      class="opponent-game-area"
      :style="{
        width: boardWidth + 'px',
        height: boardHeight + 'px',
        '--cell-size': CELL_SIZE + 'px',
      }"
    >
      <BlockRenderer
        v-for="(cell, i) in boardCells"
        :key="`op-b-${i}`"
        :type="cell.type"
        :cell-size="CELL_SIZE"
        :x="cell.x"
        :y="cell.y - BUFFER_ROWS"
      />
      <div v-if="won" class="overlay win">WIN</div>
      <div v-else-if="isGameOver" class="overlay game-over">GAME<br />OVER</div>
    </div>
  </div>
</template>

<style scoped>
.opponent {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.opponent-name {
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: #ffffff;
  background-color: #222222;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  padding: 2px 8px;
  box-sizing: border-box;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opponent.dead .opponent-name {
  color: rgba(255, 255, 255, 0.45);
}

.opponent.winner .opponent-name {
  color: #ffd21f;
  border-color: #ffd21f;
}

.overlay {
  position: absolute;
  inset: 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgb(0 0 0 / 0.7);
  color: white;
  font-size: 0.9rem;
  font-weight: bold;
  letter-spacing: 2px;
  line-height: 1.1;
}

.overlay.win {
  color: #ffd21f;
}

.opponent-game-area {
  background-color: rgb(0 0 0 / 0.8);
  position: relative;
  overflow: hidden;
  border: solid 2px rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  /* Fainter background grid than on the player board. */
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: var(--cell-size) var(--cell-size);
}

.opponent.winner .opponent-game-area {
  border-color: #ffd21f;
}
</style>
