<script setup lang="ts">
import BlockRenderer from '@/components/game/BlockRenderer.vue'
import { computed, ref } from 'vue'

const props = defineProps<{
  height: number
  width: number
  cellSize: number
}>()

function addGround(h: number) {
  const nArray = Array<number>(props.width).fill(1)
  nArray[Math.floor(Math.random() * props.width)] = 0
  for (let i = 0; i < h; i++) {
    ground.value.push(nArray)
  }
}

const ground = ref(Array(props.height))
addGround(3)
addGround(1)

const groundHeight = computed(() => props.height - ground.value.length)

defineExpose({
  addGround,
})
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
