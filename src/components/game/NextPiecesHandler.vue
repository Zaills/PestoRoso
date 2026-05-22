<script setup lang="ts">
import PieceComponent from '@/components/game/PieceComponent.vue'
import { computed } from 'vue'
import { PIECE_NAMES, type PieceName } from '@/game/tetrisEngine'

const props = defineProps<{
  cellSize: number
  pieceIds: number[]
}>()

const pieces = computed<PieceName[]>(() => props.pieceIds.map((id) => PIECE_NAMES[id]))
</script>

<template>
  <template v-for="(type, index) in pieces" :key="index">
    <piece-component
      v-if="type === 'I'"
      :type="type"
      :cellSize="props.cellSize"
      :x="2.5"
      :y="2.5 + index * 3"
      :r="0"
    />
    <piece-component
      v-else-if="type === 'O'"
      :type="type"
      :cellSize="props.cellSize"
      :x="2.5"
      :y="2 + index * 3"
      :r="0"
    />
    <piece-component
      v-else
      :type="type"
      :cellSize="props.cellSize"
      :x="2"
      :y="2 + index * 3"
      :r="0"
    />
  </template>
</template>
