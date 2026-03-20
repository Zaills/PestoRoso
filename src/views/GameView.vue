<script setup lang="ts">
import PlayerHandler from '@/components/PlayerHandler.vue'
</script>

<template>
  <div class="game">
    <PlayerHandler></PlayerHandler>
  </div>
</template>

<style scoped>
.game {
  width: 100px;
  height: 100px;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  margin: auto;
}
</style>
