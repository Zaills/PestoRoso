<script setup lang="ts">
import type { PieceName } from '@/game/tetrisEngine'

defineProps<{
  type: PieceName
  cellSize: number
  x: number
  y: number
  ghost?: boolean
}>()
</script>

<template>
  <div
    :class="['cell', type, { ghost }]"
    :style="{
      height: cellSize + 'px',
      width: cellSize + 'px',
      left: x * cellSize + 'px',
      top: y * cellSize + 'px',
    }"
  />
</template>

<style scoped>
.cell {
  position: absolute;
  box-sizing: border-box;
  border: 1px solid rgba(0, 0, 0, 0.45);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.35),
    inset -1px -1px 0 rgba(0, 0, 0, 0.2);
}

.cell.I {
  background-color: #0ad2ff;
}
.cell.O {
  background-color: #0fffdb;
}
.cell.T {
  background-color: #9500ff;
}
.cell.S {
  background-color: #b4e600;
}
.cell.Z {
  background-color: #ff0059;
}
.cell.J {
  background-color: #2962ff;
}
.cell.L {
  background-color: #ff8c00;
}

/* Penalty lines received from opponents: flat grey, they cannot be cleared. */
.cell.penalty {
  background-color: #6a6a6a;
  box-shadow: none;
}

/* Landing preview of the current piece. */
.cell.ghost {
  opacity: 0.3;
}
</style>
