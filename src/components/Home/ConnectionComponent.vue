<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const name = ref('')
const room = ref('')
const roomInput = ref<HTMLInputElement | null>(null)
const router = useRouter()

const focusRoom = () => {
  roomInput.value?.focus()
}

const joinRoom = () => {
  if (name.value !== '' && room.value !== '') {
    router.push(room.value + '/' + name.value)
  }
}
</script>

<template>

  <input v-model="name" placeholder="Name" @keyup.enter="focusRoom" />
  <input ref="roomInput" v-model="room" placeholder="Room" @keyup.enter="joinRoom" />

  <RouterLink v-if="room != '' && name != ''" :to="room + '/' + name" class="joinButton">
    Join Room
  </RouterLink>
  <button v-else class="joinButton" disabled>Join Room</button>
</template>

<style scoped>
/* 1. Importation de la police Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');


.joinButton {
}
</style>
