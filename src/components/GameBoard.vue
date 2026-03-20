<script setup lang="ts">
import PieceComponent from '@/components/PieceComponent.vue'
import { ref } from 'vue'

const test = ref([1, 1, 1, 1])
</script>

<template>
  <div class="player">
    <div :style="{ height: 22 * 19 + 'px', width: 22 * 10 + 'px' }" class="game">
      <piece-component v-for="index in test" :key="index"> </piece-component>
    </div>
  </div>
</template>

<style scoped>
.player {
  white-space: nowrap;
  display: inline-block;
  background: #e2f5ec;
  color: #222;
  border: solid 1px #b7b7b7;
}

.player > * {
  display: inline-block;
  vertical-align: top;
}

.game {
  position: relative;
  outline: solid 1px gray;
  background-color: black;
  overflow: hidden;
}
</style>
