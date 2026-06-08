import { useQuery } from '@tanstack/react-query'
import { apiGet } from './client'

export interface ChatMessage {
  id: string
  execution_id: string
  project_id: string
  type: 'user' | 'agent' | 'system' | 'approval_request'
  content: string
  metadata: string | null
  created_at: string
}

export function messagesQueryKey(projectId: string) {
  return ['messages', projectId] as const
}

export function useMessages(projectId: string | undefined) {
  return useQuery({
    queryKey: messagesQueryKey(projectId ?? ''),
    queryFn: () => apiGet<ChatMessage[]>(`/projects/${projectId}/messages`),
    enabled: !!projectId,
    staleTime: 0,
  })
}
