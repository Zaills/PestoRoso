import express from 'express';
import type { Request, Response } from 'express'
import { createServer } from "http"
import cors from 'cors';
import { initSocket } from './socket';

const app = express()

app.use(cors())
app.use(express.json())

const httpServer = createServer(app)
initSocket(httpServer)


const PORT = process.env.PORT || 3000;

app.get('/api/status', (req: Request, res: Response) => {
  res.json({ status: 'API is running' })
})

httpServer.listen(PORT, () => {
  console.log(`🚀 Server Started: http://localhost:${PORT}`)
})
