<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import SpectrumComponent from '@/components/game/SpectrumComponent.vue'
import { socket } from '@/socket'

// Page spectateur : aucun plateau jouable, aucun InputHandler, aucun état de jeu.
// On se contente d'afficher, en grand, les plateaux des joueurs en lice.
interface RosterEntry {
  id: number
  name: string
}

const players = ref<RosterEntry[]>([])
const winnerId = ref<number | null>(null)
const winnerName = ref<string>('')
const isGameFinished = ref(false)

function onStart(roster: RosterEntry[]) {
  players.value = roster
  winnerId.value = null
  winnerName.value = ''
  isGameFinished.value = false
}

function onGameEnd(payload: { winnerId: number | null; winnerName: string | null }) {
  winnerId.value = payload.winnerId
  winnerName.value = payload.winnerName ?? ''
  isGameFinished.value = true
}

onMounted(() => {
  socket.on('all_player', onStart)
  socket.on('game_end', onGameEnd)
})

onUnmounted(() => {
  socket.off('all_player', onStart)
  socket.off('game_end', onGameEnd)
})

// Les plateaux tiennent sur une seule rangée : moins il y a de joueurs,
// plus chaque plateau est affiché en grand.
const cellSize = computed(() => {
  const count = players.value.length
  if (count <= 2) return 28
  if (count === 3) return 24
  return 19
})
</script>

<template>
  <div class="viewer">
    <div v-if="players.length" class="viewer-grid">
      <SpectrumComponent
        v-for="player in players"
        :key="player.id"
        :id="player.id"
        :name="player.name"
        :cell-size="cellSize"
        :won="winnerId === player.id"
      />
    </div>
    <p v-else class="viewer-waiting">WAITING FOR THE BOARDS…</p>

    <div v-if="isGameFinished" class="end-banner">
      <span v-if="winnerName">{{ winnerName }} WINS THE GAME</span>
      <span v-else>GAME OVER</span>
    </div>

    <footer class="viewer-footer">
      <span class="viewer-badge">SPECTATOR MODE</span>
      <span class="viewer-hint">
        <template v-if="isGameFinished">
          This round is over — reload the page to join the next one.
        </template>
        <template v-else> You are watching this round. Reload once it ends to join in. </template>
      </span>
    </footer>
  </div>
</template>

<style scoped>
.viewer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 18px;
}

.viewer-grid {
  display: grid;
  grid-auto-flow: column;
  gap: 22px;
  justify-items: center;
  align-items: end;
}

.viewer-waiting {
  color: rgba(255, 255, 255, 0.75);
  letter-spacing: 2px;
  margin: 0;
  padding: 80px 0;
}

/* Bandeau d'information, sous les plateaux pour ne pas manger la place à l'écran */
.viewer-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: rgb(0 0 0 / 0.55);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 6px 18px 6px 6px;
  max-width: 100%;
}

.viewer-badge {
  flex: none;
  color: #ffffff;
  background-color: #bf1818;
  border-radius: 999px;
  padding: 4px 16px;
  font-size: 0.8rem;
  letter-spacing: 2px;
  white-space: nowrap;
}

.viewer-hint {
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
  letter-spacing: 0.5px;
}

.end-banner {
  color: #ffd21f;
  background-color: rgb(0 0 0 / 0.7);
  border: 2px solid #ffd21f;
  border-radius: 4px;
  padding: 6px 20px;
  font-size: 1rem;
  letter-spacing: 2px;
  text-align: center;
}
</style>
