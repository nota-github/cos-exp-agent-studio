import { randomUUID } from 'crypto'
import { db } from '../db/index.js'
import { processManager } from './ProcessManager.js'
import { broadcast } from '../websocket/WebSocketServer.js'
import { APPROVAL_PATTERNS } from './approvalPatterns.js'

export interface ApprovalRequest {
  action_type: string
  target: string
  risk_level: 'low' | 'medium' | 'high'
  description: string
}

const VALID_RISK_LEVELS = new Set(['low', 'medium', 'high'])

export function parseApprovalSignal(line: string): ApprovalRequest | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>
      if (
        parsed.type === 'approval_request' &&
        typeof parsed.action_type === 'string' &&
        typeof parsed.target === 'string' &&
        typeof parsed.risk_level === 'string' &&
        typeof parsed.description === 'string' &&
        VALID_RISK_LEVELS.has(parsed.risk_level)
      ) {
        return {
          action_type: parsed.action_type,
          target: parsed.target,
          risk_level: parsed.risk_level as 'low' | 'medium' | 'high',
          description: parsed.description,
        }
      }
    } catch {
      // not valid JSON, fall through to pattern matching
    }
  }

  for (const pattern of APPROVAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        action_type: 'command_exec',
        target: trimmed.slice(0, 200),
        risk_level: 'medium',
        description: trimmed,
      }
    }
  }

  return null
}

class ApprovalService {
  private pendingExecutions = new Set<string>()

  setup(): void {
    processManager.on('data', (executionId, chunk, source) => {
      if (source !== 'stdout') return
      if (this.pendingExecutions.has(executionId)) return

      for (const line of chunk.split('\n')) {
        const request = parseApprovalSignal(line)
        if (request) {
          this.handleApproval(executionId, request)
          break
        }
      }
    })

    processManager.on('exit', (executionId) => {
      this.pendingExecutions.delete(executionId)
    })
  }

  private handleApproval(executionId: string, request: ApprovalRequest): void {
    this.pendingExecutions.add(executionId)
    processManager.pause(executionId)

    const approvalId = randomUUID()
    const now = new Date().toISOString()

    db.prepare(
      'INSERT INTO approvals (id, execution_id, action_type, target, risk_level, description, status, requested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      approvalId,
      executionId,
      request.action_type,
      request.target,
      request.risk_level,
      request.description,
      'pending',
      now
    )

    const execRow = db
      .prepare('SELECT project_id FROM executions WHERE id = ?')
      .get(executionId) as { project_id: string } | undefined

    if (execRow) {
      db.prepare(
        'INSERT INTO messages (id, execution_id, project_id, type, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        randomUUID(),
        executionId,
        execRow.project_id,
        'approval_request',
        request.description,
        JSON.stringify({
          approvalId,
          action_type: request.action_type,
          target: request.target,
          risk_level: request.risk_level,
        }),
        now
      )
    }

    db.prepare("UPDATE executions SET status = 'approval_pending' WHERE id = ?").run(executionId)

    broadcast(executionId, {
      type: 'approval_request',
      executionId,
      approval: {
        id: approvalId,
        action_type: request.action_type,
        target: request.target,
        risk_level: request.risk_level,
        description: request.description,
        requested_at: now,
      },
    })
  }

  removePending(executionId: string): void {
    this.pendingExecutions.delete(executionId)
  }

  isPending(executionId: string): boolean {
    return this.pendingExecutions.has(executionId)
  }
}

export const approvalService = new ApprovalService()
