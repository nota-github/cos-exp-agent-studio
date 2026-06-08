import { Router } from 'express'
import { DB_PATH } from '../db/index.js'

const healthRouter = Router()

healthRouter.get('/health', (_req, res) => {
  res.json({ ok: true, dbPath: DB_PATH, version: '0.1.0' })
})

export { healthRouter }
