<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { socket } from '@/socket.ts'

const validKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ']

function handleKey(e: KeyboardEvent) {
  if (validKey.includes(e.key)) {
    socket.emit('key_press', e.key)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKey)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKey)
})
</script>

<template/>

<style scoped></style>
