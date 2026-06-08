import { useState, useEffect } from 'react'
import type { ExecutionStatus } from '../stores/appStore'
import { useAppStore } from '../stores/appStore'
import { send, useWsMessage } from './useWebSocket'

export function useExecutionStatus(executionId: string | null): ExecutionStatus | null {
  const setExecutionStatus = useAppStore((s) => s.setExecutionStatus)
  const storedStatus = useAppStore((s) =>
    executionId ? (s.activeExecutions[executionId] ?? null) : null
  )

  const [status, setStatus] = useState<ExecutionStatus | null>(storedStatus)

  useEffect(() => {
    if (!executionId) {
      setStatus(null)
      return
    }
    send({ type: 'subscribe', executionId })
    return () => {
      send({ type: 'unsubscribe', executionId })
    }
  }, [executionId])

  useWsMessage((msg) => {
    if (
      msg.type === 'status' &&
      typeof msg.executionId === 'string' &&
      msg.executionId === executionId &&
      executionId !== null
    ) {
      const newStatus = msg.status as ExecutionStatus
      setStatus(newStatus)
      setExecutionStatus(executionId, newStatus)
    }
  })

  return status
}
