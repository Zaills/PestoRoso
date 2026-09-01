<script setup lang="ts">
import AppBackground from '@/components/AppBackgroud.vue'
import TitleComponent from '@/components/Home/TitleComponent.vue'
</script>

<template>
  <!-- Le fond est mis au premier niveau pour couvrir toute l'application -->
  <AppBackground />

  <div class="app-layout">
    <header class="main-header">
      <TitleComponent />
    </header>

    <!-- Le composant main contient la page actuelle (formulaire de connexion, jeu, etc.) -->
    <main class="main-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
/* Conteneur principal qui prend tout l'écran */
.app-layout {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;

  /* On change ici */
  height: 100vh; /* Hauteur stricte de l'écran */
  width: 100%;
  overflow: hidden; /* Double sécurité contre le scroll */

  padding: 40px 20px;
  box-sizing: border-box; /* Indispensable pour inclure le padding dans les 100vh */
  position: relative;
  z-index: 2;
}

/* Style du Header (titre) */
.main-header {
  text-align: center;
  margin-bottom: 30px; /* Espace fixe entre le titre RED TETRIS et le contenu de la page */
}

/* Zone de contenu dynamique (RouterView) */
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
