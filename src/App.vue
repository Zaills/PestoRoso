<script setup lang="ts">
import AppBackground from '@/components/AppBackground.vue'
import TitleComponent from '@/components/home/TitleComponent.vue'
</script>

<template>
  <!-- The background sits at the top level so it covers the whole application. -->
  <AppBackground />

  <div class="app-layout">
    <header class="main-header">
      <TitleComponent />
    </header>

    <!-- Holds the current page: connection form, waiting room or game. -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Main container, sized to the viewport so the page never scrolls. */
.app-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  height: 100vh;
  width: 100%;
  overflow: hidden;

  padding: 40px 20px;
  box-sizing: border-box; /* Required so the padding stays inside the 100vh. */
  position: relative;
  z-index: 2;
}

.main-header {
  text-align: center;
  margin-bottom: 30px; /* Fixed gap between the RED TETRIS title and the page content. */
}

/* Dynamic content area rendered by the RouterView. */
.main-content {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
