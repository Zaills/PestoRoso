<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
const images = import.meta.glob('@/assets/backgrounds/*{jpg,jpeg,png,webp}', {
  eager: true,
  import: 'default',
})

const imageList = Object.values(images) as string[]
const selectedImage = ref('')

onMounted(() => {
  updateBackground()
})

function updateBackground() {
  if (imageList.length > 0) {
    const randomIndex = Math.floor(Math.random() * imageList.length)
    selectedImage.value = imageList[randomIndex]
  }
}

const route = useRoute()

watch(route, updateBackground)
</script>

<template>
  <div class="main-bg-container" :style="{ backgroundImage: `url(${selectedImage})` }"/>
</template>

<style scoped>
.main-bg-container {
  position: fixed; /* Stays fixed even if you scroll */
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: -1; /* Keeps it behind everything */
}

.bg-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.content-layer {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
