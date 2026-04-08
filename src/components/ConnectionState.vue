<script setup lang="ts">
import { computed } from 'vue'
import { state } from '@/socket.ts'

const connected = computed(() => state.connected)
</script>

<template>
  <p>State: {{ connected }}</p>
</template>

<style scoped></style>
