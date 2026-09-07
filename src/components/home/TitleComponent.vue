<script setup lang="ts"></script>

<template>
  <span class="shadow-container">
    <RouterLink to="/" class="btn-chanfrein">RED TETRIS</RouterLink>
  </span>
</template>

<style scoped>
.shadow-container {
  display: inline-block;
  /* Black shadow offset 4px down, following the bevelled outline. */
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

/* Hovering the container brightens the button. */
.shadow-container:hover .btn-chanfrein {
  background-color: #ffffff;
}

/* Pressed-in effect: the button moves down and the shadow collapses. */
.shadow-container:active {
  filter: drop-shadow(0 0px 0 #000000);
}
.shadow-container:active .btn-chanfrein {
  transform: translateY(4px);
}
</style>
