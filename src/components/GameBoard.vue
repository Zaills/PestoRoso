<script setup lang="ts">
import { ref } from 'vue'
import PieceComponent from '@/components/PieceComponent.vue'
import GroundHandler from '@/components/GroundHandler.vue'
import NextPiecesHandler from '@/components/NextPiecesHandler.vue'
import HoldComponent from '@/components/HoldComponent.vue'

const cellSize = ref(22)
const height = ref(19)
const width = ref(10)

const piece = ref('N')

function addHold(type: string) {
  piece.value = type
}

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
  nextPieces.value.push({ id: nextPieces.value.length, type: nType })
}

const nextPieces = ref([
  { id: 0, type: 'O' },
  { id: 1, type: 'L' },
  { id: 2, type: 'T' },
  { id: 3, type: 'S' },
  { id: 4, type: 'I' },
])

function addGround(h: number) {
  const nArray = Array<number>(width.value).fill(1)
  nArray[Math.floor(Math.random() * width.value)] = 0
  for (let i = 0; i < h; i++) {
    ground.value.push(nArray)
  }
}

const ground = ref(Array(height.value))
addGround(3)
addGround(1)
</script>

<template>
  <button @click="newPieces(randomType())">New Pieces</button>
  <button @click="addHold(randomType())">Hold Piece</button>
  <button @click="addGround(1)">Add Ground</button>
  <div class="player">
    <div :style="{ height: cellSize * 4 + 'px', width: cellSize * 5 + 'px' }" class="holdPieces">
      <div class="HOLD">HOLD</div>
      <hold-component :piece="piece" :cell-size="cellSize" />
    </div>
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
      :style="{ height: cellSize * (5 * 3 + 1) + 'px', width: cellSize * 5 + 'px' }"
      class="nextPieces"
    >
      <div class="NEXT">NEXT</div>
      <next-pieces-handler :next-pieces="nextPieces" :cellSize="cellSize" />
    </div>
  </div>
</template>

<style scoped>
.player {
  white-space: nowrap;
  display: inline-block;
}

.player > * {
  display: inline-block;
  vertical-align: top;
  background-color: rgb(0 0 0 / 0.67);
  position: relative;
  overflow: hidden;
  border: solid 10px white;
  border-top-width: 0;
}

.game {
  border-bottom-left-radius: 10px;
  corner-bottom-left-shape: bevel;
  border-bottom-right-radius: 10px;
  corner-bottom-right-shape: bevel;
}

.holdPieces {
  border-right-width: 0;
  border-bottom-left-radius: 20px;
  corner-bottom-left-shape: bevel;
}

.HOLD {
  text-align: right;
  color: black;
  background-color: white;
}

.nextPieces {
  border-left-width: 0;
  border-bottom-right-radius: 20px;
  corner-bottom-right-shape: bevel;
}

.NEXT {
  text-align: right;
  color: black;
  background-color: white;
}
</style>
