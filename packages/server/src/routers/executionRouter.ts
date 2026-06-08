import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { db } from '../db/index.js'
import { processManager } from '../services/ProcessManager.js'
import { buildSpawnArgs } from '../services/CommandBuilder.js'
import { settingsManager } from '../services/SettingsManager.js'
import { broadcast } from '../websocket/WebSocketServer.js'
import { OpenClawAdapter } from '../services/CliAdapter.js'

const executionRouter = Router()
const adapter = new OpenClawAdapter()

const stdoutAccumulator = new Map<string, string[]>()
const lastStderrChunk = new Map<string, string>()

const API_KEY_PATTERN = /sk-ant-[A-Za-z0-9-]+/g

function redact(text: string): string {
  return text.replace(API_KEY_PATTERN, '[REDACTED]')
}

const LOG_RETENTION_LIMIT = 10_000
const LOG_TRIM_AMOUNT = 500
const EXECUTION_RETENTION_LIMIT = 100

const logCounts = new Map<string, number>()

interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  category: 'stdout' | 'stderr' | 'file_change' | 'command'
  content: string
}

const logBatch = new Map<string, LogEntry[]>()
const batchTimers = new Map<string, ReturnType<typeof setTimeout>>()

function flushLogBatch(executionId: string): void {
  const entries = logBatch.get(executionId)
  logBatch.delete(executionId)
  batchTimers.delete(executionId)
  if (entries && entries.length > 0) {
    broadcast(executionId, { type: 'log', executionId, data: entries })
  }
}

processManager.on('data', (executionId: string, chunk: string, source: 'stdout' | 'stderr') => {
  const redacted = redact(chunk)
  const now = new Date().toISOString()
  const level = source === 'stderr' ? 'error' : 'info'

  const currentCount = logCounts.get(executionId) ?? 0
  if (currentCount >= LOG_RETENTION_LIMIT) {
    db.prepare(
      'DELETE FROM logs WHERE id IN (SELECT id FROM logs WHERE execution_id = ? ORDER BY timestamp ASC LIMIT ?)'
    ).run(executionId, LOG_TRIM_AMOUNT)
    db.prepare(
      'INSERT INTO logs (id, execution_id, timestamp, level, category, content) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(randomUUID(), executionId, now, 'warn', 'system', '[이전 10000줄 이상의 로그가 잘렸습니다]')
    logCounts.set(executionId, currentCount - LOG_TRIM_AMOUNT + 1)
  }

  db.prepare(
    'INSERT INTO logs (id, execution_id, timestamp, level, category, content) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(randomUUID(), executionId, now, level, source, redacted)
  logCounts.set(executionId, (logCounts.get(executionId) ?? 0) + 1)

  if (source === 'stdout') {
    const lines = stdoutAccumulator.get(executionId) ?? []
    lines.push(...redacted.split('\n'))
    stdoutAccumulator.set(executionId, lines)
  } else {
    lastStderrChunk.set(executionId, redacted)
  }

  const entry: LogEntry = {
    id: randomUUID(),
    timestamp: now,
    level,
    category: source,
    content: redacted,
  }
  const batch = logBatch.get(executionId) ?? []
  batch.push(entry)
  logBatch.set(executionId, batch)

  if (!batchTimers.has(executionId)) {
    batchTimers.set(executionId, setTimeout(() => flushLogBatch(executionId), 16))
  }
})

processManager.on('exit', (executionId: string, code: number | null, signal: NodeJS.Signals | null) => {
  if (batchTimers.has(executionId)) {
    clearTimeout(batchTimers.get(executionId)!)
    batchTimers.delete(executionId)
  }
  flushLogBatch(executionId)

  const now = new Date().toISOString()
  const status = signal ? 'cancelled' : code === 0 ? 'completed' : 'failed'

  const execRow = db
    .prepare('SELECT project_id, started_at FROM executions WHERE id = ?')
    .get(executionId) as { project_id: string; started_at: string } | undefined

  const durationMs = execRow?.started_at
    ? Date.now() - new Date(execRow.started_at).getTime()
    : null

  const lines = stdoutAccumulator.get(executionId) ?? []
  stdoutAccumulator.delete(executionId)
  const lastErr = lastStderrChunk.get(executionId) ?? null
  lastStderrChunk.delete(executionId)
  logCounts.delete(executionId)
  const { summary } = adapter.parseResult(lines)

  db.prepare(
    'UPDATE executions SET status = ?, completed_at = ?, duration_ms = ?, summary = ?, error_message = ? WHERE id = ?'
  ).run(status, now, durationMs, summary, status === 'failed' ? lastErr : null, executionId)

  if (execRow) {
    db.prepare('UPDATE projects SET last_run_at = ?, last_status = ? WHERE id = ?').run(
      now,
      status,
      execRow.project_id
    )
  }

  broadcast(executionId, { type: 'status', executionId, status })
  broadcast(executionId, { type: 'execution_complete', executionId, status, summary })
})

const StartExecutionSchema = z.object({
  projectId: z.string().min(1),
  requestText: z.string().min(1, '요청 내용을 입력해주세요'),
  options: z
    .object({
      model: z.string().optional(),
      extraArgs: z.array(z.string()).optional(),
    })
    .optional(),
})

executionRouter.post('/', (req: Request, res: Response) => {
  const result = StartExecutionSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: '입력값이 올바르지 않습니다',
      details: result.error.flatten().fieldErrors,
    })
    return
  }

  const { projectId, requestText, options } = result.data

  const { configured, missing } = settingsManager.isConfigured()
  if (!configured) {
    res.status(400).json({ error: '필수 설정을 완료해주세요', missing })
    return
  }

  const project = db
    .prepare('SELECT id, path FROM projects WHERE id = ?')
    .get(projectId) as { id: string; path: string } | undefined
  if (!project) {
    res.status(404).json({ error: '프로젝트를 찾을 수 없습니다' })
    return
  }

  const executionId = randomUUID()
  const now = new Date().toISOString()

  db.prepare(
    'INSERT INTO executions (id, project_id, request_text, status, started_at) VALUES (?, ?, ?, ?, ?)'
  ).run(executionId, projectId, requestText, 'pending', now)

  const execCount = (
    db.prepare('SELECT COUNT(*) as cnt FROM executions WHERE project_id = ?').get(projectId) as { cnt: number }
  ).cnt
  if (execCount > EXECUTION_RETENTION_LIMIT) {
    const toDelete = db
      .prepare('SELECT id FROM executions WHERE project_id = ? ORDER BY started_at ASC LIMIT ?')
      .all(projectId, execCount - EXECUTION_RETENTION_LIMIT) as { id: string }[]
    for (const exec of toDelete) {
      db.prepare('DELETE FROM logs WHERE execution_id = ?').run(exec.id)
      db.prepare('DELETE FROM messages WHERE execution_id = ?').run(exec.id)
      db.prepare('DELETE FROM approvals WHERE execution_id = ?').run(exec.id)
      db.prepare('DELETE FROM executions WHERE id = ?').run(exec.id)
    }
  }

  const settings = settingsManager.getSettings()
  const { command, args } = buildSpawnArgs(settings.cli_path!, requestText, project.path, options)

  const spawnEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ANTHROPIC_API_KEY: settings.api_key ?? process.env.ANTHROPIC_API_KEY ?? '',
  }

  db.prepare("UPDATE executions SET status = 'running' WHERE id = ?").run(executionId)

  try {
    processManager.spawn(executionId, command, args, project.path, spawnEnv)
  } catch (err) {
    db.prepare(
      "UPDATE executions SET status = 'failed', error_message = ? WHERE id = ?"
    ).run((err as Error).message, executionId)
    res.status(500).json({ error: '실행 시작에 실패했습니다' })
    return
  }

  broadcast(executionId, { type: 'status', executionId, status: 'running' })
  res.status(201).json({ executionId })
})

executionRouter.delete('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string

  const execution = db
    .prepare('SELECT id, status FROM executions WHERE id = ?')
    .get(id) as { id: string; status: string } | undefined
  if (!execution) {
    res.status(404).json({ error: '실행을 찾을 수 없습니다' })
    return
  }

  processManager.kill(id)

  if (!processManager.getStatus(id)) {
    const now = new Date().toISOString()
    db.prepare(
      "UPDATE executions SET status = 'cancelled', completed_at = ? WHERE id = ? AND status IN ('running', 'pending')"
    ).run(now, id)
  }

  res.status(204).send()
})

executionRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string
  const execution = db.prepare('SELECT * FROM executions WHERE id = ?').get(id)
  if (!execution) {
    res.status(404).json({ error: '실행을 찾을 수 없습니다' })
    return
  }
  res.json(execution)
})

export { executionRouter }
