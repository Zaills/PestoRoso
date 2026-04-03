<script setup lang="ts">
import PieceComponent from '@/components/PieceComponent.vue'
import { ref } from 'vue'

defineProps<{
  piece: string
  cellSize: number
}>()
</script>

<template>
  <piece-component
    v-if="piece === 'I'"
    :type="piece"
    :cellSize="cellSize"
    :x="2.5"
    :y="3.90"
    :r="0"
  />
  <piece-component
    v-else-if="piece === 'O'"
    :type="piece"
    :cellSize="cellSize"
    :x="2.5"
    :y="2.5"
    :r="0"
  />
  <piece-component
    v-else
    :type="piece"
    :cellSize="cellSize"
    :x="2"
    :y="2.5"
    :r="0"
  />
</template>

<style scoped></style>
