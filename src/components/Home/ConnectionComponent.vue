<script setup lang="ts">
import { ref } from 'vue'
import { socket } from '@/socket.ts'
import router from '@/router'
import { RouterLink } from 'vue-router'

const name = ref('')
const room = ref('')
const buttonText = ref('Create Room')

function roomUpdated() {
  if (room.value === '') buttonText.value = 'Create Room'
  else buttonText.value = 'Join Room'
}

function joinRoom() {
  if (name.value === '') {
    router.push('home')
    return
  }
  if (room.value === '') {
    room.value = Math.random().toString(36).slice(2)
  }

  if (room.value === 'roomId') {
    router.push('home')
    return
  }

  console.log(name)
  socket.connect()
}
</script>

<template>
  <input v-model="name" placeholder="Name" />
  <input v-model="room" placeholder="Room" @input="roomUpdated" />
  <RouterLink
    v-if="room != 'roomId' && name != ''"
    :to="room + '/' + name"
    @click="joinRoom()"
    class="joinButton"
    >{{ buttonText }}</RouterLink
  >
  <button v-else class="joinButton" disabled>{{ buttonText }}</button>
</template>

<style scoped>
.joinButton {
}
</style>
