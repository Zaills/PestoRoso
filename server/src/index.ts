import * as express from 'express';
import { Request, Response } from 'express'

const app = express()
const PORT = 3000

// La route demandée
app.get('/marco', (req: Request, res: Response) => {
  res.send('polo')
})

app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`)
  console.log(`💡 Teste-moi ici : http://localhost:${PORT}/marco`)
})
