<script setup lang="ts">
import BlockRenderer from '@/components/BlockRenderer.vue'
import { computed } from 'vue'

const props = defineProps<{
  ground: Array<Array<number>>
  cellSize: number
  y: number
}>()

const groundHeight = computed(() => props.y - props.ground.length)
</script>

<template>
  <template v-for="(row, rIndex) in ground" :key="rIndex">
    <template v-for="(cell, cIndex) in row" :key="cIndex">
      <block-renderer
        v-if="cell === 1"
        :type="'empty'"
        :cellSize="props.cellSize"
        :x="cIndex"
        :y="groundHeight + rIndex"
      />
    </template>
  </template>
</template>

<style scoped></style>
