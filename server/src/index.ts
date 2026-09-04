import express from 'express'
import type { Request, Response } from 'express'
import { createServer } from 'http'
import cors from 'cors'
import { initSocket, getLocalIpAddress } from './socket'

export const app = express()

app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
initSocket(httpServer)

const PORT = Number(process.env.PORT) || 3000

app.get('/api/status', (_req: Request, res: Response) => {
  res.json({ status: 'API is running' })
})

httpServer.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress()
  console.log(`🚀 Server started: http://localhost:${PORT}`)
  console.log(`🚀 Server is reachable on your local network at: http://${localIp}:${PORT}`)
})
