<script setup lang="ts">
import PieceComponent from '@/components/PieceComponent.vue'
import { ref } from 'vue'

const nextPieces = ref([
  { id: 0, type: 'O' },
  { id: 1, type: 'L' },
  { id: 2, type: 'T' },
  { id: 3, type: 'S' },
  { id: 4, type: 'I' },
])

function newPieces(nType: string) {
  nextPieces.value.reverse().pop()
  nextPieces.value.reverse()
  nextPieces.value.forEach((piece) => {
    piece.id = piece.id - 1
  })
  nextPieces.value.push({ id: nextPieces.value.length, type: nType })
}

defineExpose({
  newPieces,
})

defineProps<{
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
      :y="2.5 + index * 3"
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
