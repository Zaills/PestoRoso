<script setup lang="ts">
import { computed } from 'vue'
import { socket } from '@/socket.ts'
import PlayerIcon from '@/components/waitingRoom/PlayerIcon.vue'

// A room holds at most 5 players; anyone joining after that stays a viewer.
const MAX_PLAYERS = 5

const props = defineProps<{
  playerList: string[]
  ViewerList: string[]
  isHost: boolean
}>()

const url = window.location.href
const segments = url.split('/').filter(Boolean)
const name = segments[segments.length - 1] ?? ''
const room = segments[segments.length - 2] ?? ''

const isFull = computed(() => props.playerList.length >= MAX_PLAYERS)
const isPlayer = computed(() => props.playerList.includes(name))
const canChangeTeam = computed(() => isPlayer.value || !isFull.value)

function changeTeam() {
  if (!canChangeTeam.value) return
  socket.emit('change_team', { room })
}

function startGame() {
  socket.emit('start_game', { room, name })
}
</script>

<template>
  <div class="room-container">
    <div class="waitingRoom">
      <div class="column">
        <span class="column-title">PLAYERS {{ playerList.length }}/{{ MAX_PLAYERS }}</span>
        <div class="list">
          <template v-for="(player, index) in playerList" :key="index">
            <PlayerIcon :player="player" />
          </template>
        </div>
      </div>

      <div class="column">
        <span class="column-title">VIEWERS</span>
        <div class="list">
          <template v-for="(player, index) in ViewerList" :key="index">
            <PlayerIcon :player="player" />
          </template>
        </div>
      </div>
    </div>

    <div class="actions-container">
      <p v-if="isFull" class="room-full">
        ROOM FULL — {{ MAX_PLAYERS }} PLAYERS MAX, EXTRA JOINERS WATCH AS VIEWERS
      </p>

      <span class="shadow-container secondary" :class="{ disabled: !canChangeTeam }">
        <button class="btn-retro btn-secondary" :disabled="!canChangeTeam" @click="changeTeam()">
          CHANGE TEAM
        </button>
      </span>

      <span v-if="isHost" class="shadow-container primary">
        <button class="btn-retro btn-primary" @click="startGame()">START GAME</button>
      </span>
    </div>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Titan+One&display=swap');

/* Outer container. */
.room-container {
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
  font-family: 'Titan One', sans-serif;
}

/* --- THE WAITING ROOM --- */
.waitingRoom {
  display: flex;
  flex-direction: row;
  gap: 16px;
  white-space: nowrap;
}

.column {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: #222222; /* Dark retro background. */
  width: 13em;
  padding: 16px;

  /* Bevelled corners on the list blocks. */
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

.column-title {
  color: #ffffff;
  font-size: 1.2rem;
  margin-bottom: 12px;
  letter-spacing: 1px;
}

.list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 150px;
  max-height: 150px;
  overflow-y: auto;
  scrollbar-width: none; /* Hide the scrollbar on Firefox. */
}

/* Hide the scrollbar on Chrome/Safari. */
.list::-webkit-scrollbar {
  display: none;
}

/* --- ACTION BUTTONS --- */
.actions-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
}

.shadow-container {
  display: block;
  transition: filter 0.1s ease;
}

/* Black shadow for the primary button. */
.shadow-container.primary {
  filter: drop-shadow(0 4px 0 #000000);
}

/* Dark red shadow for the secondary button. */
.shadow-container.secondary {
  filter: drop-shadow(0 4px 0 #5a0b0b);
}

/* Pressed-in effect on click. */
.shadow-container:active {
  filter: drop-shadow(0 0px 0 #000000);
}
.shadow-container:active .btn-retro {
  transform: translateY(4px);
}

/* Shared button base. */
.btn-retro {
  display: block;
  width: 100%;
  box-sizing: border-box;
  border: none;
  font-family: 'Titan One', sans-serif;
  font-size: 1.3rem;
  padding: 12px 24px;
  cursor: pointer;

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

  transition:
    transform 0.1s ease,
    background-color 0.2s,
    color 0.2s;
}

/* Primary button (START GAME), in the RED TETRIS style. */
.btn-primary {
  background-color: #eae7e7;
  color: #bf1818;
}
.shadow-container.primary:hover .btn-primary {
  background-color: #ffffff;
}

/* Warning shown once the room has reached its player limit. */
.room-full {
  color: #ffd21f;
  font-size: 0.8rem;
  letter-spacing: 1px;
  text-align: center;
  margin: 0;
}

/* Disabled button: no seat left on the players side. */
.shadow-container.disabled {
  filter: none;
  opacity: 0.5;
}
.shadow-container.disabled .btn-retro {
  cursor: not-allowed;
}
.shadow-container.disabled:active .btn-retro {
  transform: none;
}

/* Secondary button (CHANGE TEAM), dark brick red. */
.btn-secondary {
  background-color: #bf1818;
  color: #ffffff;
}
.shadow-container.secondary:hover .btn-secondary {
  background-color: #d62222;
}
</style>
