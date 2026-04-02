<script setup lang="ts">
import { ref } from 'vue'
import PieceComponent from '@/components/PieceComponent.vue'
import GroundHandler from '@/components/GroundHandler.vue'
import NextPiecesHandler from '@/components/NextPiecesHandler.vue'

const cellSize = ref(22)
const height = ref(19)
const width = ref(10)

let id = 0
const nextCells = ref([
  { id: id++, type: 'O', x: 0.5, y: 0.5, r: 0 },
  { id: id++, type: 'L', x: 5, y: 5, r: 1 },
  { id: id++, type: 'T', x: 2, y: 10, r: 2 },
  { id: id++, type: 'I', x: 6, y: 13, r: 1 },
])

function randomType(): string {
  const types = ['I', 'J', 'L', 'O', 'S', 'T', 'Z']
  return types[Math.floor(Math.random() * types.length)]
}

function newPieces(nType: string) {
  nextPieces.value.reverse().pop()
  nextPieces.value.reverse()
  nextPieces.value.forEach((piece) => {
    piece.id = id - 1
  })
  nextPieces.value.push({ id: 5, type: nType })
}

const nextPieces = ref([
  { id: 0, type: 'O' },
  { id: 1, type: 'L' },
  { id: 2, type: 'T' },
  { id: 3, type: 'S' },
  { id: 4, type: 'I' },
  { id: 5, type: 'J' },
])

const ground = ref([
  [1, 1, 0, 1],
  [1, 0, 1, 1, 0, 0, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
])
</script>

<template>
  <button @click="newPieces(randomType())">New Pieces (Random)</button>
  <div class="player">
    <div :style="{ height: cellSize * height + 'px', width: cellSize * width + 'px' }" class="game">
      <piece-component
        v-for="cell in nextCells"
        :key="cell.id"
        :type="cell.type"
        :cellSize="cellSize"
        :x="cell.x"
        :y="cell.y"
        :r="cell.r"
      />
      <ground-handler :ground="ground" :cell-size="cellSize" :y="height" />
    </div>
    <div
      :style="{ height: cellSize * (6 * 3 + 1) + 'px', width: cellSize * 5 + 'px' }"
      class="nextPieces"
    >
      <next-pieces-handler :next-pieces="nextPieces" :cellSize="cellSize" />
    </div>
  </div>
</template>

<style scoped>
.player {
  white-space: nowrap;
  display: inline-block;
  background: #e2f5ec;
  color: #222;
  border: solid 1px #b7b7b7;
}

.player > * {
  display: inline-block;
  vertical-align: top;
}

.game {
  position: relative;
  outline: solid 1px gray;
  background-color: black;
  overflow: hidden;
}

.nextPieces {
  position: relative;
  outline: solid 1px gray;
  background-color: black;
  overflow: hidden;
}
</style>
