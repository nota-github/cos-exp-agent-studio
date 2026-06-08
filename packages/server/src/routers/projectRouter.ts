import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { existsSync } from 'fs'
import { resolve, isAbsolute } from 'path'
import { randomUUID } from 'crypto'
import { db } from '../db/index.js'

const projectRouter = Router()

const CreateProjectSchema = z.object({
  name: z.string().min(1, '프로젝트 이름은 필수입니다').max(100, '프로젝트 이름은 100자 이하여야 합니다'),
  path: z.string().min(1, '경로는 필수입니다'),
})

type Project = {
  id: string
  name: string
  path: string
  created_at: string
  last_run_at: string | null
  last_status: string | null
}

projectRouter.get('/', (_req: Request, res: Response) => {
  const projects = db.prepare(`
    SELECT id, name, path, created_at, last_run_at, last_status
    FROM projects
    ORDER BY CASE WHEN last_run_at IS NULL THEN 1 ELSE 0 END, last_run_at DESC
  `).all() as Project[]
  res.json(projects)
})

projectRouter.post('/', (req: Request, res: Response) => {
  const result = CreateProjectSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: '입력값이 올바르지 않습니다',
      details: result.error.flatten().fieldErrors,
    })
    return
  }

  const { name } = result.data
  const normalizedPath = resolve(result.data.path)

  if (!isAbsolute(normalizedPath)) {
    res.status(400).json({ error: '경로는 절대 경로여야 합니다' })
    return
  }

  if (!existsSync(normalizedPath)) {
    res.status(400).json({ error: '경로가 존재하지 않습니다' })
    return
  }

  const existing = db.prepare('SELECT id FROM projects WHERE path = ?').get(normalizedPath)
  if (existing) {
    res.status(409).json({ error: '이미 등록된 경로입니다' })
    return
  }

  const id = randomUUID()
  const created_at = new Date().toISOString()

  db.prepare(
    'INSERT INTO projects (id, name, path, created_at, last_run_at, last_status) VALUES (?, ?, ?, ?, NULL, NULL)'
  ).run(id, name, normalizedPath, created_at)

  const project = db.prepare('SELECT id, name, path, created_at, last_run_at, last_status FROM projects WHERE id = ?').get(id) as Project
  res.status(201).json(project)
})

projectRouter.delete('/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const existing = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
  if (!existing) {
    res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' })
    return
  }

  db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  res.status(204).send()
})

export { projectRouter }
