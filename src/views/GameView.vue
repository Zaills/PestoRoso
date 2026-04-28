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

</script>

<template>
  <div class="game">
    <PlayerHandler :playerList="playerList" :ViewerList="spectatorList"/>
  </div>
</template>

<style scoped>
.game {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  margin: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: -1;
}
</style>
