<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  onLeft: () => void
  onRight: () => void
  onDown: () => void
  onRotate: () => void
  onHardDrop: () => void
  onHold: () => void
}>()

const keyMap: Record<string, () => void> = {
  ArrowLeft: () => props.onLeft(),
  ArrowRight: () => props.onRight(),
  ArrowDown: () => props.onDown(),
  ArrowUp: () => props.onRotate(),
  ' ': () => props.onHardDrop(),
  c: () => props.onHold(),
  C: () => props.onHold(),
}

function handleKey(e: KeyboardEvent) {
  const action = keyMap[e.key]
  if (action) {
    e.preventDefault()
    action()
  }
}

onMounted(() => window.addEventListener('keydown', handleKey))
onUnmounted(() => window.removeEventListener('keydown', handleKey))
</script>

<template />
