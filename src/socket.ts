import { io } from 'socket.io-client'

const URL = 'http://localhost:3000'

export const socket = io(URL, {
  autoConnect: false,
})

socket.on('receive_message', (message) => {
  console.log(message)
})
