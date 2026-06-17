<script setup lang="ts">
import GameBoard from '@/components/game/GameBoard.vue'
import { ref } from 'vue'
import WaitingRoom from '@/components/waitingRoom/waitingRoom.vue'
import { socket } from '@/socket.ts'

const gameStarted = ref<boolean>(false)
const ID = ref<number>(0)

socket.on('game_status', (started: boolean) => {
  gameStarted.value = started
})
socket.on('you_join', onJoin)

function onJoin(id: number) {
  ID.value = id
  console.log(id)
}
defineProps<{
  playerList: string[]
  ViewerList: string[]
}>()
</script>

<template>
  <div class="player-handler">
    <waiting-room v-if="!gameStarted" :playerList="playerList" :ViewerList="ViewerList" />
    <GameBoard v-if="gameStarted" :id="ID" />
    <!--    <button @click="gameStarted = !gameStarted">debug</button>-->
  </div>
</template>

<style scoped>
.player-handler {
  display: flex;
  flex-direction: column;
  width: 30%;
  align-content: center;
  justify-content: center;
}
</style>
