<script setup lang="ts"></script>

<template>
  <span class="error-banner">
    <h1 class="error-badge__text">404 Not Found</h1>
  </span>
</template>

<style scoped>
.error-banner {
  display: inline-block;
  filter: drop-shadow(0 4px 0 #000000);
  min-height: 100vh;
  justify-content: flex-start;
  padding-top: 60vh;
}

.error-badge__text {
  display: inline-block;
  text-decoration: none;
  font-family: 'Titan One', sans-serif;
  font-size: 4rem;
  background-color: #eae7e7;
  color: #bf1818;
  padding: 24px 32px;
  font-weight: bold;
  user-select: none;

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
}

</style>
