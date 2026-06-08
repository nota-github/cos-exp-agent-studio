import express, { Request, Response, NextFunction } from 'express'
import { createServer } from 'http'
import { healthRouter } from './routers/healthRouter.js'
import { closeDb } from './db/index.js'

const app = express()
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000

// CORS middleware for Vite dev server
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

app.use(express.json())

app.use('/api', healthRouter)

const server = createServer(app)

server.listen(PORT, () => {
  console.log(`[server] Agent Studio listening on http://localhost:${PORT}`)
})

function shutdown(signal: string): void {
  console.log(`[server] ${signal} received — shutting down gracefully`)
  server.close(() => {
    closeDb()
    process.exit(0)
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

export { app }
