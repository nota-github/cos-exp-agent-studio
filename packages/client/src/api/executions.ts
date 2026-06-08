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
