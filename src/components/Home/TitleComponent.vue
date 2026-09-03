<script setup lang="ts"></script>

<template>
  <span class="shadow-container">
    <RouterLink to="/" class="btn-chanfrein">RED TETRIS</RouterLink>
  </span>
</template>

<style scoped>
.shadow-container {
  display: inline-block;
  /* Crée une ombre noire décalée de 4px vers le bas qui suit le chanfrein */
  filter: drop-shadow(0 4px 0 #000000);
  transition: filter 0.1s ease;
}

.btn-chanfrein {
  display: inline-block;
  text-decoration: none;
  font-family: 'Titan One', sans-serif;
  font-size: 2.5rem;
  background-color: #eae7e7;
  color: #bf1818;
  padding: 12px 24px;
  font-weight: bold;

  clip-path: polygon(
    10px 0%,
    calc(100% - 10px) 0%,
    100% 10px,
    100% calc(100% - 10px),
    calc(100% - 10px) 100%,
    10px 100%,
    0% calc(100% - 10px),
    0% 10px
  );

  transition: transform 0.1s ease;
}

/* Quand on survole le conteneur, le bouton change de couleur */
.shadow-container:hover .btn-chanfrein {
  background-color: #ffffff;
}

/* Effet d'enfoncement : on descend le bouton et on réduit l'ombre */
.shadow-container:active {
  filter: drop-shadow(0 0px 0 #000000);
}
.shadow-container:active .btn-chanfrein {
  transform: translateY(4px);
}
</style>
