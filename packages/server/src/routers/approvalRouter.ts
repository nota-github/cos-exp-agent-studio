import { randomUUID } from 'crypto'
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { processManager } from '../services/ProcessManager.js'
import { approvalService } from '../services/ApprovalService.js'
import { broadcast } from '../websocket/WebSocketServer.js'

const approvalRouter = Router()

interface ApprovalRow {
  id: string
  execution_id: string
  action_type: string
  target: string
  risk_level: string
  description: string
  status: string
  requested_at: string
  decided_at: string | null
}

const RespondSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
})

approvalRouter.get('/:id', (req: Request, res: Response) => {
  const id = req.params.id as string
  const approval = db.prepare('SELECT * FROM approvals WHERE id = ?').get(id) as ApprovalRow | undefined
  if (!approval) {
    res.status(404).json({ error: '승인 요청을 찾을 수 없습니다' })
    return
  }
  res.json(approval)
})

approvalRouter.post('/:id/respond', (req: Request, res: Response) => {
  const id = req.params.id as string

  const result = RespondSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: '입력값이 올바르지 않습니다',
      details: result.error.flatten().fieldErrors,
    })
    return
  }

  const { decision } = result.data

  const approval = db
    .prepare('SELECT * FROM approvals WHERE id = ?')
    .get(id) as ApprovalRow | undefined

  if (!approval) {
    res.status(404).json({ error: '승인 요청을 찾을 수 없습니다' })
    return
  }

  if (approval.status !== 'pending') {
    res.status(409).json({ error: '이미 처리된 승인 요청입니다' })
    return
  }

  const now = new Date().toISOString()

  if (decision === 'approved') {
    db.prepare('UPDATE approvals SET status = ?, decided_at = ? WHERE id = ?').run(
      'approved',
      now,
      id
    )
    db.prepare("UPDATE executions SET status = 'running' WHERE id = ?").run(approval.execution_id)

    approvalService.removePending(approval.execution_id)
    processManager.resume(approval.execution_id)
    processManager.write(approval.execution_id, 'y\n')

    broadcast(approval.execution_id, {
      type: 'status',
      executionId: approval.execution_id,
      status: 'running',
    })
  } else {
    db.prepare('UPDATE approvals SET status = ?, decided_at = ? WHERE id = ?').run(
      'rejected',
      now,
      id
    )
    db.prepare("UPDATE executions SET status = 'cancelled' WHERE id = ?").run(
      approval.execution_id
    )

    approvalService.removePending(approval.execution_id)
    processManager.kill(approval.execution_id)
  }

  // Insert approval_result message and broadcast for real-time chat display
  const execRow = db
    .prepare('SELECT project_id FROM executions WHERE id = ?')
    .get(approval.execution_id) as { project_id: string } | undefined

  if (execRow) {
    const msgId = randomUUID()
    const resultMeta = JSON.stringify({
      approvalId: id,
      decision,
      risk_level: approval.risk_level,
      action_type: approval.action_type,
      target: approval.target,
    })
    db.prepare(
      'INSERT INTO messages (id, execution_id, project_id, type, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      msgId,
      approval.execution_id,
      execRow.project_id,
      'approval_result',
      `${decision}: ${approval.target}`,
      resultMeta,
      now
    )
    broadcast(approval.execution_id, {
      type: 'approval_result',
      executionId: approval.execution_id,
      message: {
        id: msgId,
        execution_id: approval.execution_id,
        project_id: execRow.project_id,
        type: 'approval_result',
        content: `${decision}: ${approval.target}`,
        metadata: resultMeta,
        created_at: now,
      },
    })
  }

  const updated = db
    .prepare('SELECT * FROM approvals WHERE id = ?')
    .get(id) as ApprovalRow

  res.json(updated)
})

export { approvalRouter }
