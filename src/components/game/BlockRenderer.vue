<script setup lang="ts">
defineProps<{
  type: 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L' | 'empty'
  cellSize: number
  x: number
  y: number
}>()

</script>

<template>
  <div
    :class="['cell', type]"
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
  box-sizing: content-box;
}

.cell.I {
  background-color: cyan;
}
.cell.O {
  background-color: yellow;
}
.cell.T {
  background-color: magenta;
}
.cell.S {
  background-color: lime;
}
.cell.Z {
  background-color: red;
}
.cell.J {
  background-color: blue;
}
.cell.L {
  background-color: orange;
}

.cell.empty {
  background-color: dimgrey;
}
</style>
