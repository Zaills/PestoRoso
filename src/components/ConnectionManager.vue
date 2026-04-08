<script setup lang="ts">
import { socket } from '@/socket.ts'

function connect() {
  socket.connect()
}

function disconnect() {
  socket.disconnect()
}
</script>

<template>
  <button @click="connect()">Connect</button>
  <button @click="disconnect()">Disconnect</button>
</template>

<style scoped></style>
