<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const name = ref('')
const room = ref('')
</script>

<template>
  <input v-model="name" placeholder="Name" />
  <input v-model="room" placeholder="Room" />
  <RouterLink v-if="room != '' && name != ''" :to="room + '/' + name" class="joinButton">
    Join Room
  </RouterLink>
  <button v-else class="joinButton" disabled>Join Room</button>
</template>

<style scoped>
.joinButton {
}
</style>
