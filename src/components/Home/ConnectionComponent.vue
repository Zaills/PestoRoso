
<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const name = ref('')
const room = ref('')
const roomInput = ref<HTMLInputElement | null>(null)
const router = useRouter()

const focusRoom = () => {
  roomInput.value?.focus()
}

const joinRoom = () => {
  if (name.value !== '' && room.value !== '') {
    router.push(room.value + '/' + name.value)
  }
}
</script>

<template>
  <div class="login-container">
    <span class="shadow-container disabled-shadow">
      <input
        v-model="name"
        class="input-chanfrein"
        placeholder="NAME"
        maxlength="16"
        @keyup.enter="focusRoom"
      />
    </span>

    <span class="shadow-container disabled-shadow">
      <input
        ref="roomInput"
        v-model="room"
        class="input-chanfrein"
        placeholder="ROOM"
        maxlength="16"
        @keyup.enter="joinRoom"
      />
    </span>

    <span class="shadow-container" :class="{ 'disabled-shadow': room === '' || name === '' }">
      <RouterLink v-if="room != '' && name != ''" :to="room + '/' + name" class="joinButton">
        JOIN ROOM
      </RouterLink>
      <button v-else class="joinButton" disabled>JOIN ROOM</button>
    </span>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');

/* Conteneur pour aligner les éléments proprement en colonne */
.login-container {
  display: flex;
  flex-direction: column;
  gap: 1.4em;
  max-width: 22em;
  margin: 0 auto;
  font-family: 'Titan One', sans-serif;
}

/* --- LE CONTENEUR D'OMBRE (Commun aux inputs et boutons) --- */
.shadow-container {
  display: inline-block;
  filter: drop-shadow(0 4px 0 #000000);
  transition: filter 0.1s ease;
}

/* Effet d'enfoncement au clic (uniquement si pas désactivé) */
.shadow-container:not(.disabled-shadow):active {
  filter: drop-shadow(0 0px 0 #000000);
}
.shadow-container:not(.disabled-shadow):active .joinButton,
.shadow-container:not(.disabled-shadow):active .input-chanfrein {
  transform: translateY(4px);
}

/* --- LES INPUTS --- */
.input-chanfrein {
  width: 100%;
  box-sizing: border-box;
  border: none;
  outline: none;
  font-family: 'Titan One', sans-serif;
  font-size: 1.6rem;
  padding: 12px 20px;
  background-color: #333333; /* Fond sombre pour contraster avec le bouton blanc */
  color: #ffffff;

  clip-path: polygon(
    8px 0%, calc(100% - 8px) 0%, 100% 8px,
    100% calc(100% - 8px), calc(100% - 8px) 100%,
    8px 100%, 0% calc(100% - 8px), 0% 8px
  );

  transition: transform 0.1s ease, background-color 0.2s;
}

.input-chanfrein:focus {
  background-color: #444444; /* Légère brillance quand on tape dedans */
}

/* Style du texte d'aide (placeholder) */
.input-chanfrein::placeholder {
  color: #888888;
}

/* --- LE BOUTON REPREND TON STYLE --- */
.joinButton {
  display: block;
  width: 100%;
  box-sizing: border-box;
  text-align: center;
  text-decoration: none;
  border: none;
  font-family: 'Titan One', sans-serif;
  font-size: 1.5rem;
  background-color: #eae7e7;
  color: #2aa80f;
  padding: 12px 24px;
  cursor: pointer;

  clip-path: polygon(
    10px 0%, calc(100% - 10px) 0%, 100% 10px,
    100% calc(100% - 10px), calc(100% - 10px) 100%,
    10px 100%, 0% calc(100% - 10px), 0% 10px
  );

  transition: transform 0.1s ease, background-color 0.2s, color 0.2s;
}

/* Survol du bouton actif */
.shadow-container:not(.disabled-shadow):hover .joinButton {
  background-color: #ffffff;
}

/* --- STYLE SI DÉSACTIVÉ (Champs vides) --- */
.joinButton:disabled {
  background-color: #555555;
  color: #888888;
  cursor: not-allowed;
}

.disabled-shadow {
  filter: drop-shadow(0 4px 0 #222222); /* Ombre grisée quand c'est bloqué */
}
</style>
