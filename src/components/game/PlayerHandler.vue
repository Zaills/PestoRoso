<script setup lang="ts">
import GameBoard from '@/components/game/GameBoard.vue'
import { ref } from 'vue'
import WaitingRoom from '@/components/waitingRoom/waitingRoom.vue'

const gameStarted = ref<boolean>(false)

defineProps<{
  playerList: string[]
  ViewerList: string[]
}>()
</script>

<template>
  <div class="player-handler">
    <waiting-room v-if="!gameStarted" :playerList="playerList" :ViewerList="ViewerList" />
    <GameBoard v-if="gameStarted" />
    <button @click="gameStarted = !gameStarted">debug</button>
  </div>
</template>

<style scoped>
.player-handler {
  display: flex;
  flex-direction: column;
  width: 33%;
  align-content: center;
  justify-content: center;
}
</style>
