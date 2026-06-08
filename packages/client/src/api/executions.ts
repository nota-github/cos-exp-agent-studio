import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api'

export interface ExecutionCreated {
  executionId: string
}

export interface MissingSettingsError {
  type: 'missing_settings'
  missing: string[]
}

export type CreateExecutionResult =
  | { ok: true; executionId: string }
  | { ok: false; error: MissingSettingsError }

export async function createExecution(
  projectId: string,
  requestText: string
): Promise<CreateExecutionResult> {
  const res = await fetch(`${BASE_URL}/executions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, requestText }),
  })

  if (res.status === 400) {
    const body = (await res.json()) as { error: string; missing?: string[] }
    if (body.missing && body.missing.length > 0) {
      return { ok: false, error: { type: 'missing_settings', missing: body.missing } }
    }
  }

  if (res.ok) {
    const data = (await res.json()) as { executionId: string }
    return { ok: true, executionId: data.executionId }
  }

  throw new Error(`POST /executions failed: ${res.status}`)
}

export interface Execution {
  id: string
  project_id: string
  request_text: string
  status: string
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  summary: string | null
  error_message: string | null
}

export function executionListQueryKey(projectId: string) {
  return ['executions', projectId] as const
}

export function useProjectExecutions(projectId: string | undefined) {
  return useQuery({
    queryKey: executionListQueryKey(projectId ?? ''),
    queryFn: () => apiGet<Execution[]>(`/projects/${projectId}/executions`),
    enabled: !!projectId,
  })
}

export function executionDetailQueryKey(executionId: string) {
  return ['execution', executionId] as const
}

export function useExecution(executionId: string | undefined) {
  return useQuery({
    queryKey: executionDetailQueryKey(executionId ?? ''),
    queryFn: () => apiGet<Execution>(`/executions/${executionId}`),
    enabled: !!executionId,
  })
}

export interface ExecutionLogEntry {
  id: string
  execution_id: string
  timestamp: string
  level: 'info' | 'warn' | 'error'
  category: 'stdout' | 'stderr' | 'file_change' | 'command'
  content: string
}

export function executionLogsQueryKey(executionId: string) {
  return ['execution-logs', executionId] as const
}

export function useExecutionLogs(executionId: string | undefined) {
  return useQuery({
    queryKey: executionLogsQueryKey(executionId ?? ''),
    queryFn: () => apiGet<ExecutionLogEntry[]>(`/executions/${executionId}/logs`),
    enabled: !!executionId,
  })
}

export interface ExecutionMessage {
  id: string
  execution_id: string
  project_id: string
  type: string
  content: string
  metadata: string | null
  created_at: string
}

export function executionMessagesQueryKey(executionId: string) {
  return ['execution-messages', executionId] as const
}

export function useExecutionMessages(executionId: string | undefined) {
  return useQuery({
    queryKey: executionMessagesQueryKey(executionId ?? ''),
    queryFn: () => apiGet<ExecutionMessage[]>(`/executions/${executionId}/messages`),
    enabled: !!executionId,
  })
}
