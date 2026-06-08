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

  const updated = db
    .prepare('SELECT * FROM approvals WHERE id = ?')
    .get(id) as ApprovalRow

  res.json(updated)
})

export { approvalRouter }
