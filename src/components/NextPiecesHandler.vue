<script setup lang="ts">
import PieceComponent from '@/components/PieceComponent.vue'

defineProps<{
  nextPieces: { id: number; type: string }[]
  cellSize: number
}>()
</script>

<template>
    <template v-for="(piece, index) in nextPieces" :key="index">
      <piece-component
        v-if="piece.type === 'I'"
        :type="piece.type"
        :cellSize="cellSize"
        :x="2.5"
        :y="3.5 + index * 3"
        :r="0"
      />
      <piece-component
        v-else-if="piece.type === 'O'"
        :type="piece.type"
        :cellSize="cellSize"
        :x="2.5"
        :y="2 + index * 3"
        :r="0"
      />
      <piece-component
        v-else
        :type="piece.type"
        :cellSize="cellSize"
        :x="2"
        :y="2 + index * 3"
        :r="0"
      />
    </template>
</template>

<style scoped></style>
