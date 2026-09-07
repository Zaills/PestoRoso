<script setup lang="ts">
import jsonShape from '@/assets/tetriminoShape.json'
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import type { TetriminoName } from '@/game/tetrisEngine'
import { computed } from 'vue'

const props = defineProps<{
  type: TetriminoName
  cellSize: number
  x: number
  y: number
  r: number
}>()

/** Quarter turn clockwise: transpose the matrix, then mirror each row. */
function rotateClockwise(shape: number[][]): number[][] {
  const firstRow = shape[0] ?? []
  return firstRow.map((_, column) => shape.map((row) => row[column] ?? 0).reverse())
}

const Shape = computed(() => {
  let shape: number[][] = jsonShape[props.type]
  for (let i = 0; i < props.r; i++) {
    shape = rotateClockwise(shape)
  }
  return shape
})

const offset = computed(() => Math.floor(Shape.value.length / 2))
const startX = computed(() => Math.max(props.x - offset.value, 0))
const startY = computed(() => Math.max(props.y - offset.value, 0))
</script>

<template>
  <template v-for="(row, rIndex) in Shape" :key="rIndex">
    <template v-for="(cell, cIndex) in row" :key="cIndex">
      <block-renderer
        v-if="cell === 1"
        :type="props.type"
        :cellSize="props.cellSize"
        :x="startX + cIndex"
        :y="startY + rIndex"
      />
    </template>
  </template>
</template>
