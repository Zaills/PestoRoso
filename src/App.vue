<script setup lang="ts">
import AppBackground from '@/components/AppBackground.vue'
import TitleComponent from '@/components/home/TitleComponent.vue'
</script>

<template>
  <AppBackground />

  <div class="app-layout">
    <header class="main-header">
      <TitleComponent />
    </header>

    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  height: 100dvh;
  width: 100%;
  overflow: hidden;

  padding: 40px 20px;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
}

.main-header {
  text-align: center;
  margin-bottom: 30px;
}

.main-content {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
