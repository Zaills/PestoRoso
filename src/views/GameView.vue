<script setup lang="ts">
import PlayerHandler from '@/components/game/PlayerHandler.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { socket } from '@/socket.ts'
import router from '@/router'

const playerList = ref([])
const spectatorList = ref([])

onMounted(() => {
  if (socket.connected) return
  socket.connect()
  const url = window.location.href
  const length = url.split('/').length
  if (length !== 5) {
    router.push('home')
    return
  }
  const room = url.split('/')[length - 2]
  const name = url.split('/')[length - 1]
  if (name === '' || room == 'roomId') {
    router.push('home')
    return
  }
  socket.emit('join_room', { room: room, name: name })
})

socket.on('room_update', (players, spectators) => {
  playerList.value = players
  spectatorList.value = spectators
})

onUnmounted(() => {
  socket.disconnect()
})

function debug() {
  console.log(playerList.value)
  console.log(spectatorList.value)
}
</script>

<template>
  <div class="game">
    <button @click="debug">Debug</button>
    <template v-for="(player, index) in playerList" :key="index">
      {{ player }}
    </template>

    <template v-for="(spectator, index) in spectatorList" :key="index">
      {{ spectator }}
    </template>
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
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
