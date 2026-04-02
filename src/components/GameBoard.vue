<script setup lang="ts">
import { ref } from 'vue'
import PieceComponent from '@/components/PieceComponent.vue'
import GroundHandler from '@/components/GroundHandler.vue'

const cellSize = ref(22)
const height = ref(19)
const width = ref(10)

const test = ref([1, 1, 1, 1])
let id = 0
const nextCells = ref([
  { id: id++, type: 'O', x: 0.5, y: 0.5, r: 0 },
  { id: id++, type: 'L', x: 5, y: 5, r: 1 },
  { id: id++, type: 'T', x: 2, y: 10, r: 2 },
])
</script>

<template>
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
      <ground-handler
        :ground="ground"
        :cell-size="cellSize"
        :y="height"
      />
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
</style>
