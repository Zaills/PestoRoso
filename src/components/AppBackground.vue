<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'

const images = import.meta.glob('@/assets/backgrounds/*{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
})

const imageList = Object.values(images) as string[]
const selectedImage = ref('')
const route = useRoute()

// A new random picture is drawn on every navigation.
function updateBackground() {
  const randomIndex = Math.floor(Math.random() * imageList.length)
  selectedImage.value = imageList[randomIndex] ?? ''
}

onMounted(updateBackground)
watch(route, updateBackground)
</script>

<template>
  <div class="main-bg-container" :style="{ backgroundImage: `url(${selectedImage})` }" />
</template>

<style scoped>
.main-bg-container {
  position: fixed; /* Stays in place even if the page scrolls. */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1000; /* Keeps it behind everything else. */
}
</style>
