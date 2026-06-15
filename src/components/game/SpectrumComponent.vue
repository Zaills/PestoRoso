<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createEmptyBoard, PIECE_NAMES, type PieceName } from '@/game/tetrisEngine'
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import { socket } from '@/socket.ts'

const props = defineProps<{
  name: string
  cellSize?: number
}>()

const boardMatrix = ref<number[][]>(createEmptyBoard())

function onGameUpdate(gameData: { name: string; board: number[][]; isGameOver: boolean }) {
  if (gameData.name == props.name) {
    boardMatrix.value = gameData.board
  }
}

onMounted(() => {
  socket.on('game_update', onGameUpdate)
})

// Valeurs par défaut si non spécifiées
const CELL_SIZE = computed(() => props.cellSize || 12) // Plus petit par défaut (ex: 12px)
const BUFFER_ROWS = 2

interface Cell {
  x: number
  y: number
  type: PieceName
}

// Comme dans ton composant principal, on transforme la matrice 2D
// en une liste 1D de blocs pour faciliter le rendu avec v-for
const boardCells = computed<Cell[]>(() => {
  const cells: Cell[] = []
  if (!boardMatrix.value) return cells

  const totalRows = boardMatrix.value.length
  if (totalRows === 0) return cells
  const cols = boardMatrix.value[0].length

  for (let row = 0; row < totalRows; row++) {
    for (let col = 0; col < cols; col++) {
      const val = boardMatrix.value[row][col]
      if (val !== 0) {
        cells.push({ x: col, y: row, type: PIECE_NAMES[val] })
      }
    }
  }
  return cells
})

// Détermine dynamiquement la largeur et hauteur de la grille de l'adversaire
const boardWidth = computed(() => {
  const cols = boardMatrix.value?.[0]?.length || 10
  return cols * CELL_SIZE.value
})

const boardHeight = computed(() => {
  const totalRows = boardMatrix.value?.length || 22
  const visibleRows = totalRows - BUFFER_ROWS
  return visibleRows * CELL_SIZE.value
})
</script>

<template>
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
  </div>
</template>

<style scoped>
.opponent-game-area {
  background-color: rgb(0 0 0 / 0.8);
  position: relative;
  overflow: hidden;
  border: solid 2px rgba(255, 255, 255, 0.4);
  border-radius: 4px;
  display: inline-block;
  /* Grille de fond plus discrète pour l'adversaire */
  background-image:
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: var(--cell-size) var(--cell-size);
}
</style>
