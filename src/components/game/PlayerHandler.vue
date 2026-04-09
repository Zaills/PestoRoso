<script setup lang="ts">
import GameBoard from '@/components/game/GameBoard.vue'
import { ref } from 'vue'
import WaitingRoom from '@/components/waitingRoom/waitingRoom.vue'

const gameStarted = ref<boolean>(false);

</script>

<template>
  <div>
    <button @click="gameStarted = !gameStarted">start Game</button>
    <waiting-room v-if="!gameStarted"/>
    <GameBoard v-if="gameStarted" />
  </div>
</template>

<style scoped>


</style>
