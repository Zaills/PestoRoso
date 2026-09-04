<script setup lang="ts">
import PieceComponent from '@/components/game/PieceComponent.vue'
import { computed } from 'vue'
import { PIECE_NAMES, type PieceId, type TetriminoName } from '@/game/tetrisEngine'

const props = defineProps<{
  cellSize: number
  pieceIds: number[]
}>()

// The queue only ever holds the seven tetriminoes, never a penalty block.
const pieces = computed<TetriminoName[]>(() =>
  props.pieceIds
    .map((id) => PIECE_NAMES[id as PieceId])
    .filter((name): name is TetriminoName => name !== 'penalty' && name !== undefined),
)
</script>

<template>
  <template v-for="(type, index) in pieces" :key="index">
    <!-- "I" and "O" need their own offsets to sit centred in their slot. -->
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
