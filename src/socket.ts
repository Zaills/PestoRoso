import { reactive } from 'vue'
import { io } from 'socket.io-client'

const URL = 'http://localhost:3000'

export const socket = io(URL)

export const state = reactive({
  connected: false,
})

socket.on('connect', () => {
  state.connected = true
})

socket.on('disconnect', () => {
  state.connected = false
})
