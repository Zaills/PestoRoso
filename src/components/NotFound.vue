<script setup lang="ts">
// The message is deliberately repeated to fill the page: the joke is the point.
const REPEAT_COUNT = 300
const MESSAGE = "Oops, it looks like the page you're looking for doesn't exist..."
</script>

<template>
  <p class="not-found">
    <template v-for="index in REPEAT_COUNT" :key="index">{{ MESSAGE }} </template>
  </p>
</template>

<style scoped>
.not-found {
  font-family: 'Titan One', sans-serif;
  font-size: 0.6rem;
  margin: 0;
}
</style>
