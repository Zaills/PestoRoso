<script setup lang="ts">
import jsonShape from '@/assets/tetriminoShape.json'
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import { computed } from 'vue'

const props = defineProps<{
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
  cellSize: number
  x: number
  y: number
  r: number
}>()

const Shape = computed(() => {
  let shape: number[][] = jsonShape[props.type]
  for (let i = 0; i < props.r; i++) {
    shape = shape[0].map((val, index) => shape.map((row) => row[index]).reverse())
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

<style scoped></style>
