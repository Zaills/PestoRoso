<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import PieceComponent from '@/components/game/PieceComponent.vue'
import GroundHandler from '@/components/game/GroundHandler.vue'
import NextPiecesHandler from '@/components/game/NextPiecesHandler.vue'
import HoldComponent from '@/components/game/HoldComponent.vue'
import InputHandler from '@/components/game/InputHandler.vue'

const cellSize = ref(22)
const height = ref(19)
const width = ref(10)

const nextRef = useTemplateRef('nextChild')

function nextClicked() {
  nextRef.value.newPieces(randomType())
}

const holdRef = useTemplateRef('holdChild')

function holdClicked() {
  holdRef.value.addHold(randomType())
}

const groundRef = useTemplateRef('groundChild')

function groundClicked() {
  groundRef.value.addGround(1)
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
</script>

<template>
  <button @click="nextClicked">New Pieces</button>
  <button @click="holdClicked">Hold Piece</button>
  <button @click="groundClicked">Add Ground</button>
  <input-handler/>
  <div class="player">
    <div :style="{ height: cellSize * 4 + 'px', width: cellSize * 5 + 'px' }" class="holdPieces">
      <div class="HOLD">HOLD</div>
      <hold-component :cell-size="cellSize" ref="holdChild" />
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
      <ground-handler :height="height" :width="width" :cell-size="cellSize" ref="groundChild" />
    </div>
    <div
      :style="{ height: cellSize * (5 * 3 + 1) + 'px', width: cellSize * 5 + 'px' }"
      class="nextPieces"
    >
      <div class="NEXT">NEXT</div>
      <next-pieces-handler :cellSize="cellSize" ref="nextChild" />
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
