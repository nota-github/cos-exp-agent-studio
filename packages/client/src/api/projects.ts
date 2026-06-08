import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPostJson } from './client'
import type { Project } from '../stores/appStore'

export const projectsQueryKey = ['projects'] as const

export function fetchProjects(): Promise<Project[]> {
  return apiGet<Project[]>('/projects')
}

export function useProjects() {
  return useQuery({
    queryKey: projectsQueryKey,
    queryFn: fetchProjects,
    staleTime: 30_000,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; path: string }) =>
      apiPostJson<Project>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectsQueryKey })
    },
  })
}
