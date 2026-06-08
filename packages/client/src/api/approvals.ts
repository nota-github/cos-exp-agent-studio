import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPostJson } from './client'

export interface Approval {
  id: string
  execution_id: string
  action_type: string
  target: string
  risk_level: 'low' | 'medium' | 'high'
  description: string
  status: 'pending' | 'approved' | 'rejected'
  requested_at: string
  decided_at: string | null
}

export function approvalQueryKey(id: string) {
  return ['approval', id] as const
}

export function useApproval(id: string) {
  return useQuery({
    queryKey: approvalQueryKey(id),
    queryFn: () => apiGet<Approval>(`/approvals/${id}`),
    staleTime: 0,
  })
}

export function useRespondToApproval(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (decision: 'approved' | 'rejected') =>
      apiPostJson<Approval>(`/approvals/${id}/respond`, { decision }),
    onSuccess: (data) => {
      queryClient.setQueryData<Approval>(approvalQueryKey(id), data)
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: approvalQueryKey(id) })
    },
  })
}
