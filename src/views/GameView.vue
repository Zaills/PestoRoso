<script setup lang="ts">
import PlayerHandler from '@/components/game/PlayerHandler.vue'
import { onMounted, onUnmounted } from 'vue'
import { socket } from '@/socket.ts'
import router from '@/router'

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

onUnmounted(() => {
  socket.disconnect()
})
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
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
