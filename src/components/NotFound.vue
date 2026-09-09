<script setup lang="ts"></script>

<template>
  <div class="error-banner">
    <h1 class="error-badge__text">404 Not Found</h1>
  </div>
</template>

<style scoped>
.error-banner {
  position: fixed;
  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  filter: drop-shadow(0 4px 0 #000000);
  pointer-events: none;
}

.error-badge__text {
  display: inline-block;
  margin: 0;
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
