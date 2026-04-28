<script setup lang="ts">
import { socket } from '@/socket.ts'
import PlayerIcon from '@/components/waitingRoom/PlayerIcon.vue'

defineProps<{
  playerList: string[]
  ViewerList: string[]
}>()

const url = window.location.href
const length = url.split('/').length
const name = url.split('/')[length - 1]
const room = url.split('/')[length - 2]

function changeTeam() {
  socket.emit('change_team', { room: room, name: name })
}

function startGame() {
  socket.emit('start_game', { name })
}
</script>

<template>
  <div class="waitingRoom">
    <div class="column">
      <span class="column-title">Players</span>
      <div class="list">
        <template v-for="(player, index) in playerList" :key="index">
          <PlayerIcon :player="player" />
        </template>
      </div>
    </div>
    <div class="column">
      <span class="column-title">Viewers</span>
      <div class="list">
        <template v-for="(player, index) in ViewerList" :key="index">
          <PlayerIcon :player="player" />
        </template>
      </div>
    </div>
  </div>
  <button v-if="name === playerList[0]" @click="startGame()">Start Game</button>
  <button @click="changeTeam()">Change Team</button>
</template>

<style scoped>
.waitingRoom {
  display: flex;
  flex-direction: row;
  align-items: center;

  white-space: nowrap;

  background-color: rgb(90 90 90 / 0.8);
  border-radius: 4px;

  .column,
  .list {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    justify-items: center;
    width: 50%;
  }

  .list {
    width: 75% !important;
    height: 100px;
    max-height: 100px;
    overflow: scroll;
    scrollbar-width: none;
    ::-webkit-scrollbar {
      display: none;
    }
    gap: 1px;
  }
}
</style>
