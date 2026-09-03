<script setup lang="ts">
import GameBoard from '@/components/game/GameBoard.vue'
import ViewerBoard from '@/components/game/ViewerBoard.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WaitingRoom from '@/components/waitingRoom/waitingRoom.vue'
import { socket } from '@/socket.ts'

const gameStarted = ref<boolean>(false)
const ID = ref<number>(0)
const role = ref<'player' | 'spectator'>('player')
const isHost = ref<boolean>(false)

const isSpectator = computed(() => role.value === 'spectator')

function onGameStatus(started: boolean) {
  gameStarted.value = started
}

function onJoin(id: number) {
  ID.value = id
}

function onRole(newRole: 'player' | 'spectator') {
  role.value = newRole
}

function onHost(host: boolean) {
  isHost.value = host
}

onMounted(() => {
  socket.on('game_status', onGameStatus)
  socket.on('you_join', onJoin)
  socket.on('role_update', onRole)
  socket.on('host_update', onHost)
})

onUnmounted(() => {
  socket.off('game_status', onGameStatus)
  socket.off('you_join', onJoin)
  socket.off('role_update', onRole)
  socket.off('host_update', onHost)
})

defineProps<{
  playerList: string[]
  ViewerList: string[]
}>()
</script>

<template>
  <div class="player-handler">
    <waiting-room
      v-if="!gameStarted"
      :playerList="playerList"
      :ViewerList="ViewerList"
      :isHost="isHost"
    />
    <ViewerBoard v-else-if="isSpectator" />
    <GameBoard v-else :id="ID" />
  </div>
</template>

<style scoped>
.player-handler {
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
  justify-content: center;
}
</style>
