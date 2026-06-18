import express from 'express'
import type { Request, Response } from 'express'
import { createServer } from "http"
import cors from 'cors'
import { initSocket } from './socket';
import * as os from 'node:os'

const app = express()

app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
initSocket(httpServer)

export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces()
  for (const interfaceName in interfaces) {
    const networkInterface = interfaces[interfaceName]
    if (networkInterface) {
      for (const net of networkInterface) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address
        }
      }
    }
  }
  return 'localhost'
}

const PORT = process.env.PORT || 3000;

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'API is running' })
})

httpServer.listen(Number(PORT), '0.0.0.0', () => {
  const localIp = getLocalIpAddress()
  console.log(`🚀 Server Started: http://localhost:${PORT}`)
  console.log(`🚀 Server is accessible on your local network at: http://${localIp}:3000`)
})
