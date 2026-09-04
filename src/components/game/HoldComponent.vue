<script setup lang="ts">
import PieceComponent from '@/components/game/PieceComponent.vue'
import type { PieceName, TetriminoName } from '@/game/tetrisEngine'
import { computed } from 'vue'

const props = defineProps<{
  cellSize: number
  pieceName: PieceName | null
}>()

// Penalty blocks are never held, so only the seven tetriminoes are rendered.
const heldPiece = computed<TetriminoName | null>(() =>
  props.pieceName !== null && props.pieceName !== 'penalty' ? props.pieceName : null,
)
</script>

<template>
  <!-- "I" and "O" need their own offsets to sit centred in the hold box. -->
  <piece-component
    v-if="heldPiece === 'I'"
    :type="heldPiece"
    :cellSize="props.cellSize"
    :x="2.5"
    :y="2.9"
    :r="0"
  />
  <piece-component
    v-else-if="heldPiece === 'O'"
    :type="heldPiece"
    :cellSize="props.cellSize"
    :x="2.5"
    :y="2.5"
    :r="0"
  />
  <piece-component
    v-else-if="heldPiece !== null"
    :type="heldPiece"
    :cellSize="props.cellSize"
    :x="2"
    :y="2.5"
    :r="0"
  />
</template>
