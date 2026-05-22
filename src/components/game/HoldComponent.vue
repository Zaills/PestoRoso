<script setup lang="ts">
import PieceComponent from '@/components/game/PieceComponent.vue'
import type { PieceName } from '@/game/tetrisEngine'

const props = defineProps<{
  cellSize: number
  pieceName: PieceName | null
}>()
</script>

<template>
  <piece-component
    v-if="props.pieceName === 'I'"
    :type="props.pieceName"
    :cellSize="props.cellSize"
    :x="2.5"
    :y="2.9"
    :r="0"
  />
  <piece-component
    v-else-if="props.pieceName === 'O'"
    :type="props.pieceName"
    :cellSize="props.cellSize"
    :x="2.5"
    :y="2.5"
    :r="0"
  />
  <piece-component
    v-else-if="props.pieceName !== null"
    :type="props.pieceName"
    :cellSize="props.cellSize"
    :x="2"
    :y="2.5"
    :r="0"
  />
</template>
