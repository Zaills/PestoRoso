<script setup lang="ts">
import PlayerHandler from '@/components/game/PlayerHandler.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { socket } from '@/socket.ts'

const playerList = ref([])
const spectatorList = ref([])
const router = useRouter()

function onRoomDenied() {
  socket.disconnect()
  router.push('/')
  alert('error: room access denied')
}

const URL = `http://${window.location.hostname}:3000/api/status`

onMounted(() => {
  fetch(URL).catch(() => {
    socket.disconnect()
    router.push('/')
    alert('error: server inaccessible, contact support')
  })

  socket.on('room_denied', onRoomDenied)
  socket.connect()
  const url = window.location.href
  const length = url.split('/').length

  const room = url.split('/')[length - 2]
  const name = url.split('/')[length - 1]
  socket.emit('join_room', { room: room, name: name })
})

socket.on('room_update', (players, spectators) => {
  playerList.value = players
  spectatorList.value = spectators
})

onUnmounted(() => {
  socket.off('room_denied', onRoomDenied)
  socket.disconnect()
})
</script>

<template>
  <div class="game">
    <PlayerHandler :playerList="playerList" :ViewerList="spectatorList" />
  </div>
</template>

<style scoped>
.game {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
