<template>
  <div class="icon">
    {{ player }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  player: string
}>()
</script>

<style scoped>
.icon {
  width: inherit;
  white-space: nowrap;
  background-color: white;
  text-align: center;
  border-radius: 4px;
  overflow-x: clip;
}
</style>
