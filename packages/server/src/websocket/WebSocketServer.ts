import { WebSocket, WebSocketServer as WsServer } from 'ws'
import type { Server } from 'http'
import { db } from '../db/index.js'

interface PendingApprovalRow {
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

// executionId → subscribed clients
const subscriptions = new Map<string, Set<WebSocket>>()
// client → subscribed executionIds (for cleanup on disconnect)
const clientSubs = new Map<WebSocket, Set<string>>()

let wss: WsServer | null = null

export function setupWebSocket(server: Server): void {
  wss = new WsServer({ server, path: '/ws' })

  wss.on('connection', (ws) => {
    console.log('[ws] client connected')
    clientSubs.set(ws, new Set())

    const pendingApprovals = db
      .prepare('SELECT * FROM approvals WHERE status = ?')
      .all('pending') as PendingApprovalRow[]
    ws.send(JSON.stringify({ type: 'connected', pendingApprovals }))

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string; executionId?: string }
        if (msg.type === 'subscribe' && msg.executionId) {
          if (!subscriptions.has(msg.executionId)) {
            subscriptions.set(msg.executionId, new Set())
          }
          subscriptions.get(msg.executionId)!.add(ws)
          clientSubs.get(ws)!.add(msg.executionId)
        } else if (msg.type === 'unsubscribe' && msg.executionId) {
          subscriptions.get(msg.executionId)?.delete(ws)
          clientSubs.get(ws)?.delete(msg.executionId)
        }
      } catch {
        // ignore malformed messages
      }
    })

    ws.on('close', () => {
      console.log('[ws] client disconnected')
      const subs = clientSubs.get(ws)
      if (subs) {
        for (const executionId of subs) {
          subscriptions.get(executionId)?.delete(ws)
        }
      }
      clientSubs.delete(ws)
    })

    ws.on('error', (err) => {
      console.error('[ws] client error:', err.message)
    })
  })
}

export function broadcast(executionId: string, message: unknown): void {
  const clients = subscriptions.get(executionId)
  if (!clients) return
  const payload = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}

export function broadcastAll(message: unknown): void {
  if (!wss) return
  const payload = JSON.stringify(message)
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload)
    }
  }
}
