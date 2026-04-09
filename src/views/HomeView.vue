<script setup lang="ts">
import TitleComponent from '@/components/Home/TitleComponent.vue'
import ConnectionComponent from '@/components/Home/ConnectionComponent.vue'

</script>

<template>
  <main>
    <title-component />
    <connection-component/>
  </main>
</template>

<style scoped>
main {
  width: 100px;
  height: 100px;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;

  margin: auto;
}
</style>
